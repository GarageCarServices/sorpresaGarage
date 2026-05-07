create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  email text primary key,
  created_at timestamptz not null default now(),
  constraint admin_users_email_lower check (email = lower(email))
);

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  active boolean not null default true,
  used_at timestamptz,
  used_by_user_id uuid references auth.users (id),
  used_by_email text,
  claim_id uuid unique,
  created_at timestamptz not null default now(),
  constraint promo_codes_code_upper check (code = upper(code))
);

create table if not exists public.promotion_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete cascade,
  email text not null,
  email_normalized text,
  first_name text not null,
  last_name text not null,
  dui text not null,
  dui_normalized text not null unique,
  whatsapp_phone text,
  claimed_code text not null,
  promo_code_id uuid not null unique references public.promo_codes (id),
  terms_accepted_at timestamptz not null default now(),
  notification_sent_at timestamptz,
  redeemed_at timestamptz,
  redeemed_by_email text,
  created_at timestamptz not null default now()
);

alter table public.promotion_claims
  alter column user_id drop not null;

alter table public.promotion_claims
  add column if not exists email_normalized text;

alter table public.promotion_claims
  add column if not exists notification_sent_at timestamptz;

alter table public.promotion_claims
  add column if not exists whatsapp_phone text;

alter table public.promotion_claims
  drop constraint if exists promotion_claims_whatsapp_phone_format;

alter table public.promotion_claims
  add constraint promotion_claims_whatsapp_phone_format
  check (whatsapp_phone is null or whatsapp_phone ~ '^503[567][0-9]{7}$');

alter table public.promo_codes
  drop constraint if exists promo_codes_claim_id_fkey;

alter table public.promo_codes
  add constraint promo_codes_claim_id_fkey
  foreign key (claim_id)
  references public.promotion_claims (id)
  on delete set null;

create or replace function public.current_user_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where email = public.current_user_email()
  );
$$;

drop function if exists public.claim_promotion(text, text, text, text);
drop function if exists public.claim_promotion(text, text, text, text, text);

create or replace function public.claim_promotion(
  p_first_name text,
  p_last_name text,
  p_dui text,
  p_whatsapp_phone text,
  p_email text,
  p_code text
)
returns public.promotion_claims
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code public.promo_codes%rowtype;
  v_claim public.promotion_claims%rowtype;
  v_dui_digits text := regexp_replace(trim(coalesce(p_dui, '')), '\D', '', 'g');
  v_dui_formatted text;
  v_whatsapp_digits text := regexp_replace(trim(coalesce(p_whatsapp_phone, '')), '\D', '', 'g');
  v_whatsapp_canonical text;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_code_normalized text := upper(trim(coalesce(p_code, '')));
  v_registration_deadline constant timestamptz := timestamptz '2026-05-16 23:59:59-06';
begin
  if now() > v_registration_deadline then
    raise exception 'REGISTRATION_CLOSED';
  end if;

  if length(trim(coalesce(p_first_name, ''))) = 0 or length(trim(coalesce(p_last_name, ''))) = 0 then
    raise exception 'NAME_REQUIRED';
  end if;

  if length(v_dui_digits) <> 9 then
    raise exception 'INVALID_DUI';
  end if;

  if v_email = '' or v_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' then
    raise exception 'INVALID_EMAIL';
  end if;

  if v_whatsapp_digits !~ '^[567][0-9]{7}$' then
    raise exception 'INVALID_WHATSAPP';
  end if;

  if v_code_normalized = '' then
    raise exception 'INVALID_CODE';
  end if;

  if exists (
    select 1
    from public.promotion_claims
    where dui_normalized = v_dui_digits
  ) then
    raise exception 'DUI_ALREADY_REGISTERED';
  end if;

  select *
  into v_code
  from public.promo_codes
  where code = v_code_normalized
    and active = true
  for update;

  if not found then
    raise exception 'INVALID_CODE';
  end if;

  if v_code.used_at is not null then
    raise exception 'CODE_ALREADY_USED';
  end if;

  v_dui_formatted := substring(v_dui_digits from 1 for 8) || '-' || substring(v_dui_digits from 9 for 1);
  v_whatsapp_canonical := '503' || v_whatsapp_digits;

  insert into public.promotion_claims (
    email,
    email_normalized,
    first_name,
    last_name,
    dui,
    dui_normalized,
    whatsapp_phone,
    claimed_code,
    promo_code_id
  )
  values (
    v_email,
    v_email,
    trim(p_first_name),
    trim(p_last_name),
    v_dui_formatted,
    v_dui_digits,
    v_whatsapp_canonical,
    v_code_normalized,
    v_code.id
  )
  returning *
  into v_claim;

  update public.promo_codes
  set
    used_at = now(),
    used_by_email = v_email,
    claim_id = v_claim.id
  where id = v_code.id;

  return v_claim;
