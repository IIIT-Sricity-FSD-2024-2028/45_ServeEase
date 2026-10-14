import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
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
    if (user.password && !user.passwordHash) { user.passwordHash = this.hash(input.password); delete user.password; this.save(data); }
    return this.issue(user);
  }

  private loginEmployee(input: LoginDto) {
    const employeeId = String(input.employeeId || '').trim().toUpperCase();
    const employeeState = this.state.findById('serveEaseEmployeeModuleData')?.value as { employees?: Account[] } | undefined;
    const employee = employeeState?.employees?.find((item) => String(item.employeeId || '').toUpperCase() === employeeId);
    if (!employee || employee.department !== input.department || !this.verifyPassword(input.password, employee)) throw new UnauthorizedException('Invalid employee ID, password, or department.');
    if (employee.password && !employee.passwordHash) { employee.passwordHash = this.hash(input.password); delete employee.password; this.state.update('serveEaseEmployeeModuleData', { value: employeeState as Record<string, unknown> }); }
    return this.issue({ ...employee, id: employee.employeeId, role: 'support', fullName: employee.name, email: employee.email || `${employee.employeeId.toLowerCase()}@serveease.local` });
  }

  register(input: RegisterDto) {
    const data = this.data(); const users: Account[] = data.users || (data.users = []);
    if (users.some((u) => String(u.email || '').toLowerCase() === input.email.toLowerCase())) throw new ConflictException('Email already exists.');
    if (users.some((u) => String(u.phone || '') === input.phone)) throw new ConflictException('Phone number already exists.');
    if (input.role === 'provider' && (!input.organisationName || !input.serviceType || input.experience === undefined || !input.cityId || !input.address || !input.idProofType)) throw new ConflictException('Complete all provider registration fields.');
    const id = this.nextId(input.role, users);
    const user: Account = { id, role: input.role, fullName: input.fullName.trim(), email: input.email.toLowerCase(), phone: input.phone, passwordHash: this.hash(input.password), registrationDate: new Date().toLocaleDateString('en-GB') };
    if (input.role === 'provider') Object.assign(user, { organisationName: input.organisationName, serviceType: input.serviceType, experience: input.experience, cityId: input.cityId, cityName: cities[input.cityId!] || '', location: cities[input.cityId!] || '', address: input.address, idProofType: input.idProofType, documents: input.documents || [], approvalStatus: 'Pending Approval', verificationStatus: 'Pending', accountStatus: 'Under Verification', status: 'Under Verification' });
    users.push(user); this.save(data); return this.issue(user);
  }

  session(token: string) { const entry = this.sessions.get(token); if (!entry || entry.expiresAt < Date.now()) { this.sessions.delete(token); throw new UnauthorizedException('Session is invalid or expired.'); } return entry; }
  sessionUser(token: string) { const session = this.session(token); const user = this.accountForSession(session); return this.publicUser(user); }
  principal(token: string) { const session = this.session(token); const user = this.accountForSession(session); return { userId: String(user.id), role: String(user.role), email: String(user.email || '').toLowerCase(), providerCatalogId: user.providerCatalogId ? String(user.providerCatalogId) : undefined }; }
  logout(token: string) { this.sessions.delete(token); }
  private issue(user: Account) { const token = randomBytes(32).toString('base64url'); this.sessions.set(token, { userId: user.id, role: user.role, expiresAt: Date.now() + 8 * 60 * 60 * 1000 }); return { token, user: this.publicUser(user) }; }
  private publicUser(user: Account) { const safe = { ...user }; delete safe.password; delete safe.passwordHash; return safe; }
  private accountForSession(session: Session): Account {
    if (session.role === 'support') {
      const employeeState = this.state.findById('serveEaseEmployeeModuleData')?.value as { employees?: Account[] } | undefined;
      const employee = employeeState?.employees?.find((item) => String(item.employeeId) === String(session.userId));
      if (employee) return {
        ...employee,
        id: employee.employeeId,
        role: 'support',
        fullName: employee.name,
        email: employee.email || `${String(employee.employeeId).toLowerCase()}@serveease.local`,
      };
    }
    const user = (this.data().users || []).find((item: Account) => item.id === session.userId);
    if (!user) throw new UnauthorizedException('Account no longer exists.');
    return user;
  }
  private data(): Record<string, any> { return (this.state.findById(STATE_KEY)?.value as Record<string, any>) || { users: [] }; }
  private save(value: Record<string, any>) { const entry = this.state.findById(STATE_KEY); if (entry) this.state.update(STATE_KEY, { value }); else this.state.create({ key: STATE_KEY, value }); }
  private nextId(role: string, users: Account[]) { const prefix = role === 'customer' ? 'CUS' : 'PRO'; const max = users.filter((u) => String(u.id).startsWith(prefix)).reduce((n, u) => Math.max(n, Number(String(u.id).slice(3)) || 0), 0); return `${prefix}${String(max + 1).padStart(3, '0')}`; }
  private hash(password: string) { const salt = randomBytes(16).toString('hex'); return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`; }
  private verifyPassword(password: string, user: Account) { if (user.passwordHash) { const [salt, digest] = String(user.passwordHash).split(':'); const actual = scryptSync(password, salt, 64); const expected = Buffer.from(digest, 'hex'); return actual.length === expected.length && timingSafeEqual(actual, expected); } const expected = Buffer.from(String(user.password || '')); const actual = Buffer.from(password); return expected.length === actual.length && timingSafeEqual(actual, expected); }
}
