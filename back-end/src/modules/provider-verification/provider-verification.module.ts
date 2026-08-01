import { Module } from '@nestjs/common';
import { ProviderVerificationController } from './provider-verification.controller';
import { ProviderVerificationRepository } from './provider-verification.repository';
import { ProviderVerificationService } from './provider-verification.service';

@Module({
  controllers: [ProviderVerificationController],
  providers: [ProviderVerificationService, ProviderVerificationRepository],
})
export class ProviderVerificationModule {}
