import { Module } from '@nestjs/common';
import { StateModule } from '../state/state.module';
import { ProviderDocumentMigrationController, ProviderDocumentsController, ProviderProfilePhotoController } from './provider-documents.controller';
import { ProviderDocumentsService } from './provider-documents.service';

@Module({
  imports: [StateModule],
  controllers: [ProviderDocumentsController, ProviderProfilePhotoController, ProviderDocumentMigrationController],
  providers: [ProviderDocumentsService],
  exports: [ProviderDocumentsService],
})
export class ProviderDocumentsModule {}
