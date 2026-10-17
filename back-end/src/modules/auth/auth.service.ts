import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { CUSTOMER_SUSPENDED_CODE, SUSPENDED_CUSTOMER_MESSAGE, customerSuspensionReason, isSuspendedCustomer } from '../../common/customer-account-status';
import { employeeDepartment } from '../../common/employee-departments';
import { PROVIDER_SUSPENDED_CODE, SUSPENDED_PROVIDER_MESSAGE, isSuspendedProvider, providerSuspensionReason } from '../../common/provider-account-status';
import { writeProviderServices } from '../catalog/provider-services-store';
import { StateRepository } from '../state/state.repository';
import { LoginDto, RegisterDto, UpdateProviderProfileDto } from './auth.dto';

type Account = Record<string, any>;
type Session = { userId: string; role: string; expiresAt: number };
const STATE_KEY = 'serveEaseData';
// One message for every rejected login, so a failure never reveals whether the identifier exists, which kind
// of account it is, or which half of the credential was wrong.
const INVALID_LOGIN = 'Invalid credentials. Check your email or ServeEase ID and password.';
const cities: Record<number, string> = { 1: 'Chennai', 2: 'Bangalore', 3: 'Hyderabad', 4: 'Delhi', 5: 'Mumbai' };

@Injectable()
export class AuthService {
  private readonly sessions = new Map<string, Session>();
  constructor(private readonly state: StateRepository) {}

  // Login takes an identifier and a password, and nothing else. An email addresses a self-registered
  // consumer identity; an id addresses an identity ServeEase issued. Emails contain an @ and issued ids do
  // not, so the two namespaces cannot overlap and one email may hold both a customer and a provider account.
  login(input: LoginDto) {
    const identifier = String(input.identifier || '').trim();
    if (!identifier) throw new UnauthorizedException(INVALID_LOGIN);
    return identifier.includes('@') ? this.loginByEmail(identifier, input.password) : this.loginById(identifier, input.password);
  }

  // Providers and the legacy support stubs are reached by their issued id, never by email. That exclusion is
  // what keeps this lookup single-valued once one email may hold a customer and a provider account at once.
  private loginByEmail(identifier: string, password: string) {
    const data = this.data();
    const email = identifier.toLowerCase();
    const user = (data.users || []).find((item: Account) => String(item.email || '').trim().toLowerCase() === email && (item.role === 'customer' || item.role === 'superuser'));
    if (!user || !this.verifyPassword(password, user)) throw new UnauthorizedException(INVALID_LOGIN);
    return this.completeLogin(user, password, data);
  }

  private loginById(identifier: string, password: string) {
    const id = identifier.toUpperCase();
    const employeeState = this.state.findById('serveEaseEmployeeModuleData')?.value as { employees?: Account[] } | undefined;
    const employee = employeeState?.employees?.find((item) => String(item.employeeId || '').toUpperCase() === id);
    if (employee) return this.loginEmployee(employee, employeeState!, password);
    const data = this.data();
    // Only an operational account answers to an id. Role 'support' rows in users are legacy stubs carrying no
    // department, so they are excluded here: a session on one would authenticate into an empty workspace.
    const user = (data.users || []).find((item: Account) => String(item.id || '').toUpperCase() === id && (item.role === 'provider' || item.role === 'superuser'));
    if (!user || !this.verifyPassword(password, user)) throw new UnauthorizedException(INVALID_LOGIN);
    return this.completeLogin(user, password, data);
  }

  // The department is read from the stored employee record alone; the client no longer supplies it and so can
  // no longer influence which workspace it is matched against.
  private loginEmployee(employee: Account, employeeState: { employees?: Account[] }, password: string) {
    if (!this.verifyPassword(password, employee)) throw new UnauthorizedException(INVALID_LOGIN);
    if (!employeeDepartment(employee.department)) throw new UnauthorizedException('This employee department is not supported.');
    if (employee.password && !employee.passwordHash) { employee.passwordHash = this.hash(password); delete employee.password; this.state.update('serveEaseEmployeeModuleData', { value: employeeState as Record<string, unknown> }); }
    return this.issue(this.employeeAccount(employee));
  }

  private completeLogin(user: Account, password: string, data: Record<string, any>) {
    // Checked only after the password, so the suspension is never disclosed to someone without it.
    this.assertNotSuspended(user);
    if (user.password && !user.passwordHash) { user.passwordHash = this.hash(password); delete user.password; this.save(data); }
    return this.issue(user);
  }

