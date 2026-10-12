import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../context/useAuth'
import { availabilityApi } from '../../../services/api'
import { apiRequest } from '../../../services/apiClient'
import './providerAvailability.css'

const days = [
  ['monday', 'Monday'],
  ['tuesday', 'Tuesday'],
  ['wednesday', 'Wednesday'],
  ['thursday', 'Thursday'],
  ['friday', 'Friday'],
  ['saturday', 'Saturday'],
  ['sunday', 'Sunday'],
]

const emptySchedule = Object.fromEntries(days.map(([key]) => [key, []]))
const slotPattern = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/

function scheduleFromResponse(response) {
  return days.reduce((schedule, [key]) => ({
    ...schedule,
    [key]: Array.isArray(response?.weeklySchedule?.[key]) ? response.weeklySchedule[key] : [],
  }), {})
}

function parseSlot(slot) {
  const match = slotPattern.exec(slot.trim())
  if (!match) return null
  const start = Number(match[1]) * 60 + Number(match[2])
  const end = Number(match[3]) * 60 + Number(match[4])
  if (Number(match[1]) > 23 || Number(match[3]) > 23 || Number(match[2]) > 59 || Number(match[4]) > 59 || start >= end) return null
  return { start, end }
}

function slotParts(slot) {
  const [start = '', end = ''] = String(slot || '').split('-')
  return { start, end }
}

function validateSchedule(schedule) {
  for (const [key, label] of days) {
    const slots = schedule[key]
    const parsed = slots.map(parseSlot)
    if (parsed.some((slot) => !slot)) return `${label} contains an invalid slot. Use HH:mm-HH:mm, for example 09:00-12:00.`
    for (let index = 0; index < parsed.length; index += 1) {
      if (parsed.slice(index + 1).some((next) => parsed[index].start < next.end && next.start < parsed[index].end)) return `${label} contains overlapping slots.`
    }
  }
  return ''
}

export function ProviderAvailabilityPage() {
  const { currentUser, isAuthenticated, role } = useAuth()
  const providerId = currentUser?.providerId || currentUser?.providerCatalogId || currentUser?.userId
  const [schedule, setSchedule] = useState(emptySchedule)
  const [isLoading, setIsLoading] = useState(Boolean(providerId && role === 'provider'))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!providerId || role !== 'provider') return undefined
    let active = true
    availabilityApi.getWeeklySchedule(providerId)
      .then((response) => { if (active) setSchedule(scheduleFromResponse(response)) })
      .catch((requestError) => { if (active) setError(requestError.message || 'No weekly schedule is configured yet. You can create one below.') })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [providerId, role])

  function updateSlot(key, index, part, value) {
    setSchedule((current) => ({
      ...current,
      [key]: current[key].map((slot, slotIndex) => {
        if (slotIndex !== index) return slot
        const parts = slotParts(slot)
        return part === 'start' ? `${value}-${parts.end}` : `${parts.start}-${value}`
      }),
    }))
    setError('')
    setNotice('')
  }

  function addSlot(key) {
    setSchedule((current) => ({ ...current, [key]: [...current[key], ''] }))
    setError('')
    setNotice('')
  }

  function removeSlot(key, index) {
    setSchedule((current) => ({ ...current, [key]: current[key].filter((_, slotIndex) => slotIndex !== index) }))
    setError('')
    setNotice('')
  }

  async function saveSchedule(event) {
    event.preventDefault()
    const validationError = validateSchedule(schedule)
    if (validationError) {
      setError(validationError)
      setNotice('')
      return
    }
    setIsSaving(true)
    setError('')
    setNotice('')
    try {
      const saved = await apiRequest(`/availability/providers/${encodeURIComponent(providerId)}/weekly-schedule`, {
        method: 'PUT',
        body: JSON.stringify({ weeklySchedule: schedule }),
      })
      setSchedule(scheduleFromResponse(saved))
      setNotice('Weekly availability saved successfully.')
    } catch (requestError) {
      setError(requestError.message || 'Unable to save weekly availability.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isAuthenticated || role !== 'provider') return <section className="provider-availability-page"><div className="provider-availability-feedback">Please sign in with a provider account to manage availability.</div></section>
  if (!providerId) return <section className="provider-availability-page"><div className="provider-availability-feedback provider-availability-feedback--error">Your provider profile could not be identified.</div></section>

  return <section className="provider-availability-page">
    <div className="provider-availability-breadcrumb"><Link to="/provider/dashboard">Provider Dashboard</Link><span aria-hidden="true">›</span><strong>Availability</strong></div>
    <div className="provider-availability-title-row"><div><h1>Availability Management</h1><p>Set the recurring weekly slots when customers can request your services.</p></div><Link className="provider-availability-secondary-link" to="/provider/services">Manage Services</Link></div>
    {isLoading && <div className="provider-availability-feedback">Loading weekly availability…</div>}
    {error && <div className="provider-availability-feedback provider-availability-feedback--error" role="alert">{error}</div>}
    {notice && <div className="provider-availability-feedback provider-availability-feedback--success" role="status">{notice}</div>}
    {!isLoading && <form className="provider-availability-form" onSubmit={saveSchedule}>
      <div className="provider-availability-panel"><h2>Weekly Schedule</h2><p>Add individual 24-hour time slots with the Add slot and Remove slot controls. For example, use <code>09:00</code> to <code>12:00</code> for one slot. Leave a day empty for no availability.</p>
        <div className="provider-availability-days">{days.map(([key, label]) => <article className="provider-availability-day-card" key={key}>
          <div className="provider-availability-day-head"><div><h3>{label}</h3><span>{schedule[key].length ? `${schedule[key].length} slot${schedule[key].length === 1 ? '' : 's'}` : 'Unavailable'}</span></div><button className="provider-availability-add-slot" disabled={isSaving} onClick={() => addSlot(key)} type="button">+ Add slot</button></div>
          {schedule[key].length === 0 && <p className="provider-availability-empty-day">No slots configured.</p>}
          {schedule[key].map((slot, index) => {
            const parts = slotParts(slot)
            return <div className="provider-availability-slot" key={`${key}-${index}`}>
              <label>Start<input aria-label={`${label} slot ${index + 1} start`} disabled={isSaving} onChange={(event) => updateSlot(key, index, 'start', event.target.value)} type="time" value={parts.start} /></label>
              <span aria-hidden="true">–</span>
              <label>End<input aria-label={`${label} slot ${index + 1} end`} disabled={isSaving} onChange={(event) => updateSlot(key, index, 'end', event.target.value)} type="time" value={parts.end} /></label>
              <button aria-label={`Remove ${label} slot ${index + 1}`} className="provider-availability-remove-slot" disabled={isSaving} onClick={() => removeSlot(key, index)} type="button">×</button>
            </div>
          })}
        </article>)}</div>
        <div className="provider-availability-actions"><button className="provider-availability-primary" disabled={isSaving} type="submit">{isSaving ? 'Saving…' : 'Save Weekly Availability'}</button></div>
      </div>
    </form>}
  </section>
}
