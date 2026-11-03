from django.urls import path
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

from apps.restaurants import views as restaurant_views
from apps.tables import views as table_views
from apps.menu import views as menu_views
from apps.orders import views as order_views
from apps.service_requests import views as service_views
from apps.payments import views as payment_views
from apps.dashboard import views as dashboard_views
from apps.realtime import views as realtime_views

import time
import re
from datetime import datetime, timezone
from django.db import connection
from config.supabase import check_supabase_health

@api_view(["GET"])
@permission_classes([AllowAny])
def liveness_check(request):
    """
    Lightweight Liveness Probe.
    Returns HTTP 200 immediately if Django/Gunicorn process is alive and receiving traffic.
    Zero database queries, zero external network calls.
    """
    return Response({
        "status": "alive",
        "service": "resto-backend",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }, status=200)

@api_view(["GET"])
@permission_classes([AllowAny])
def readiness_check(request):
    """
    Traffic Readiness Probe.
    Checks PostgreSQL connectivity with a lightweight ping (SELECT 1;).
    Returns HTTP 200 if ready to serve, or HTTP 503 if database connection fails.
    """
    db_ok = False
    db_latency_ms = 0.0
    db_error = None

    t0 = time.perf_counter()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1;")
            cursor.fetchone()
            db_ok = True
        db_latency_ms = round((time.perf_counter() - t0) * 1000, 2)
    except Exception as e:
        db_latency_ms = round((time.perf_counter() - t0) * 1000, 2)
        raw_err = str(e).split("\n")[0]
        clean_err = re.sub(r"password=[^\s]+", "password=[REDACTED]", raw_err)
        db_error = f"{type(e).__name__}: {clean_err}"

    status_code = 200 if db_ok else 503
    return Response({
        "status": "ready" if db_ok else "not_ready",
        "database": "connected" if db_ok else "unavailable",
        "database_vendor": connection.vendor,
        "db_latency_ms": db_latency_ms,
        "database_error": db_error,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }, status=status_code)

