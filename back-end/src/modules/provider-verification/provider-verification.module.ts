import { Module } from '@nestjs/common';
import { ProviderVerificationController } from './provider-verification.controller';
import { ProviderVerificationRepository } from './provider-verification.repository';
import { ProviderVerificationService } from './provider-verification.service';
import { StateModule } from '../state/state.module';

@Module({
  imports: [StateModule],
  controllers: [ProviderVerificationController],
  providers: [ProviderVerificationService, ProviderVerificationRepository],
})
export class ProviderVerificationModule {}