  register(input: RegisterDto) {
    const data = this.data(); const users: Account[] = data.users || (data.users = []);
    // Uniqueness is per role, not global: a provider is free to book services, so the same person may register
    // a customer account on the email and phone their provider account already uses. Two accounts of the same
    // role on one email stay rejected.
    const sameRole = users.filter((u) => u.role === input.role);
    const email = input.email.trim().toLowerCase();
    if (sameRole.some((u) => String(u.email || '').trim().toLowerCase() === email)) throw new ConflictException('Email already exists.');
    if (sameRole.some((u) => String(u.phone || '') === input.phone)) throw new ConflictException('Phone number already exists.');
    if (input.role === 'provider' && (!input.organisationName || !input.serviceType || input.experience === undefined || !input.cityId || !input.address || !input.idProofType)) throw new ConflictException('Complete all provider registration fields.');
    const id = this.nextId(input.role, users);
    const user: Account = { id, role: input.role, fullName: input.fullName.trim(), email, phone: input.phone, passwordHash: this.hash(input.password), registrationDate: new Date().toISOString().slice(0, 10) };
    // A customer account starts Active and records it, so Customer Operations counts and shows it like every other account.
    if (input.role === 'customer') Object.assign(user, { accountStatus: 'Active', status: 'Active' });
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
      // A listed sub-service keeps the catalog's spelling; the registration form's "Other" sends a service the
      // category does not list yet, which the provider names themselves.
      const name = names.get(slug(service.name)) || String(service.name ?? '').trim();
      if (!slug(name)) throw new BadRequestException('Every service you offer needs a name.');
      if (seen.has(slug(name))) throw new BadRequestException(`"${name}" is listed more than once.`);
      seen.add(slug(name));
      return { id: `SVC${String(index + 1).padStart(3, '0')}`, name, category: input.serviceType, description: `${name} offered by ${user.organisationName}`, price: service.price, cityId: user.cityId, cityName: user.cityName, location: user.cityName, status: 'Active', isActive: true, updatedAt: new Date().toISOString() };
    });
  }

  // An account edits only itself, resolved from the session; customers may change only their phone number.
  updateProviderProfile(token: string, input: UpdateProviderProfileDto) {
    const session = this.session(token);
    const data = this.data();
    const user = (data.users || []).find((item: Account) => item.id === session.userId && item.role === session.role);
    if (!user) throw new UnauthorizedException('Account no longer exists.');
    this.assertNotSuspended(user);
    if (!['provider', 'customer'].includes(session.role)) throw new ForbiddenException('Only customers and providers can update their profile.');
    if (session.role === 'customer' && Object.keys(input).some((key) => key !== 'phone')) throw new ForbiddenException('Customers can update only their phone number.');
    if (input.phone && (data.users || []).some((item: Account) => item.id !== user.id && item.role === user.role && String(item.phone || '') === input.phone)) throw new ConflictException('Phone number already exists.');
    if (input.fullName !== undefined) user.fullName = input.fullName.trim();
    if (input.organisationName !== undefined) user.organisationName = input.organisationName.trim();
    if (input.phone !== undefined) user.phone = input.phone;
    if (input.experience !== undefined) user.experience = input.experience;
    if (input.cityId !== undefined) Object.assign(user, { cityId: input.cityId, cityName: cities[input.cityId], location: cities[input.cityId] });
    for (const key of ['bankName', 'accountHolder', 'accountNumber', 'ifsc'] as const) if (input[key] !== undefined) user[key] = key === 'ifsc' ? input[key]!.toUpperCase() : input[key]!.trim();
    // Customers see the provider through its catalog listing; keep the stored listing's name in step with the account.
    for (const listing of (Array.isArray(data.providers) ? data.providers : []) as Account[]) {
      if (String(listing.ownerProviderId) !== String(user.id)) continue;
      if (input.organisationName !== undefined) listing.name = user.organisationName;
    }
    this.save(data);
    return this.publicUser(user);
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
  // Providers that never entered bank details show the original site's sample details (provider.js
  // buildProviderProfile), with the account holder defaulting to the provider's own name. Saved values replace them.
  private publicUser(user: Account) {
    const safe = { ...user }; delete safe.password; delete safe.passwordHash;
    if (safe.role === 'provider') {
      safe.bankName = safe.bankName || 'HDFC Bank';
      safe.accountHolder = safe.accountHolder || safe.organisationName || safe.fullName;
      safe.accountNumber = safe.accountNumber || 'XXXXXX1129';
      safe.ifsc = safe.ifsc || 'HDFC0001234';
    }
    return safe;
  }
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
