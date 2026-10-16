import { Injectable } from '@nestjs/common';
import { DateOverride, StoredWeeklySchedule } from './availability.entity';
import { StateRepository } from '../state/state.repository';
import { canonicalProviderId } from '../../common/provider-identity';

@Injectable()
export class AvailabilityRepository {
  private readonly schedules = new Map<string, StoredWeeklySchedule[]>();
  private readonly overrides = new Map<string, DateOverride>();
  constructor(private readonly state: StateRepository) {
    state.findAll().forEach((entry) => {
      if (entry.key.startsWith('serveEaseAvailabilityWeekly:')) {
        const rawSchedule = entry.value as unknown as StoredWeeklySchedule;
        if (rawSchedule?.providerId && Array.isArray(rawSchedule.days)) {
          this.addSchedule({ ...rawSchedule, providerId: canonicalProviderId(rawSchedule.providerId) });
        }
      }
      if (entry.key.startsWith('serveEaseAvailabilityOverride:')) {
        const parts = entry.key.split(':');
        const override = entry.value as unknown as DateOverride;
        if (parts.length >= 3 && override?.date) this.overrides.set(this.key(canonicalProviderId(parts[1]), parts.slice(2).join(':')), override);
      }
    });
    this.adoptListingKeyedAvailability();
  }

  // Availability recorded before a provider had one identity sits under their catalog listing id, while the
  // provider's own pages read and write their account id. Each such record is adopted by the owning account
  // when that account has nothing of its own, so published hours survive and both sides now agree.
  private adoptListingKeyedAvailability(): void {
    const data = this.state.findById('serveEaseData')?.value as { users?: Array<Record<string, any>>; providers?: Array<Record<string, any>> } | undefined;
    const accounts = (Array.isArray(data?.users) ? data!.users! : []).filter((account) => account?.role === 'provider');
    const listings = Array.isArray(data?.providers) ? data!.providers! : [];
    listings.forEach((listing) => {
      const listingId = canonicalProviderId(String(listing?.id ?? ''));
      if (!listingId) return;
      const owners = listing.ownerProviderId
        ? accounts.filter((account) => String(account.id) === String(listing.ownerProviderId))
        : accounts.filter((account) => String(account.providerCatalogId ?? '') === String(listing.id));
      if (owners.length !== 1) return;
      const accountId = canonicalProviderId(String(owners[0].id));
      if (accountId === listingId) return;

      if (!this.schedules.has(accountId)) {
        (this.schedules.get(listingId) ?? []).forEach((schedule) => this.addSchedule({ ...schedule, providerId: accountId }));
      }
      Array.from(this.overrides.entries()).forEach(([key, override]) => {
        if (!key.startsWith(`${listingId}|`)) return;
        const adopted = this.key(accountId, override.date);
        if (!this.overrides.has(adopted)) this.overrides.set(adopted, override);
      });
    });
  }
  findSchedule(providerId: string): StoredWeeklySchedule | undefined {
    return this.schedules.get(providerId)?.slice().sort((left, right) => this.effectiveFrom(right).localeCompare(this.effectiveFrom(left)))[0];
  }
  findScheduleForDate(providerId: string, date: string): StoredWeeklySchedule | undefined {
    return this.schedules.get(providerId)?.filter((schedule) => this.effectiveFrom(schedule) <= date)
      .sort((left, right) => this.effectiveFrom(right).localeCompare(this.effectiveFrom(left)))[0];
  }
  saveSchedule(schedule: StoredWeeklySchedule): StoredWeeklySchedule {
    const saved = { ...schedule, effectiveFrom: this.effectiveFrom(schedule) };
    const schedules = (this.schedules.get(schedule.providerId) ?? []).filter((item) => {
      const itemEffectiveFrom = this.effectiveFrom(item);
      if (itemEffectiveFrom <= saved.effectiveFrom) return true;
      // An immediate schedule update supersedes any previously staged
      // versions, otherwise next week's stale version would win again after
      // the provider reloads the page.
      this.state.delete(`serveEaseAvailabilityWeekly:${schedule.providerId}:${itemEffectiveFrom}`);
      return false;
    });
    const index = schedules.findIndex((item) => this.effectiveFrom(item) === saved.effectiveFrom);
    if (index >= 0) schedules[index] = saved; else schedules.push(saved);
    this.schedules.set(schedule.providerId, schedules);
    this.state.create({ key: `serveEaseAvailabilityWeekly:${schedule.providerId}:${saved.effectiveFrom}`, value: saved as unknown as Record<string, unknown> });
    return saved;
  }
  findOverride(providerId: string, date: string): DateOverride | undefined { return this.overrides.get(this.key(providerId, date)); }
  findOverrides(providerId: string): DateOverride[] { return Array.from(this.overrides.entries()).filter(([key]) => key.startsWith(`${providerId}|`)).map(([, value]) => value); }
  saveOverride(providerId: string, override: DateOverride): DateOverride { this.overrides.set(this.key(providerId, override.date), override); this.state.create({ key: `serveEaseAvailabilityOverride:${providerId}:${override.date}`, value: override as unknown as Record<string, unknown> }); return override; }
  deleteOverride(providerId: string, date: string): DateOverride | undefined { const key = this.key(providerId, date); const value = this.overrides.get(key); this.overrides.delete(key); this.state.delete(`serveEaseAvailabilityOverride:${providerId}:${date}`); return value; }
  private addSchedule(schedule: StoredWeeklySchedule): void {
    const schedules = this.schedules.get(schedule.providerId) ?? [];
    schedules.push(schedule);
    this.schedules.set(schedule.providerId, schedules);
  }
  private effectiveFrom(schedule: StoredWeeklySchedule): string { return schedule.effectiveFrom || '0000-01-01'; }
  private key(providerId: string, date: string): string { return `${providerId}|${date}`; }
}