end;
$$;

create or replace function public.validate_promo_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code public.promo_codes%rowtype;
  v_code_normalized text := upper(trim(coalesce(p_code, '')));
  v_registration_deadline constant timestamptz := timestamptz '2026-05-16 23:59:59-06';
begin
  if v_code_normalized = '' then
    return jsonb_build_object(
      'available', false,
      'reason', 'missing_code',
      'message', 'Ingresa un codigo valido.'
    );
  end if;

  select *
  into v_code
  from public.promo_codes
  where code = v_code_normalized
    and active = true;

  if not found then
    return jsonb_build_object(
      'available', false,
      'reason', 'invalid_code',
      'message', 'Ese QR no corresponde a una promocion activa.'
    );
  end if;

  if v_code.used_at is not null then
    return jsonb_build_object(
      'available', false,
      'reason', 'already_used',
      'message', 'Este QR ya fue registrado anteriormente.'
    );
  end if;

  if now() > v_registration_deadline then
    return jsonb_build_object(
      'available', false,
      'reason', 'registration_closed',
      'message', 'El periodo de registro ya finalizo.'
    );
  end if;

  return jsonb_build_object(
    'available', true,
    'reason', 'available',
    'message', 'Codigo valido. Ya puedes completar tus datos.',
    'code', v_code_normalized
  );
end;
$$;

create or replace function public.redeem_promotion(p_claim_id uuid)
returns public.promotion_claims
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim public.promotion_claims%rowtype;
  v_email text := public.current_user_email();
  v_redemption_deadline constant timestamptz := timestamptz '2026-05-31 23:59:59-06';
begin
  if not public.is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if now() > v_redemption_deadline then
    raise exception 'REDEMPTION_CLOSED';
  end if;

  select *
  into v_claim
  from public.promotion_claims
  where id = p_claim_id
  for update;

  if not found then
    raise exception 'CLAIM_NOT_FOUND';
  end if;

  if v_claim.redeemed_at is not null then
    raise exception 'CLAIM_ALREADY_REDEEMED';
  end if;

  update public.promotion_claims
  set
    redeemed_at = now(),
    redeemed_by_email = v_email
  where id = p_claim_id
  returning *
  into v_claim;

  return v_claim;
end;
$$;

alter table public.admin_users enable row level security;
alter table public.promo_codes enable row level security;
alter table public.promotion_claims enable row level security;

drop policy if exists "admins_can_view_themselves" on public.admin_users;
create policy "admins_can_view_themselves"
on public.admin_users
for select
to authenticated
using (email = public.current_user_email());

drop policy if exists "participants_or_admin_can_view_claims" on public.promotion_claims;
create policy "participants_or_admin_can_view_claims"
on public.promotion_claims
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

grant usage on schema public to authenticated, anon;
grant select on public.promotion_claims to authenticated;
grant select on public.admin_users to authenticated;
grant execute on function public.validate_promo_code(text) to authenticated, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.claim_promotion(text, text, text, text, text, text) to authenticated, anon;
grant execute on function public.redeem_promotion(uuid) to authenticated;
