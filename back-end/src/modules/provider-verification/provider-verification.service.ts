import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateProviderVerificationDto, ProviderActionDto, RejectDocumentDto, RejectProviderDto } from './dto/provider-action.dto';
import { ProviderVerification, VerificationDocument } from './provider-verification.entity';
import { ProviderVerificationRepository } from './provider-verification.repository';

@Injectable()
export class ProviderVerificationService {
  constructor(private readonly providerRepository: ProviderVerificationRepository) {}

  findAll(): ProviderVerification[] {
    return [...this.providerRepository.findAll()].sort(
      (a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime(),
    );
  }

  findById(id: string): ProviderVerification {
    const provider = this.providerRepository.findById(id);
    if (!provider) {
      throw new NotFoundException(`Provider with id "${id}" was not found.`);
    }
    return provider;
  }

  create(data: CreateProviderVerificationDto): ProviderVerification {
    const supportedDocuments = data.documents.filter((document) => !document.documentType.toLowerCase().startsWith('police verification'));
    if (!supportedDocuments.length) {
      throw new BadRequestException('Provider verification requires uploaded documents.');
    }
    return this.providerRepository.create({ ...data, documents: supportedDocuments });
  }

  update(id: string, data: CreateProviderVerificationDto): ProviderVerification {
    const supportedDocuments = data.documents.filter((document) => !document.documentType.toLowerCase().startsWith('police verification'));
    if (!supportedDocuments.length) {
      throw new BadRequestException('Provider verification requires uploaded documents.');
    }
    return this.providerRepository.resubmit(id, { ...data, id, documents: supportedDocuments });
  }

  getDocuments(providerId: string): VerificationDocument[] {
    return this.findById(providerId).documents;
  }

  approveProvider(id: string, data: ProviderActionDto): ProviderVerification {
    const provider = this.findById(id);
    const missingDocuments = provider.documents.filter((document) => document.required && document.documentStatus !== 'Approved');

    if (missingDocuments.length) {
      throw new BadRequestException('All required documents must be approved before provider verification.');
    }

    provider.status = 'Verified';
    provider.verifiedAt = new Date().toISOString();
    provider.suspendedAt = undefined;
    provider.rejectionReason = undefined;
    provider.adminRemarks = data.adminRemarks || provider.adminRemarks;
    this.addHistory(provider, 'Verified', data.adminRemarks || 'Provider approved after document verification.');
    return this.providerRepository.update(provider);
  }

  rejectProvider(id: string, data: RejectProviderDto): ProviderVerification {
    const provider = this.findById(id);
    provider.status = 'Rejected';
    provider.rejectionReason = data.rejectionReason;
    provider.adminRemarks = data.adminRemarks || provider.adminRemarks;
    provider.verifiedAt = undefined;
    this.addHistory(provider, 'Rejected', data.rejectionReason);
    return this.providerRepository.update(provider);
  }

  suspendProvider(id: string, data: ProviderActionDto): ProviderVerification {
    const provider = this.findById(id);
    provider.status = 'Suspended';
    provider.suspendedAt = new Date().toISOString();
    provider.adminRemarks = data.adminRemarks || provider.adminRemarks;
    this.addHistory(provider, 'Suspended', data.adminRemarks || 'Provider suspended by admin.');
    return this.providerRepository.update(provider);
  }

  approveDocument(providerId: string, documentId: string): VerificationDocument {
    const provider = this.findById(providerId);
    const document = this.findDocument(provider, documentId);
    document.documentStatus = 'Approved';
    document.rejectionReason = undefined;
    this.addHistory(provider, 'Approved', `${document.documentType} approved.`);
    return document;
  }

  rejectDocument(providerId: string, documentId: string, data: RejectDocumentDto): VerificationDocument {
    const provider = this.findById(providerId);
    const document = this.findDocument(provider, documentId);
    document.documentStatus = 'Rejected';
    document.rejectionReason = data.rejectionReason;
    if (provider.status === 'Verified') {
      provider.status = 'Pending';
      provider.verifiedAt = undefined;
    }
    this.addHistory(provider, 'Rejected', `${document.documentType} rejected: ${data.rejectionReason}`);
    return document;
  }

  private findDocument(provider: ProviderVerification, documentId: string): VerificationDocument {
    const document = provider.documents.find((item) => item.documentId === documentId);
    if (!document) {
      throw new NotFoundException(`Document with id "${documentId}" was not found.`);
    }
    return document;
  }

  private addHistory(provider: ProviderVerification, status: ProviderVerification['status'] | VerificationDocument['documentStatus'], note: string) {
    provider.statusHistory.unshift({
      status,
      note,
      updatedBy: 'Admin',
      updatedAt: new Date().toISOString(),
    });
  }
}
