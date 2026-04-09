-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Player roles enum
create type player_role as enum ('batsman', 'bowler', 'keeper', 'allrounder');

-- Match status enum
create type match_status as enum ('upcoming', 'live', 'completed');

-- Players table (seeded once, fixed token values)
create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ipl_team text not null,
  role player_role not null,
  token_value integer not null check (token_value between 7 and 13),
  rapidapi_player_id integer
);

-- Squads (one per user per season)
create table squads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  season integer not null default 2026,
  transfers_used integer not null default 0,
  unique(user_id, season)
);

-- Current squad composition (updated on transfer)
create table squad_players (
  squad_id uuid not null references squads(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  primary key (squad_id, player_id)
);

-- Matches
create table matches (
  id uuid primary key default gen_random_uuid(),
  team_a text not null,
  team_b text not null,
  match_date timestamptz not null,
  status match_status not null default 'upcoming',
  rapidapi_match_id text not null unique
);

-- Per-match selection snapshot (locked when match goes live)
create table match_selections (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid not null references squads(id) on delete cascade,
  match_id uuid not null references matches(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  is_captain boolean not null default false,
  is_vice_captain boolean not null default false,
  unique(squad_id, match_id, player_id)
);

-- Player points per match (written by Edge Function)
create table player_match_points (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  runs integer not null default 0,
  fours integer not null default 0,
  sixes integer not null default 0,
  wickets integer not null default 0,
  catches integer not null default 0,
  stumpings integer not null default 0,
  run_outs_direct integer not null default 0,
  run_outs_indirect integer not null default 0,
  is_motm boolean not null default false,
  total_points integer not null default 0,
  unique(match_id, player_id)
);

-- Leagues
create table leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- League members
create table league_members (
  league_id uuid not null references leagues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

-- Row-level security
alter table squads enable row level security;
create policy "Users manage own squad" on squads
  for all using (auth.uid() = user_id);

alter table squad_players enable row level security;
create policy "Users manage own squad players" on squad_players
  for all using (
    squad_id in (select id from squads where user_id = auth.uid())
  );

alter table match_selections enable row level security;
create policy "Users manage own match selections" on match_selections
  for all using (
    squad_id in (select id from squads where user_id = auth.uid())
  );

alter table players enable row level security;
create policy "Players are public" on players for select using (true);

alter table matches enable row level security;
create policy "Matches are public" on matches for select using (true);

alter table player_match_points enable row level security;
create policy "Points are public" on player_match_points for select using (true);

alter table leagues enable row level security;
create policy "Leagues are public read" on leagues for select using (true);
create policy "Creator manages league" on leagues
  for insert with check (auth.uid() = created_by);

alter table league_members enable row level security;
create policy "Members can read league members" on league_members for select using (true);
create policy "Users join leagues" on league_members
  for insert with check (auth.uid() = user_id);

-- Enable real-time for live score updates
alter publication supabase_realtime add table player_match_points;
alter publication supabase_realtime add table matches;
