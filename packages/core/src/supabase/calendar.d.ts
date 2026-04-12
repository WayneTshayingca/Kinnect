import type { CalendarEvent } from '../types/database';
export declare function getCalendarEvents(familyId: string, startDate?: string, endDate?: string): Promise<CalendarEvent[]>;
export declare function createCalendarEvent(familyId: string, title: string, startTime: string, endTime: string, createdBy: string, description?: string, allDay?: boolean, location?: string): Promise<{
    all_day: boolean;
    created_at: string;
    created_by: string | null;
    description: string | null;
    end_time: string;
    family_id: string;
    id: string;
    location: string | null;
    start_time: string;
    title: string;
}>;
export declare function updateCalendarEvent(eventId: string, updates: {
    title?: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    all_day?: boolean;
    location?: string | null;
}): Promise<{
    all_day: boolean;
    created_at: string;
    created_by: string | null;
    description: string | null;
    end_time: string;
    family_id: string;
    id: string;
    location: string | null;
    start_time: string;
    title: string;
}>;
export declare function deleteCalendarEvent(eventId: string): Promise<void>;
//# sourceMappingURL=calendar.d.ts.map