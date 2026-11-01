import hashlib
import hmac
import time
from decimal import Decimal, ROUND_HALF_UP
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError, NotFound, PermissionDenied
from apps.orders.models import Order, OrderItem
from apps.tables.models import RestaurantTable
from apps.menu.models import MenuItem

STATUS_TRANSITIONS = {
    "pending": ["confirmed", "cancelled"],
    "confirmed": ["preparing", "cancelled"],
    "preparing": ["ready", "cancelled"],
    "ready": ["served", "cancelled"],
    "served": ["completed"],
    "completed": [],
    "cancelled": [],
}

CUSTOMER_STATUS_MAP = {
    "pending": "received",
    "confirmed": "accepted",
    "preparing": "preparing",
    "ready": "ready",
    "served": "served",
    "completed": "completed",
    "cancelled": "cancelled",
}

def generate_tracking_token(restaurant_id: str, idempotency_key: str) -> str:
    secret = getattr(settings, "TRACKING_TOKEN_SECRET", "resto-demo-secret-key-1234567890")
    raw = f"{restaurant_id}:{idempotency_key}:{secret}"
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]
    return f"tok-{digest}"

def hash_tracking_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def verify_tracking_token(raw_token: str, stored_hash: str) -> bool:
    if not raw_token or not stored_hash:
        return False
    computed_hash = hash_tracking_token(raw_token)
    return hmac.compare_digest(computed_hash, stored_hash)

def format_order_for_customer(order: Order, access_token: str = None) -> dict:
    items = []
    for item in order.order_items.all():
        items.append({
            "cartItemId": item.id,
            "menuItemId": item.menu_item_id,
            "foodItem": {
                "id": item.menu_item_id,
                "name": item.item_name,
                "description": "",
                "price": float(item.unit_price),
                "category": "",
                "image": "",
                "isVegetarian": item.food_type == "veg",
                "dietaryType": "veg" if item.food_type == "veg" else "non-veg",
                "isAvailable": True,
                "preparationTime": "",
            },
            "quantity": item.quantity,
            "selectedCustomizations": [
                {
                    "groupId": "addons",
                    "groupName": "Add-ons",
                    "optionId": addon.get("id", ""),
                    "optionName": addon.get("name", ""),
                    "price": float(addon.get("price", 0)),
                }
                for addon in (item.selected_addons or [])
            ],
            "specialInstructions": item.special_instructions,
            "unitPriceWithCustomizations": float(item.unit_price),
            "lineTotal": float(item.total_price),
        })

    payload = {
        "id": order.id,
        "orderNumber": order.order_number,
        "tableNumber": order.table_number.zfill(2) if order.table_number.isdigit() else order.table_number,
        "customerName": order.customer_name or None,
        "customerPhone": order.customer_phone or None,
        "items": items,
        "breakdown": {
            "subtotal": float(order.subtotal),
            "cgst": float(order.cgst),
            "sgst": float(order.sgst),
            "gstTotal": float(order.gst_total),
            "serviceCharge": float(order.service_charge),
            "finalTotal": float(order.final_total),
        },
        "subtotal": float(order.subtotal),
        "tax": float(order.gst_total),
        "total": float(order.final_total),
        "orderStatus": order.status,
        "paymentMethod": order.payment_method,
        "paymentStatus": order.payment_status,
        "status": CUSTOMER_STATUS_MAP.get(order.status, order.status),
        "createdAt": order.created_at.isoformat() if order.created_at else timezone.now().isoformat(),
        "estimatedTimeMinutes": order.estimated_time_minutes,
        "orderNotes": order.order_notes or None,
        "statusTimeline": order.status_timeline or [],
    }
    if access_token:
        payload["accessToken"] = access_token
    return payload

