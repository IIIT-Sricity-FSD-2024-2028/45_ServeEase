import { useCallback, useEffect, useMemo, useState } from 'react'
import { availabilityApi } from '../../../services/api'
import { availabilityDays } from './availabilityConstants'

const emptySchedule = Object.fromEntries(availabilityDays.map(([key]) => [key, []]))
const slotPattern = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/

function isoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}-${String(date.getDate()).padStart(2, '0')}`
}

function parseSlot(value) {
  const match = slotPattern.exec(String(value || ''))
  if (!match) return null
  const start = Number(match[1]) * 60 + Number(match[2])
  const end = Number(match[3]) * 60 + Number(match[4])
  if (Number(match[1]) > 23 || Number(match[3]) > 23 || Number(match[2]) > 59 || Number(match[4]) > 59 || start >= end) return null
  return { start, end }
}

function fromResponse(response) {
  return availabilityDays.reduce((result, [key]) => ({ ...result, [key]: Array.isArray(response?.weeklySchedule?.[key]) ? response.weeklySchedule[key] : [] }), {})
}

function slotParts(slot) {
  const [start = '', end = ''] = String(slot || '').split('-')
  return { start, end }
}

function weekdayKey(date) {
  return availabilityDays[(date.getDay() + 6) % 7][0]
}

function formatMonth(date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function validateSchedule(schedule) {
  for (const [key, label] of availabilityDays) {
    const parsed = schedule[key].map(parseSlot)
    if (parsed.some((slot) => !slot)) return `${label} contains an invalid slot. Use HH:mm-HH:mm.`
    for (let index = 0; index < parsed.length; index += 1) {
      if (parsed.slice(index + 1).some((next) => parsed[index].start < next.end && next.start < parsed[index].end)) return `${label} contains overlapping slots.`
    }
  }
  return ''
}

export function ProviderAvailabilityPanel({ providerId, embedded = false }) {
  const [schedule, setSchedule] = useState(emptySchedule)
  const [enabledDays, setEnabledDays] = useState(Object.fromEntries(availabilityDays.map(([key]) => [key, true])))
  const [overrides, setOverrides] = useState([])
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState('')
  const [draftOverride, setDraftOverride] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [overrideSaving, setOverrideSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [weekly, dateOverrides] = await Promise.all([availabilityApi.getWeeklySchedule(providerId), availabilityApi.getDateOverrides(providerId)])
      const nextSchedule = fromResponse(weekly)
      setSchedule(nextSchedule)
      setEnabledDays(Object.fromEntries(availabilityDays.map(([key]) => [key, nextSchedule[key].length > 0])))
      setOverrides(Array.isArray(dateOverrides) ? dateOverrides : [])
    } catch (requestError) {
      setError(requestError.message || 'Unable to load availability settings.')
    } finally {
      setLoading(false)
    }
  }, [providerId])

  // The effect synchronizes the panel with the authenticated provider API.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (providerId) load() }, [load, providerId])

  const updateSlot = (key, index, part, value) => {
    setSchedule((current) => ({ ...current, [key]: current[key].map((slot, slotIndex) => { if (slotIndex !== index) return slot; const parts = slotParts(slot); return part === 'start' ? `${value}-${parts.end}` : `${parts.start}-${value}` }) }))
    setError(''); setNotice('')
  }

  const addSlot = (key) => { setSchedule((current) => ({ ...current, [key]: [...current[key], '09:00-10:00'] })); setEnabledDays((current) => ({ ...current, [key]: true })); setError(''); setNotice('') }
  const removeSlot = (key, index) => { setSchedule((current) => ({ ...current, [key]: current[key].filter((_, slotIndex) => slotIndex !== index) })); setError(''); setNotice('') }
  const toggleDay = (key, enabled) => { setEnabledDays((current) => ({ ...current, [key]: enabled })); if (enabled && !schedule[key].length) addSlot(key); setError(''); setNotice('') }

  const saveSchedule = async (event) => {
    event.preventDefault()
    const validationError = validateSchedule(schedule)
    if (validationError) { setError(validationError); setNotice(''); return }
    setSaving(true); setError(''); setNotice('')
    try {
      const weeklySchedule = Object.fromEntries(availabilityDays.map(([key]) => [key, enabledDays[key] ? schedule[key] : []]))
      const saved = await availabilityApi.saveWeeklySchedule(providerId, weeklySchedule)
      setSchedule(fromResponse(saved)); setNotice('Availability updated successfully.')
    } catch (requestError) { setError(requestError.message || 'Unable to save weekly schedule.') } finally { setSaving(false) }
  }

  const selected = selectedDate ? new Date(`${selectedDate}T00:00:00`) : null
  const selectedKey = selected ? weekdayKey(selected) : ''
  const selectedSlots = selectedKey ? schedule[selectedKey].filter((slot) => parseSlot(slot)) : []
  const existingOverride = overrides.find((override) => override.date === selectedDate)
  const calendarCells = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1)
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    const leading = (start.getDay() + 6) % 7
    return [...Array(leading).fill(null), ...Array.from({ length: count }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1))]
  }, [month])

  const selectDate = (date) => {
    const value = isoDate(date)
    if (value < isoDate(new Date()) || !enabledDays[weekdayKey(date)] || !schedule[weekdayKey(date)].length) return
    const existing = overrides.find((override) => override.date === value)
    setSelectedDate(value); setDraftOverride(existing ? { fullDayOff: existing.fullDayOff, disabledSlots: existing.disabledSlots || [] } : { fullDayOff: false, disabledSlots: [] }); setError(''); setNotice('')
  }

  const saveOverride = async () => {
    if (!selectedDate || !draftOverride || overrideSaving) return
    setOverrideSaving(true); setError(''); setNotice('')
    try {
      if (!draftOverride.fullDayOff && !draftOverride.disabledSlots.length) {
        if (existingOverride) await availabilityApi.deleteDateOverride(providerId, selectedDate)
      } else {
        await availabilityApi.saveDateOverride(providerId, selectedDate, { fullDayOff: draftOverride.fullDayOff, disabledSlots: draftOverride.disabledSlots, enabledSlots: [] })
      }
      const updated = await availabilityApi.getDateOverrides(providerId)
      setOverrides(Array.isArray(updated) ? updated : []); setSelectedDate(''); setDraftOverride(null); setNotice('Availability updated successfully.')
    } catch (requestError) { setError(requestError.message || 'Unable to save this date override.') } finally { setOverrideSaving(false) }
  }

  if (loading) return <div className="provider-availability-skeleton" role="status" aria-label="Loading availability settings"><span /><span /><span /><span /></div>

  return <div className={`provider-availability-manager ${embedded ? 'is-embedded' : ''}`}>
    {error && <div className="provider-availability-feedback provider-availability-feedback--error" role="alert">{error}</div>}
    {notice && <div className="provider-availability-feedback provider-availability-feedback--success" role="status">{notice}</div>}
    <section className="provider-weekly-section" aria-labelledby="weeklyScheduleHeading">
      <div className="provider-availability-section-head"><div><h3 id="weeklyScheduleHeading">Weekly schedule</h3><p>Set the recurring hours customers can book.</p></div><button className="btn btn-primary availability-save-weekly" disabled={saving} onClick={saveSchedule} type="button">{saving ? 'Saving…' : 'Save Changes'}</button></div>
      <div className="provider-weekday-grid">{availabilityDays.map(([key, label]) => <article className="provider-weekday-card" key={key}><div className="provider-weekday-head"><h4>{label}</h4><label className="availability-day-toggle"><input checked={enabledDays[key]} disabled={saving} onChange={(event) => toggleDay(key, event.target.checked)} type="checkbox" /><span>{enabledDays[key] ? 'Available' : 'Unavailable'}</span></label></div><div className="provider-weekly-slots">{!enabledDays[key] ? <p>Unavailable</p> : schedule[key].map((slot, index) => { const parts = slotParts(slot); return <div className="provider-weekly-slot" key={`${key}-${index}`}><input aria-label={`${label} slot ${index + 1} start`} disabled={saving} onChange={(event) => updateSlot(key, index, 'start', event.target.value)} type="time" value={parts.start} /><span aria-hidden="true">–</span><input aria-label={`${label} slot ${index + 1} end`} disabled={saving} onChange={(event) => updateSlot(key, index, 'end', event.target.value)} type="time" value={parts.end} /><button aria-label={`Remove ${label} slot ${index + 1}`} disabled={saving} onClick={() => removeSlot(key, index)} type="button">×</button></div> })}</div><button className="availability-add-slot" disabled={saving || !enabledDays[key]} onClick={() => addSlot(key)} type="button">+ Add slot</button></article>)}</div>
    </section>
    <section className="provider-override-section" aria-labelledby="providerOverridesHeading"><div className="provider-availability-section-head"><div><h3 id="providerOverridesHeading">Date-specific overrides</h3><p>Set one-off time changes without affecting your weekly schedule. Customers book within the next 7 days, so changes to later dates show once those dates come into range.</p></div></div><div className="availability-calendar-toolbar"><button aria-label="Previous month" className="calendar-nav-btn" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} type="button">←</button><strong>{formatMonth(month)}</strong><button aria-label="Next month" className="calendar-nav-btn" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} type="button">→</button></div><div className="availability-calendar-weekdays">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}</div><div className="availability-calendar-grid">{calendarCells.map((date, index) => date ? <button className={`availability-calendar-day ${overrides.some((item) => item.date === isoDate(date)) ? 'has-override' : ''} ${selectedDate === isoDate(date) ? 'is-selected' : ''}`} disabled={isoDate(date) < isoDate(new Date()) || !enabledDays[weekdayKey(date)] || !schedule[weekdayKey(date)].length} key={isoDate(date)} onClick={() => selectDate(date)} type="button">{date.getDate()}</button> : <span className="availability-calendar-blank" key={`blank-${index}`} />)}</div></section>
    {selected && draftOverride && <aside className="availability-override-drawer" aria-label="Date override editor"><div className="availability-drawer-head"><div><span>Selected date</span><h3>{selected.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</h3></div><button aria-label="Close date override" className="availability-close-btn" onClick={() => { setSelectedDate(''); setDraftOverride(null) }} type="button">×</button></div><label className="availability-full-day-toggle"><input checked={draftOverride.fullDayOff} onChange={(event) => setDraftOverride((current) => ({ ...current, fullDayOff: event.target.checked }))} type="checkbox" /><span>Full day off</span></label>{!draftOverride.fullDayOff && <div className="availability-override-slots">{selectedSlots.map((slot) => <label className="availability-override-slot" key={slot}><input checked={!draftOverride.disabledSlots.includes(slot)} onChange={(event) => setDraftOverride((current) => ({ ...current, disabledSlots: event.target.checked ? current.disabledSlots.filter((item) => item !== slot) : [...current.disabledSlots, slot] }))} type="checkbox" /><span>{slot}</span></label>)}</div>}<div className="availability-drawer-actions"><button className="btn btn-primary" disabled={overrideSaving} onClick={saveOverride} type="button">{overrideSaving ? 'Saving…' : 'Save'}</button><button className="secondary-btn" onClick={() => { setSelectedDate(''); setDraftOverride(null) }} type="button">Cancel</button></div></aside>}
  </div>
}
