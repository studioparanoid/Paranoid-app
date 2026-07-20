-- Email-based second factor: profile flag + short-lived one-time codes.
-- This table is only ever read/written by the server using the service role key;
-- no client-facing RLS policies are created on purpose (deny by default).

alter table public.profiles
  add column if not exists email_mfa_enabled boolean not null default false;

create table if not exists public.mfa_email_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  purpose text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  constraint mfa_email_codes_purpose_check check (purpose in ('enroll', 'login'))
);

create index if not exists mfa_email_codes_user_purpose_idx
  on public.mfa_email_codes(user_id, purpose, created_at desc);

alter table public.mfa_email_codes enable row level security;
