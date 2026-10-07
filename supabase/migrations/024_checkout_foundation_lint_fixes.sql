-- AK PRIME — corrections linter pour la fondation checkout

create index if not exists checkout_intents_offer_code_idx
  on private.checkout_intents (offer_code);

create index if not exists checkout_intents_client_id_idx
  on private.checkout_intents (client_id);

drop policy if exists checkout_intents_client_deny on private.checkout_intents;
create policy checkout_intents_client_deny
on private.checkout_intents
for all
to anon, authenticated
using (false)
with check (false);
