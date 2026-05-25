-- Callejeros / Stray-Wolfies — ejecutar en Supabase → SQL Editor → Run

-- Estado de la tienda (abrir/cerrar manual; los dueños mandan)
create table if not exists public.shop_settings (
  id int primary key default 1 check (id = 1),
  is_open boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.shop_settings (id, is_open)
values (1, false)
on conflict (id) do nothing;

-- Pedidos
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  customer_name text not null,
  customer_phone text not null,
  fulfillment text not null check (fulfillment in ('pickup', 'delivery')),
  delivery_address text,
  delivery_fee int not null default 0,
  timing text not null check (timing in ('asap', 'scheduled')),
  scheduled_time text,
  notes text,
  subtotal int not null,
  total int not null,
  status text not null default 'placed'
    check (status in ('placed', 'confirmed', 'preparing', 'ready', 'picked_up', 'cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  menu_item_id text not null,
  item_name text not null,
  quantity int not null default 1,
  modifier_labels text[] not null default '{}',
  line_total int not null
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);

-- RLS: lectura pública solo del estado de tienda; pedidos solo vía API con service role
alter table public.shop_settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_lines enable row level security;

create policy "shop_settings_read_anon"
  on public.shop_settings for select
  to anon, authenticated
  using (true);

-- Sin políticas de insert/update para anon en orders → el cliente usa tu API con service_role
