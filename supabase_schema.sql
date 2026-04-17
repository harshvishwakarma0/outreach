-- Run this script in Supabase SQL Editor

create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_data (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  contacts jsonb not null default '[]'::jsonb,
  templates jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_app_users_email on public.app_users (email);
