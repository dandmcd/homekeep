import { Frequency, UserTask } from './database.types';

// Helper to format date as YYYY-MM-DD for Supabase
export const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

export const getSeasonStartDate = (season: string, year: number): Date => {
    switch (season) {
        case 'seasonal_spring':
            return new Date(year, 2, 20); // March 20
        case 'seasonal_summer':
            return new Date(year, 5, 21); // June 21
        case 'seasonal_fall':
            return new Date(year, 8, 22); // Sept 22
        case 'seasonal_winter':
            return new Date(year, 11, 21); // Dec 21
        default:
            return new Date(year, 0, 1);
    }
};

/**
 * Align a date to a specific day of the week.
 * If the date is already on the target day, returns the date + 7 days.
 * Otherwise, finds the next occurrence of the target day.
 * @param date - The base date to align from
 * @param targetDay - Target day of week (0=Sunday, 6=Saturday)
 * @returns Date aligned to the target weekday
 */
export const alignToWeekday = (date: Date, targetDay: number): Date => {
    const result = new Date(date);
    const currentDay = result.getDay();

    // Calculate days until next target day
    let daysUntilTarget = targetDay - currentDay;

    // If we're on the target day or it's in the past this week, go to next week
    if (daysUntilTarget <= 0) {
        daysUntilTarget += 7;
    }

    result.setDate(result.getDate() + daysUntilTarget);
    return result;
};

export const calculateNextOccurrences = (
    frequency: Frequency,
    startDate: Date = new Date(),
    months: number = 12,
    preferredWeekday?: number
): Date[] => {
    const dates: Date[] = [];
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + months);

    let current = new Date(startDate);
    // Reset time to start of day to avoid issues
    current.setHours(0, 0, 0, 0);

    // If seasonal, we need to find the next valid season start
    if (frequency.startsWith('seasonal_')) {
        let year = current.getFullYear();
        let seasonDate = getSeasonStartDate(frequency, year);

        // If the season date for this year has passed, move to next year
        if (seasonDate < current) {
            seasonDate = getSeasonStartDate(frequency, year + 1);
        }

        current = seasonDate;
    }

    // For weekly tasks with preferred weekday, align to that day
    if (frequency === 'weekly' && preferredWeekday !== undefined) {
        current = alignToWeekday(current, preferredWeekday);
        // Adjust back if we went past today into next week unnecessarily
        const checkDate = new Date(current);
        checkDate.setDate(checkDate.getDate() - 7);
        if (checkDate >= startDate) {
            current = checkDate;
        }
    }

    while (current <= endDate) {
        dates.push(new Date(current));

        switch (frequency) {
            case 'daily':
                current.setDate(current.getDate() + 1);
                break;
            case 'weekly':
                current.setDate(current.getDate() + 7);
                break;
            case 'biweekly':
                current.setDate(current.getDate() + 14);
                break;
            case 'monthly':
                current.setMonth(current.getMonth() + 1);
                break;
            case 'semi_monthly':
                // Add 15 days, roughly
                current.setDate(current.getDate() + 15);
                break;
            case 'quarterly':
                current.setMonth(current.getMonth() + 3);
                break;
            case 'seasonal_spring':
            case 'seasonal_summer':
            case 'seasonal_fall':
            case 'seasonal_winter':
            case 'annual':
                current.setFullYear(current.getFullYear() + 1);
                break;
            case 'semi_annual':
                current.setMonth(current.getMonth() + 6);
                break;
        }
    }

    return dates;
};

/**
 * Calculate the next due date for a recurring task after it's been completed.
 * Unlike calculateNextOccurrences which generates all future dates,
 * this returns only the NEXT single occurrence.
 * @param frequency - The task frequency
 * @param afterDate - The date to calculate from (default: now)
 * @param preferredWeekday - For weekly tasks, the preferred day (0=Sunday, 6=Saturday)
 */
export const calculateNextDueDate = (
    frequency: Frequency,
    afterDate: Date = new Date(),
    preferredWeekday?: number
): Date => {
    const next = new Date(afterDate);
    next.setHours(0, 0, 0, 0);

    switch (frequency) {
        case 'daily':
            next.setDate(next.getDate() + 1);
            break;
        case 'weekly':
            // If preferred weekday is set, align to that day
            if (preferredWeekday !== undefined) {
                return alignToWeekday(next, preferredWeekday);
            }
            next.setDate(next.getDate() + 7);
            break;
        case 'biweekly':
            next.setDate(next.getDate() + 14);
            break;
        case 'monthly':
            next.setMonth(next.getMonth() + 1);
            break;
        case 'semi_monthly':
            next.setDate(next.getDate() + 15);
            break;
        case 'quarterly':
            next.setMonth(next.getMonth() + 3);
            break;
        case 'semi_annual':
            next.setMonth(next.getMonth() + 6);
            break;
        case 'annual':
            next.setFullYear(next.getFullYear() + 1);
            break;
        case 'seasonal_spring':
        case 'seasonal_summer':
        case 'seasonal_fall':
        case 'seasonal_winter':
            // For seasonal tasks, schedule for the same season next year
            return getSeasonStartDate(frequency, next.getFullYear() + 1);
        default:
            // Unknown frequency, default to tomorrow
            next.setDate(next.getDate() + 1);
            break;
    }

    return next;
};

