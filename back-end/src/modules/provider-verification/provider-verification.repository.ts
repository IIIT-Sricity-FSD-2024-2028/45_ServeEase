import { Injectable } from '@nestjs/common';
import { CreateProviderVerificationDto } from './dto/provider-action.dto';
import { ProviderVerification, ProviderVerificationStatus, VerificationDocument } from './provider-verification.entity';

@Injectable()
export class ProviderVerificationRepository {
  private readonly providers: ProviderVerification[] = [
    this.createSeedProvider({
      id: 'PRO013',
      name: 'Anita Verma',
      organisationName: 'Anita Beauty Studio',
      email: 'anita.verma@email.com',
      phone: '+91 9876543230',
      category: 'Salon Services',
      experience: 5,
      location: 'Mumbai',
      address: 'Andheri West, Mumbai, Maharashtra',
      skills: ['Hair styling', 'Bridal makeup', 'Facial care'],
      certifications: ['Advanced beauty therapy certificate'],
      completedJobs: 128,
      rating: 4.7,
      submittedDate: '2026-03-08T10:30:00.000Z',
      status: 'Pending',
      approvedRequiredDocuments: 3,
    }),
    this.createSeedProvider({
      id: 'PRO014',
      name: 'Deepak Kumar',
      organisationName: 'Deepak Electricals',
      email: 'deepak.kumar@email.com',
      phone: '+91 9876543233',
      category: 'Electrical',
      experience: 4,
      location: 'Bangalore',
      address: 'Indiranagar, Bangalore, Karnataka',
      skills: ['Wiring repair', 'MCB replacement', 'Fan installation'],
      certifications: ['ITI electrician certificate'],
      completedJobs: 94,
      rating: 4.5,
      submittedDate: '2026-03-07T09:15:00.000Z',
      status: 'Pending',
      approvedRequiredDocuments: 5,
    }),
    this.createSeedProvider({
      id: 'PRO015',
      name: 'Manoj Singh',
      organisationName: 'Singh Appliance Care',
      email: 'manoj.singh@email.com',
      phone: '+91 9876543237',
      category: 'Appliance Repair',
      experience: 5,
      location: 'Delhi',
      address: 'Rohini, Delhi, NCR',
      skills: ['AC repair', 'Washing machine service', 'Refrigerator repair'],
      certifications: ['Appliance service technician certificate'],
      completedJobs: 176,
      rating: 4.8,
      submittedDate: '2026-02-10T12:00:00.000Z',
      status: 'Verified',
      approvedRequiredDocuments: 5,
      verifiedAt: '2026-02-11T12:00:00.000Z',
      adminRemarks: 'Strong profile and complete document set.',
    }),
    this.createSeedProvider({
      id: 'PRO016',
      name: 'Rekha Joshi',
      organisationName: 'Rekha Salon Services',
      email: 'rekha.joshi@email.com',
      phone: '+91 9876543240',
      category: 'Salon Services',
      experience: 3,
      location: 'Mumbai',
      address: 'Borivali West, Mumbai, Maharashtra',
      skills: ['Hair spa', 'Threading', 'Cleanup'],
      certifications: ['Salon assistant certificate'],
      completedJobs: 42,
      rating: 4.1,
      submittedDate: '2026-02-25T15:30:00.000Z',
      status: 'Rejected',
      approvedRequiredDocuments: 2,
      rejectionReason: 'Experience proof did not match declared work history.',
    }),
    this.createSeedProvider({
      id: 'PRO017',
      name: 'Ravi Verma',
      organisationName: 'Verma Pest Control',
      email: 'ravi.verma@email.com',
      phone: '+91 9876543250',
      category: 'Pest Control',
      experience: 7,
      location: 'Hyderabad',
      address: 'Madhapur, Hyderabad, Telangana',
      skills: ['Termite treatment', 'Cockroach control', 'Bed bug service'],
      certifications: ['Pest control chemical handling certificate'],
      completedJobs: 211,
      rating: 4.6,
      submittedDate: '2026-01-28T08:45:00.000Z',
      status: 'Suspended',
      approvedRequiredDocuments: 5,
      suspendedAt: '2026-03-12T08:45:00.000Z',
      adminRemarks: 'Suspended after customer compliance review.',
    }),
  ];

  findAll(): ProviderVerification[] {
    return this.providers;
  }

  findById(id: string): ProviderVerification | undefined {
    return this.providers.find((provider) => provider.id === id);
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

    if (existing) {
      Object.assign(existing, provider);
      return existing;
    }

    this.providers.unshift(provider);
    return provider;
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

  update(provider: ProviderVerification): ProviderVerification {
    return provider;
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
