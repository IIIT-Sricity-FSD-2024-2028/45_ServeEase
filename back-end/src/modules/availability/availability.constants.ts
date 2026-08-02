export const BOOKING_WINDOW_DAYS = 7;
export const MIN_BOOKING_NOTICE_HOURS = 3;

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export type Weekday = (typeof WEEKDAYS)[number];
