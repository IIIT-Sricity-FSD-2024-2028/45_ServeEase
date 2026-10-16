import { AvailabilityService } from './availability.service';
import { AvailabilityRepository } from './availability.repository';
import { StateRepository } from '../state/state.repository';

// A provider's availability is only ever what that provider recorded. Nothing is assumed on their behalf:
// before they set a weekly schedule, customers are offered no slots at all.
function service(entries: Array<{ key: string; value: Record<string, unknown> }> = []) {
  const store = new Map(entries.map((entry) => [entry.key, { ...entry, updatedAt: '2026-01-01T00:00:00.000Z' }]));
  const state = {
    findAll: () => [...store.values()],
    findById: (key: string) => store.get(key),
    create: (entry: { key: string; value: Record<string, unknown> }) => { store.set(entry.key, { ...entry, updatedAt: new Date().toISOString() }); return store.get(entry.key); },
    update: (key: string, patch: { value: Record<string, unknown> }) => { store.set(key, { key, ...patch, updatedAt: new Date().toISOString() }); return store.get(key); },
    delete: (key: string) => store.delete(key),
  } as unknown as StateRepository;
  return { availability: new AvailabilityService(new AvailabilityRepository(state), { findByProviderAndDate: () => [], findByProvider: () => [] } as never), store };
}

const weekly = (slots: string[]) => ({ monday: slots, tuesday: slots, wednesday: slots, thursday: slots, friday: slots, saturday: [], sunday: [] });

describe('AvailabilityService', () => {
  it('offers a provider with no recorded schedule an empty week instead of failing', () => {
    const { availability } = service();
    expect(availability.getWeeklySchedule('PRO900')).toEqual({
      providerId: 'PRO900',
      effectiveFrom: undefined,
      weeklySchedule: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] },
    });
  });

  it('shows customers no slots for a provider who has set none, and records nothing for them', () => {
    const { availability, store } = service();
    const keysBefore = [...store.keys()];
    const result = availability.getAvailability('PRO900');
    expect(result.dates).toHaveLength(result.bookingWindowDays);
    expect(result.dates.every((date) => date.slots.length === 0 && (date.scheduledSlots ?? []).length === 0)).toBe(true);
    // No invented working hours are stored against the provider.
    expect([...store.keys()]).toEqual(keysBefore);
  });

  it('offers exactly the hours a provider saved', () => {
    const { availability, store } = service();
    const saved = availability.saveWeeklySchedule('PRO900', { weeklySchedule: weekly(['09:00-12:00']) });
    expect(saved.weeklySchedule.monday).toEqual(['09:00-12:00']);
    expect(saved.weeklySchedule.sunday).toEqual([]);
    expect([...store.keys()].some((key) => key.startsWith('serveEaseAvailabilityWeekly:PRO900'))).toBe(true);
    expect(availability.getWeeklySchedule('PRO900').weeklySchedule.monday).toEqual(['09:00-12:00']);

    const dates = availability.getAvailability('PRO900').dates;
    const weekend = dates.filter((date) => date.dayOfWeek === 'Saturday' || date.dayOfWeek === 'Sunday');
    expect(weekend.every((date) => (date.scheduledSlots ?? []).length === 0)).toBe(true);
    const weekdays = dates.filter((date) => !['Saturday', 'Sunday'].includes(date.dayOfWeek));
    expect(weekdays.every((date) => (date.scheduledSlots ?? []).join() === '09:00-12:00')).toBe(true);
  });

  it('refuses overlapping slots', () => {
    const { availability } = service();
    expect(() => availability.saveWeeklySchedule('PRO900', { weeklySchedule: weekly(['09:00-12:00', '11:00-13:00']) })).toThrow(/overlap/i);
  });
});