def format_order_for_dashboard(order: Order) -> dict:
    items = []
    for item in order.order_items.all():
        items.append({
            "id": item.id,
            "menuItemId": item.menu_item_id,
            "menu_item_id": item.menu_item_id,
            "name": item.item_name,
            "item_name": item.item_name,
            "price": float(item.unit_price),
            "unit_price": float(item.unit_price),
            "quantity": item.quantity,
            "qty": item.quantity,
            "total_price": float(item.total_price),
            "selected_addons": item.selected_addons or [],
            "special_instructions": item.special_instructions,
            "isVeg": item.food_type == "veg",
            "is_veg": item.food_type == "veg",
            "food_type": item.food_type,
        })

    table_num = order.table_number.zfill(2) if order.table_number.isdigit() else order.table_number

    return {
        "id": order.id,
        "orderId": order.id,
        "order_number": order.order_number,
        "orderNumber": order.order_number,
        "tableNumber": table_num,
        "table_number": table_num,
        "customerName": order.customer_name or f"Guest Table {table_num}",
        "customer_name": order.customer_name or f"Guest Table {table_num}",
        "customerPhone": order.customer_phone or None,
        "customer_phone": order.customer_phone or None,
        "status": order.status,
        "orderStatus": order.status,
        "order_status": order.status,
        "paymentMethod": order.payment_method,
        "payment_method": order.payment_method,
        "paymentStatus": order.payment_status,
        "payment_status": order.payment_status,
        "subtotal": float(order.subtotal),
        "cgst": float(order.cgst),
        "sgst": float(order.sgst),
        "gst_total": float(order.gst_total),
        "tax": float(order.gst_total),
        "service_charge": float(order.service_charge),
        "final_total": float(order.final_total),
        "total": float(order.final_total),
        "order_notes": order.order_notes or None,
        "orderNotes": order.order_notes or None,
        "items": items,
        "order_items": items,
        "createdAt": order.created_at.isoformat() if order.created_at else timezone.now().isoformat(),
        "created_at": order.created_at.isoformat() if order.created_at else timezone.now().isoformat(),
        "updatedAt": order.updated_at.isoformat() if order.updated_at else timezone.now().isoformat(),
        "updated_at": order.updated_at.isoformat() if order.updated_at else timezone.now().isoformat(),
    }

