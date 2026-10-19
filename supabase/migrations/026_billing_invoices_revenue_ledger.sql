-- AK PRIME — facturation, paiements et livre des recettes
-- Socle prêt avant branchement Stripe. Les factures ne peuvent être émises
-- que lorsque l'identité légale de facturation (adresse + SIREN/SIRET) est complète.

create table if not exists public.billing_settings (
  id smallint primary key default 1 check (id = 1),
  legal_name text not null,
  business_name text not null,
  legal_form text not null default 'Entrepreneur individuel',
  legal_address text,
  siren text,
  siret text,
  email text not null,
  website text,
  vat_exempt boolean not null default true,
  vat_number text,
  vat_mention text not null default 'TVA non applicable, art. 293 B du code général des impôts',
  operation_category text not null default 'Prestations de services',
  invoice_prefix text not null default 'AKP' check (invoice_prefix ~ '^[A-Z0-9-]{2,12}$'),
  next_invoice_sequence bigint not null default 1 check (next_invoice_sequence > 0),
  updated_at timestamptz not null default now()
);

insert into public.billing_settings (
  id, legal_name, business_name, legal_form, email, website
)
values (
  1, 'Alex Kieffer', 'AK PRIME', 'Entrepreneur individuel (micro-entrepreneur)',
  'contact@akprime.fr', 'akprime.fr'
)
on conflict (id) do nothing;

alter table public.billing_settings enable row level security;

revoke all on table public.billing_settings from anon, authenticated;
grant select, update on table public.billing_settings to authenticated;
grant select, insert, update, delete on table public.billing_settings to service_role;

drop policy if exists billing_settings_coach_read on public.billing_settings;
create policy billing_settings_coach_read
on public.billing_settings
for select
to authenticated
using ((select private.is_coach()));

