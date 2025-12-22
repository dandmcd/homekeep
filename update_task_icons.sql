-- Update Core Tasks with Icons

-- Weekly
UPDATE core_tasks SET icon = 'local-laundry-service' WHERE name = 'Laundry';
UPDATE core_tasks SET icon = 'cleaning-services' WHERE name = 'Dust surfaces, light fixtures & ceiling fans';
UPDATE core_tasks SET icon = 'delete-outline' WHERE name = 'Empty trash bins, wipe inside/outside';
UPDATE core_tasks SET icon = 'smart-toy' WHERE name = 'Schedule robots to vacuum & mop twice a week';
UPDATE core_tasks SET icon = 'markunread-mailbox' WHERE name = 'Sort mail and paperwork';
UPDATE core_tasks SET icon = 'countertops' WHERE name = 'Wipe kitchen counters, sink, fridge and cupboard doors';
UPDATE core_tasks SET icon = 'microwave' WHERE name = 'Wipe inside microwave and oven';
UPDATE core_tasks SET icon = 'bathtub' WHERE name = 'Clean bathroom sinks and tubs';
UPDATE core_tasks SET icon = 'grass' WHERE name = 'Mow lawn and control weeds, water in morning';
UPDATE core_tasks SET icon = 'local-florist' WHERE name = 'Weed garden beds';

-- Bi-Weekly
UPDATE core_tasks SET icon = 'wash' WHERE name = 'Launder bath mats, towels and washcloths';
UPDATE core_tasks SET icon = 'mci:vacuum' WHERE name = 'Manually vacuum & mop floors including upholstrey';
UPDATE core_tasks SET icon = 'bed' WHERE name = 'Change & launder bed linens';
UPDATE core_tasks SET icon = 'water-drop' WHERE name = 'Flush kitchen drain with boiling water';

-- Monthly
UPDATE core_tasks SET icon = 'layers' WHERE name = 'Launder rugs';
UPDATE core_tasks SET icon = 'water-damage' WHERE name = 'Check water softener';
UPDATE core_tasks SET icon = 'water' WHERE name = 'Monitor basement humidity';
UPDATE core_tasks SET icon = 'deck' WHERE name = 'Clean outdoor furniture and grills';
UPDATE core_tasks SET icon = 'grid-on' WHERE name = 'Inspect grout and caulking in baths and kitchen';
UPDATE core_tasks SET icon = 'door-front' WHERE name = 'Wipe interior and exterior doors, trim, and switch plates';
UPDATE core_tasks SET icon = 'pest-control' WHERE name = 'Pest Control Spray Exterior';
UPDATE core_tasks SET icon = 'fence' WHERE name = 'Visually inspect any fence & tighten or lube hardware';
UPDATE core_tasks SET icon = 'grass' WHERE name = 'Control vegetation around fences & exterior';
UPDATE core_tasks SET icon = 'mci:stove' WHERE name = 'Deep-clean oven and range'; -- using MCI for stove if MI doesn't have a good one, or just assume MI has something? MI has 'kitchen'.
UPDATE core_tasks SET icon = 'plumbing' WHERE name = 'Inspect basement for leaks';
UPDATE core_tasks SET icon = 'lightbulb' WHERE name = 'Check exterior lighting';

-- Semi-Monthly
UPDATE core_tasks SET icon = 'air' WHERE name = 'Change or clean HVAC filters';
UPDATE core_tasks SET icon = 'air' WHERE name = 'Vacuum heat registers and vents';
UPDATE core_tasks SET icon = 'delete-sweep' WHERE name = 'Clean garbage disposal';
UPDATE core_tasks SET icon = 'mci:dishwasher' WHERE name = 'Clean dishwasher filter';
UPDATE core_tasks SET icon = 'air' WHERE name = 'Clean dryer vent and vent line';
UPDATE core_tasks SET icon = 'mci:fan' WHERE name = 'Clean range hood vent';
UPDATE core_tasks SET icon = 'grid-view' WHERE name = 'Wash windows and screens'; -- makeshift window
UPDATE core_tasks SET icon = 'bug-report' WHERE name = 'Broom or vacuum exterior cobwebs';

