-- Migration: Add onboarding and task set support
-- This migration adds task_set column to core_tasks and tutorial tracking to user_profiles

-- Add task_set column to core_tasks (which sets this task belongs to)
-- Tasks can belong to multiple sets, stored as an array
-- Empty array means it won't be auto-added in any set (but can be manually added)
ALTER TABLE core_tasks 
ADD COLUMN IF NOT EXISTS task_set text[] DEFAULT ARRAY['homeowner'];

-- Add tutorial_completed and selected_task_set to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS tutorial_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS selected_task_set text;

-- ============================================================================
-- TASK SET CATEGORIZATION
-- Based on exported core_tasks as of 2025-12-30
-- ============================================================================

-- APARTMENT + HOMEOWNER (Indoor tasks suitable for both renters and homeowners)
UPDATE core_tasks SET task_set = ARRAY['apartment', 'homeowner'] WHERE name IN (
  -- Weekly indoor tasks
  'Laundry',
  'Dust surfaces, light fixtures & ceiling fans',
  'Empty trash bins, wipe inside/outside',
  'Schedule robots to vacuum & mop twice a week',
  'Sort mail and paperwork',
  'Wipe kitchen counters, sink, fridge and cupboard doors',
  'Wipe inside microwave and oven',
  'Clean bathroom sinks and tubs',
  
  -- Biweekly indoor tasks
  'Launder bath mats, towels and washcloths',
  'Manually vacuum & mop floors including upholstrey',
  'Change & launder bed linens',
  'Flush kitchen drain with boiling water',
  
  -- Monthly indoor tasks
  'Launder rugs',
  'Deep-clean oven and range',
  'Inspect grout and caulking in baths and kitchen',
  'Wipe interior and exterior doors, trim, and switch plates',
  
  -- Semi-monthly indoor tasks
  'Change or clean HVAC filters',
  'Vacuum heat registers and vents',
  'Clean garbage disposal',
  'Clean dishwasher filter',
  'Clean dryer vent and vent line',
  'Clean range hood vent',
  'Wash windows and screens',
  
  -- Seasonal spring indoor (deep clean)
  'Clean faucet aerators and showerheads',
  'Clean out refrigerator',
  'Declutter and deep-clean kitchen',
  'Declutter and deep-clean living room',
  'Declutter and deep-clean master bedroom',
  'Declutter and deep-clean Ashlynn''s room',
  'Declutter and deep-clean Ashton''s room',
  'Declutter and deep-clean office',
  'Declutter and deep-clean all bathrooms',
  
  -- Seasonal summer indoor
  'Vacuum bathroom exhaust fan grills',
  'Refrigerator cleaning',
  'Reverse ceiling-fan counterclockwise direction',
  
  -- Seasonal winter indoor
  'Reverse ceiling fans to clockwise',
  
  -- Semi-annual indoor
  'Deep-clean carpets & rugs'
);

-- HOMEOWNER ONLY (Exterior, yard, basement, garage, seasonal maintenance)
UPDATE core_tasks SET task_set = ARRAY['homeowner'] WHERE name IN (
  -- Weekly outdoor tasks
  'Mow lawn and control weeds, water in morning',
  'Weed garden beds',
  
  -- Monthly exterior/maintenance tasks
  'Check water softener',
  'Monitor basement humidity',
  'Clean outdoor furniture and grills',
  'Pest Control Spray Exterior',
  'Visually inspect any fence & tighten or lube hardware',
  'Control vegetation around fences & exterior',
  'Inspect basement for leaks',
  'Check exterior lighting',
  
  -- Semi-monthly exterior tasks
  'Broom or vacuum exterior cobwebs',
  
  -- Seasonal spring exterior
  'Verify garage-door safety reverse',
  'Clean out garage',
  'Prune trees and shrubs',
  
  -- Seasonal summer exterior
  'Declutter and deep-clean basement',
  'Declutter and deep-clean garage',
  'Inspect windows',
  'Remove insulation from outdoor faucets, test sprinkler heads',
  'Clean and seal deck',
  
  -- Seasonal fall exterior
  'Inspect driveway, walkway and foundation for cracks',
  'Wash siding',
  'Inspect roof',
  'Inspect driveway',
  'Cover central a/c',
  'Appliance maintenance / HVAC inspection',
  'Rake leaves',
  
  -- Seasonal winter exterior
  'Inspect siding and roof',
  'Wash and apply sealant to wood fence',
  'Clean debris from window wells',
  'Remove ice dams or icicles',
  'Cover and store furniture and grills before first snow',
  'Remove snow promptly on deck',
  'Stock up on ice melt and salt',
  
  -- Semi-annual exterior
  'Check lawn for aeration',
  'Fertilize lawn',
  'Drain and winterize exterior plumbing'
);

-- ============================================================================
-- ALPHA RESET: Reset all existing users for fresh onboarding
-- This ensures everyone sees the new onboarding flow
-- ============================================================================
UPDATE user_profiles SET tutorial_completed = false, initialized = false;
DELETE FROM task_events;
DELETE FROM user_tasks;
