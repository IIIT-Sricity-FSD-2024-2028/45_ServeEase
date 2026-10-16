import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/FeedbackStates'
import { AdminAccessGate } from './AdminAccessGate'
import { getEmployeeModuleData, saveEmployeeModuleData } from './adminApi'
import { show, useAdminData } from './useAdminData'
import './admin.css'

const departments = [
  { name: 'Customer Operations', permission: 'CUSTOMER_OPERATIONS' },
  { name: 'Provider Operations', permission: 'PROVIDER_OPERATIONS' },
  { name: 'Support', permission: 'SUPPORT' },
]

const employeeRoles = {
  'customer-operations': { label: 'Customer Operations', department: 'Customer Operations', permission: 'CUSTOMER_OPERATIONS', prefix: 'EMP-CO-' },
  'provider-operations': { label: 'Provider Operations', department: 'Provider Operations', permission: 'PROVIDER_OPERATIONS', prefix: 'EMP-PO-' },
  'customer-support': { label: 'Customer Support', department: 'Support', permission: 'SUPPORT', prefix: 'EMP-SUP-' },
}

const protectedEmployeeIds = new Set(['EMP-CO-001', 'EMP-PO-001', 'EMP-SUP-001'])
const workspaceLinks = [
  { label: 'Customer Operations', to: '/employee/customer-operations' },
  { label: 'Provider Operations', to: '/employee/provider-operations' },
  { label: 'Support', to: '/employee/support-tickets' },
]
const platformLinks = [
  { label: 'Service Categories', to: '/admin/categories' },
  { label: 'Provider Verification', to: '/admin/verification' },
  { label: 'Finance & Revenue', to: '/admin/finance' },
]
const authorityLinks = [
  { label: 'User Management', to: '/admin/customers' },
  { label: 'Escalated Tickets', to: '/admin/escalated-tickets' },
]

function generatedEmployeeId(role, employees) {
  if (!role) return ''
  const prefix = role.prefix.toLocaleUpperCase()
  const ids = new Set(employees.map((employee) => String(employee.employeeId || '').toLocaleUpperCase()))
  const pattern = new RegExp(`^${prefix}(\\d+)$`)
  let max = employees.reduce((highest, employee) => {
    const match = String(employee.employeeId || '').toLocaleUpperCase().match(pattern)
    return match ? Math.max(highest, Number(match[1]) || 0) : highest
  }, 0)
  let nextId
  do {
    max += 1
    nextId = `${prefix}${String(max).padStart(3, '0')}`
  } while (ids.has(nextId))
  return nextId
}

function createTemporaryPassword() {
  const groups = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '@#$%^&*!']
  const alphabet = groups.join('')
  const secureIndex = (length) => {
    if (!globalThis.crypto?.getRandomValues) return Math.floor(Math.random() * length)
    const sample = new Uint32Array(1)
    const limit = Math.floor(0x100000000 / length) * length
    do { globalThis.crypto.getRandomValues(sample) } while (sample[0] >= limit)
    return sample[0] % length
  }
  const characters = groups.map((group) => group[secureIndex(group.length)])
  while (characters.length < 12) characters.push(alphabet[secureIndex(alphabet.length)])
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = secureIndex(index + 1)
    ;[characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]]
  }
  return characters.join('')
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function validPhone(value) {
  return /^[6-9]\d{9}$/.test(value.trim())
}

function DirectorySection({ kicker, title, links }) {
  return <section className="admin-panel admin-administration-directory admin-administration-directory--links">
    <div><p className="admin-administration-kicker">{kicker}</p><h2>{title}</h2></div>
    <div className="admin-administration-links">{links.map((link) => <Link className="admin-button admin-button--secondary" key={link.to} to={link.to}>{link.label}</Link>)}</div>
  </section>
}

