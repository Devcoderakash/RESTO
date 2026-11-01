create extension if not exists pgcrypto;

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  address text,
  phone text,
  email text,
  logo_url text,
  opening_hours jsonb not null default '{}'::jsonb,
  wifi_ssid text,
  wifi_password text,
  tax_percentage numeric(5,2) not null default 0 check (tax_percentage >= 0),
  service_charge_percentage numeric(5,2) not null default 0 check (service_charge_percentage >= 0),
  currency text not null default 'INR',
  timezone text not null default 'Asia/Kolkata',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null check (role in ('super_admin', 'restaurant_admin', 'manager', 'chef', 'waiter')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('super_admin', 'restaurant_admin', 'manager', 'chef', 'waiter')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_number integer not null check (table_number > 0),
  capacity integer not null check (capacity > 0),
  zone text not null default 'Main Dining',
  status text not null default 'available' check (status in ('available', 'occupied', 'inactive')),
  qr_code_url text,
  created_at timestamptz not null default now(),
  unique (restaurant_id, table_number)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  description text,
  image_url text,
  sort_order integer not null default 0,
  active boolean not null default true,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  unique (restaurant_id, name)
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(12,2) not null check (price >= 0),
  image_url text,
  food_type text not null default 'veg' check (food_type in ('veg', 'non_veg')),
  dietary_tags text[] not null default '{}',
  available boolean not null default true,
  popular boolean not null default false,
  chef_special boolean not null default false,
  preparation_time_minutes integer not null default 15 check (preparation_time_minutes > 0),
  calories integer check (calories is null or calories > 0),
  allergens text[] not null default '{}',
  addons jsonb not null default '[]'::jsonb check (jsonb_typeof(addons) = 'array'),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, name)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id),
  table_id uuid not null references public.restaurant_tables(id),
  table_number integer not null,
  order_number text not null,
  idempotency_key text not null,
  tracking_token_hash text not null,
  customer_name text,
  customer_phone text,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  cgst numeric(12,2) not null default 0,
  sgst numeric(12,2) not null default 0,
  gst_total numeric(12,2) not null default 0,
  service_charge numeric(12,2) not null default 0,
  final_total numeric(12,2) not null check (final_total >= 0),
  payment_method text not null check (payment_method in ('counter', 'upi')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'completed', 'failed', 'refunded')),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled')),
  order_notes text,
  cancellation_reason text,
  estimated_time_minutes integer not null default 20,
  status_timeline jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, order_number),
  unique (restaurant_id, idempotency_key)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  item_name text not null,
  food_type text not null default 'veg' check (food_type in ('veg', 'non_veg')),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  selected_addons jsonb not null default '[]'::jsonb,
  spice_level text,
  special_instructions text,
  total_price numeric(12,2) not null check (total_price >= 0)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  payment_method text not null check (payment_method in ('counter', 'upi')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'completed', 'failed', 'refunded')),
  transaction_reference text,
  created_at timestamptz not null default now()
);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_id uuid not null references public.restaurant_tables(id),
  table_number integer not null,
  order_id uuid references public.orders(id) on delete set null,
  request_type text not null check (request_type in ('waiter', 'bill', 'water', 'assistance', 'other')),
  message text,
  payment_preference text,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_staff_restaurant on public.staff(restaurant_id, is_active);
