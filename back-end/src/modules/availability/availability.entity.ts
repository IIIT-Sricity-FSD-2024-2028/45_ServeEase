import { ApiProperty } from '@nestjs/swagger';
import { BOOKING_WINDOW_DAYS, Weekday } from './availability.constants';

export class WeeklyScheduleDay {
  @ApiProperty({ enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] })
  dayOfWeek: Weekday;

  @ApiProperty({ example: ['09:00-12:00', '13:00-17:00'] })
  slots: string[];
}

export class WeeklySchedule {
  @ApiProperty({ example: 'cleanpro-service' }) providerId: string;
  @ApiProperty({
    example: { monday: ['09:00-12:00', '13:00-17:00'], tuesday: ['09:00-12:00'], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] },
  })
  weeklySchedule: Record<string, string[]>;
}

export interface StoredWeeklySchedule {
  providerId: string;
  days: WeeklyScheduleDay[];
}

export class DateOverride {
  @ApiProperty({ example: '2026-08-04' }) date: string;
  @ApiProperty({ example: false }) fullDayOff: boolean;
  @ApiProperty({ example: ['09:00-12:00'] }) disabledSlots: string[];
  @ApiProperty({ example: ['13:00-17:00'] }) enabledSlots: string[];
}

export class AvailableDate {
  @ApiProperty({ example: '2026-08-04' }) date: string;
  @ApiProperty({ example: 'Monday' }) dayOfWeek: Weekday;
  @ApiProperty({ example: ['13:00-17:00'] }) slots: string[];
}

export class ProviderAvailability {
  @ApiProperty({ example: 'cleanpro-service' }) providerId: string;
  @ApiProperty({ example: BOOKING_WINDOW_DAYS }) bookingWindowDays: number;
  @ApiProperty({ type: [AvailableDate] }) dates: AvailableDate[];
}
