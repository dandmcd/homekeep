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
