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
  
-- Function to handle new user signup (Optional: create default subscription?)
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.subscriptions (user_id, status, plan)
  values (new.id, 'active', 'start'); -- Default to active start plan for testing
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call handle_new_user on signup
-- Uncomment to enable auto-subscription creation
-- create trigger on_auth_user_created
--   after insert on auth.users
--   for each row execute procedure public.handle_new_user();
