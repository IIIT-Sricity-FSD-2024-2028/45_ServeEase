import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { CUSTOMER_SUSPENDED_CODE, SUSPENDED_CUSTOMER_MESSAGE, customerSuspensionReason, isSuspendedCustomer } from '../../common/customer-account-status';
import { employeeDepartment } from '../../common/employee-departments';
import { PROVIDER_SUSPENDED_CODE, SUSPENDED_PROVIDER_MESSAGE, isSuspendedProvider, providerSuspensionReason } from '../../common/provider-account-status';
import { writeProviderServices } from '../catalog/provider-services-store';
import { StateRepository } from '../state/state.repository';
import { LoginDto, RegisterDto } from './auth.dto';

type Account = Record<string, any>;
type Session = { userId: string; role: string; expiresAt: number };
const STATE_KEY = 'serveEaseData';
const cities: Record<number, string> = { 1: 'Chennai', 2: 'Bangalore', 3: 'Hyderabad', 4: 'Delhi', 5: 'Mumbai' };

@Injectable()
export class AuthService {
  private readonly sessions = new Map<string, Session>();
  constructor(private readonly state: StateRepository) {}

  login(input: LoginDto) {
    if (input.role === 'employee') return this.loginEmployee(input);
    const data = this.data();
    const email = String(input.email || '').toLowerCase();
    const user = (data.users || []).find((item: Account) => String(item.email || '').toLowerCase() === email);
    if (!user || user.role !== input.role || !this.verifyPassword(input.password, user)) throw new UnauthorizedException('Invalid email, password, or account type.');
    // Checked only after the password, so the suspension is never disclosed to someone without it.
    this.assertNotSuspended(user);
    if (user.password && !user.passwordHash) { user.passwordHash = this.hash(input.password); delete user.password; this.save(data); }
    return this.issue(user);
  }

  private loginEmployee(input: LoginDto) {
    const employeeId = String(input.employeeId || '').trim().toUpperCase();
    const employeeState = this.state.findById('serveEaseEmployeeModuleData')?.value as { employees?: Account[] } | undefined;
    const employee = employeeState?.employees?.find((item) => String(item.employeeId || '').toUpperCase() === employeeId);
    if (!employee || employee.department !== input.department || !this.verifyPassword(input.password, employee)) throw new UnauthorizedException('Invalid employee ID, password, or department.');
    const department = employeeDepartment(employee.department);
    if (!department) throw new UnauthorizedException('This employee department is not supported.');
    if (employee.password && !employee.passwordHash) { employee.passwordHash = this.hash(input.password); delete employee.password; this.state.update('serveEaseEmployeeModuleData', { value: employeeState as Record<string, unknown> }); }
    return this.issue(this.employeeAccount(employee));
  }

  register(input: RegisterDto) {
    const data = this.data(); const users: Account[] = data.users || (data.users = []);
    if (users.some((u) => String(u.email || '').toLowerCase() === input.email.toLowerCase())) throw new ConflictException('Email already exists.');
    if (users.some((u) => String(u.phone || '') === input.phone)) throw new ConflictException('Phone number already exists.');
    if (input.role === 'provider' && (!input.organisationName || !input.serviceType || input.experience === undefined || !input.cityId || !input.address || !input.idProofType)) throw new ConflictException('Complete all provider registration fields.');
    const id = this.nextId(input.role, users);
    const user: Account = { id, role: input.role, fullName: input.fullName.trim(), email: input.email.toLowerCase(), phone: input.phone, passwordHash: this.hash(input.password), registrationDate: new Date().toLocaleDateString('en-GB') };
    if (input.role === 'provider') Object.assign(user, { organisationName: input.organisationName, serviceType: input.serviceType, experience: input.experience, cityId: input.cityId, cityName: cities[input.cityId!] || '', location: cities[input.cityId!] || '', address: input.address, idProofType: input.idProofType, documents: (input.documents || []).map((document, index) => ({ ...document, documentId: `DOC-${id}-${index + 1}` })), approvalStatus: 'Pending Approval', verificationStatus: 'Pending', accountStatus: 'Under Verification', status: 'Under Verification' });
    const services = input.role === 'provider' ? this.initialServices(data, input, user) : [];
    users.push(user); this.save(data);
    // The provider's own services go to the one saved-services record, keyed by the new account id.
    if (services.length) writeProviderServices(this.state, id, services);
    return this.issue(user);
  }

  // Registration may carry the provider's initial services. Each must be a sub-service of the chosen category in
  // the catalog, at the provider's own price; nothing is defaulted or invented, and a category alone saves none.
  private initialServices(data: Record<string, any>, input: RegisterDto, user: Account): Array<Record<string, unknown>> {
    const requested = input.services || [];
    if (!requested.length) return [];
    const slug = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const wanted = slug(input.serviceType) === 'cleaning-services' ? 'home-cleaning' : slug(input.serviceType);
    const category = (Array.isArray(data.categories) ? data.categories : []).find((item: Account) => slug(item.id) === wanted || slug(item.name) === wanted);
    if (!category) throw new BadRequestException('Choose a service category from the list to add services.');
    const names = new Map<string, string>((Array.isArray(category.subServices) ? category.subServices : []).map((name: string) => [slug(name), String(name)] as [string, string]));
    const seen = new Set<string>();
    return requested.map((service, index) => {
      const name = names.get(slug(service.name));
      if (!name) throw new BadRequestException(`"${service.name}" is not a ${category.name} service.`);
      if (seen.has(slug(name))) throw new BadRequestException(`"${name}" is listed more than once.`);
      seen.add(slug(name));
      return { id: `SVC${String(index + 1).padStart(3, '0')}`, name, category: input.serviceType, description: `${name} offered by ${user.organisationName}`, price: service.price, cityId: user.cityId, cityName: user.cityName, location: user.cityName, status: 'Active', isActive: true, updatedAt: new Date().toISOString() };
    });
  }

