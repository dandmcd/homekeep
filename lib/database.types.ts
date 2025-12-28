/**
 * Database types for Supabase tables
 */

export type Frequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'semi_monthly'
  | 'quarterly'
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
  icon?: string;
  room?: string;
  estimated_time?: number; // minutes
}

/**
 * Display labels for frequency values
 */
export const frequencyLabels: Record<Frequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Every Other Week',
  monthly: 'Monthly',
  semi_monthly: 'Semi-Monthly',
  quarterly: 'Quarterly',
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
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'semi_monthly',
  'quarterly',
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
  first_name?: string;
  last_name?: string;
  created_at: string;
  updated_at: string;
}

/**
 * User's assigned task (copy of core_tasks for the user)
 */
export interface UserTask {
  id: string;
  user_id: string;
  core_task_id: string | null;
  name?: string;
  frequency?: Frequency;
  room?: string;
  estimated_time?: number;
  created_at: string;
  // Joined data from core_tasks
  core_task?: CoreTask;
}

export type TaskEventStatus = 'pending' | 'completed' | 'skipped';

export interface TaskEvent {
  id: string;
  user_task_id: string;
  due_date: string;
  completed_at: string | null;
  status: TaskEventStatus;
  created_at: string;
}
