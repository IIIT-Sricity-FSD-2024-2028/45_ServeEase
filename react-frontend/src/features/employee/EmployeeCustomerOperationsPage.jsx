import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { employeeOperationsApi } from '../../services/api'
import { Breadcrumb, Chip, LoadState, Metric } from './EmployeeOpsParts'
import { customerStats, display, filterCustomers } from './employeeOperations'
import { useOperationsData } from './useOperationsData'
import './employeeOperations.css'

const statusOptions = [['all', 'All Status'], ['Active', 'Active'], ['Blocked', 'Blocked']]

// customer-operations.html: GET /employee/customer-operations/customers (Customer Operations department only).
export default function EmployeeCustomerOperationsPage() {
  const { state, data, error, retry } = useOperationsData(employeeOperationsApi.customers)
  const [params, setParams] = useSearchParams()
  const query = params.get('q') || ''
  const status = statusOptions.some(([value]) => value === params.get('status')) ? params.get('status') : 'all'
  const stats = customerStats(data)
  const customers = useMemo(() => filterCustomers(data?.customers || [], { status, query }), [data, query, status])

  const setParam = (key, value) => setParams((current) => {
    const next = new URLSearchParams(current)
    if (value && value !== 'all') next.set(key, value); else next.delete(key)
    return next
  }, { replace: true })

  return <div className="employee-ops">
    <Breadcrumb items={[['Home', '/'], ['Employee'], ['Customer Operations']]} />
    <section aria-labelledby="customer-operations-title" className="ops-hero">
      <h1 id="customer-operations-title">Customer Operations</h1>
      <p>Internal customer management and operational visibility for ServeEase.</p>
    </section>
    <LoadState error={error} loadingText="Loading customer records…" onRetry={retry} state={state} />
    {state === 'ready' && <>
      <section aria-label="Customer operations summary" className="ops-stats">
        <Metric description="Registered customers" icon="👥" label="Customers" value={stats.customers} />
        <Metric description="Active accounts" icon="🟢" label="Active" value={stats.active} />
        <Metric description="Blocked accounts" icon="🔴" label="Blocked" value={stats.blocked} />
        <Metric description="Bookings across all customers" icon="📅" label="Total Bookings" value={stats.bookings} />
        <Metric description="Customer tickets" icon="🎟" label="Support Tickets" value={stats.tickets} />
      </section>
      <section aria-labelledby="manage-customers-title" className="ops-panel">
        <div className="ops-panel-head">
          <h2 id="manage-customers-title">Manage Customers ({customers.length})</h2>
          <select aria-label="Filter customers by status" className="ops-status-filter" onChange={(event) => setParam('status', event.target.value)} value={status}>
            {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <label className="ops-search">Search customers<input onChange={(event) => setParam('q', event.target.value)} placeholder="Name, email, phone, or status" type="search" value={query} /></label>
        <div className="ops-table-wrap table-scroll">
          <table className="ops-table">
            <thead><tr><th scope="col">Customer ID</th><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Phone</th><th scope="col">Bookings</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead>
            <tbody>{customers.length ? customers.map((customer) => <tr key={customer.id}>
              <td>{customer.id}</td>
              <td>{display(customer.fullName)}</td>
              <td>{display(customer.email)}</td>
              <td>{display(customer.phone)}</td>
              <td>{display(customer.bookings)}</td>
              <td><Chip value={customer.status} /></td>
              <td><Link aria-label={`View ${display(customer.fullName)}`} className="ops-action" to={`/employee/customer-operations/${encodeURIComponent(customer.id)}`}>View</Link></td>
            </tr>) : <tr><td colSpan="7"><div className="ops-empty">No existing customer records found for this view.</div></td></tr>}</tbody>
          </table>
        </div>
      </section>
    </>}
  </div>
}
