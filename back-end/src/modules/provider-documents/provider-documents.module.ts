import { Module } from '@nestjs/common';
import { StateModule } from '../state/state.module';
import { ProviderDocumentMigrationController, ProviderDocumentsController } from './provider-documents.controller';
import { ProviderDocumentsService } from './provider-documents.service';

@Module({
  imports: [StateModule],
  controllers: [ProviderDocumentsController, ProviderDocumentMigrationController],
  providers: [ProviderDocumentsService],
  exports: [ProviderDocumentsService],
})
export class ProviderDocumentsModule {}
