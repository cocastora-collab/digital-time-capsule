create extension if not exists pgcrypto;

create table if not exists public.capsule_messages (
  id uuid primary key default gen_random_uuid(),
  message text not null check (char_length(message) between 5 and 1000),
  nickname text check (nickname is null or char_length(nickname) <= 40),
  anonymous boolean not null default false,
  consent_to_publish boolean not null default false,
  payment_id text not null unique,
  order_id text not null,
  amount_paise integer not null check (amount_paise = 1000),
  status text not null default 'pending_review' check (status in ('pending_review','approved','rejected')),
  created_at timestamptz not null default now()
);

alter table public.capsule_messages enable row level security;
-- No public SELECT/INSERT policies: all access goes through server routes using the service-role key.
revoke all on public.capsule_messages from anon, authenticated;

create index if not exists capsule_messages_status_created_idx
on public.capsule_messages(status, created_at);

-- Optional public aggregate view. It reveals only a count, never message content.
create or replace view public.capsule_public_stats as
select count(*)::bigint as participants
from public.capsule_messages
where status in ('pending_review','approved');

create table if not exists public.pending_submissions (
  token uuid primary key,
  message text not null check (char_length(message) between 5 and 1000),
  nickname text check (nickname is null or char_length(nickname) <= 40),
  anonymous boolean not null default false,
  consent boolean not null default false,
  order_id text unique,
  created_at timestamptz not null default now()
);
alter table public.pending_submissions enable row level security;
revoke all on public.pending_submissions from anon, authenticated;
