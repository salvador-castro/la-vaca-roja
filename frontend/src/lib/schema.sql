-- ================================================
-- LA VACA ROJA — Supabase Schema
-- Ejecutar en el SQL Editor de Supabase
-- ================================================

-- ================================================
-- PROFILES (extiende auth.users con rol)
-- ================================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  role text not null default 'cliente' check (role in ('admin', 'cliente')),
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Admin full access to profiles"
  on profiles for all using (
    exists (select 1 from profiles p2 where p2.id = auth.uid() and p2.role = 'admin')
  );

-- ================================================
-- PRODUCTS
-- ================================================
create table if not exists public.products (
  id bigserial primary key,
  name text not null,
  category text not null,
  description text,
  price numeric(10,2) not null,
  stock integer not null default 0,
  image_url text,
  badge text check (badge in ('premium', 'promo', 'new') or badge is null),
  unit text default 'kg',
  has_variants boolean default false,
  active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "Anyone can view active products"
  on products for select using (active = true);

create policy "Admin can manage products"
  on products for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ================================================
-- PRODUCT VARIANTS (fino / medio / grueso)
-- ================================================
create table if not exists public.product_variants (
  id bigserial primary key,
  product_id bigint references products on delete cascade not null,
  name text not null,
  price_modifier numeric(10,2) default 0,
  active boolean default true
);

alter table public.product_variants enable row level security;

create policy "Anyone can view active variants"
  on product_variants for select using (
    active = true
    and exists (select 1 from products where id = product_id and active = true)
  );

create policy "Admin can manage variants"
  on product_variants for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ================================================
-- PROMOTIONS (descuentos de bancos)
-- ================================================
create table if not exists public.promotions (
  id bigserial primary key,
  title text not null,
  description text,
  bank_name text,
  bank_abbr text,
  bank_color text default '#c8102e',
  discount_percentage integer not null,
  deal_text text,
  day_name text,
  active boolean default true,
  created_at timestamptz not null default now()
);

alter table public.promotions enable row level security;

create policy "Anyone can view active promotions"
  on promotions for select using (active = true);

create policy "Admin can manage promotions"
  on promotions for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ================================================
-- COUPONS (códigos de descuento)
-- ================================================
create table if not exists public.coupons (
  id bigserial primary key,
  code text unique not null,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(10,2) not null,
  min_order_amount numeric(10,2) default 0,
  max_uses integer,
  uses_count integer default 0,
  expires_at timestamptz,
  active boolean default true,
  created_at timestamptz not null default now()
);

alter table public.coupons enable row level security;

create policy "Anyone can read active coupons for validation"
  on coupons for select using (active = true);

create policy "Admin can manage coupons"
  on coupons for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ================================================
-- ORDERS (pedidos)
-- ================================================
create table if not exists public.orders (
  id bigserial primary key,
  user_id uuid references auth.users not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'preparing', 'shipping', 'delivered', 'cancelled')),
  subtotal numeric(10,2) not null default 0,
  coupon_discount numeric(10,2) default 0,
  total numeric(10,2) not null,
  coupon_id bigint references coupons,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders enable row level security;

create policy "Users can view own orders"
  on orders for select using (auth.uid() = user_id);

create policy "Users can create own orders"
  on orders for insert with check (auth.uid() = user_id);

create policy "Users can update own orders"
  on orders for update using (auth.uid() = user_id);

create policy "Admin can manage all orders"
  on orders for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ================================================
-- ORDER ITEMS (ítems de cada pedido)
-- ================================================
create table if not exists public.order_items (
  id bigserial primary key,
  order_id bigint references orders on delete cascade not null,
  product_id bigint references products,
  product_name text not null,
  variant_name text,
  quantity numeric(10,3) not null,
  unit_price numeric(10,2) not null,
  line_total numeric(10,2) not null
);

alter table public.order_items enable row level security;

create policy "Users can view own order items"
  on order_items for select using (
    exists (select 1 from orders where id = order_id and user_id = auth.uid())
  );

create policy "Users can insert own order items"
  on order_items for insert with check (
    exists (select 1 from orders where id = order_id and user_id = auth.uid())
  );

create policy "Admin can manage all order items"
  on order_items for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ================================================
-- GRANTS (necesarios cuando se crea via SQL editor)
-- ================================================
grant usage on schema public to authenticated, anon;

grant all on public.orders to authenticated;
grant all on public.order_items to authenticated;
grant usage, select on sequence public.orders_id_seq to authenticated;
grant usage, select on sequence public.order_items_id_seq to authenticated;

-- ================================================
-- TRIGGER: Crear perfil automático al registrarse
-- ================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ================================================
-- STORAGE: Bucket productos (imágenes de productos)
-- ================================================

-- Crear el bucket si no existe (público = URLs accesibles sin auth)
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict do nothing;

-- Lectura pública (para mostrar las imágenes en el frontend)
create policy "Public can view productos"
  on storage.objects for select
  using (bucket_id = 'productos');

-- Sólo admin puede subir archivos
create policy "Admin can upload to productos"
  on storage.objects for insert
  with check (
    bucket_id = 'productos'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Sólo admin puede actualizar archivos
create policy "Admin can update productos"
  on storage.objects for update
  using (
    bucket_id = 'productos'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Sólo admin puede eliminar archivos
create policy "Admin can delete from productos"
  on storage.objects for delete
  using (
    bucket_id = 'productos'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ================================================
-- SEED: Promociones iniciales de bancos
-- ================================================
insert into public.promotions (title, bank_name, bank_abbr, bank_color, discount_percentage, deal_text, day_name) values
  ('40% OFF todos los martes', 'Banco Galicia', 'GAL', '#c8102e', 40, 'Visa y Mastercard', 'Martes'),
  ('25% OFF los miércoles', 'BBVA', 'BBVA', '#004a9f', 25, 'Tarjeta BBVA', 'Miércoles'),
  ('30% OFF los viernes', 'Santander', 'SAN', '#ec0000', 30, 'Visa y Debit Select', 'Viernes'),
  ('20% OFF los jueves', 'Banco Macro', 'MCR', '#f5a623', 20, 'Todas las tarjetas', 'Jueves'),
  ('35% OFF los lunes', 'Banco Nación', 'BNA', '#2d5fa6', 35, 'Débito BNA', 'Lunes'),
  ('15% OFF los sábados', 'ICBC', 'ICBC', '#cc0000', 15, 'Tarjetas ICBC', 'Sábados')
on conflict do nothing;
