-- Встроенный чат покупатель ↔ магазин. Выполнить один раз в Supabase → SQL Editor.
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  product_id bigint,
  product_name text not null default '',
  subject text not null default 'Сообщение магазину',
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create index if not exists conversations_customer_recent_idx on public.conversations(customer_id,last_message_at desc);
alter table public.conversations add column if not exists product_price text not null default '';
alter table public.conversations add column if not exists customer_name text not null default '';
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id,created_at);

create or replace function public.is_shop_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'); $$;
grant execute on function public.is_shop_admin() to authenticated;

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
drop policy if exists "chat read own conversations or admin" on public.conversations;
create policy "chat read own conversations or admin" on public.conversations for select to authenticated
using (customer_id=auth.uid() or public.is_shop_admin());
drop policy if exists "chat create own conversation" on public.conversations;
create policy "chat create own conversation" on public.conversations for insert to authenticated
with check (customer_id=auth.uid());
drop policy if exists "chat update own conversation or admin" on public.conversations;
create policy "chat update own conversation or admin" on public.conversations for update to authenticated
using (customer_id=auth.uid() or public.is_shop_admin()) with check (customer_id=auth.uid() or public.is_shop_admin());
drop policy if exists "chat read messages in allowed conversations" on public.messages;
create policy "chat read messages in allowed conversations" on public.messages for select to authenticated
using (exists(select 1 from public.conversations c where c.id=conversation_id and (c.customer_id=auth.uid() or public.is_shop_admin())));
drop policy if exists "chat send messages in allowed conversations" on public.messages;
create policy "chat send messages in allowed conversations" on public.messages for insert to authenticated
with check (sender_id=auth.uid() and exists(select 1 from public.conversations c where c.id=conversation_id and (c.customer_id=auth.uid() or public.is_shop_admin())));
drop policy if exists "chat mark received messages read" on public.messages;
create policy "chat mark received messages read" on public.messages for update to authenticated
using (sender_id<>auth.uid() and exists(select 1 from public.conversations c where c.id=conversation_id and (c.customer_id=auth.uid() or public.is_shop_admin())))
with check (sender_id<>auth.uid() and exists(select 1 from public.conversations c where c.id=conversation_id and (c.customer_id=auth.uid() or public.is_shop_admin())));

-- Для обновлений в реальном времени включите messages в Supabase → Database → Publications → supabase_realtime.

-- Подписки для push-уведомлений на компьютере/телефоне.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  unique(user_id, subscription)
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "users manage own push subscriptions" on public.push_subscriptions;
create policy "users manage own push subscriptions" on public.push_subscriptions for all to authenticated
using (user_id=auth.uid()) with check (user_id=auth.uid());
