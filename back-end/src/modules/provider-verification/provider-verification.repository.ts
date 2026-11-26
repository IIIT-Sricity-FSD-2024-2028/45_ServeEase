import { Injectable } from '@nestjs/common';
import { CreateProviderVerificationDto } from './dto/provider-action.dto';
import { ProviderVerification, ProviderVerificationStatus, VerificationDocument } from './provider-verification.entity';
import { StateRepository } from '../state/state.repository';
import { VERIFICATION_DECISIONS, providerAccountStatus, providerVerificationStatus } from '../../common/provider-account-status';

type Account = Record<string, any>;
const ACCOUNTS_KEY = 'serveEaseData';
const documentIdOf = (account: Account, document: Account, index: number): string => document.documentId || `DOC-${account.id}-${index + 1}`;

@Injectable()
export class ProviderVerificationRepository {
  // Requests submitted through this API that have not been decided yet.
  private readonly submitted = new Map<string, ProviderVerification>();

  constructor(private readonly state: StateRepository) {}

  // Read from the stored accounts on every call, so changes made elsewhere are always shown.
  findAll(): ProviderVerification[] {
    const providers = new Map(this.accounts()
      .filter((account) => Array.isArray(account.documents) && account.documents.length > 0)
      .map((account) => [String(account.id), this.fromAccount(account)]));
    this.submitted.forEach((provider, id) => providers.set(id, provider));
    return [...providers.values()];
  }

  findById(id: string): ProviderVerification | undefined {
    return this.findAll().find((provider) => provider.id === id);
  }

  create(data: CreateProviderVerificationDto): ProviderVerification {
    const existing = this.findById(data.id);
    const submittedDate = new Date().toISOString();
    const provider: ProviderVerification = {
      id: data.id,
      name: data.name,
      email: data.email,
      organisationName: data.organisationName || data.name,
      phone: data.phone,
      category: data.category,
      experience: Number(data.experience) || 0,
      location: data.location,
      address: data.address,
      skills: [],
      certifications: [],
      completedJobs: 0,
      rating: 0,
      submittedDate,
      joinedDate: submittedDate,
      status: 'Pending',
      documents: data.documents.filter((document) => !document.documentType.toLowerCase().startsWith('police verification')).map((document, index) => ({
        ...document,
        documentId: document.documentId || `DOC-${data.id}-${index + 1}`,
        documentStatus: 'Pending',
        required: document.required !== false,
        uploadedAt: submittedDate,
      })),
      statusHistory: [
        {
          status: 'Pending',
          note: 'Provider submitted verification request with uploaded documents.',
          updatedBy: 'Provider',
          updatedAt: submittedDate,
        },
      ],
    };

    const next = existing ? { ...existing, ...provider } : provider;
    this.submitted.set(next.id, next);
    return next;
  }

  resubmit(id: string, data: CreateProviderVerificationDto): ProviderVerification {
    const provider = this.findById(id);
    if (!provider) throw new Error(`Provider with id "${id}" was not found.`);

    const submittedDate = new Date().toISOString();
    const submittedDocuments = data.documents.filter((document) => !document.documentType.toLowerCase().startsWith('police verification'));
    const existingDocumentByKey = new Map(provider.documents.map((document) => [document.documentId || document.documentType.toLowerCase(), document]));
    const nextDocuments = submittedDocuments.map((document, index) => {
      const key = document.documentId || document.documentType.toLowerCase();
      const existing = existingDocumentByKey.get(key);
      return {
        ...existing,
        ...document,
        documentId: document.documentId || existing?.documentId || `DOC-${id}-${index + 1}`,
        documentStatus: 'Pending' as const,
        required: document.required !== false,
        uploadedAt: submittedDate,
        rejectionReason: undefined,
      };
    });

    provider.name = data.name;
    provider.email = data.email;
    provider.organisationName = data.organisationName || data.name;
    provider.phone = data.phone;
    provider.category = data.category;
    provider.experience = Number(data.experience) || 0;
    provider.location = data.location;
    provider.address = data.address;
    provider.submittedDate = submittedDate;
    provider.status = 'Pending';
    provider.verifiedAt = undefined;
    provider.suspendedAt = undefined;
    provider.rejectionReason = undefined;
    provider.documents = nextDocuments;
    this.submitted.set(id, provider);
    provider.statusHistory.unshift({
      status: 'Pending',
      note: 'Provider resubmitted verification request.',
      updatedBy: 'Provider',
      updatedAt: submittedDate,
    });
    return provider;
  }

  getDocuments(providerId: string): VerificationDocument[] | undefined {
    return this.findById(providerId)?.documents;
  }

  // Saves an approve, reject or suspend decision on the provider account, which login and other pages read.
  update(provider: ProviderVerification): ProviderVerification {
    const fields = provider.status === 'Verified' ? VERIFICATION_DECISIONS.approve
      : provider.status === 'Rejected' ? VERIFICATION_DECISIONS.reject
        : provider.status === 'Suspended'
          ? { approvalStatus: 'Suspended', verificationStatus: 'Verified', accountStatus: 'Suspended', verified: true }
          : { approvalStatus: 'Pending Approval', verificationStatus: 'Pending', accountStatus: 'Under Verification', verified: false };
    const { approvalStatus, verificationStatus, accountStatus, verified } = fields;
    this.save(provider, (record) => {
      Object.assign(record, { approvalStatus, verificationStatus, accountStatus, status: accountStatus, verified });
      record.adminRemarks = provider.adminRemarks;
      record.rejectionReason = provider.rejectionReason;
      record.verifiedAt = provider.verifiedAt;
      record.statusHistory = provider.statusHistory;
    });
    return provider;
  }

