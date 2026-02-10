-- Update team codes for all teams
-- Run this SQL directly in your database or use: npx drizzle-kit studio

-- Group C
UPDATE teams SET code = 'BRA' WHERE name = 'Brazil';
UPDATE teams SET code = 'MAR' WHERE name = 'Morocco';
UPDATE teams SET code = 'HAI' WHERE name = 'Haiti';
UPDATE teams SET code = 'SCO' WHERE name = 'Scotland';

-- Group E
UPDATE teams SET code = 'GER' WHERE name = 'Germany';
UPDATE teams SET code = 'CUW' WHERE name = 'Curaçao';
UPDATE teams SET code = 'CIV' WHERE name = 'Ivory Coast';
UPDATE teams SET code = 'ECU' WHERE name = 'Ecuador';

-- Group G
UPDATE teams SET code = 'BEL' WHERE name = 'Belgium';
UPDATE teams SET code = 'EGY' WHERE name = 'Egypt';
UPDATE teams SET code = 'IRN' WHERE name = 'Iran';
UPDATE teams SET code = 'NZL' WHERE name = 'New Zealand';

-- Group H
UPDATE teams SET code = 'ESP' WHERE name = 'Spain';
UPDATE teams SET code = 'CPV' WHERE name = 'Cape Verde';
UPDATE teams SET code = 'KSA' WHERE name = 'Saudi Arabia';
UPDATE teams SET code = 'URU' WHERE name = 'Uruguay';

-- Group J
UPDATE teams SET code = 'ARG' WHERE name = 'Argentina';
UPDATE teams SET code = 'ALG' WHERE name = 'Algeria';
UPDATE teams SET code = 'AUT' WHERE name = 'Austria';
UPDATE teams SET code = 'JOR' WHERE name = 'Jordan';

-- Group L
UPDATE teams SET code = 'ENG' WHERE name = 'England';
UPDATE teams SET code = 'CRO' WHERE name = 'Croatia';
UPDATE teams SET code = 'GHA' WHERE name = 'Ghana';
UPDATE teams SET code = 'PAN' WHERE name = 'Panama';
