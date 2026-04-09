-- Season leaderboard: all users ranked by cumulative season score
create or replace function get_season_leaderboard()
returns table(user_id uuid, email text, total_points bigint)
language sql
security definer
as $$
  select
    u.id as user_id,
    u.email,
    coalesce(sum(
      case
        when ms.is_captain then pmp.total_points * 3
        when ms.is_vice_captain then pmp.total_points * 2
        else pmp.total_points
      end
    ), 0) as total_points
  from auth.users u
  left join squads s on s.user_id = u.id and s.season = 2026
  left join match_selections ms on ms.squad_id = s.id
  left join player_match_points pmp
    on pmp.player_id = ms.player_id
    and pmp.match_id = ms.match_id
  left join matches m on m.id = ms.match_id and m.status = 'completed'
  group by u.id, u.email
  order by total_points desc;
$$;

-- Per-match leaderboard
create or replace function get_match_leaderboard(p_match_id uuid)
returns table(user_id uuid, email text, match_points bigint)
language sql
security definer
as $$
  select
    u.id as user_id,
    u.email,
    coalesce(sum(
      case
        when ms.is_captain then pmp.total_points * 3
        when ms.is_vice_captain then pmp.total_points * 2
        else pmp.total_points
      end
    ), 0) as match_points
  from auth.users u
  left join squads s on s.user_id = u.id and s.season = 2026
  left join match_selections ms on ms.squad_id = s.id and ms.match_id = p_match_id
  left join player_match_points pmp
    on pmp.player_id = ms.player_id
    and pmp.match_id = p_match_id
  group by u.id, u.email
  order by match_points desc;
$$;

-- League season leaderboard
create or replace function get_league_season_leaderboard(p_league_id uuid)
returns table(user_id uuid, email text, total_points bigint)
language sql
security definer
as $$
  select
    u.id as user_id,
    u.email,
    coalesce(sum(
      case
        when ms.is_captain then pmp.total_points * 3
        when ms.is_vice_captain then pmp.total_points * 2
        else pmp.total_points
      end
    ), 0) as total_points
  from league_members lm
  join auth.users u on u.id = lm.user_id
  left join squads s on s.user_id = u.id and s.season = 2026
  left join match_selections ms on ms.squad_id = s.id
  left join player_match_points pmp
    on pmp.player_id = ms.player_id
    and pmp.match_id = ms.match_id
  left join matches m on m.id = ms.match_id and m.status = 'completed'
  where lm.league_id = p_league_id
  group by u.id, u.email
  order by total_points desc;
$$;

-- League per-match leaderboard
create or replace function get_league_match_leaderboard(p_league_id uuid, p_match_id uuid)
returns table(user_id uuid, email text, match_points bigint)
language sql
security definer
as $$
  select
    u.id as user_id,
    u.email,
    coalesce(sum(
      case
        when ms.is_captain then pmp.total_points * 3
        when ms.is_vice_captain then pmp.total_points * 2
        else pmp.total_points
      end
    ), 0) as match_points
  from league_members lm
  join auth.users u on u.id = lm.user_id
  left join squads s on s.user_id = u.id and s.season = 2026
  left join match_selections ms on ms.squad_id = s.id and ms.match_id = p_match_id
  left join player_match_points pmp
    on pmp.player_id = ms.player_id
    and pmp.match_id = p_match_id
  where lm.league_id = p_league_id
  group by u.id, u.email
  order by match_points desc;
$$;
