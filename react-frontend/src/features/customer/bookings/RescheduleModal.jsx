import { useMemo, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../../store/hooks.js'
import {
  rescheduleBooking,
  selectRescheduleBookingMutationStatus,
} from '../../../store/bookings/bookingsSlice.js'
import { formatSlot } from '../../discovery/catalogModel'
import { useProviderAvailability } from '../../discovery/useProviderAvailability'
import { formatDisplayDate } from '../customerOperations'
import { OpsModal } from '../CustomerOpsParts'

export function RescheduleModal({ booking, onClose, onRescheduled }) {
  const dispatch = useAppDispatch()
  // The booking already records the provider account id the availability API expects.
  const { dates, loading, error: availabilityError, reload: loadAvailability } = useProviderAvailability(booking.providerId)
  // Only dates with an open slot are offered; the slice keeps the server response unchanged.
  const availability = useMemo(() => ({ loading, error: availabilityError, dates: dates.filter((item) => Array.isArray(item.slots) && item.slots.length) }), [dates, loading, availabilityError])
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [error, setError] = useState('')
  const saving = useAppSelector(selectRescheduleBookingMutationStatus(booking.id)) === 'loading'
  const close = () => { if (!saving) onClose() }
  const selectedDate = availability.dates.find((item) => item.date === date)
  async function confirm() {
    setError('')
    try {
      const saved = await dispatch(rescheduleBooking({ bookingId: booking.id, date, time })).unwrap()
      if (saved?.date !== date) throw new Error('The server did not confirm the new schedule.')
      onRescheduled(saved)
    } catch (requestError) {
      const message = requestError?.message || (typeof requestError === 'string' ? requestError : '') || 'The booking could not be rescheduled.'
      const visibleMessage = message === 'Booking request failed.' ? 'The booking could not be rescheduled.' : message
      setError(visibleMessage)
      if (/slot|available|availability/i.test(visibleMessage)) { setTime(''); loadAvailability() }
    }
  }
  return <OpsModal className="reschedule-modal" labelId="reschedule-booking-title" onClose={close} title="Reschedule Booking">
    <div className="reschedule-current"><strong>Current schedule:</strong> {formatDisplayDate(booking.date)} · {formatSlot(booking.time)}<div>{booking.service} · {booking.provider}</div></div>
    {error && <p className="ops-alert" role="alert">{error}</p>}
    <h3>Available Dates</h3>
    {availability.loading && <p role="status">Finding available appointments…</p>}
    {availability.error && <p role="alert">{availability.error} <button className="btn btn-outline" onClick={loadAvailability} type="button">Retry</button></p>}
    {!availability.loading && !availability.error && !availability.dates.length && <p>No appointments are available for the next 7 days. Please try again later.</p>}
    <div className="reschedule-date-row">{availability.dates.map((item) => <button aria-pressed={date === item.date} className={`reschedule-chip${date === item.date ? ' is-selected' : ''}`} key={item.date} onClick={() => { setDate(item.date); setTime('') }} type="button">{new Date(`${item.date}T12:00:00`).toLocaleDateString('en', { weekday: 'short' })} {formatDisplayDate(item.date).slice(0, 5)}</button>)}</div>
    <h3>Available Time Slots</h3>
    {!date && <p>Select a date to view available time slots.</p>}
    {selectedDate && <div className="reschedule-slot-grid">{selectedDate.slots.map((slot) => <button aria-pressed={time === slot} className={`reschedule-chip${time === slot ? ' is-selected' : ''}`} key={slot} onClick={() => setTime(slot)} type="button">{formatSlot(slot)}</button>)}</div>}
    <div className="reschedule-footer"><button className="btn btn-outline" disabled={saving} onClick={close} type="button">Keep Current Booking</button><button className="btn btn-primary" disabled={!date || !time || saving} onClick={confirm} type="button">{saving ? 'Rescheduling…' : 'Confirm Reschedule'}</button></div>
  </OpsModal>
}