-- Quarterly
UPDATE core_tasks SET icon = 'plumbing' WHERE name = 'Inspect tub & sink drains';
UPDATE core_tasks SET icon = 'plumbing' WHERE name = 'Check for leaks around toilets, sinks and cabinets';
UPDATE core_tasks SET icon = 'coffee' WHERE name = 'Descale coffee machine';
UPDATE core_tasks SET icon = 'water-damage' WHERE name = 'Inspect water softener';
UPDATE core_tasks SET icon = 'notifications-active' WHERE name = 'Test smoke alarms and carbon-monoxide detectors';
UPDATE core_tasks SET icon = 'water' WHERE name = 'Test sump pump';
UPDATE core_tasks SET icon = 'thermostat' WHERE name = 'Test water heater temp and pressure valve';

-- Seasonal Spring
UPDATE core_tasks SET icon = 'shower' WHERE name = 'Clean faucet aerators and showerheads';
UPDATE core_tasks SET icon = 'kitchen' WHERE name = 'Clean out refrigerator';
UPDATE core_tasks SET icon = 'garage' WHERE name = 'Verify garage-door safety reverse';
UPDATE core_tasks SET icon = 'garage' WHERE name = 'Clean out garage';
UPDATE core_tasks SET icon = 'cleaning-services' WHERE name LIKE 'Declutter and deep-clean%';

-- Seasonal Summer
UPDATE core_tasks SET icon = 'mci:fan' WHERE name = 'Vacuum bathroom exhaust fan grills';
UPDATE core_tasks SET icon = 'kitchen' WHERE name = 'Refrigerator cleaning';
UPDATE core_tasks SET icon = 'grid-view' WHERE name = 'Inspect windows';
UPDATE core_tasks SET icon = 'water-off' WHERE name = 'Remove insulation from outdoor faucets, test sprinkler heads';
UPDATE core_tasks SET icon = 'mci:fan' WHERE name = 'Reverse ceiling-fan counterclockwise direction';

-- Seasonal Fall
UPDATE core_tasks SET icon = 'nature-people' WHERE name = 'Prune trees and shrubs';
UPDATE core_tasks SET icon = 'edit-road' WHERE name = 'Inspect driveway, walkway and foundation for cracks';
UPDATE core_tasks SET icon = 'home-work' WHERE name = 'Wash siding';
UPDATE core_tasks SET icon = 'roofing' WHERE name = 'Inspect roof';
UPDATE core_tasks SET icon = 'edit-road' WHERE name = 'Inspect driveway';
UPDATE core_tasks SET icon = 'ac-unit' WHERE name = 'Cover central a/c';
UPDATE core_tasks SET icon = 'build' WHERE name = 'Appliance maintenance / HVAC inspection';

-- Seasonal Winter
UPDATE core_tasks SET icon = 'deck' WHERE name = 'Clean and seal deck';
UPDATE core_tasks SET icon = 'roofing' WHERE name = 'Inspect siding and roof';
UPDATE core_tasks SET icon = 'fence' WHERE name = 'Wash and apply sealant to wood fence';
UPDATE core_tasks SET icon = 'grid-view' WHERE name = 'Clean debris from window wells';
UPDATE core_tasks SET icon = 'mci:fan' WHERE name = 'Reverse ceiling fans to clockwise';

-- Semi-Annual
UPDATE core_tasks SET icon = 'grass' WHERE name = 'Check lawn for aeration';
UPDATE core_tasks SET icon = 'agriculture' WHERE name = 'Rake leaves';
UPDATE core_tasks SET icon = 'eco' WHERE name = 'Fertilize lawn';
UPDATE core_tasks SET icon = 'plumbing' WHERE name = 'Drain and winterize exterior plumbing';
UPDATE core_tasks SET icon = 'layers' WHERE name = 'Deep-clean carpets & rugs';

-- Annual
UPDATE core_tasks SET icon = 'ac-unit' WHERE name = 'Remove ice dams or icicles';
UPDATE core_tasks SET icon = 'deck' WHERE name = 'Cover and store furniture and grills before first snow';
UPDATE core_tasks SET icon = 'snowing' WHERE name = 'Remove snow promptly on deck';
UPDATE core_tasks SET icon = 'ice-skating' WHERE name = 'Stock up on ice melt and salt';
