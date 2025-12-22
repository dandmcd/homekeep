-- Seed core tasks
-- Weekly
INSERT INTO core_tasks (name, frequency) VALUES
('Laundry', 'weekly'),
('Dust surfaces, light fixtures & ceiling fans', 'weekly'),
('Empty trash bins, wipe inside/outside', 'weekly'),
('Schedule robots to vacuum & mop twice a week', 'weekly'),
('Sort mail and paperwork', 'weekly'),
('Wipe kitchen counters, sink, fridge and cupboard doors', 'weekly'),
('Wipe inside microwave and oven', 'weekly'),
('Clean bathroom sinks and tubs', 'weekly'),
('Mow lawn and control weeds, water in morning', 'weekly'),
('Weed garden beds', 'weekly');

-- Bi-Weekly (Every Other Week)
INSERT INTO core_tasks (name, frequency) VALUES
('Launder bath mats, towels and washcloths', 'biweekly'),
('Manually vacuum & mop floors including upholstrey', 'biweekly'),
('Change & launder bed linens', 'biweekly'),
('Flush kitchen drain with boiling water', 'biweekly');

-- Monthly
INSERT INTO core_tasks (name, frequency) VALUES
('Change & launder bed linens', 'monthly'),
('Launder rugs', 'monthly'),
('Check water softener', 'monthly'),
('Monitor basement humidity', 'monthly'),
('Clean outdoor furniture and grills', 'monthly'),
('Inspect grout and caulking in baths and kitchen', 'monthly'),
('Wipe interior and exterior doors, trim, and switch plates', 'monthly'),
('Pest Control Spray Exterior', 'monthly'),
('Visually inspect any fence & tighten or lube hardware', 'monthly'),
('Control vegetation around fences & exterior', 'monthly'),
('Deep-clean oven and range', 'monthly'),
('Inspect basement for leaks', 'monthly'),
('Check exterior lighting', 'monthly');

-- Semi-Monthly
INSERT INTO core_tasks (name, frequency) VALUES
('Change or clean HVAC filters', 'semi_monthly'),
('Vacuum heat registers and vents', 'semi_monthly'),
('Clean garbage disposal', 'semi_monthly'),
('Clean dishwasher filter', 'semi_monthly'),
('Clean dryer vent and vent line', 'semi_monthly'),
('Clean range hood vent', 'semi_monthly'),
('Wash windows and screens', 'semi_monthly'),
('Broom or vacuum exterior cobwebs', 'semi_monthly');

-- Quarterly (Anytime Seasonally)
INSERT INTO core_tasks (name, frequency) VALUES
('Inspect tub & sink drains', 'quarterly'),
('Check for leaks around toilets, sinks and cabinets', 'quarterly'),
('Descale coffee machine', 'quarterly'),
('Inspect water softener', 'quarterly'),
('Test smoke alarms and carbon-monoxide detectors', 'quarterly'),
('Test sump pump', 'quarterly'),
('Test water heater temp and pressure valve', 'quarterly');

-- Seasonal Spring
INSERT INTO core_tasks (name, frequency) VALUES
('Clean faucet aerators and showerheads', 'seasonal_spring'),
('Clean out refrigerator', 'seasonal_spring'),
('Verify garage-door safety reverse', 'seasonal_spring'),
('Clean out garage', 'seasonal_spring'),
('Declutter and deep-clean kitchen', 'seasonal_spring'),
('Declutter and deep-clean living room', 'seasonal_spring'),
('Declutter and deep-clean master bedroom', 'seasonal_spring'),
('Declutter and deep-clean Ashlynn''s room', 'seasonal_spring'),
('Declutter and deep-clean Ashton''s room', 'seasonal_spring'),
('Declutter and deep-clean office', 'seasonal_spring'),
('Declutter and deep-clean all bathrooms', 'seasonal_spring');

-- Seasonal Summer
INSERT INTO core_tasks (name, frequency) VALUES
('Vacuum bathroom exhaust fan grills', 'seasonal_summer'),
('Refrigerator cleaning', 'seasonal_summer'),
('Declutter and deep-clean basement', 'seasonal_summer'),
('Declutter and deep-clean garage', 'seasonal_summer'),
('Inspect windows', 'seasonal_summer'),
('Remove insulation from outdoor faucets, test sprinkler heads', 'seasonal_summer'),
('Reverse ceiling-fan counterclockwise direction', 'seasonal_summer');

-- Seasonal Fall
INSERT INTO core_tasks (name, frequency) VALUES
('Prune trees and shrubs', 'seasonal_fall'),
('Inspect driveway, walkway and foundation for cracks', 'seasonal_fall'),
('Wash siding', 'seasonal_fall'),
('Inspect roof', 'seasonal_fall'),
('Inspect driveway', 'seasonal_fall'),
('Cover central a/c', 'seasonal_fall'),
('Appliance maintenance / HVAC inspection', 'seasonal_fall');

-- Seasonal Winter
INSERT INTO core_tasks (name, frequency) VALUES
('Clean and seal deck', 'seasonal_winter'),
('Inspect siding and roof', 'seasonal_winter'),
('Wash and apply sealant to wood fence', 'seasonal_winter'),
('Clean debris from window wells', 'seasonal_winter'),
('Inspect basement for leaks', 'seasonal_winter'),
('Reverse ceiling fans to clockwise', 'seasonal_winter');

-- Semi-Annual
INSERT INTO core_tasks (name, frequency) VALUES
('Check lawn for aeration', 'semi_annual'),
('Rake leaves', 'semi_annual'),
('Fertilize lawn', 'semi_annual'),
('Drain and winterize exterior plumbing', 'semi_annual'),
('Deep-clean carpets & rugs', 'semi_annual');

-- Annual
INSERT INTO core_tasks (name, frequency) VALUES
('Remove ice dams or icicles', 'annual'),
('Cover and store furniture and grills before first snow', 'annual'),
('Remove snow promptly on deck', 'annual'),
('Stock up on ice melt and salt', 'annual');