create unique index if not exists idx_users_email_lower on public.users(lower(email));
create index if not exists idx_tables_restaurant_status on public.restaurant_tables(restaurant_id, status);
create index if not exists idx_categories_restaurant_order on public.categories(restaurant_id, active, sort_order);
create index if not exists idx_menu_restaurant_available on public.menu_items(restaurant_id, available, sort_order);
create index if not exists idx_orders_restaurant_created on public.orders(restaurant_id, created_at desc);
create index if not exists idx_orders_restaurant_status on public.orders(restaurant_id, status);
create index if not exists idx_orders_table_status on public.orders(table_id, status);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_payments_restaurant_created on public.payments(restaurant_id, created_at desc);
create index if not exists idx_service_requests_restaurant_status on public.service_requests(restaurant_id, status, created_at desc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger restaurants_touch_updated_at before update on public.restaurants
for each row execute function public.touch_updated_at();
create trigger menu_items_touch_updated_at before update on public.menu_items
for each row execute function public.touch_updated_at();
create trigger orders_touch_updated_at before update on public.orders
for each row execute function public.touch_updated_at();
create trigger service_requests_touch_updated_at before update on public.service_requests
for each row execute function public.touch_updated_at();

create or replace function public.staff_restaurant_ids()
returns uuid[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(restaurant_id), '{}'::uuid[])
  from public.staff
  where user_id = auth.uid() and is_active = true
$$;

create or replace function public.create_order(
  p_restaurant_id uuid,
  p_table_number integer,
  p_customer_name text,
  p_items jsonb,
  p_payment_method text,
  p_idempotency_key text,
  p_tracking_token_hash text,
  p_customer_phone text default null,
  p_order_notes text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_existing_id uuid;
  v_table public.restaurant_tables%rowtype;
  v_restaurant public.restaurants%rowtype;
  v_menu public.menu_items%rowtype;
  v_item jsonb;
  v_addon_request jsonb;
  v_addon jsonb;
  v_selected_addons jsonb;
  v_addon_total numeric(12,2);
  v_unit_price numeric(12,2);
  v_quantity integer;
  v_subtotal numeric(12,2) := 0;
  v_cgst numeric(12,2);
  v_sgst numeric(12,2);
  v_gst numeric(12,2);
  v_service_charge numeric(12,2);
  v_total numeric(12,2);
  v_order_id uuid := gen_random_uuid();
  v_order_number text;
  v_tax_rate numeric(5,2);
  v_service_rate numeric(5,2);
begin
  perform pg_advisory_xact_lock(hashtextextended(p_restaurant_id::text || ':' || p_idempotency_key, 0));
  select id into v_existing_id from public.orders
    where restaurant_id = p_restaurant_id and idempotency_key = p_idempotency_key;
  if v_existing_id is not null then
    return v_existing_id;
  end if;

  select * into v_restaurant from public.restaurants where id = p_restaurant_id and is_active = true;
  if not found then raise exception using errcode = 'P0001', message = 'Restaurant is inactive'; end if;

  select * into v_table from public.restaurant_tables
    where restaurant_id = p_restaurant_id and table_number = p_table_number
    for update;
  if not found or v_table.status <> 'available' then
    raise exception using errcode = 'P0001', message = 'Table is unavailable';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception using errcode = 'P0001', message = 'Order must contain at least one item';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity < 1 or v_quantity > 50 then
      raise exception using errcode = 'P0001', message = 'Invalid item quantity';
    end if;
    select * into v_menu from public.menu_items
      where id = (v_item->>'menuItemId')::uuid
        and restaurant_id = p_restaurant_id and available = true;
    if not found then
      raise exception using errcode = 'P0001', message = 'A menu item is unavailable';
    end if;

    v_selected_addons := '[]'::jsonb;
    v_addon_total := 0;
    for v_addon_request in select value from jsonb_array_elements(coalesce(v_item->'addonIds', '[]'::jsonb))
    loop
      select addon into v_addon
        from jsonb_array_elements(coalesce(v_menu.addons, '[]'::jsonb)) as addons(addon)
        where addon->>'id' = (v_addon_request #>> '{}')
        limit 1;
      if v_addon is null then
        raise exception using errcode = 'P0001', message = 'A selected add-on is unavailable';
      end if;
      v_addon_total := v_addon_total + coalesce((v_addon->>'price')::numeric, 0);
      v_selected_addons := v_selected_addons || jsonb_build_array(v_addon);
    end loop;

    v_unit_price := v_menu.price + v_addon_total;
    v_subtotal := v_subtotal + (v_unit_price * v_quantity);
    insert into public.order_items(order_id, menu_item_id, item_name, food_type, quantity, unit_price, selected_addons, spice_level, special_instructions, total_price)
    values (
      v_order_id, v_menu.id, v_menu.name, v_menu.food_type, v_quantity, v_menu.price,
      v_selected_addons, v_item->>'spiceLevel', v_item->>'specialInstructions',
      v_unit_price * v_quantity
    );
  end loop;

  v_tax_rate := v_restaurant.tax_percentage;
  v_service_rate := v_restaurant.service_charge_percentage;
  v_gst := round(v_subtotal * v_tax_rate / 100, 2);
  v_cgst := round(v_gst / 2, 2);
  v_sgst := v_gst - v_cgst;
  v_service_charge := round(v_subtotal * v_service_rate / 100, 2);
  v_total := v_subtotal + v_gst + v_service_charge;
  v_order_number := 'DF-' || to_char(clock_timestamp(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.orders(
    id, restaurant_id, table_id, table_number, order_number, idempotency_key, tracking_token_hash,
    customer_name, customer_phone, subtotal, cgst, sgst, gst_total, service_charge, final_total,
    payment_method, status, order_notes, status_timeline
  ) values (
    v_order_id, p_restaurant_id, v_table.id, p_table_number, v_order_number, p_idempotency_key, p_tracking_token_hash,
    p_customer_name, p_customer_phone, v_subtotal, v_cgst, v_sgst, v_gst, v_service_charge, v_total,
    p_payment_method, 'pending', p_order_notes,
    jsonb_build_array(jsonb_build_object('stage', 'received', 'timestamp', now()))
  );
  insert into public.payments(restaurant_id, order_id, amount, payment_method, payment_status)
  values (p_restaurant_id, v_order_id, v_total, p_payment_method, 'pending');
  update public.restaurant_tables set status = 'occupied' where id = v_table.id;
  return v_order_id;
end;
$$;

create or replace function public.update_order_status(
  p_order_id uuid,
  p_restaurant_id uuid,
  p_status text,
  p_staff_id uuid,
  p_reason text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_role text;
  v_allowed boolean := false;
begin
  select * into v_order from public.orders where id = p_order_id and restaurant_id = p_restaurant_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'Order not found'; end if;
  select role into v_role from public.staff where id = p_staff_id and restaurant_id = p_restaurant_id and is_active = true;
  if v_role is null then raise exception using errcode = 'P0001', message = 'Staff account is inactive'; end if;
  if v_order.status = p_status then return; end if;

  if v_role in ('restaurant_admin', 'manager') then
    v_allowed := (v_order.status, p_status) in (
      ('pending', 'confirmed'), ('pending', 'cancelled'),
      ('confirmed', 'preparing'), ('confirmed', 'cancelled'),
      ('preparing', 'ready'), ('preparing', 'cancelled'),
      ('ready', 'served'), ('ready', 'cancelled'),
      ('served', 'completed')
    );
  elsif v_role = 'chef' then
    v_allowed := (v_order.status, p_status) in (('confirmed', 'preparing'), ('preparing', 'ready'));
  elsif v_role = 'waiter' then
    v_allowed := (v_order.status, p_status) in (('ready', 'served'), ('served', 'completed'));
  end if;
  if not v_allowed then
    raise exception using errcode = 'P0001', message = 'Invalid order status transition for this staff role';
  end if;

  update public.orders
    set status = p_status,
        cancellation_reason = case when p_status = 'cancelled' then p_reason else cancellation_reason end,
        status_timeline = coalesce(status_timeline, '[]'::jsonb) ||
          jsonb_build_array(jsonb_build_object('stage', case p_status when 'pending' then 'received' when 'confirmed' then 'accepted' else p_status end, 'timestamp', now()))
    where id = p_order_id;

  if p_status in ('completed', 'cancelled') and not exists (
    select 1 from public.orders
    where table_id = v_order.table_id and id <> p_order_id
      and status not in ('completed', 'cancelled')
  ) then
    update public.restaurant_tables set status = 'available' where id = v_order.table_id;
  end if;
end;
$$;

create or replace function public.create_service_request(
  p_restaurant_id uuid,
  p_table_number integer,
  p_request_type text,
  p_order_id uuid default null,
  p_message text default null,
  p_payment_preference text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_table public.restaurant_tables%rowtype;
  v_id uuid := gen_random_uuid();
begin
  select * into v_table from public.restaurant_tables
    where restaurant_id = p_restaurant_id and table_number = p_table_number and status <> 'inactive';
  if not found then raise exception using errcode = 'P0001', message = 'Table not found'; end if;
  if p_request_type not in ('waiter', 'bill', 'water', 'assistance', 'other') then
    raise exception using errcode = 'P0001', message = 'Invalid service request type';
  end if;
  if p_order_id is not null and not exists (
    select 1 from public.orders where id = p_order_id and restaurant_id = p_restaurant_id and table_id = v_table.id
  ) then
    raise exception using errcode = 'P0001', message = 'Order does not belong to this table';
  end if;
  insert into public.service_requests(id, restaurant_id, table_id, table_number, order_id, request_type, message, payment_preference)
  values (v_id, p_restaurant_id, v_table.id, p_table_number, p_order_id, p_request_type, p_message, p_payment_preference);
  return v_id;
end;
$$;

create or replace function public.update_payment_status(
  p_payment_id uuid,
  p_restaurant_id uuid,
  p_status text,
  p_transaction_reference text
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_payment public.payments%rowtype;
begin
  select * into v_payment from public.payments
    where id = p_payment_id and restaurant_id = p_restaurant_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'Payment not found'; end if;
  if v_payment.payment_status in ('completed', 'refunded') and p_status not in (v_payment.payment_status, 'refunded') then
    raise exception using errcode = 'P0001', message = 'Invalid payment status transition';
  end if;
  update public.payments
    set payment_status = p_status, transaction_reference = coalesce(p_transaction_reference, transaction_reference)
    where id = p_payment_id;
  update public.orders
    set payment_status = p_status
    where id = v_payment.order_id and restaurant_id = p_restaurant_id;
end;
$$;

create or replace function public.set_staff_active(
  p_staff_id uuid,
  p_restaurant_id uuid,
  p_is_active boolean
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id from public.staff
    where id = p_staff_id and restaurant_id = p_restaurant_id for update;
  if v_user_id is null then raise exception using errcode = 'P0001', message = 'Staff member not found'; end if;
  update public.staff set is_active = p_is_active where id = p_staff_id;
  update public.users set is_active = p_is_active where id = v_user_id;
end;
$$;

alter table public.restaurants enable row level security;
alter table public.users enable row level security;
alter table public.staff enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.service_requests enable row level security;

create policy "Public can view active restaurants" on public.restaurants for select
using (is_active = true);
create policy "Staff can view assigned restaurant" on public.restaurants for select to authenticated
using (id = any(public.staff_restaurant_ids()));
create policy "Public can view table availability" on public.restaurant_tables for select
using (status <> 'inactive' and exists (select 1 from public.restaurants r where r.id = restaurant_id and r.is_active));
create policy "Staff can view tenant tables" on public.restaurant_tables for select to authenticated
using (restaurant_id = any(public.staff_restaurant_ids()));
create policy "Public can view visible categories" on public.categories for select
using (active and is_visible and exists (select 1 from public.restaurants r where r.id = restaurant_id and r.is_active));
create policy "Staff can view tenant categories" on public.categories for select to authenticated
using (restaurant_id = any(public.staff_restaurant_ids()));
create policy "Public can view available menu" on public.menu_items for select
using (available and exists (select 1 from public.restaurants r where r.id = restaurant_id and r.is_active));
create policy "Staff can view tenant menu" on public.menu_items for select to authenticated
using (restaurant_id = any(public.staff_restaurant_ids()));
create policy "Staff can view tenant orders" on public.orders for select to authenticated
using (restaurant_id = any(public.staff_restaurant_ids()));
create policy "Staff can view tenant order items" on public.order_items for select to authenticated
using (exists (select 1 from public.orders o where o.id = order_id and o.restaurant_id = any(public.staff_restaurant_ids())));
create policy "Staff can view tenant payments" on public.payments for select to authenticated
using (restaurant_id = any(public.staff_restaurant_ids()));
create policy "Staff can view tenant requests" on public.service_requests for select to authenticated
using (restaurant_id = any(public.staff_restaurant_ids()));
create policy "Users can view own profile" on public.users for select to authenticated
using (id = auth.uid());
create policy "Staff can view same-tenant staff" on public.staff for select to authenticated
using (restaurant_id = any(public.staff_restaurant_ids()));

revoke select on public.restaurants from public, anon, authenticated;
grant select (id, slug, name, description, address, phone, email, logo_url, opening_hours, tax_percentage, is_active, currency, timezone)
  on public.restaurants to anon, authenticated;

revoke all on function public.create_order(uuid, integer, text, jsonb, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.update_order_status(uuid, uuid, text, uuid, text) from public, anon, authenticated;
revoke all on function public.create_service_request(uuid, integer, text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.update_payment_status(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.set_staff_active(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.create_order(uuid, integer, text, jsonb, text, text, text, text, text) to service_role;
grant execute on function public.update_order_status(uuid, uuid, text, uuid, text) to service_role;
grant execute on function public.create_service_request(uuid, integer, text, uuid, text, text) to service_role;
grant execute on function public.update_payment_status(uuid, uuid, text, text) to service_role;
grant execute on function public.set_staff_active(uuid, uuid, boolean) to service_role;

alter table public.orders replica identity full;
alter table public.restaurant_tables replica identity full;
alter table public.service_requests replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders') then
      alter publication supabase_realtime add table public.orders;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'restaurant_tables') then
      alter publication supabase_realtime add table public.restaurant_tables;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'service_requests') then
      alter publication supabase_realtime add table public.service_requests;
    end if;
  end if;
end;
$$;