export interface NewTaskEvent {
    user_task_id: string;
    due_date: string;
    status: 'pending';
}

export const generateTaskEventsForUser = (userTasks: UserTask[]): NewTaskEvent[] => {
    const events: NewTaskEvent[] = [];
    const now = new Date();

    userTasks.forEach((task) => {
        // Determine frequency from task or core_task
        const freq = task.frequency || task.core_task?.frequency;

        if (freq) {
            const dates = calculateNextOccurrences(freq as Frequency, now);

            dates.forEach((date) => {
                events.push({
                    user_task_id: task.id,
                    due_date: formatDate(date),
                    status: 'pending',
                });
            });
        }
    });

    return events;
};

// ============================================
// Task Threshold System - Priority & Urgency
// ============================================

/**
 * Default thresholds for task prioritization (can be overridden by user settings)
 */
export const DEFAULT_DAILY_TIME_BUDGET_MINUTES = 75; // Middle of 60-90 range
export const MIN_DAILY_TIME_BUDGET = 30;
export const MAX_DAILY_TIME_BUDGET = 180;

/**
 * Urgency windows: how many days before due date a task escalates to primary list
 */
export const URGENCY_WINDOWS: Record<string, number> = {
    daily: 0,           // Always urgent
    weekly: 0,          // Always urgent when due
    biweekly: 3,        // 3 days before
    monthly: 7,         // 7 days before
    semi_monthly: 5,    // 5 days before
    quarterly: 10,      // 10 days before
    seasonal_spring: 14,
    seasonal_summer: 14,
    seasonal_fall: 14,
    seasonal_winter: 14,
    semi_annual: 14,
    annual: 14,
};

/**
 * Priority tiers for frequencies (lower = more urgent/higher priority)
 * Used to determine which tasks get shown first
 */
export const FREQUENCY_PRIORITY: Record<Frequency, number> = {
    daily: 1,
    weekly: 2,
    biweekly: 3,
    semi_monthly: 4,
    monthly: 5,
    quarterly: 6,
    seasonal_spring: 7,
    seasonal_summer: 7,
    seasonal_fall: 7,
    seasonal_winter: 7,
    semi_annual: 8,
    annual: 9,
};

/**
 * Get numeric priority for a frequency (lower = higher priority)
 */
export const getFrequencyPriority = (frequency: Frequency): number => {
    return FREQUENCY_PRIORITY[frequency] ?? 10;
};

/**
 * Get the end date for a given season
 * Seasons end the day before the next season starts
 */
export const getSeasonEndDate = (season: string, year: number): Date => {
    switch (season) {
        case 'seasonal_spring':
            return new Date(year, 5, 20); // June 20 (day before summer)
        case 'seasonal_summer':
            return new Date(year, 8, 21); // Sept 21 (day before fall)
        case 'seasonal_fall':
            return new Date(year, 11, 20); // Dec 20 (day before winter)
        case 'seasonal_winter':
            return new Date(year + 1, 2, 19); // March 19 next year (day before spring)
        default:
            // For non-seasonal, return end of year
            return new Date(year, 11, 31);
    }
};

/**
 * Calculate days until a due date from today
 * Negative values mean the task is overdue
 */
export const getDaysUntilDue = (dueDate: string | Date): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = typeof dueDate === 'string' ? new Date(dueDate) : new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    const diffMs = due.getTime() - today.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

/**
 * Determine if a task should be in the primary list based on urgency
 * Returns true if task is urgent enough to show in main "Today's Tasks"
 */
export const isTaskUrgent = (
    frequency: Frequency,
    dueDate: string | null,
    customUrgencyWindow?: number
): boolean => {
    // No due date means we can't determine urgency - default to not urgent
    if (!dueDate) return false;

    const daysUntil = getDaysUntilDue(dueDate);

    // Overdue tasks are ALWAYS urgent
    if (daysUntil < 0) return true;

    // Daily and weekly tasks are always urgent when due
    if (frequency === 'daily' || frequency === 'weekly') return true;

    // Use custom window or default for this frequency
    const urgencyWindow = customUrgencyWindow ?? URGENCY_WINDOWS[frequency] ?? 7;

    return daysUntil <= urgencyWindow;
};

export type TaskUrgencyTier = 'overdue' | 'urgent' | 'primary' | 'get_ahead';

/**
 * Categorize a task into urgency tiers for display purposes
 */
export const getTaskUrgencyTier = (
    frequency: Frequency,
    dueDate: string | null
): TaskUrgencyTier => {
    if (!dueDate) return 'get_ahead';

    const daysUntil = getDaysUntilDue(dueDate);

    // Overdue
    if (daysUntil < 0) return 'overdue';

    // Daily/weekly that are due today
    if ((frequency === 'daily' || frequency === 'weekly') && daysUntil === 0) {
        return 'primary';
    }

    // Check if within urgency window
    const urgencyWindow = URGENCY_WINDOWS[frequency] ?? 7;
    if (daysUntil <= urgencyWindow) return 'urgent';

    return 'get_ahead';
};
