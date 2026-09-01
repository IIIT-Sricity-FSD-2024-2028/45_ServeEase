import { Injectable } from '@nestjs/common';
import { DateOverride, StoredWeeklySchedule } from './availability.entity';
import { StateRepository } from '../state/state.repository';

@Injectable()
export class AvailabilityRepository {
  private readonly schedules = new Map<string, StoredWeeklySchedule>();
  private readonly overrides = new Map<string, DateOverride>();
  constructor(private readonly state: StateRepository) {
    state.findAll().forEach((entry) => {
      if (entry.key.startsWith('serveEaseAvailabilityWeekly:')) {
        const schedule = entry.value as unknown as StoredWeeklySchedule;
        if (schedule?.providerId && Array.isArray(schedule.days)) this.schedules.set(schedule.providerId, schedule);
      }
      if (entry.key.startsWith('serveEaseAvailabilityOverride:')) {
        const parts = entry.key.split(':');
        const override = entry.value as unknown as DateOverride;
        if (parts.length >= 3 && override?.date) this.overrides.set(this.key(parts[1], parts.slice(2).join(':')), override);
      }
    });
  }
  findSchedule(providerId: string): StoredWeeklySchedule | undefined { return this.schedules.get(providerId); }
  saveSchedule(schedule: StoredWeeklySchedule): StoredWeeklySchedule { this.schedules.set(schedule.providerId, schedule); this.state.create({ key: `serveEaseAvailabilityWeekly:${schedule.providerId}`, value: schedule as unknown as Record<string, unknown> }); return schedule; }
  findOverride(providerId: string, date: string): DateOverride | undefined { return this.overrides.get(this.key(providerId, date)); }
  findOverrides(providerId: string): DateOverride[] { return Array.from(this.overrides.entries()).filter(([key]) => key.startsWith(`${providerId}|`)).map(([, value]) => value); }
  saveOverride(providerId: string, override: DateOverride): DateOverride { this.overrides.set(this.key(providerId, override.date), override); this.state.create({ key: `serveEaseAvailabilityOverride:${providerId}:${override.date}`, value: override as unknown as Record<string, unknown> }); return override; }
  deleteOverride(providerId: string, date: string): DateOverride | undefined { const key = this.key(providerId, date); const value = this.overrides.get(key); this.overrides.delete(key); this.state.delete(`serveEaseAvailabilityOverride:${providerId}:${date}`); return value; }
  private key(providerId: string, date: string): string { return `${providerId}|${date}`; }
}
