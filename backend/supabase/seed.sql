insert into public.restaurants (
  name, slug, description, address, phone, email, opening_hours, wifi_ssid, wifi_password,
  tax_percentage, service_charge_percentage, currency, timezone, is_active
) values (
  'The Olive & Ember',
  'olive-and-ember',
  'Wood-fired Mediterranean and contemporary dining in Bengaluru.',
  '14, Wood Street, 100ft Road, Downtown Heritage District, Bengaluru, Karnataka 560038',
  '+91 98765 43210',
  'concierge@oliveandember.com',
  '{"daily":"12:00 PM – 11:30 PM","lunch":"12:00 PM – 04:00 PM","dinner":"06:30 PM – 11:30 PM"}'::jsonb,
  'OliveGuest',
  'welcome2026',
  5.00,
  5.00,
  'INR',
  'Asia/Kolkata',
  true
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  address = excluded.address,
  phone = excluded.phone,
  email = excluded.email,
  opening_hours = excluded.opening_hours,
  wifi_ssid = excluded.wifi_ssid,
  wifi_password = excluded.wifi_password,
  tax_percentage = excluded.tax_percentage,
  service_charge_percentage = excluded.service_charge_percentage,
  currency = excluded.currency,
  timezone = excluded.timezone,
  is_active = excluded.is_active;

insert into public.categories (restaurant_id, name, description, sort_order, active, is_visible)
select r.id, c.name, c.description, c.sort_order, true, true
from public.restaurants r
cross join (values
  ('Starters', 'Small plates and wood-fired appetizers', 1),
  ('Main Course', 'Slow-roasted meats and ember specialties', 2),
  ('Pizza & Pasta', 'Hand-stretched sourdough and fresh pasta', 3),
  ('Beverages', 'Artisanal drinks and slow brews', 4),
  ('Desserts', 'Desserts from the pastry kitchen', 5)
) as c(name, description, sort_order)
where r.slug = 'olive-and-ember'
on conflict (restaurant_id, name) do update set
  description = excluded.description,
  sort_order = excluded.sort_order,
  active = true,
  is_visible = true;

insert into public.restaurant_tables (restaurant_id, table_number, capacity, zone, status)
select r.id, t.table_number, t.capacity, t.zone, 'available'
from public.restaurants r
cross join generate_series(1, 20) as t(table_number)
cross join lateral (
  select case
    when t.table_number <= 8 then 'Main Dining'
    when t.table_number <= 14 then 'Garden Alfresco'
    else 'Terrace Lounge'
  end as zone,
  case
    when t.table_number in (1, 2, 8, 11, 15, 19) then 2
    when t.table_number in (6, 12, 18) then 6
    when t.table_number = 14 then 8
    else 4
  end as capacity
) details
where r.slug = 'olive-and-ember'
on conflict (restaurant_id, table_number) do nothing;

insert into public.menu_items (
  restaurant_id, category_id, name, description, price, image_url, food_type,
  dietary_tags, available, popular, chef_special, preparation_time_minutes, addons, sort_order
)
select r.id, c.id, item.name, item.description, item.price, item.image_url, item.food_type,
  item.dietary_tags, true, item.popular, item.chef_special, item.preparation_time_minutes, item.addons, item.sort_order
from public.restaurants r
join (values
  ('Starters', 'Truffle & Wild Mushroom Arancini', 'Crispy rice croquettes with wild mushrooms and truffle emulsion.', 425.00, 'https://images.unsplash.com/photo-1541529086526-db283c563270?w=900&q=80', 'veg', array['vegetarian']::text[], true, true, 16, '[{"id":"sharing","name":"Sharing Plate","price":180}]'::jsonb, 1),
  ('Starters', 'Ember Smoked Chicken Skewers', 'Charcoal-grilled chicken with lemon-tahini crema.', 545.00, 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=900&q=80', 'non_veg', array[]::text[], true, false, 20, '[{"id":"extra-skewer","name":"Extra Skewer","price":120}]'::jsonb, 2),
  ('Main Course', 'Slow-Braised Rosemary Lamb Shank', 'Slow-braised lamb with rosemary jus and seasonal vegetables.', 895.00, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=900&q=80', 'non_veg', array[]::text[], true, true, 35, '[]'::jsonb, 1),
  ('Pizza & Pasta', 'Wood-Fired Margherita', 'San Marzano tomato, fior di latte, basil, and olive oil.', 595.00, 'https://images.unsplash.com/photo-1579751626657-72bc17010498?w=900&q=80', 'veg', array['vegetarian']::text[], true, false, 18, '[{"id":"extra-cheese","name":"Extra Cheese","price":90}]'::jsonb, 1),
  ('Beverages', 'Rosemary Citrus Cooler', 'A bright citrus cooler with rosemary and sparkling water.', 245.00, 'https://images.unsplash.com/photo-1513558161293-cdab4e7806f0?w=900&q=80', 'veg', array['vegetarian']::text[], true, false, 5, '[]'::jsonb, 1),
  ('Desserts', 'Dark Chocolate Fondant', 'Warm dark chocolate cake with vanilla bean gelato.', 395.00, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=900&q=80', 'veg', array['vegetarian']::text[], true, true, 14, '[]'::jsonb, 1)
) as item(category_name, name, description, price, image_url, food_type, dietary_tags, popular, chef_special, preparation_time_minutes, addons, sort_order)
  on true
join public.categories c on c.restaurant_id = r.id and c.name = item.category_name
where r.slug = 'olive-and-ember'
on conflict (restaurant_id, name) do nothing;