@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    """
    Diagnostic & Backward-Compatible Health Check.
    Combines application status, PostgreSQL connectivity, and Supabase service status.
    """
    sb_health = check_supabase_health()

    db_ok = False
    db_records = 0
    db_latency_ms = 0.0
    db_error = None

    t0 = time.perf_counter()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM restaurants;")
            row = cursor.fetchone()
            db_records = row[0] if row else 0
            db_ok = True
        db_latency_ms = round((time.perf_counter() - t0) * 1000, 2)
    except Exception as e:
        db_latency_ms = round((time.perf_counter() - t0) * 1000, 2)
        raw_err = str(e).split("\n")[0]
        clean_err = re.sub(r"password=[^\s]+", "password=[REDACTED]", raw_err)
        db_error = f"{type(e).__name__}: {clean_err}"

    return Response({
        "status": "ok" if db_ok else "degraded",
        "database_vendor": connection.vendor,
        "database_configured": bool(connection.vendor == "postgresql"),
        "database_connected": db_ok,
        "database_records": db_records,
        "db_latency_ms": db_latency_ms,
        "database_error": db_error,
        "supabase": sb_health.get("status", "unknown"),
        "storage": sb_health.get("storage", "unknown"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

urlpatterns = [
    # Health, Liveness and Readiness Probes
    path("health/live", liveness_check, name="health-live"),
    path("health/live/", liveness_check),
    path("api/health/live", liveness_check, name="api-health-live"),
    path("api/health/live/", liveness_check),

    path("health/ready", readiness_check, name="health-ready"),
    path("health/ready/", readiness_check),
    path("api/health/ready", readiness_check, name="api-health-ready"),
    path("api/health/ready/", readiness_check),

    path("health", health_check, name="health"),
    path("health/", health_check),
    path("api/health", health_check, name="api-health"),
    path("api/health/", health_check),

    # Restaurants
    path("api/restaurants", restaurant_views.restaurant_list, name="restaurant-list"),
    path("api/restaurants/info", restaurant_views.restaurant_detail, kwargs={"slug": "info"}, name="restaurant-info"),
    path("api/restaurants/settings", restaurant_views.update_restaurant_settings, name="update-restaurant-settings"),
    path("api/staff/restaurant-settings", restaurant_views.staff_restaurant_settings, name="staff-restaurant-settings"),
    path("api/restaurants/<str:slug>", restaurant_views.restaurant_detail, name="restaurant-detail"),

    # Tables
    path("api/tables/availability", table_views.table_availability, name="table-availability"),
    path("api/tables/availability/", table_views.table_availability),
    path("api/tables", table_views.staff_tables, name="staff-tables"),
    path("api/tables/", table_views.staff_tables, name="staff-tables-slash"),
    path("api/tables/<str:pk>", table_views.staff_table_detail, name="staff-table-detail"),
    path("api/tables/<str:pk>/", table_views.staff_table_detail),
    path("api/tables/<str:pk>/status", table_views.staff_table_status, name="staff-table-status"),
    path("api/tables/<str:pk>/status/", table_views.staff_table_status),

    # Menu & Categories
    path("api/upload", menu_views.upload_image_view, name="upload-image"),
    path("api/upload/", menu_views.upload_image_view),
    path("api/menu", menu_views.public_menu, name="public-menu"),
    path("api/menu/categories", menu_views.public_categories, name="public-categories"),
    path("api/staff/menu", menu_views.staff_menu, name="staff-menu"),
    path("api/menu/<str:pk>", menu_views.staff_menu_item_detail, name="staff-menu-item-detail"),
    path("api/menu/<str:pk>/availability", menu_views.staff_menu_item_availability, name="staff-menu-item-availability"),
    path("api/categories", menu_views.staff_categories, name="staff-categories"),
    path("api/categories/<str:pk>", menu_views.staff_category_detail, name="staff-category-detail"),

    # Orders
    path("api/orders", order_views.orders_collection_view, name="orders-collection"),
    path("api/orders/", order_views.orders_collection_view, name="orders-collection-slash"),
    path("api/orders/<str:pk>", order_views.staff_order_detail_view, name="staff-order-detail"),
    path("api/orders/<str:pk>/", order_views.staff_order_detail_view),
    path("api/orders/<str:pk>/tracking", order_views.customer_order_tracking_view, name="customer-order-tracking"),
    path("api/orders/<str:pk>/tracking/", order_views.customer_order_tracking_view),
    path("api/orders/<str:pk>/status", order_views.staff_order_status_view, name="staff-order-status"),
    path("api/orders/<str:pk>/status/", order_views.staff_order_status_view),

    # Service Requests (Waiter calls & bill requests)
    path("api/service-requests", service_views.service_requests_view, name="service-requests"),
    path("api/service-requests/", service_views.service_requests_view),
    path("api/service-requests/<str:pk>", service_views.service_request_detail_view, name="service-request-detail"),
    path("api/service-requests/<str:pk>/", service_views.service_request_detail_view),

    # Payments
    path("api/payments", payment_views.payments_view, name="payments"),
    path("api/payments/", payment_views.payments_view),
    path("api/payments/<str:pk>/status", payment_views.payment_status_view, name="payment-status"),
    path("api/payments/<str:pk>/status/", payment_views.payment_status_view),

    # Real-Time SSE Stream & State Sync
    path("api/realtime/stream", realtime_views.realtime_stream, name="realtime-stream"),
    path("api/realtime/sync", realtime_views.realtime_sync, name="realtime-sync"),
    path("realtime/stream", realtime_views.realtime_stream),
    path("realtime/sync", realtime_views.realtime_sync),

    # Dashboard Metrics
    path("api/dashboard/overview", dashboard_views.dashboard_overview, name="dashboard-overview"),
    path("api/dashboard/recent-orders", dashboard_views.dashboard_recent_orders, name="dashboard-recent-orders"),
    path("api/dashboard/daily-sales", dashboard_views.dashboard_daily_sales, name="dashboard-daily-sales"),

    # Staff
    path("api/staff", dashboard_views.staff_list_create, name="staff-list-create"),
    path("api/staff/<str:pk>/status", dashboard_views.staff_status_toggle, name="staff-status-toggle"),

    # Auth compatibility
    path("api/auth/login", dashboard_views.auth_login, name="auth-login"),
    path("api/auth/me", dashboard_views.auth_me, name="auth-me"),
    path("api/auth/logout", dashboard_views.auth_logout, name="auth-logout"),

    # Direct compatibility routes (in case client omits /api prefix)
    path("restaurants", restaurant_views.restaurant_list),
    path("restaurants/info", restaurant_views.restaurant_detail, kwargs={"slug": "info"}),
    path("restaurants/settings", restaurant_views.update_restaurant_settings),
    path("restaurants/<str:slug>", restaurant_views.restaurant_detail),
    path("tables/availability", table_views.table_availability),
    path("tables/availability/", table_views.table_availability),
    path("tables", table_views.staff_tables),
    path("tables/", table_views.staff_tables),
    path("tables/<str:pk>", table_views.staff_table_detail),
    path("tables/<str:pk>/", table_views.staff_table_detail),
    path("tables/<str:pk>/status", table_views.staff_table_status),
    path("tables/<str:pk>/status/", table_views.staff_table_status),
    path("upload", menu_views.upload_image_view),
    path("upload/", menu_views.upload_image_view),
    path("menu", menu_views.public_menu),
    path("menu/categories", menu_views.public_categories),
    path("staff/menu", menu_views.staff_menu),
    path("categories", menu_views.staff_categories),
    path("orders", order_views.orders_collection_view),
    path("orders/", order_views.orders_collection_view),
    path("orders/<str:pk>", order_views.staff_order_detail_view),
    path("orders/<str:pk>/", order_views.staff_order_detail_view),
    path("orders/<str:pk>/tracking", order_views.customer_order_tracking_view),
    path("orders/<str:pk>/tracking/", order_views.customer_order_tracking_view),
    path("orders/<str:pk>/status", order_views.staff_order_status_view),
    path("orders/<str:pk>/status/", order_views.staff_order_status_view),
    path("service-requests", service_views.service_requests_view),
    path("service-requests/", service_views.service_requests_view),
    path("service-requests/<str:pk>", service_views.service_request_detail_view),
    path("service-requests/<str:pk>/", service_views.service_request_detail_view),
    path("payments", payment_views.payments_view),
    path("payments/", payment_views.payments_view),
    path("payments/<str:pk>/status", payment_views.payment_status_view),
    path("payments/<str:pk>/status/", payment_views.payment_status_view),
]