  session(token: string) { const entry = this.sessions.get(token); if (!entry || entry.expiresAt < Date.now()) { this.sessions.delete(token); throw new UnauthorizedException('Session is invalid or expired.'); } return entry; }
  sessionUser(token: string) { return this.publicUser(this.activeAccount(token)); }
  principal(token: string) { const user = this.activeAccount(token); return { userId: String(user.id), role: String(user.role), email: String(user.email || '').toLowerCase(), providerCatalogId: user.providerCatalogId ? String(user.providerCatalogId) : undefined, department: user.role === 'support' ? employeeDepartment(user.department) : undefined }; }
  logout(token: string) { this.sessions.delete(token); }
  // Ends every session of one customer or provider (used on suspension); other users are untouched.
  revokeSessions(userId: string, role: 'customer' | 'provider') { let revoked = 0; for (const [token, entry] of this.sessions) if (entry.role === role && String(entry.userId) === userId) { this.sessions.delete(token); revoked += 1; } return revoked; }
  revokeCustomerSessions(customerId: string) { return this.revokeSessions(customerId, 'customer'); }
  // Resolves a live session to its account. Status is re-read from the stored record on every request, so a
  // suspended customer's or provider's existing session stops working immediately and is discarded.
  private activeAccount(token: string): Account {
    const user = this.accountForSession(this.session(token));
    try { this.assertNotSuspended(user); } catch (error) { this.sessions.delete(token); throw error; }
    return user;
  }
  // The structured 403 carries only a stable code and the reason recorded on this same account; it is raised
  // after the password (login) or a valid session, so it is never shown to someone who has not authenticated.
  private assertNotSuspended(user: Account) {
    if (isSuspendedCustomer(user)) throw new ForbiddenException({ statusCode: 403, error: 'Forbidden', message: SUSPENDED_CUSTOMER_MESSAGE, code: CUSTOMER_SUSPENDED_CODE, reason: customerSuspensionReason(user) });
    if (isSuspendedProvider(user)) throw new ForbiddenException({ statusCode: 403, error: 'Forbidden', message: SUSPENDED_PROVIDER_MESSAGE, code: PROVIDER_SUSPENDED_CODE, reason: providerSuspensionReason(user) });
  }
  private issue(user: Account) { const token = randomBytes(32).toString('base64url'); this.sessions.set(token, { userId: user.id, role: user.role, expiresAt: Date.now() + 8 * 60 * 60 * 1000 }); return { token, user: this.publicUser(user) }; }
  private publicUser(user: Account) { const safe = { ...user }; delete safe.password; delete safe.passwordHash; return safe; }
  private accountForSession(session: Session): Account {
    if (session.role === 'support') {
      const employeeState = this.state.findById('serveEaseEmployeeModuleData')?.value as { employees?: Account[] } | undefined;
      const employee = employeeState?.employees?.find((item) => String(item.employeeId) === String(session.userId));
      if (employee) return this.employeeAccount(employee);
    }
    const user = (this.data().users || []).find((item: Account) => item.id === session.userId);
    if (!user) throw new UnauthorizedException('Account no longer exists.');
    return user;
  }
  // Employees keep the shared 'support' role; their department is re-read from the employee record on every
  // login and session restore, and an unsupported value becomes null so it grants no workspace.
  private employeeAccount(employee: Account): Account {
    return { ...employee, id: employee.employeeId, role: 'support', department: employeeDepartment(employee.department), fullName: employee.name, email: employee.email || `${String(employee.employeeId).toLowerCase()}@serveease.local` };
  }
  private data(): Record<string, any> { return (this.state.findById(STATE_KEY)?.value as Record<string, any>) || { users: [] }; }
  private save(value: Record<string, any>) { const entry = this.state.findById(STATE_KEY); if (entry) this.state.update(STATE_KEY, { value }); else this.state.create({ key: STATE_KEY, value }); }
  private nextId(role: string, users: Account[]) { const prefix = role === 'customer' ? 'CUS' : 'PRO'; const max = users.filter((u) => String(u.id).startsWith(prefix)).reduce((n, u) => Math.max(n, Number(String(u.id).slice(3)) || 0), 0); return `${prefix}${String(max + 1).padStart(3, '0')}`; }
  private hash(password: string) { const salt = randomBytes(16).toString('hex'); return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`; }
  private verifyPassword(password: string, user: Account) { if (user.passwordHash) { const [salt, digest] = String(user.passwordHash).split(':'); const actual = scryptSync(password, salt, 64); const expected = Buffer.from(digest, 'hex'); return actual.length === expected.length && timingSafeEqual(actual, expected); } const expected = Buffer.from(String(user.password || '')); const actual = Buffer.from(password); return expected.length === actual.length && timingSafeEqual(actual, expected); }
}
