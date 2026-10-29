create type public.app_role as enum ('admin','client');
create type public.tv_orientation as enum ('horizontal','vertical');
create type public.tv_activation_status as enum ('pendente','ativa','inativa','bloqueada');
create type public.record_status as enum ('ativo','inativo');

create or replace function public.update_updated_at_column() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- plans
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  max_tvs integer,
  default_reserved_percent integer not null default 20 check (default_reserved_percent between 0 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.plans to authenticated;
grant all on public.plans to service_role;
alter table public.plans enable row level security;

-- clients
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document text,
  contact_name text,
  contact_email text,
  phone text,
  city text,
  region text,
  status public.record_status not null default 'ativo',
  plan_id uuid references public.plans(id) on delete set null,
  plannet_reserved_percent integer not null default 20 check (plannet_reserved_percent between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.clients to authenticated;
grant all on public.clients to service_role;
alter table public.clients enable row level security;

create table public.client_members (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (client_id, user_id)
);
grant select, insert, delete on public.client_members to authenticated;
grant all on public.client_members to service_role;
alter table public.client_members enable row level security;

create or replace function public.is_client_member(_user_id uuid, _client_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.client_members where user_id = _user_id and client_id = _client_id)
$$;

-- establishments
create table public.establishments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  type text,
  address text,
  district text,
  city text,
  region text,
  status public.record_status not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.establishments(client_id);
grant select, insert, update, delete on public.establishments to authenticated;
grant all on public.establishments to service_role;
alter table public.establishments enable row level security;

create or replace function public.establishment_client(_establishment_id uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select client_id from public.establishments where id = _establishment_id
$$;

-- devices
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  name text not null,
  device_code text not null unique default ('TV-' || upper(substr(md5(gen_random_uuid()::text), 1, 8))),
  serial_number text,
  model text,
  orientation public.tv_orientation not null default 'horizontal',
  activation_status public.tv_activation_status not null default 'pendente',
  location_note text,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.devices(establishment_id);
grant select, insert, update, delete on public.devices to authenticated;
grant all on public.devices to service_role;
alter table public.devices enable row level security;

-- updated_at triggers
create trigger trg_profiles_updated before update on public.profiles for each row execute function public.update_updated_at_column();
create trigger trg_plans_updated before update on public.plans for each row execute function public.update_updated_at_column();
create trigger trg_clients_updated before update on public.clients for each row execute function public.update_updated_at_column();
create trigger trg_est_updated before update on public.establishments for each row execute function public.update_updated_at_column();
create trigger trg_devices_updated before update on public.devices for each row execute function public.update_updated_at_column();

-- only admins change plan / status / Plannet reserve
create or replace function public.protect_client_admin_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.has_role(auth.uid(), 'admin') then return new; end if;
  if new.plannet_reserved_percent is distinct from old.plannet_reserved_percent
     or new.plan_id is distinct from old.plan_id
     or new.status is distinct from old.status then
    raise exception 'Somente o administrador Plannet pode alterar plano, status ou reserva Plannet';
  end if;
  return new;
end $$;
create trigger trg_clients_protect before update on public.clients for each row execute function public.protect_client_admin_fields();

-- new user -> profile + client role (never admin)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  insert into public.user_roles (user_id, role) values (new.id, 'client');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- first admin: only runnable by the database owner (SQL Editor), never from the app
create or replace function public.promote_to_admin(_email text) returns void
language plpgsql security definer set search_path = public as $$
declare _uid uuid;
begin
  select id into _uid from auth.users where lower(email) = lower(_email);
  if _uid is null then raise exception 'Usuário % não encontrado', _email; end if;
  insert into public.user_roles (user_id, role) values (_uid, 'admin') on conflict do nothing;
end $$;
revoke all on function public.promote_to_admin(text) from public, anon, authenticated;

-- POLICIES
create policy "own profile or admin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "own roles or admin" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "plans readable" on public.plans for select to authenticated using (true);
create policy "admin manages plans" on public.plans for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "admin or member reads clients" on public.clients for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.is_client_member(auth.uid(), id));
create policy "admin creates clients" on public.clients for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));
create policy "admin or member updates clients" on public.clients for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.is_client_member(auth.uid(), id))
  with check (public.has_role(auth.uid(), 'admin') or public.is_client_member(auth.uid(), id));
create policy "admin deletes clients" on public.clients for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "admin or self reads members" on public.client_members for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "admin adds members" on public.client_members for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));
create policy "admin removes members" on public.client_members for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "read establishments" on public.establishments for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.is_client_member(auth.uid(), client_id));
create policy "create establishments" on public.establishments for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') or public.is_client_member(auth.uid(), client_id));
create policy "update establishments" on public.establishments for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.is_client_member(auth.uid(), client_id))
  with check (public.has_role(auth.uid(), 'admin') or public.is_client_member(auth.uid(), client_id));
create policy "admin deletes establishments" on public.establishments for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "read devices" on public.devices for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.is_client_member(auth.uid(), public.establishment_client(establishment_id)));
create policy "create devices" on public.devices for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') or public.is_client_member(auth.uid(), public.establishment_client(establishment_id)));
create policy "update devices" on public.devices for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.is_client_member(auth.uid(), public.establishment_client(establishment_id)))
  with check (public.has_role(auth.uid(), 'admin') or public.is_client_member(auth.uid(), public.establishment_client(establishment_id)));
create policy "admin deletes devices" on public.devices for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

insert into public.plans (name, description, max_tvs, default_reserved_percent) values
  ('Essencial', 'Plano de entrada para pequenos estabelecimentos', 3, 20),
  ('Parceiro', 'Plano para redes com múltiplas TVs', 20, 20);