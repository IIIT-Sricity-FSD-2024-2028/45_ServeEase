import { AppShell } from './AppShell'

// Employee workspaces are closed operational areas. A generic footer exposes public-site links, so it is
// intentionally omitted for every employee department (including Support).
export function EmployeeLayout() {
  return <AppShell area="Employee" footer={false} />
}
