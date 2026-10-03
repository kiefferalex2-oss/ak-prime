-- AK PRIME — choix du client à J-14 avant renouvellement/paiement
create table if not exists public.renewal_choices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  due_date date not null,
  decision text not null check (decision in ('3_months','6_months','monthly','stop')),
  payment_mode text null,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, due_date),
  constraint renewal_choices_payment_mode_check check (
    (decision = 'stop' and payment_mode is null)
    or (decision = 'monthly' and payment_mode = 'monthly')
    or (decision in ('3_months','6_months') and payment_mode in ('monthly','upfront'))
  )
);

create index if not exists renewal_choices_client_due_idx
  on public.renewal_choices(client_id, due_date desc);

alter table public.renewal_choices enable row level security;

revoke all on public.renewal_choices from anon;
grant select on public.renewal_choices to authenticated, service_role;

drop policy if exists renewal_choices_read on public.renewal_choices;
create policy renewal_choices_read
on public.renewal_choices
for select to authenticated
using (private.can_access_client(client_id));

create or replace function public.submit_my_renewal_choice(
  p_decision text,
  p_payment_mode text default null
)
returns public.renewal_choices
language plpgsql
security definer
set search_path = public, private
as $function$
declare
  v_client public.clients%rowtype;
  v_row public.renewal_choices%rowtype;
begin
  select *
  into v_client
  from public.clients
  where auth_user_id = auth.uid()
    and portal_access_enabled = true
  limit 1;

  if v_client.id is null then
    raise exception 'Aucun dossier client actif n''est lié à ce compte.';
  end if;

  if v_client.engagement_end_date is null then
    raise exception 'Aucune date de fin d''engagement n''est définie.';
  end if;

  if v_client.engagement_end_date > current_date + 14 then
    raise exception 'Le choix de renouvellement ouvre 14 jours avant l''échéance.';
  end if;

  if exists (
    select 1 from public.renewals r
    where r.client_id = v_client.id
      and r.due_date = v_client.engagement_end_date
  ) then
    raise exception 'Cette échéance a déjà été finalisée.';
  end if;

  if p_decision not in ('3_months','6_months','monthly','stop') then
    raise exception 'Choix de renouvellement invalide.';
  end if;

  if p_decision = 'stop' then
    p_payment_mode := null;
  elsif p_decision = 'monthly' then
    p_payment_mode := 'monthly';
  elsif p_payment_mode not in ('monthly','upfront') then
    raise exception 'Choisis un paiement mensuel ou comptant.';
  end if;

  insert into public.renewal_choices (
    client_id, due_date, decision, payment_mode, submitted_at, updated_at
  )
  values (
    v_client.id, v_client.engagement_end_date, p_decision, p_payment_mode, now(), now()
  )
  on conflict (client_id, due_date)
  do update set
    decision = excluded.decision,
    payment_mode = excluded.payment_mode,
    submitted_at = now(),
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$function$;

revoke all on function public.submit_my_renewal_choice(text,text) from public, anon;
grant execute on function public.submit_my_renewal_choice(text,text) to authenticated;