export default function AdminAdministrationPage() {
  const moduleState = useAdminData(getEmployeeModuleData)
  const [activeDepartment, setActiveDepartment] = useState('All')
  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState({ role: '', name: '', email: '', phone: '' })
  const [errors, setErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [operationError, setOperationError] = useState('')
  const [notice, setNotice] = useState(null)
  const [createdCredentials, setCreatedCredentials] = useState(null)
  const [pendingRemoval, setPendingRemoval] = useState(null)

  const moduleData = moduleState.data?.value || {}
  const employeeRecords = moduleState.data?.value?.employees
  const employees = useMemo(() => Array.isArray(employeeRecords) ? employeeRecords : [], [employeeRecords])
  const visibleEmployees = useMemo(() => activeDepartment === 'All'
    ? employees
    : activeDepartment === 'Other'
      ? employees.filter((employee) => !departments.some((department) => department.name === employee.department))
      : employees.filter((employee) => employee.department === activeDepartment), [activeDepartment, employees])
  const hasOtherDepartment = employees.some((employee) => !departments.some((department) => department.name === employee.department))
  const departmentTabs = [
    { name: 'All', count: employees.length },
    ...departments.map((department) => ({ name: department.name, count: employees.filter((employee) => employee.department === department.name).length })),
    ...(hasOtherDepartment ? [{ name: 'Other', count: employees.filter((employee) => !departments.some((department) => department.name === employee.department)).length }] : []),
  ]

  function selectedRole() {
    return employeeRoles[draft.role] || null
  }

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
    setOperationError('')
  }

  function openForm() {
    setDraft({ role: '', name: '', email: '', phone: '' })
    setErrors({})
    setOperationError('')
    setCreatedCredentials(null)
    setFormOpen(true)
  }

  function closeForm() {
    if (isSaving) return
    setFormOpen(false)
    setErrors({})
    setOperationError('')
  }

  async function persistEmployeeList(nextEmployees) {
    await saveEmployeeModuleData({ ...moduleData, employees: nextEmployees }, Boolean(moduleState.data?.exists))
    await moduleState.reload()
  }

  async function createEmployee(event) {
    event.preventDefault()
    if (isSaving || moduleState.isLoading || moduleState.error) return
    const role = selectedRole()
    const name = draft.name.trim()
    const email = draft.email.trim().toLocaleLowerCase()
    const phone = draft.phone.trim()
    const duplicate = employees.some((employee) => String(employee.email || '').toLocaleLowerCase() === email)
    const nextErrors = {
      role: role ? '' : 'Employee role is required.',
      name: name ? '' : 'Name is required.',
      email: validEmail(email) ? (duplicate ? 'An employee with this email already exists.' : '') : 'Enter a valid email address.',
      phone: validPhone(phone) ? '' : 'Enter a valid 10-digit phone number.',
    }
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) return

    const employee = {
      employeeId: generatedEmployeeId(role, employees),
      name,
      email,
      phone,
      department: role.department,
      permissions: [role.permission],
      password: createTemporaryPassword(),
    }
    setIsSaving(true)
    setOperationError('')
    setNotice(null)
    try {
      await persistEmployeeList([...employees, employee])
      setCreatedCredentials({ ...employee, roleLabel: role.label })
      setFormOpen(false)
      setDraft({ role: '', name: '', email: '', phone: '' })
      setActiveDepartment('All')
      setNotice({ type: 'success', text: `${employee.name} (${employee.employeeId}) was added.` })
    } catch (error) {
      setOperationError(error?.message || 'Unable to create the employee record.')
    } finally {
      setIsSaving(false)
    }
  }

  async function removeEmployee() {
    if (!pendingRemoval || isSaving) return
    setIsSaving(true)
    setOperationError('')
    try {
      await persistEmployeeList(employees.filter((employee) => employee.employeeId !== pendingRemoval.employeeId))
      setNotice({ type: 'success', text: `${pendingRemoval.name} (${pendingRemoval.employeeId}) was removed.` })
      setPendingRemoval(null)
    } catch (error) {
      setOperationError(error?.message || 'Unable to remove the employee.')
    } finally {
      setIsSaving(false)
    }
  }

  async function copyTemporaryPassword() {
    if (!createdCredentials?.password || !navigator.clipboard?.writeText) {
      setNotice({ type: 'error', text: 'Copy is unavailable in this browser. Select and copy the temporary password.' })
      return
    }
    try {
      await navigator.clipboard.writeText(createdCredentials.password)
      setNotice({ type: 'success', text: 'Temporary password copied.' })
    } catch {
      setNotice({ type: 'error', text: 'Password could not be copied. Select and copy it manually.' })
    }
  }

  return <AdminAccessGate>
    <section className="admin-page admin-administration-page">
      <nav aria-label="Administration navigation" className="admin-administration-nav"><Link to="/admin">Superuser Dashboard</Link><Link to="/login">Login</Link></nav>
      <header className="admin-page-header admin-administration-hero"><div><h1>Administration</h1><p>Manage platform administration and access operational workspaces.</p></div><Link className="admin-button" to="/admin">Open Dashboard</Link></header>

      <section className="admin-panel admin-administration-directory admin-administration-employees">
        <div className="admin-administration-employee-intro">
          <p className="admin-administration-kicker">Superuser Administration</p>
          <h2>Employee Management</h2>
          <button className="admin-button" disabled={moduleState.isLoading || Boolean(moduleState.error)} onClick={openForm} type="button">+ Add New Employee</button>
        </div>
        <div className="admin-administration-employee-data">
          <p className="admin-administration-description">Manage internal ServeEase employees and department access.</p>
          {moduleState.isLoading && <LoadingState message="Loading employee records…" />}
          {!moduleState.isLoading && moduleState.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={moduleState.error} /><button className="admin-button admin-button--secondary admin-button--small" onClick={moduleState.reload} type="button">Retry</button></div>}
          {!moduleState.isLoading && !moduleState.error && <>
            {notice && <p className={`admin-administration-notice admin-administration-notice--${notice.type}`} role="status">{notice.text}</p>}
            {createdCredentials && <section aria-label="New employee credentials" className="admin-administration-created">
              <h3>Employee created</h3>
              <dl>
                <div><dt>Employee ID</dt><dd>{createdCredentials.employeeId}</dd></div>
                <div><dt>Name</dt><dd>{createdCredentials.name}</dd></div>
                <div><dt>Role</dt><dd>{createdCredentials.roleLabel}</dd></div>
                <div><dt>Email</dt><dd>{createdCredentials.email}</dd></div>
                <div><dt>Phone</dt><dd>{createdCredentials.phone}</dd></div>
                <div><dt>Temporary Password</dt><dd><code>{createdCredentials.password}</code></dd></div>
              </dl>
              <button className="admin-button admin-button--secondary admin-button--small" onClick={copyTemporaryPassword} type="button">Copy Password</button>
            </section>}

            {formOpen && <form className="admin-administration-form" onSubmit={createEmployee} noValidate>
              <div className="admin-administration-form-head"><h3>Add New Employee</h3><button aria-label="Close add employee form" className="admin-icon-button" onClick={closeForm} type="button">×</button></div>
              <div className="admin-administration-form-grid">
                <label>Employee Role
                  <select onChange={(event) => updateDraft('role', event.target.value)} value={draft.role}>
                    <option value="">Select employee role</option>
                    <option value="customer-operations">Customer Operations</option>
                    <option value="provider-operations">Provider Operations</option>
                    <option value="customer-support">Customer Support</option>
                  </select>
                  {errors.role && <small className="admin-administration-field-error">{errors.role}</small>}
                </label>
                <label>Name
                  <input autoComplete="name" onChange={(event) => updateDraft('name', event.target.value)} value={draft.name} />
                  {errors.name && <small className="admin-administration-field-error">{errors.name}</small>}
                </label>
                <label>Email ID
                  <input autoComplete="email" onChange={(event) => updateDraft('email', event.target.value)} type="email" value={draft.email} />
                  {errors.email && <small className="admin-administration-field-error">{errors.email}</small>}
                </label>
                <label>Phone Number
                  <input autoComplete="tel" inputMode="numeric" maxLength={10} onChange={(event) => updateDraft('phone', event.target.value.replace(/\D/g, ''))} type="tel" value={draft.phone} />
                  {errors.phone && <small className="admin-administration-field-error">{errors.phone}</small>}
                </label>
                <label>Employee ID
                  <input aria-readonly="true" readOnly placeholder="Select a role to generate an ID" value={generatedEmployeeId(selectedRole(), employees)} />
                </label>
              </div>
              {operationError && <ErrorState message={operationError} />}
              <div className="admin-administration-form-actions"><button className="admin-button" disabled={isSaving} type="submit">{isSaving ? 'Creating…' : 'Create Employee'}</button><button className="admin-button admin-button--secondary" disabled={isSaving} onClick={closeForm} type="button">Cancel</button></div>
            </form>}

            <div aria-label="Filter employees by department" className="admin-administration-tabs">
              {departmentTabs.map((tab) => <button aria-pressed={activeDepartment === tab.name} className={`admin-administration-tab${activeDepartment === tab.name ? ' is-active' : ''}`} key={tab.name} onClick={() => setActiveDepartment(tab.name)} type="button">{tab.name === 'All' ? 'All' : tab.name} <span>{tab.count}</span></button>)}
            </div>
            {employees.length === 0 && <EmptyState message="No employee records are available." />}
            {employees.length > 0 && <div className="admin-administration-table-wrap"><table className="admin-administration-table">
              <thead><tr><th>Employee ID</th><th>Name</th><th>Department</th><th>Permissions</th><th>Actions</th></tr></thead>
              <tbody>{visibleEmployees.map((employee) => {
                const protectedRow = protectedEmployeeIds.has(String(employee.employeeId || '').toLocaleUpperCase())
                return <tr key={employee.employeeId}>
                  <td>{show(employee.employeeId)}</td><td>{show(employee.name)}</td><td>{show(employee.department)}</td><td>{Array.isArray(employee.permissions) ? employee.permissions.join(', ') : 'Not available'}</td>
                  <td>{protectedRow ? <span className="admin-administration-protected" title="Default employees cannot be removed.">Default</span> : <button className="admin-button admin-button--secondary admin-button--small" onClick={() => { setPendingRemoval({ employeeId: employee.employeeId, name: employee.name, department: employee.department }); setOperationError('') }} type="button">Remove</button>}</td>
                </tr>
              })}</tbody>
            </table></div>}
          </>}
        </div>
      </section>

      <DirectorySection kicker="Platform Administration" title="Platform Configuration" links={platformLinks} />
      <DirectorySection kicker="Platform Authority" title="Superuser Tools" links={authorityLinks} />
      <DirectorySection kicker="Employee Departments" title="Operational Workspaces" links={workspaceLinks} />

      {pendingRemoval && <div className="admin-modal-backdrop admin-administration-modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget && !isSaving) setPendingRemoval(null) }}>
        <section aria-labelledby="admin-remove-employee-title" aria-modal="true" className="admin-administration-remove-modal" role="dialog">
          <header><div><h2 id="admin-remove-employee-title">Remove Employee</h2><p>{pendingRemoval.name} ({pendingRemoval.employeeId})</p></div><button aria-label="Close remove employee dialog" className="admin-notification-close" disabled={isSaving} onClick={() => setPendingRemoval(null)} type="button">×</button></header>
          <div className="admin-administration-remove-body"><p>Are you sure you want to remove {pendingRemoval.name} ({pendingRemoval.employeeId})?</p>{operationError && <ErrorState message={operationError} />}</div>
          <footer><button className="admin-button admin-button--secondary" disabled={isSaving} onClick={() => setPendingRemoval(null)} type="button">Cancel</button><button className="admin-button" disabled={isSaving} onClick={removeEmployee} type="button">{isSaving ? 'Removing…' : 'Confirm Remove'}</button></footer>
        </section>
      </div>}
    </section>
  </AdminAccessGate>
}