describe('AvailabilityService provider identity', () => {
  const listingSchedule = {
    key: 'serveEaseAvailabilityWeekly:sparkle-home-care',
    value: { providerId: 'sparkle-home-care', days: [{ dayOfWeek: 'Monday', slots: ['09:00-12:00'] }, { dayOfWeek: 'Tuesday', slots: ['09:00-12:00'] }, { dayOfWeek: 'Wednesday', slots: ['09:00-12:00'] }, { dayOfWeek: 'Thursday', slots: ['09:00-12:00'] }, { dayOfWeek: 'Friday', slots: ['09:00-12:00'] }, { dayOfWeek: 'Saturday', slots: ['09:00-12:00'] }, { dayOfWeek: 'Sunday', slots: ['09:00-12:00'] }] },
  };
  const accounts = {
    key: 'serveEaseData',
    value: {
      providers: [{ id: 'sparkle-home-care', category: 'home-cleaning', cityId: 1 }],
      users: [{ id: 'PRO-CAT-020', role: 'provider', email: 'sparkle@example.test', providerCatalogId: 'sparkle-home-care' }],
    },
  };

  // The provider's pages use their account id; hours published against their listing id are the same hours.
  it('reads hours stored under a listing id through the owning account', () => {
    const { availability } = service([listingSchedule, accounts]);
    expect(availability.getWeeklySchedule('PRO-CAT-020').weeklySchedule.monday).toEqual(['09:00-12:00']);
    const override = availability.getAvailability('PRO-CAT-020').dates[2];
    availability.saveDateOverride('PRO-CAT-020', override.date, { fullDayOff: true, disabledSlots: [], enabledSlots: [] });
    // The same identity the customer pages ask for, so the day off reaches them.
    expect(availability.getAvailability('PRO-CAT-020').dates[2].slots).toEqual([]);
  });

  it('leaves an account that published its own hours alone', () => {
    const own = { key: 'serveEaseAvailabilityWeekly:PRO-CAT-020:0000-01-01', value: { providerId: 'PRO-CAT-020', effectiveFrom: '0000-01-01', days: [{ dayOfWeek: 'Monday', slots: ['15:00-18:00'] }] } };
    const { availability } = service([listingSchedule, own, accounts]);
    expect(availability.getWeeklySchedule('PRO-CAT-020').weeklySchedule.monday).toEqual(['15:00-18:00']);
  });
});

describe('AvailabilityService date overrides', () => {
  const nextWeekday = (offset: number) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  it('removes a disabled slot, clears a full day off, and restores both when deleted', () => {
    const { availability } = service();
    availability.saveWeeklySchedule('PRO900', { weeklySchedule: {
      monday: ['09:00-12:00', '13:00-17:00'], tuesday: ['09:00-12:00', '13:00-17:00'], wednesday: ['09:00-12:00', '13:00-17:00'],
      thursday: ['09:00-12:00', '13:00-17:00'], friday: ['09:00-12:00', '13:00-17:00'], saturday: ['09:00-12:00', '13:00-17:00'], sunday: ['09:00-12:00', '13:00-17:00'],
    } });
    const date = nextWeekday(3);
    const slotsOn = (day: string) => availability.getAvailability('PRO900').dates.find((item) => item.date === day);

    expect(slotsOn(date)?.slots).toEqual(['09:00-12:00', '13:00-17:00']);

    availability.saveDateOverride('PRO900', date, { fullDayOff: false, disabledSlots: ['09:00-12:00'], enabledSlots: [] });
    expect(slotsOn(date)?.slots).toEqual(['13:00-17:00']);
    // Other dates keep the recurring schedule.
    expect(slotsOn(nextWeekday(4))?.slots).toEqual(['09:00-12:00', '13:00-17:00']);
    expect(availability.getDateOverrides('PRO900')).toEqual([{ date, fullDayOff: false, disabledSlots: ['09:00-12:00'], enabledSlots: [] }]);

    availability.saveDateOverride('PRO900', date, { fullDayOff: true, disabledSlots: [], enabledSlots: [] });
    expect(slotsOn(date)?.slots).toEqual([]);

    availability.deleteDateOverride('PRO900', date);
    expect(slotsOn(date)?.slots).toEqual(['09:00-12:00', '13:00-17:00']);
    expect(availability.getDateOverrides('PRO900')).toEqual([]);
  });
});