def create_order_atomic(restaurant, data: dict):
    table_num_str = str(data.get("tableNumber") or data.get("table_number", "")).strip()
    norm_table_num = table_num_str.zfill(2) if table_num_str.isdigit() else table_num_str
    idempotency_key = (data.get("idempotencyKey") or data.get("idempotency_key") or "").strip()

    # 1. Idempotency Check
    if idempotency_key:
        existing = Order.objects.filter(restaurant=restaurant, idempotency_key=idempotency_key).first()
        if existing:
            token = generate_tracking_token(restaurant.id, idempotency_key)
            return format_order_for_customer(existing, access_token=token), False

    with transaction.atomic():
        # 2. Table validation
        table_obj = RestaurantTable.objects.filter(
            restaurant=restaurant,
            table_number__in=[norm_table_num, table_num_str, str(int(norm_table_num)) if norm_table_num.isdigit() else norm_table_num]
        ).first()

        if not table_obj or table_obj.status == "inactive":
            raise ValidationError({"error": {"code": "TABLE_UNAVAILABLE", "message": "Selected table is inactive or unavailable"}})

        # 3. Pricing & Line items calculation
        items_in = data.get("items", [])
        if not items_in:
            raise ValidationError({"error": {"code": "VALIDATION_ERROR", "message": "At least one item is required"}})

        subtotal = Decimal("0.00")
        prepared_items = []

        for item_data in items_in:
            menu_item_id = item_data.get("menuItemId") or item_data.get("menu_item_id") or item_data.get("id")
            quantity = int(item_data.get("quantity") or item_data.get("qty", 1))
            if quantity < 1:
                quantity = 1

            menu_item = MenuItem.objects.filter(restaurant=restaurant, id=menu_item_id).first()
            if not menu_item:
                menu_item = MenuItem.objects.filter(id=menu_item_id).first()

            if menu_item:
                menu_item_id = menu_item.id

            item_name = menu_item.name if menu_item else "Item"
            unit_price = menu_item.price if menu_item else Decimal("250.00")
            food_type = menu_item.food_type if menu_item else "veg"

            # Addons
            selected_addons = item_data.get("selectedAddons") or item_data.get("selected_addons") or []
            addon_price_sum = Decimal("0.00")
            cleaned_addons = []
            for addon in selected_addons:
                addon_id = addon.get("id", "")
                addon_name = addon.get("name", "")
                addon_p = Decimal(str(addon.get("price", 0)))
                addon_price_sum += addon_p
                cleaned_addons.append({"id": addon_id, "name": addon_name, "price": float(addon_p)})

            line_unit = unit_price + addon_price_sum
            line_total = line_unit * Decimal(quantity)
            subtotal += line_total

            prepared_items.append({
                "menu_item_id": menu_item_id,
                "item_name": item_name,
                "food_type": food_type,
                "quantity": quantity,
                "unit_price": line_unit,
                "total_price": line_total,
                "selected_addons": cleaned_addons,
                "special_instructions": item_data.get("specialInstructions") or item_data.get("special_instructions") or "",
            })

        # Calculate taxes (5% GST: CGST 2.5%, SGST 2.5%)
        tax_rate = Decimal(str(restaurant.tax_percentage or 5.00))
        gst_total = (subtotal * tax_rate / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        cgst = (gst_total / Decimal("2")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        sgst = gst_total - cgst
        service_charge = Decimal("0.00")
        final_total = subtotal + gst_total + service_charge

        order_id = f"ord-{int(time.time() * 1000)}"
        order_count = Order.objects.filter(restaurant=restaurant).count()
        order_number = f"DF-{1000 + order_count + 1}"

        access_token = generate_tracking_token(restaurant.id, idempotency_key or order_id)
        tracking_hash = hash_tracking_token(access_token)

        now_iso = timezone.now().isoformat()
        pm = str(data.get("paymentMethod") or data.get("payment_method", "counter")).lower()
        if pm in ["upi", "card", "online"]:
            pm = "upi"
        else:
            pm = "counter"

        order = Order.objects.create(
            id=order_id,
            order_number=order_number,
            restaurant=restaurant,
            table=table_obj,
            table_number=norm_table_num,
            idempotency_key=idempotency_key or order_id,
            tracking_token_hash=tracking_hash,
            customer_name=data.get("customerName") or data.get("customer_name") or f"Guest Table {norm_table_num}",
            customer_phone=data.get("customerPhone") or data.get("customer_phone") or "",
            subtotal=subtotal,
            cgst=cgst,
            sgst=sgst,
            gst_total=gst_total,
            service_charge=service_charge,
            final_total=final_total,
            payment_method=pm,
            payment_status="completed" if pm == "upi" else "pending",
            status="pending",
            order_notes=data.get("specialInstructions") or data.get("orderNotes") or data.get("special_instructions") or "",
            estimated_time_minutes=20,
            status_timeline=[{"stage": "received", "timestamp": now_iso}],
        )

        for pi in prepared_items:
            OrderItem.objects.create(
                id=f"oi-{order.id}-{pi['menu_item_id']}",
                order=order,
                menu_item_id=pi["menu_item_id"],
                item_name=pi["item_name"],
                food_type=pi["food_type"],
                quantity=pi["quantity"],
                unit_price=pi["unit_price"],
                total_price=pi["total_price"],
                selected_addons=pi["selected_addons"],
                special_instructions=pi["special_instructions"],
            )

        # Mark table as occupied
        if table_obj:
            table_obj.status = "occupied"
            table_obj.save(update_fields=["status"])

        # Create payment record
        from apps.payments.models import Payment
        Payment.objects.create(
            id=f"pay-{order.id}",
            restaurant=restaurant,
            order=order,
            amount=final_total,
            payment_method=pm,
            payment_status="completed" if pm == "upi" else "pending",
        )

        return format_order_for_customer(order, access_token=access_token), True

def update_order_status_service(order: Order, new_status: str, reason: str = None) -> Order:
    valid_next = STATUS_TRANSITIONS.get(order.status, [])
    if new_status != order.status and new_status not in valid_next:
        raise ValidationError(
            {"error": {"code": "INVALID_STATUS_TRANSITION", "message": f"Cannot transition order from {order.status} to {new_status}"}},
            code="invalid_status"
        )

    order.status = new_status
    if reason and new_status == "cancelled":
        order.cancellation_reason = reason

    now_iso = timezone.now().isoformat()
    timeline = list(order.status_timeline or [])
    mapped_stage = CUSTOMER_STATUS_MAP.get(new_status, new_status)
    if not any(t.get("stage") == mapped_stage for t in timeline):
        timeline.append({"stage": mapped_stage, "timestamp": now_iso})
    order.status_timeline = timeline
    order.save()

    # Table release check
    if new_status in ["completed", "cancelled"]:
        table = order.table
        if not table:
            table = RestaurantTable.objects.filter(
                restaurant=order.restaurant,
                table_number=order.table_number
            ).first()

        if table:
            # Check if there are any other active orders for this table
            has_active = Order.objects.filter(
                restaurant=order.restaurant,
                table_number=order.table_number
            ).exclude(status__in=["completed", "cancelled"]).exists()

            if not has_active:
                table.status = "available"
                table.save(update_fields=["status"])

    return order

