import { Injectable } from '@nestjs/common';
import { DateOverride, StoredWeeklySchedule } from './availability.entity';

@Injectable()
export class AvailabilityRepository {
  private readonly schedules = new Map<string, StoredWeeklySchedule>();
  private readonly overrides = new Map<string, DateOverride>();
  findSchedule(providerId: string): StoredWeeklySchedule | undefined { return this.schedules.get(providerId); }
  saveSchedule(schedule: StoredWeeklySchedule): StoredWeeklySchedule { this.schedules.set(schedule.providerId, schedule); return schedule; }
  findOverride(providerId: string, date: string): DateOverride | undefined { return this.overrides.get(this.key(providerId, date)); }
  findOverrides(providerId: string): DateOverride[] { return Array.from(this.overrides.entries()).filter(([key]) => key.startsWith(`${providerId}|`)).map(([, value]) => value); }
  saveOverride(providerId: string, override: DateOverride): DateOverride { this.overrides.set(this.key(providerId, override.date), override); return override; }
  deleteOverride(providerId: string, date: string): DateOverride | undefined { const key = this.key(providerId, date); const value = this.overrides.get(key); this.overrides.delete(key); return value; }
  private key(providerId: string, date: string): string { return `${providerId}|${date}`; }
}
