import { Module } from '@nestjs/common';
import { ActivitiesModule } from './modules/activities/activities.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { ProviderVerificationModule } from './modules/provider-verification/provider-verification.module';
import { StateModule } from './modules/state/state.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { AvailabilityModule } from './modules/availability/availability.module';

@Module({
  imports: [TasksModule, BookingsModule, CatalogModule, ActivitiesModule, StateModule, ProviderVerificationModule, TicketsModule, AvailabilityModule],
})
export class AppModule {}
