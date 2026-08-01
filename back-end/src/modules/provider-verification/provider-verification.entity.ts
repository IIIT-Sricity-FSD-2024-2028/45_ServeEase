import { ApiProperty } from '@nestjs/swagger';

export type ProviderVerificationStatus = 'Pending' | 'Verified' | 'Rejected' | 'Suspended';
export type VerificationDocumentStatus = 'Pending' | 'Approved' | 'Rejected';

export class VerificationDocument {
  @ApiProperty({ example: 'DOC-PRO001-ID' })
  documentId: string;

  @ApiProperty({ example: 'ID Proof' })
  documentType: string;

  @ApiProperty({ example: 'Aadhaar Card' })
  documentName: string;

  @ApiProperty({ example: '/documents/providers/PRO001/aadhaar.pdf' })
  documentUrl: string;

  @ApiProperty({ example: 'Approved', enum: ['Pending', 'Approved', 'Rejected'] })
  documentStatus: VerificationDocumentStatus;

  @ApiProperty({ example: true })
  required: boolean;

  @ApiProperty({ example: '2026-03-08T10:30:00.000Z' })
  uploadedAt: string;

  @ApiProperty({ example: 'Document is blurred.', required: false })
  rejectionReason?: string;
}

export class ProviderStatusHistoryItem {
  @ApiProperty({ example: 'Pending' })
  status: ProviderVerificationStatus | VerificationDocumentStatus;

  @ApiProperty({ example: 'Provider submitted verification request.' })
  note: string;

  @ApiProperty({ example: 'System' })
  updatedBy: string;

  @ApiProperty({ example: '2026-03-08T10:30:00.000Z' })
  updatedAt: string;
}

export class ProviderVerification {
  @ApiProperty({ example: 'PRO013' })
  id: string;

  @ApiProperty({ example: 'Anita Verma' })
  name: string;

  @ApiProperty({ example: 'anita.verma@email.com' })
  email: string;

  @ApiProperty({ example: 'Anita Beauty Studio', required: false })
  organisationName?: string;

  @ApiProperty({ example: '+91 9876543230' })
  phone: string;

  @ApiProperty({ example: 'Salon Services' })
  category: string;

  @ApiProperty({ example: 5 })
  experience: number;

  @ApiProperty({ example: 'Mumbai' })
  location: string;

  @ApiProperty({ example: 'Andheri West, Mumbai' })
  address: string;

  @ApiProperty({ example: ['Hair styling', 'Facial care'] })
  skills: string[];

  @ApiProperty({ example: ['Beauty academy certificate'] })
  certifications: string[];

  @ApiProperty({ example: 128 })
  completedJobs: number;

  @ApiProperty({ example: 4.7 })
  rating: number;

  @ApiProperty({ example: '2026-03-08T10:30:00.000Z' })
  submittedDate: string;

  @ApiProperty({ example: '2026-03-08T10:30:00.000Z' })
  joinedDate: string;

  @ApiProperty({ example: 'Pending', enum: ['Pending', 'Verified', 'Rejected', 'Suspended'] })
  status: ProviderVerificationStatus;

  @ApiProperty({ type: [VerificationDocument] })
  documents: VerificationDocument[];

  @ApiProperty({ type: [ProviderStatusHistoryItem] })
  statusHistory: ProviderStatusHistoryItem[];

  @ApiProperty({ example: 'Needs one clearer document.', required: false })
  rejectionReason?: string;

  @ApiProperty({ example: 'Called provider and verified service area.', required: false })
  adminRemarks?: string;

  @ApiProperty({ example: '2026-03-10T10:30:00.000Z', required: false })
  verifiedAt?: string;

  @ApiProperty({ example: '2026-03-11T10:30:00.000Z', required: false })
  suspendedAt?: string;
}