drop policy if exists billing_settings_coach_update on public.billing_settings;
create policy billing_settings_coach_update
on public.billing_settings
for update
to authenticated
using ((select private.is_coach()))
with check ((select private.is_coach()));

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  enrollment_id uuid references public.enrollments(id) on delete set null,
  invoice_number text not null unique,
  issue_date date not null,
  service_date date not null,
  due_date date not null,
  customer_type text not null default 'individual'
    check (customer_type in ('individual','business')),
  customer_name text not null,
  customer_email text,
  customer_billing_address text,
  customer_siren text,
  customer_vat_number text,
  seller_legal_name text not null,
  seller_business_name text not null,
  seller_legal_form text not null,
  seller_address text not null,
  seller_siren text not null,
  seller_siret text not null,
  seller_email text not null,
  seller_vat_number text,
  operation_category text not null default 'Prestations de services',
  line_items jsonb not null check (jsonb_typeof(line_items) = 'array' and jsonb_array_length(line_items) > 0),
  amount_excl_tax_cents integer not null check (amount_excl_tax_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  amount_incl_tax_cents integer not null check (amount_incl_tax_cents >= 0),
  currency text not null default 'eur' check (currency = 'eur'),
  vat_exempt boolean not null default true,
  vat_mention text,
  payment_status text not null default 'pending'
    check (payment_status in ('pending','paid','partially_refunded','refunded')),
  paid_at timestamptz,
  pdf_storage_path text,
  pdf_generated_at timestamptz,
  source text not null default 'manual' check (source in ('manual','stripe','migration')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (amount_incl_tax_cents = amount_excl_tax_cents + tax_cents),
  check ((payment_status = 'paid' and paid_at is not null) or payment_status <> 'paid')
);

create index if not exists invoices_client_issue_idx
  on public.invoices (client_id, issue_date desc);
create index if not exists invoices_enrollment_id_idx
  on public.invoices (enrollment_id);
create index if not exists invoices_payment_status_idx
  on public.invoices (payment_status, issue_date desc);

alter table public.invoices enable row level security;

revoke all on table public.invoices from anon, authenticated;
grant select on table public.invoices to authenticated;
grant select, insert, update, delete on table public.invoices to service_role;

drop policy if exists invoices_read on public.invoices;
create policy invoices_read
on public.invoices
for select
to authenticated
using ((select private.can_access_client(client_id)));

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  invoice_id uuid references public.invoices(id) on delete restrict,
  enrollment_id uuid references public.enrollments(id) on delete set null,
  provider text not null default 'manual' check (provider in ('manual','stripe','bank','other')),
  provider_reference text,
  payment_method text not null check (payment_method in ('card','bank_transfer','cash','check','other')),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'eur' check (currency = 'eur'),
  status text not null check (status in ('pending','paid','failed','refunded')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  check ((status = 'paid' and paid_at is not null) or status <> 'paid')
);

create unique index if not exists payment_transactions_provider_ref_uidx
  on public.payment_transactions (provider, provider_reference)
  where provider_reference is not null;
create index if not exists payment_transactions_client_paid_idx
  on public.payment_transactions (client_id, paid_at desc);
create index if not exists payment_transactions_invoice_id_idx
  on public.payment_transactions (invoice_id);
create index if not exists payment_transactions_enrollment_id_idx
  on public.payment_transactions (enrollment_id);

alter table public.payment_transactions enable row level security;

revoke all on table public.payment_transactions from anon, authenticated;
grant select on table public.payment_transactions to authenticated;
grant select, insert, update, delete on table public.payment_transactions to service_role;

drop policy if exists payment_transactions_read on public.payment_transactions;
create policy payment_transactions_read
on public.payment_transactions
for select
to authenticated
using ((select private.can_access_client(client_id)));

create table if not exists public.revenue_entries (
  id bigint generated always as identity primary key,
  client_id uuid not null references public.clients(id) on delete restrict,
  invoice_id uuid references public.invoices(id) on delete restrict,
  payment_transaction_id uuid not null unique references public.payment_transactions(id) on delete restrict,
  receipt_date date not null,
  source_label text not null,
  description text not null,
  payment_method text not null check (payment_method in ('card','bank_transfer','cash','check','other')),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'eur' check (currency = 'eur'),
  created_at timestamptz not null default now()
);

create index if not exists revenue_entries_receipt_date_idx
  on public.revenue_entries (receipt_date desc, id desc);
create index if not exists revenue_entries_client_id_idx
  on public.revenue_entries (client_id);
create index if not exists revenue_entries_invoice_id_idx
  on public.revenue_entries (invoice_id);

alter table public.revenue_entries enable row level security;

revoke all on table public.revenue_entries from anon, authenticated;
grant select on table public.revenue_entries to authenticated;
grant select, insert on table public.revenue_entries to service_role;

drop policy if exists revenue_entries_coach_read on public.revenue_entries;
create policy revenue_entries_coach_read
on public.revenue_entries
for select
to authenticated
using ((select private.is_coach()));

create or replace function private.protect_invoice_core()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.client_id is distinct from old.client_id
    or new.enrollment_id is distinct from old.enrollment_id
    or new.invoice_number is distinct from old.invoice_number
    or new.issue_date is distinct from old.issue_date
    or new.service_date is distinct from old.service_date
    or new.due_date is distinct from old.due_date
    or new.customer_type is distinct from old.customer_type
    or new.customer_name is distinct from old.customer_name
    or new.customer_email is distinct from old.customer_email
    or new.customer_billing_address is distinct from old.customer_billing_address
    or new.customer_siren is distinct from old.customer_siren
    or new.customer_vat_number is distinct from old.customer_vat_number
    or new.seller_legal_name is distinct from old.seller_legal_name
    or new.seller_business_name is distinct from old.seller_business_name
    or new.seller_legal_form is distinct from old.seller_legal_form
    or new.seller_address is distinct from old.seller_address
    or new.seller_siren is distinct from old.seller_siren
    or new.seller_siret is distinct from old.seller_siret
    or new.seller_email is distinct from old.seller_email
    or new.seller_vat_number is distinct from old.seller_vat_number
    or new.operation_category is distinct from old.operation_category
    or new.line_items is distinct from old.line_items
    or new.amount_excl_tax_cents is distinct from old.amount_excl_tax_cents
    or new.tax_cents is distinct from old.tax_cents
    or new.amount_incl_tax_cents is distinct from old.amount_incl_tax_cents
    or new.currency is distinct from old.currency
    or new.vat_exempt is distinct from old.vat_exempt
    or new.vat_mention is distinct from old.vat_mention
    or new.source is distinct from old.source
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Une facture émise ne peut pas être modifiée. Utiliser un avoir pour toute correction.';
  end if;
  new.updated_at := now();
  return new;
end;
$function$;

revoke all on function private.protect_invoice_core() from public, anon, authenticated;

drop trigger if exists invoices_protect_core on public.invoices;
create trigger invoices_protect_core
before update on public.invoices
for each row execute function private.protect_invoice_core();

create or replace function private.prevent_invoice_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  raise exception 'Une facture émise ne peut pas être supprimée. Utiliser un avoir pour toute correction.';
end;
$function$;

revoke all on function private.prevent_invoice_delete() from public, anon, authenticated;

drop trigger if exists invoices_prevent_delete on public.invoices;
create trigger invoices_prevent_delete
before delete on public.invoices
for each row execute function private.prevent_invoice_delete();

create or replace function private.prevent_revenue_entry_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  raise exception 'Le livre des recettes est append-only : une écriture existante ne peut pas être modifiée ou supprimée.';
end;
$function$;

revoke all on function private.prevent_revenue_entry_mutation() from public, anon, authenticated;

drop trigger if exists revenue_entries_prevent_update on public.revenue_entries;
create trigger revenue_entries_prevent_update
before update on public.revenue_entries
for each row execute function private.prevent_revenue_entry_mutation();

drop trigger if exists revenue_entries_prevent_delete on public.revenue_entries;
create trigger revenue_entries_prevent_delete
before delete on public.revenue_entries
for each row execute function private.prevent_revenue_entry_mutation();

create or replace function private.record_paid_transaction_revenue()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_invoice_number text;
  v_customer_name text;
begin
  if new.status = 'paid'
     and new.paid_at is not null
     and (tg_op = 'INSERT' or old.status is distinct from 'paid')
  then
    select i.invoice_number, i.customer_name
      into v_invoice_number, v_customer_name
    from public.invoices i
    where i.id = new.invoice_id;

    insert into public.revenue_entries (
      client_id, invoice_id, payment_transaction_id, receipt_date,
      source_label, description, payment_method, amount_cents, currency
    )
    values (
      new.client_id,
      new.invoice_id,
      new.id,
      (new.paid_at at time zone 'Europe/Paris')::date,
      coalesce(v_customer_name, 'Client AK PRIME'),
      case
        when v_invoice_number is not null then 'Encaissement facture ' || v_invoice_number
        else 'Encaissement AK PRIME'
      end,
      new.payment_method,
      new.amount_cents,
      new.currency
    )
    on conflict (payment_transaction_id) do nothing;
  end if;
  return new;
end;
$function$;

revoke all on function private.record_paid_transaction_revenue() from public, anon, authenticated;

drop trigger if exists payment_transactions_record_revenue on public.payment_transactions;
create trigger payment_transactions_record_revenue
after insert or update of status, paid_at on public.payment_transactions
for each row execute function private.record_paid_transaction_revenue();

create or replace function public.issue_manual_invoice(
  p_client_id uuid,
  p_description text,
  p_amount_cents integer,
  p_service_date date default current_date,
  p_customer_billing_address text default null,
  p_payment_status text default 'pending',
  p_payment_method text default null,
  p_paid_at timestamptz default null
)
returns public.invoices
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_settings public.billing_settings%rowtype;
  v_client public.clients%rowtype;
  v_invoice public.invoices%rowtype;
  v_number text;
  v_paid_at timestamptz;
begin
  if not private.is_coach() then
    raise exception 'Accès refusé.';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'Montant invalide.';
  end if;

  if char_length(btrim(coalesce(p_description,''))) < 3 then
    raise exception 'Description de prestation requise.';
  end if;

  if p_payment_status not in ('pending','paid') then
    raise exception 'Statut de paiement invalide.';
  end if;

  if p_payment_status = 'paid' and p_payment_method not in ('card','bank_transfer','cash','check','other') then
    raise exception 'Mode de paiement requis pour une facture déjà encaissée.';
  end if;

  select * into v_client
  from public.clients
  where id = p_client_id;

  if v_client.id is null then
    raise exception 'Client introuvable.';
  end if;

  select * into v_settings
  from public.billing_settings
  where id = 1
  for update;

  if v_settings.id is null
     or nullif(btrim(coalesce(v_settings.legal_address,'')), '') is null
     or nullif(btrim(coalesce(v_settings.siren,'')), '') is null
     or nullif(btrim(coalesce(v_settings.siret,'')), '') is null
  then
    raise exception 'Facturation verrouillée : complète d''abord l''adresse légale, le SIREN et le SIRET.';
  end if;

  if not v_settings.vat_exempt then
    raise exception 'La facturation avec TVA n''est pas encore activée dans AK PRIME. Configure-la avant émission.';
  end if;

  v_number :=
    v_settings.invoice_prefix || '-' ||
    to_char(current_date, 'YYYY') || '-' ||
    lpad(v_settings.next_invoice_sequence::text, 5, '0');

  update public.billing_settings
  set next_invoice_sequence = next_invoice_sequence + 1,
      updated_at = now()
  where id = 1;

  v_paid_at := case
    when p_payment_status = 'paid' then coalesce(p_paid_at, now())
    else null
  end;

  insert into public.invoices (
    client_id, invoice_number, issue_date, service_date, due_date,
    customer_type, customer_name, customer_email, customer_billing_address,
    seller_legal_name, seller_business_name, seller_legal_form, seller_address,
    seller_siren, seller_siret, seller_email, seller_vat_number,
    operation_category, line_items,
    amount_excl_tax_cents, tax_cents, amount_incl_tax_cents,
    vat_exempt, vat_mention, payment_status, paid_at, source
  )
  values (
    v_client.id,
    v_number,
    current_date,
    coalesce(p_service_date, current_date),
    current_date,
    'individual',
    btrim(v_client.first_name || ' ' || case when v_client.last_name = '-' then '' else v_client.last_name end),
    v_client.email,
    nullif(btrim(coalesce(p_customer_billing_address,'')), ''),
    v_settings.legal_name,
    v_settings.business_name,
    v_settings.legal_form,
    v_settings.legal_address,
    v_settings.siren,
    v_settings.siret,
    v_settings.email,
    v_settings.vat_number,
    v_settings.operation_category,
    jsonb_build_array(jsonb_build_object(
      'description', btrim(p_description),
      'quantity', 1,
      'unit_price_excl_tax_cents', p_amount_cents,
      'tax_rate_percent', 0,
      'line_total_excl_tax_cents', p_amount_cents
    )),
    p_amount_cents,
    0,
    p_amount_cents,
    true,
    v_settings.vat_mention,
    p_payment_status,
    v_paid_at,
    'manual'
  )
  returning * into v_invoice;

  if p_payment_status = 'paid' then
    insert into public.payment_transactions (
      client_id, invoice_id, provider, payment_method,
      amount_cents, currency, status, paid_at
    )
    values (
      v_client.id, v_invoice.id, 'manual', p_payment_method,
      p_amount_cents, 'eur', 'paid', v_paid_at
    );
  end if;

  return v_invoice;
end;
$function$;

revoke all on function public.issue_manual_invoice(uuid,text,integer,date,text,text,text,timestamptz) from public, anon;
grant execute on function public.issue_manual_invoice(uuid,text,integer,date,text,text,text,timestamptz) to authenticated, service_role;

create or replace function public.mark_invoice_paid(
  p_invoice_id uuid,
  p_payment_method text,
  p_paid_at timestamptz default now()
)
returns public.invoices
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_invoice public.invoices%rowtype;
begin
  if not private.is_coach() then
    raise exception 'Accès refusé.';
  end if;

  if p_payment_method not in ('card','bank_transfer','cash','check','other') then
    raise exception 'Mode de paiement invalide.';
  end if;

  select * into v_invoice
  from public.invoices
  where id = p_invoice_id
  for update;

  if v_invoice.id is null then
    raise exception 'Facture introuvable.';
  end if;

  if v_invoice.payment_status = 'paid' then
    return v_invoice;
  end if;

  if v_invoice.payment_status in ('refunded','partially_refunded') then
    raise exception 'Cette facture ne peut pas être marquée payée dans cet état.';
  end if;

  insert into public.payment_transactions (
    client_id, invoice_id, enrollment_id, provider, payment_method,
    amount_cents, currency, status, paid_at
  )
  values (
    v_invoice.client_id, v_invoice.id, v_invoice.enrollment_id,
    'manual', p_payment_method, v_invoice.amount_incl_tax_cents,
    v_invoice.currency, 'paid', coalesce(p_paid_at, now())
  );

  update public.invoices
  set payment_status = 'paid',
      paid_at = coalesce(p_paid_at, now())
  where id = v_invoice.id
  returning * into v_invoice;

  return v_invoice;
end;
$function$;

revoke all on function public.mark_invoice_paid(uuid,text,timestamptz) from public, anon;
grant execute on function public.mark_invoice_paid(uuid,text,timestamptz) to authenticated, service_role;
