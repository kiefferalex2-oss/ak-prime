-- Publier uniquement les inserts d'alertes propriétaires (RLS limite chaque destinataire).
alter publication supabase_realtime add table public.coach_new_client_events;