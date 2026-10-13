import { EmptyState, ErrorState, LoadingState } from '../../components/common/FeedbackStates'
import { AdminAccessGate } from './AdminAccessGate'
import { listBookings, listEscalatedTickets } from './adminApi'
import { money, show, useAdminData } from './useAdminData'
import './admin.css'

function RecordsTable({ columns, records, rowKey }) {
  return <div className="admin-table-wrap"><table className="admin-table">
    <thead><tr>{columns.map((column) => <th key={column.label}>{column.label}</th>)}</tr></thead>
    <tbody>{records.map((record, index) => <tr key={record[rowKey] ?? `${rowKey}-${index}`}>
      {columns.map((column) => <td key={column.label}>{column.render ? column.render(record) : show(record[column.field])}</td>)}
    </tr>)}</tbody>
  </table></div>
}

export default function AdminBookingsPage() {
  const bookings = useAdminData(listBookings)
  const tickets = useAdminData(listEscalatedTickets)
  const bookingRecords = Array.isArray(bookings.data) ? bookings.data : []
  const ticketRecords = Array.isArray(tickets.data) ? tickets.data : []

  return (
    <AdminAccessGate>
      <section className="admin-page">
        <h1>Bookings and escalated tickets</h1>

        <section className="admin-panel">
          <h2>Bookings</h2>
          {bookings.isLoading && <LoadingState message="Loading bookings…" />}
          {!bookings.isLoading && bookings.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={bookings.error} /><button className="admin-button" onClick={bookings.reload} type="button">Retry</button></div>}
          {!bookings.isLoading && !bookings.error && bookingRecords.length === 0 && <EmptyState message="No bookings are available." />}
          {!bookings.isLoading && !bookings.error && bookingRecords.length > 0 && <RecordsTable
            columns={[
              { label: 'ID', field: 'id' },
              { label: 'Service', field: 'service' },
              { label: 'Customer', render: (record) => show(record.customerName || record.customerEmail || record.customerId) },
              { label: 'Provider', render: (record) => show(record.provider || record.providerId) },
              { label: 'Date', field: 'date' },
              { label: 'Status', field: 'status' },
              { label: 'Amount', render: (record) => record.amount === null || record.amount === undefined || record.amount === '' ? 'Not available' : money(record.amount) },
            ]}
            records={bookingRecords}
            rowKey="id"
          />}
        </section>

        <section className="admin-panel">
          <h2>Escalated tickets</h2>
          {tickets.isLoading && <LoadingState message="Loading escalated tickets…" />}
          {!tickets.isLoading && tickets.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={tickets.error} /><button className="admin-button" onClick={tickets.reload} type="button">Retry</button></div>}
          {!tickets.isLoading && !tickets.error && ticketRecords.length === 0 && <EmptyState message="No escalated tickets are available." />}
          {!tickets.isLoading && !tickets.error && ticketRecords.length > 0 && <RecordsTable
            columns={[
              { label: 'Ticket ID', field: 'ticketId' },
              { label: 'Subject', field: 'subject' },
              { label: 'Raised by', field: 'raisedByName' },
              { label: 'Priority', field: 'priority' },
              { label: 'Status', field: 'status' },
              { label: 'Escalation reason', field: 'escalationReason' },
            ]}
            records={ticketRecords}
            rowKey="ticketId"
          />}
        </section>
      </section>
    </AdminAccessGate>
  )
}
