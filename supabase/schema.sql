-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create 'leads' table
create table if not exists leads (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  name text not null,
  email text,
  phone text,
  source text,
  tag text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for 'leads'
alter table leads enable row level security;

create policy "Users can view their own leads" on leads
  for select using (auth.uid() = user_id);

create policy "Users can insert their own leads" on leads
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own leads" on leads
  for update using (auth.uid() = user_id);

create policy "Users can delete their own leads" on leads
  for delete using (auth.uid() = user_id);


-- Create 'subscriptions' table (Mock/Simulated structure)
-- In a real scenario, this might sync with Stripe via webhooks
create table if not exists subscriptions (
  user_id uuid references auth.users(id) primary key,
  status text not null check (status in ('active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid')),
  plan text not null check (plan in ('start', 'pro', 'master')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for 'subscriptions'
alter table subscriptions enable row level security;

create policy "Users can view their own subscription" on subscriptions
  for select using (auth.uid() = user_id);

-- Only service role should insert/update subscriptions mainly, but for mock purposes:
create policy "Users can insert their own subscription (Mock)" on subscriptions
  for insert with check (auth.uid() = user_id);
  
-- Create 'customers' table
create table if not exists customers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  name text not null,
  email text,
  phone text,
  cpf text,
  points_balance integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table customers enable row level security;
create policy "Users can manage their own customers" on customers
  for all using (auth.uid() = user_id);

-- Create 'rewards' table
create table if not exists rewards (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  title text not null,
  description text,
  points_required integer not null,
  is_active boolean default true,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table rewards enable row level security;
create policy "Users can manage their own rewards" on rewards
  for all using (auth.uid() = user_id);

-- Create 'loyalty_configs' table
create table if not exists loyalty_configs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null unique,
  points_per_real numeric default 1.0,
  min_points_to_redeem integer default 100,
  double_points_active boolean default false,
  whatsapp_template text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table loyalty_configs enable row level security;
create policy "Users can manage their own configs" on loyalty_configs
  for all using (auth.uid() = user_id);

-- Create 'loyalty_transactions' table
create table if not exists loyalty_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  customer_id uuid references customers(id) not null,
  type text check (type in ('earn', 'redeem')),
  points integer not null,
  sale_amount numeric,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table loyalty_transactions enable row level security;
create policy "Users can view their own transactions" on loyalty_transactions
  for select using (auth.uid() = user_id);
create policy "Users can insert their own transactions" on loyalty_transactions
  for insert with check (auth.uid() = user_id);

-- Create 'company_groups' table
create table if not exists company_groups (
  id uuid primary key default uuid_generate_v4(),
  mall_id uuid references auth.users(id) not null,
  store_id uuid references auth.users(id) not null,
  status text check (status in ('pending', 'accepted', 'rejected')) default 'pending',
  double_points boolean default false,
  event_start_date timestamp with time zone,
  event_end_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table company_groups enable row level security;
create policy "Users can view groups they are part of" on company_groups
  for select using (auth.uid() = store_id or auth.uid() = mall_id);
create policy "Malls can manage their groups" on company_groups
  for all using (auth.uid() = mall_id);


-- Function to handle new user signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.subscriptions (user_id, status, plan)
  values (new.id, 'active', 'start');
  
  -- Create default loyalty config
  insert into public.loyalty_configs (user_id, points_per_real, min_points_to_redeem)
  values (new.id, 1.0, 100);
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call handle_new_user on signup
-- create trigger on_auth_user_created
--   after insert on auth.users
--   for each row execute procedure public.handle_new_user();

