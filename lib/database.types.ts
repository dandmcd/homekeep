/**
 * Database types for Supabase tables
 */

export type Frequency =
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'semi_monthly'
  | 'seasonal_spring'
  | 'seasonal_summer'
  | 'seasonal_fall'
  | 'seasonal_winter'
  | 'semi_annual'
  | 'annual';

export interface CoreTask {
  id: string;
  name: string;
  frequency: Frequency;
  created_at: string;
}

/**
 * Display labels for frequency values
 */
export const frequencyLabels: Record<Frequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Every Other Week',
  monthly: 'Monthly',
  semi_monthly: 'Semi-Monthly',
  seasonal_spring: 'Spring',
  seasonal_summer: 'Summer',
  seasonal_fall: 'Fall',
  seasonal_winter: 'Winter',
  semi_annual: 'Semi-Annual',
  annual: 'Annual',
};

/**
 * Order for displaying frequencies in the UI
 */
export const frequencyOrder: Frequency[] = [
  'weekly',
  'biweekly',
  'monthly',
  'semi_monthly',
  'seasonal_spring',
  'seasonal_summer',
  'seasonal_fall',
  'seasonal_winter',
  'semi_annual',
  'annual',
];

/**
 * User profile for tracking initialization state
 */
export interface UserProfile {
  id: string;
  user_id: string;
  initialized: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * User's assigned task (copy of core task for the user)
 */
export interface UserTask {
  id: string;
  user_id: string;
  core_task_id: string;
  created_at: string;
  // Joined data from core_tasks
  core_task?: CoreTask;
}
