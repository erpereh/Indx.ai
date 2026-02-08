-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- TABLE: funds (Metadata)
create table if not exists funds (
    isin text primary key,
    name text,
    currency text,
    asset_type jsonb,
    sectors jsonb,
    regions jsonb,
    updated_at timestamp with time zone default now()
);

-- TABLE: fund_nav_history (Historical Prices)
create table if not exists fund_nav_history (
    id uuid primary key default uuid_generate_v4(),
    isin text references funds(isin) on delete cascade,
    nav_date date not null,
    price numeric not null,
    constraint unique_nav_entry unique(isin, nav_date)
);

-- Create index for faster history lookups
create index if not exists idx_fund_nav_history_isin_date on fund_nav_history(isin, nav_date);

-- TABLE: investments (User Portfolios)
create table if not exists investments (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users not null,
    isin text references funds(isin), -- Optional FK enforcement, usually good
    shares numeric not null default 0,
    total_investment numeric not null default 0,
    purchase_date date not null,
    created_at timestamp with time zone default now()
);

-- RLS: Security Policies
alter table investments enable row level security;

create policy "Users can view their own investments"
on investments for select
using (auth.uid() = user_id);

create policy "Users can insert their own investments"
on investments for insert
with check (auth.uid() = user_id);

create policy "Users can update their own investments"
on investments for update
using (auth.uid() = user_id);

create policy "Users can delete their own investments"
on investments for delete
using (auth.uid() = user_id);

-- Public read access for funds data (metadata and history)
alter table funds enable row level security;
create policy "Public funds access" on funds for select using (true);

alter table fund_nav_history enable row level security;
create policy "Public history access" on fund_nav_history for select using (true);
