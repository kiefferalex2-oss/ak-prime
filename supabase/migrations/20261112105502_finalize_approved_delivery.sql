-- Owner-supplied posts start as drafts; server-only delivery fields are not writable.
grant insert(batch_key,kind,channel,pole,target_label,title,body,visual_title,visual_points,rationale)
  on public.prospection_drafts to authenticated;
drop policy if exists prospection_drafts_owner_insert on public.prospection_drafts;
create policy prospection_drafts_owner_insert on public.prospection_drafts for insert to authenticated
  with check((select private.is_prospection_owner()) and status='draft' and approved_at is null and approved_snapshot is null);
alter table public.prospection_drafts add column if not exists platform_post_id text;
alter table public.prospection_leads add column if not exists review_notified_at timestamptz;
alter table public.prospection_leads add column if not exists reply_notified_at timestamptz;
-- Archive only unapproved demonstration posts, keeping their content recoverable.
update public.prospection_drafts set status='rejected'
where batch_key in ('initial-performance-20261111','initial-forme-20261111','initial-mental-20261111') and status='draft';
