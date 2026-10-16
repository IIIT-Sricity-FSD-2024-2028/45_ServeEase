import { useCallback, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { employeeOperationsApi } from '../../services/api'
import { Breadcrumb } from './EmployeeOpsParts'
import { Chip, DocumentPreviewDialog, LoadState, ProviderNotFound } from './ProviderOpsParts'
import { availabilityRows, countLabel, display, formatDate, formatExperience, formatPrice, hasVerificationDetails, providerDetailStats } from './providerOperations'
import { useOperationsData } from './useOperationsData'
import './providerOperations.css'

// detailField(): the original labels carry a trailing " :".
function Field({ label, value }) {
  return <div className="provider-operations-detail-field"><span>{label} :</span><strong>{display(value)}</strong></div>
}

function StatCard({ icon, label, value, description }) {
  return <article className="provider-operations-detail-stat-card">
    <div className="provider-operations-detail-stat-label"><span aria-hidden="true" className="provider-operations-stat-icon">{icon}</span><span>{label}</span></div>
    <strong>{value}</strong>
    <small>{description}</small>
  </article>
}

function Card({ id, title, count, children }) {
  return <section aria-labelledby={id} className="provider-operations-detail-card">
    <div className="provider-operations-section-head"><h2 id={id}>{title}</h2>{count !== undefined && <span>{count}</span>}</div>
    {children}
  </section>
}

function Table({ headings, rows, empty }) {
  return <div className="provider-operations-table-wrap table-scroll"><table className="provider-operations-table">
    <thead><tr>{headings.map((heading) => <th key={heading} scope="col">{heading}</th>)}</tr></thead>
    <tbody>{rows.length ? rows : <tr><td colSpan={headings.length}><div className="provider-operations-empty-state">{empty}</div></td></tr>}</tbody>
  </table></div>
}

// provider-operations-detail.html sections, in the original order; `data` is GET .../providers/:id.
export function ProviderDetailSections({ data, onPreview }) {
  const { provider, documents = [], services = [], bookings = [], tickets = [], history = [] } = data
  const stats = providerDetailStats(services, bookings)
  const availability = availabilityRows(data.availability)
  return <>
    <Card id="provider-information-title" title="Provider Information">
      <div className="provider-operations-info-grid">
        <Field label="Provider ID" value={provider.id} />
        <Field label="Provider Name" value={provider.fullName} />
        <Field label="Organisation" value={provider.organisationName} />
        <Field label="Email" value={provider.email} />
        <Field label="Phone" value={provider.phone} />
        <Field label="Location" value={provider.location} />
        <Field label="Account Status" value={provider.accountStatus} />
        <Field label="Registration Date" value={provider.registrationDate && formatDate(provider.registrationDate)} />
        <Field label="Verification Status" value={provider.verificationStatus} />
        <Field label="Service Category" value={provider.serviceType} />
        <Field label="Experience" value={provider.experience === null || provider.experience === undefined ? null : formatExperience(provider.experience)} />
      </div>
    </Card>

    <section aria-label="Selected provider statistics" className="provider-operations-detail-stats">
      <StatCard description="All linked provider bookings" icon="📅" label="Total Bookings" value={stats.total} />
      <StatCard description="Pending or accepted bookings" icon="🟢" label="Upcoming" value={stats.upcoming} />
      <StatCard description="Completed provider jobs" icon="✓" label="Completed" value={stats.completed} />
      <StatCard description="Cancelled or rejected bookings" icon="✕" label="Cancelled" value={stats.cancelled} />
      <StatCard description="Active provider service records" icon="🛠" label="Active Services" value={stats.activeServices} />
    </section>

    {hasVerificationDetails(provider, documents) && <Card id="provider-verification-title" title="Provider Verification">
      <div className="provider-operations-info-grid">
        <Field label="Verification Status" value={provider.verificationStatus} />
        <Field label="Account Status" value={provider.accountStatus} />
        <Field label="Registration Date" value={provider.registrationDate && formatDate(provider.registrationDate)} />
        <Field label="Source" value="Registered provider account" />
        {provider.rejectionReason && <Field label="Rejection Reason" value={provider.rejectionReason} />}
        {provider.adminRemarks && <Field label="Admin Remarks" value={provider.adminRemarks} />}
      </div>
      <div className="provider-operations-list">
        {documents.length ? documents.map((document) => <div className="provider-operations-list-item" key={document.documentId}>
          <div className="provider-operations-document-type"><span>Document Type :</span><strong>{document.documentType || 'Document'}</strong></div>
          <div className="provider-operations-document-file"><span>File Name :</span><strong title={document.documentName || 'Not submitted'}>{document.documentName || 'Not submitted'}</strong></div>
          <div className="provider-operations-document-status"><span>Status :</span><Chip value={document.documentStatus} /></div>
          <div className="provider-operations-document-action"><span>Action :</span><button className="provider-operations-inline-action" onClick={() => onPreview(document)} type="button">Preview</button></div>
        </div>) : <div className="provider-operations-empty-state">No verification documents are recorded for this provider.</div>}
      </div>
    </Card>}

    <Card count={countLabel(services.length, 'service')} id="provider-services-title" title="Provider Services">
      <Table empty="No services are linked to this provider." headings={['Service Name', 'Category', 'Subcategory', 'Price', 'Location', 'Status']}
        rows={services.map((service) => <tr key={service.id}><td>{display(service.name)}</td><td>{display(service.category)}</td><td>{display(service.subcategory)}</td><td>{formatPrice(service.price)}</td><td>{display(service.location)}</td><td><Chip value={service.status} /></td></tr>)} />
    </Card>

    <Card count={countLabel(bookings.length, 'booking')} id="provider-booking-activity-title" title="Provider Booking Activity">
      <Table empty="No bookings are linked to this provider." headings={['Booking ID', 'Customer', 'Service', 'Date / Time', 'Status', 'Payment Status']}
        rows={bookings.map((booking) => <tr key={booking.id}><td>{booking.id}</td><td>{display(booking.customer)}</td><td>{display(booking.service)}</td><td className="provider-operations-cell-nowrap">{formatDate(booking.date)}{booking.time ? ` · ${booking.time}` : ''}</td><td><Chip value={booking.status} /></td><td><Chip value={booking.paymentStatus} /></td></tr>)} />
    </Card>

    <Card id="provider-availability-title" title="Availability Overview">
      <div className="provider-operations-list">
        {data.availability === null ? <div className="provider-operations-empty-state">No availability data is recorded for this provider.</div>
          : availability.length ? availability.map((row) => <div className="provider-operations-list-item provider-operations-list-item--pair" key={row.label}><span>{row.label}</span><strong>{row.value}</strong></div>)
            : <div className="provider-operations-empty-state">No availability slots are recorded for this provider.</div>}
      </div>
    </Card>

    <Card count={countLabel(tickets.length, 'ticket')} id="provider-support-title" title="Provider Support Context">
      <Table empty="No support tickets are linked to this provider." headings={['Ticket ID', 'Booking Reference', 'Subject', 'Category', 'Status', 'Created']}
        rows={tickets.map((ticket) => <tr key={ticket.ticketId}><td>{ticket.ticketId}</td><td>{display(ticket.relatedBookingId)}</td><td>{display(ticket.subject)}</td><td>{display(ticket.ticketType)}</td><td><Chip value={ticket.status} /></td><td>{formatDate(ticket.createdAt)}</td></tr>)} />
    </Card>

    <Card id="provider-status-history-title" title="Account Status History">
      <Table empty="No account status history is recorded for this provider." headings={['Date / Time', 'Action', 'Previous Status', 'New Status', 'Reason', 'Remarks', 'Updated By']}
        rows={history.map((item, index) => <tr key={`${item.dateTime}-${index}`}><td>{formatDate(item.dateTime)}</td><td>{display(item.action)}</td><td><Chip value={item.previousStatus} /></td><td><Chip value={item.newStatus} /></td><td>{display(item.reason)}</td><td>{display(item.remarks)}</td><td>{display(item.performedBy)}</td></tr>)} />
    </Card>
  </>
}

// provider-operations-detail.html?id= → /employee/provider-operations/:providerId (?listing= for shared ids).
export default function EmployeeProviderDetailPage() {
  const { providerId } = useParams()
  const [params] = useSearchParams()
  const listing = params.get('listing') || undefined
  const request = useCallback(() => employeeOperationsApi.provider(providerId, listing), [providerId, listing])
  const { state, data, error, retry } = useOperationsData(request)
  const [preview, setPreview] = useState(null)
  // The loader is created once per opened document so the dialog fetches the file exactly once.
  const openPreview = (document) => setPreview({ document, load: () => employeeOperationsApi.providerDocument(providerId, listing, document.documentId) })
  const notFound = state === 'error' && /not found|invalid provider id/i.test(error)
  const provider = data?.provider

  return <div className="provider-ops provider-ops--detail">
    <Breadcrumb items={[['Home', '/'], ['Employee'], ['Provider Operations', '/employee/provider-operations'], ['Provider Profile']]} />
    <Link className="provider-operations-back-link" to="/employee/provider-operations">← Back to Provider Operations</Link>
    <section aria-labelledby="provider-detail-title" className="provider-operations-hero">
      <h1 id="provider-detail-title">Provider Profile</h1>
      <p>{provider ? display(provider.organisationName || provider.fullName) : 'Selected provider operational view'}</p>
    </section>
    {notFound ? <ProviderNotFound message="The selected provider ID does not match an existing ServeEase provider record." />
      : <LoadState error={error} loadingText="Loading provider profile…" onRetry={retry} state={state} />}
    {state === 'ready' && provider && <ProviderDetailSections data={data} onPreview={openPreview} />}
    {preview && <DocumentPreviewDialog document={preview.document} load={preview.load} onClose={() => setPreview(null)} />}
  </div>
}