  saveDocument(provider: ProviderVerification, document: VerificationDocument): void {
    this.save(provider, (record) => {
      (Array.isArray(record.documents) ? record.documents : []).forEach((stored: Account, index: number) => {
        if (documentIdOf(record, stored, index) !== document.documentId) return;
        stored.documentStatus = document.documentStatus;
        stored.rejectionReason = document.rejectionReason;
      });
      record.statusHistory = provider.statusHistory;
    });
  }

  private accounts(): Account[] {
    const data = this.state.findById(ACCOUNTS_KEY)?.value as { users?: Account[] } | undefined;
    return (Array.isArray(data?.users) ? data!.users! : []).filter((account) => account.role === 'provider');
  }

  private save(provider: ProviderVerification, apply: (record: Account) => void): void {
    const data = this.state.findById(ACCOUNTS_KEY)?.value as { users?: Account[]; providerApprovalRequests?: Account[] } | undefined;
    const account = this.accounts().find((item) => String(item.id) === provider.id);
    if (!data || !account) return;
    apply(account);
    const email = String(account.email || '').toLowerCase();
    (data.providerApprovalRequests || [])
      .filter((request) => String(request.id ?? request.providerId) === provider.id && (!request.email || String(request.email).toLowerCase() === email))
      .forEach(apply);
    this.submitted.delete(provider.id);
    this.state.update(ACCOUNTS_KEY, { value: data as Record<string, unknown> });
  }

  private createSeedProvider(seed: Omit<ProviderVerification, 'documents' | 'statusHistory' | 'joinedDate'> & { approvedRequiredDocuments: number }): ProviderVerification {
    const documents = this.createDocuments(seed.id, seed.approvedRequiredDocuments);
    const provider: ProviderVerification = {
      ...seed,
      joinedDate: seed.submittedDate,
      documents,
      statusHistory: [
        {
          status: 'Pending',
          note: 'Provider submitted verification request.',
          updatedBy: 'System',
          updatedAt: seed.submittedDate,
        },
      ],
    };

    if (seed.status !== 'Pending') {
      provider.statusHistory.push({
        status: seed.status,
        note: seed.rejectionReason || seed.adminRemarks || `Provider marked ${seed.status.toLowerCase()}.`,
        updatedBy: 'Admin',
        updatedAt: seed.verifiedAt || seed.suspendedAt || seed.submittedDate,
      });
    }

    return provider;
  }

  private fromAccount(account: Record<string, any>): ProviderVerification {
    const submittedDate = account.submittedDate || account.registrationDate || new Date().toISOString();
    // The same status rule as login and Provider Operations.
    const status: ProviderVerificationStatus = providerVerificationStatus(providerAccountStatus(account)) || 'Pending';
    const documents = account.documents.map((document: Record<string, any>, index: number) => ({
      ...document,
      documentId: documentIdOf(account, document, index),
      documentType: document.documentType || 'Verification Document',
      documentName: document.documentName || document.originalFilename || 'Uploaded document',
      documentStatus: document.documentStatus || (status === 'Verified' ? 'Approved' : 'Pending'),
      required: document.required !== false,
      uploadedAt: document.uploadedAt || submittedDate,
    }));
    return {
      id: String(account.id), name: account.fullName || account.organisationName || String(account.id),
      organisationName: account.organisationName || account.fullName, email: account.email || '', phone: account.phone || '',
      category: account.serviceType || account.category || 'Not specified', experience: Number(account.experience) || 0,
      location: account.location || account.cityName || '', address: account.address || '', skills: account.skills || [], certifications: account.certifications || [],
      completedJobs: Number(account.completedJobs) || 0, rating: Number(account.rating) || 0, submittedDate, joinedDate: submittedDate,
      status, documents, statusHistory: Array.isArray(account.statusHistory)
        ? account.statusHistory.map((entry: Account) => ({
          ...entry,
          status: entry.status || entry.newStatus,
          note: entry.note || entry.remarks || entry.reason || entry.action,
          updatedBy: entry.updatedBy || entry.performedBy,
          updatedAt: entry.updatedAt || entry.dateTime,
        }))
        : [{ status, note: 'Provider verification record loaded.', updatedBy: 'System', updatedAt: submittedDate }],
      rejectionReason: account.rejectionReason, adminRemarks: account.adminRemarks, verifiedAt: account.verifiedAt,
    };
  }

  private createDocuments(providerId: string, approvedRequiredDocuments: number): VerificationDocument[] {
    const definitions: Array<[string, string, boolean]> = [
      ['ID Proof', 'Aadhaar Card', true],
      ['Address Proof', 'Electricity Bill', true],
      ['Skill Certificate', 'Skill Training Certificate', false],
      ['Experience Proof', 'Previous Employer Letter', false],
      ['Profile Photo', 'Profile Photo', true],
    ];
    const documents: VerificationDocument[] = definitions.map(([documentType, documentName, required], index) => ({
      documentId: `DOC-${providerId}-${index + 1}`,
      documentType,
      documentName,
      documentUrl: `/documents/providers/${providerId}/${documentType.toLowerCase().replace(/\s+/g, '-')}.pdf`,
      documentStatus: index < approvedRequiredDocuments ? 'Approved' as const : 'Pending' as const,
      required,
      uploadedAt: '2026-03-08T10:30:00.000Z',
    }));

    return documents;
  }
}
