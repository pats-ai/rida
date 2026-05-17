-- ═══════════════════════════════════════════════════════════
-- RIDA — Supabase Migration
-- Run this in your Supabase dashboard → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════

-- ── 1. PROFILES TABLE ──────────────────────────────────────
-- Stores every user's name, role, area, business name
-- Linked to Supabase Auth (auth.users)

create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  phone         text not null,
  full_name     text not null,
  role          text not null check (role in ('commuter', 'driver', 'business')),
  area          text,
  business_name text,
  created_at    timestamptz default now()
);

-- Enable Row Level Security
alter table profiles enable row level security;

-- Users can only read/write their own profile
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);


-- ── 2. RIDE REQUESTS TABLE ─────────────────────────────────
-- Handles both rides and deliveries

create table if not exists ride_requests (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade,
  driver_id        uuid references auth.users(id) on delete set null,

  -- Core fields
  pickup_location  text not null,
  dropoff_location text not null,
  status           text not null default 'pending'
                   check (status in ('pending','accepted','in_progress','completed','cancelled')),

  -- Type: ride or delivery
  type             text not null default 'ride'
                   check (type in ('ride', 'delivery')),

  -- Delivery-only fields
  recipient_name   text,
  recipient_phone  text,
  notes            text,
  proof_of_delivery text,   -- URL to photo once uploaded

  -- Driver info (written when driver accepts)
  driver_name      text,
  vehicle          text,
  plate            text,
  eta              text,

  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Enable Row Level Security
alter table ride_requests enable row level security;

-- Commuters/businesses see only their own requests
create policy "Users see own requests"
  on ride_requests for select
  using (auth.uid() = user_id or auth.uid() = driver_id);

-- Anyone logged in can see pending requests (so drivers can accept)
create policy "Drivers see pending requests"
  on ride_requests for select
  using (status = 'pending');

-- Users can create their own requests
create policy "Users can create requests"
  on ride_requests for insert
  with check (auth.uid() = user_id);

-- Users can update their own, drivers can update ones they're assigned to
create policy "Users and drivers can update"
  on ride_requests for update
  using (auth.uid() = user_id or auth.uid() = driver_id or status = 'pending');

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger ride_requests_updated_at
  before update on ride_requests
  for each row execute function update_updated_at();


-- ── 3. ENABLE REALTIME ─────────────────────────────────────
-- Lets the app receive live updates without polling

alter publication supabase_realtime add table ride_requests;
alter publication supabase_realtime add table profiles;


-- ── 4. PHONE AUTH SETUP NOTE ───────────────────────────────
-- After running this SQL, go to:
-- Supabase Dashboard → Authentication → Providers → Phone
-- Enable Phone and add your Twilio credentials
-- (or use "Test OTP: 000000" in dev mode — no Twilio needed)

-- ── Done ───────────────────────────────────────────────────
-- Tables: profiles, ride_requests
-- RLS: enabled on both
-- Realtime: enabled on both
