-- Match status sync: time-based transitions for matches without a RapidAPI ID.
-- For matches with rapidapi_match_id, the score-updater edge function handles status.
-- For manually inserted matches (null rapidapi_match_id), this cron keeps statuses current.

-- ── Function ────────────────────────────────────────────────────────────────

create or replace function sync_match_statuses()
returns void
language plpgsql
security definer
as $$
declare
  match_window interval := '4 hours';
  r record;
begin
  -- Upcoming → Live: match has started, still within the 4-hour window
  for r in
    select id
    from matches
    where status = 'upcoming'
      and rapidapi_match_id is null
      and match_date <= now()
      and match_date + match_window > now()
  loop
    update matches set status = 'live' where id = r.id;

    -- Snapshot squad_players into match_selections for all squads that don't have one yet
    insert into match_selections (squad_id, match_id, player_id, is_captain, is_vice_captain)
    select
      sp.squad_id,
      r.id,
      sp.player_id,
      false,
      false
    from squad_players sp
    join squads s on s.id = sp.squad_id and s.season = 2026
    where not exists (
      select 1 from match_selections ms
      where ms.squad_id = sp.squad_id and ms.match_id = r.id
    );
  end loop;

  -- Live → Completed: match window has elapsed
  update matches
  set status = 'completed'
  where status = 'live'
    and rapidapi_match_id is null
    and match_date + match_window <= now();

  -- Also mark any upcoming matches whose window has fully passed (edge case: was never set live)
  update matches
  set status = 'completed'
  where status = 'upcoming'
    and rapidapi_match_id is null
    and match_date + match_window <= now();
end;
$$;

-- ── Immediate one-time fix ───────────────────────────────────────────────────
-- Run the function right now to fix any matches that are already stale.
select sync_match_statuses();

-- ── Schedule via pg_cron ────────────────────────────────────────────────────
-- Runs every 5 minutes. pg_cron is enabled by default on Supabase.
select cron.schedule(
  'sync-match-statuses',       -- job name (unique)
  '*/5 * * * *',               -- every 5 minutes
  $$ select sync_match_statuses(); $$
);
