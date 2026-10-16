import { Module } from '@nestjs/common';
import { AvailabilityModule } from '../availability/availability.module';
import { BookingsModule } from '../bookings/bookings.module';
import { ProviderDocumentsModule } from '../provider-documents/provider-documents.module';
import { CatalogModule } from '../catalog/catalog.module';
import { StateModule } from '../state/state.module';
import { TicketsModule } from '../tickets/tickets.module';
import { EmployeeOperationsController } from './employee-operations.controller';
import { EmployeeOperationsService } from './employee-operations.service';
import { ProviderOperationsService } from './provider-operations.service';

@Module({
  imports: [StateModule, BookingsModule, TicketsModule, CatalogModule, AvailabilityModule, ProviderDocumentsModule],
  controllers: [EmployeeOperationsController],
  providers: [EmployeeOperationsService, ProviderOperationsService],
})
export class EmployeeOperationsModule {}
