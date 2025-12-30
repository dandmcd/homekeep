-- Migration: Add Pool Owner and Pet Owner task sets
-- This adds new core tasks for pool maintenance and pet care

-- Pool Owner Tasks (12 tasks)
INSERT INTO core_tasks (name, frequency, room, estimated_time, icon, task_set) VALUES
-- Weekly pool tasks
('Test pool water chemistry (pH, chlorine)', 'weekly', 'Pool', 15, 'mci:water-check', ARRAY['pool_owner']),
('Skim pool surface and empty baskets', 'weekly', 'Pool', 15, 'mci:pool', ARRAY['pool_owner']),
('Brush pool walls and floor', 'weekly', 'Pool', 20, 'mci:broom', ARRAY['pool_owner']),
('Vacuum pool', 'weekly', 'Pool', 30, 'mci:vacuum', ARRAY['pool_owner']),

-- Biweekly pool tasks
('Backwash pool filter', 'biweekly', 'Pool', 15, 'mci:filter', ARRAY['pool_owner']),
('Shock treat pool', 'biweekly', 'Pool', 10, 'mci:flash', ARRAY['pool_owner']),

-- Monthly pool tasks
('Check pool equipment (pump, filter, heater)', 'monthly', 'Pool', 15, 'build', ARRAY['pool_owner']),
('Clean pool tile line', 'monthly', 'Pool', 20, 'mci:rectangle-outline', ARRAY['pool_owner']),

-- Seasonal pool tasks
('Open pool for season', 'seasonal_spring', 'Pool', 120, 'mci:pool', ARRAY['pool_owner']),
('Deep clean pool filter', 'seasonal_spring', 'Pool', 45, 'mci:filter', ARRAY['pool_owner']),
('Close and winterize pool', 'seasonal_fall', 'Pool', 120, 'mci:snowflake', ARRAY['pool_owner']),
('Inspect pool cover', 'seasonal_winter', 'Pool', 15, 'visibility', ARRAY['pool_owner']);

-- Pet Owner Tasks (8 tasks)
INSERT INTO core_tasks (name, frequency, room, estimated_time, icon, task_set) VALUES
-- Weekly pet tasks
('Wash pet bedding', 'weekly', 'General', 30, 'mci:paw', ARRAY['pet_owner']),
('Clean pet food and water bowls', 'weekly', 'Kitchen', 10, 'mci:bowl-mix', ARRAY['pet_owner']),
('Vacuum pet hair from furniture and floors', 'weekly', 'Living Room', 20, 'mci:vacuum', ARRAY['pet_owner']),
('Clean litter box or yard pet waste', 'weekly', 'General', 15, 'delete-outline', ARRAY['pet_owner']),
('Groom and brush pet', 'weekly', 'General', 15, 'mci:dog-side', ARRAY['pet_owner']),

-- Monthly pet tasks
('Deep clean pet areas', 'monthly', 'General', 45, 'cleaning-services', ARRAY['pet_owner']),
('Wash pet toys', 'monthly', 'General', 15, 'mci:paw', ARRAY['pet_owner']),

-- Seasonal pet tasks (every spring)
('Check and clean pet carriers and crates', 'seasonal_spring', 'General', 20, 'mci:crate', ARRAY['pet_owner']);
