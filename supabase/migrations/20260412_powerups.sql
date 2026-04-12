-- supabase/migrations/20260412_powerups.sql

-- ================================================================
-- 1. Add is_overseas to players
-- ================================================================
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_overseas boolean NOT NULL DEFAULT false;

-- Mark known overseas players (non-Indian nationals in IPL 2026)
UPDATE players SET is_overseas = true WHERE name IN (
  -- CSK
  'Noor Ahmad', 'Spencer Johnson', 'Matt Henry',
  -- DC
  'Mitchell Starc', 'Ben Duckett', 'Kyle Jamieson', 'Pathum Nissanka',
  -- GT
  'Jos Buttler', 'Kagiso Rabada', 'Glenn Phillips', 'Tom Banton', 'Jason Holder',
  -- KKR
  'Rovman Powell', 'Rachin Ravindra', 'Cameron Green', 'Matheesha Pathirana', 'Finn Allen',
  -- LSG
  'Aiden Markram', 'Mitchell Marsh', 'Anrich Nortje', 'Josh Inglis',
  'Wanindu Hasaranga', 'Matthew Breetzke',
  -- MI
  'Quinton de Kock', 'Trent Boult', 'Will Jacks', 'Ryan Rickelton', 'Sherfane Rutherford',
  -- PBKS
  'Marcus Stoinis', 'Marco Jansen', 'Lockie Ferguson', 'Azmatullah Omarzai',
  -- RCB
  'Phil Salt', 'Tim David', 'Romario Shepherd', 'Jacob Bethell', 'Josh Hazlewood',
  -- RR
  'Jofra Archer', 'Sam Curran', 'Nandre Burger', 'Adam Milne',
  -- SRH
  'Liam Livingstone', 'Kamindu Mendis', 'Brydon Carse'
);

-- ================================================================
-- 2. Create user_powerups table
-- ================================================================
CREATE TABLE user_powerups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id uuid REFERENCES squads(id) NOT NULL,
  season int NOT NULL,
  type text NOT NULL CHECK (type IN ('super_captain','double_up','overseas_boost','role_boost','wildcard')),
  match_id_used uuid REFERENCES matches(id),
  role_used text CHECK (role_used IN ('keeper','batsman','allrounder','bowler')),
  UNIQUE(squad_id, season, type)
);

-- ================================================================
-- 3. RLS
-- ================================================================
ALTER TABLE user_powerups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own powerups"
  ON user_powerups FOR SELECT
  USING (squad_id IN (SELECT id FROM squads WHERE user_id = auth.uid()));

CREATE POLICY "users can update own powerups"
  ON user_powerups FOR UPDATE
  USING (squad_id IN (SELECT id FROM squads WHERE user_id = auth.uid()));

CREATE POLICY "users can insert own powerups"
  ON user_powerups FOR INSERT
  WITH CHECK (squad_id IN (SELECT id FROM squads WHERE user_id = auth.uid()));

-- ================================================================
-- 4. Backfill existing squads
-- ================================================================
INSERT INTO user_powerups (squad_id, season, type)
SELECT s.id, s.season, p.type
FROM squads s
CROSS JOIN (
  VALUES ('super_captain'), ('double_up'), ('overseas_boost'), ('role_boost'), ('wildcard')
) AS p(type)
ON CONFLICT (squad_id, season, type) DO NOTHING;
