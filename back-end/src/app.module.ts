import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ActivitiesModule } from './modules/activities/activities.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { ProviderVerificationModule } from './modules/provider-verification/provider-verification.module';
import { StateModule } from './modules/state/state.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { RequestLoggingMiddleware } from './middleware/request-logging.middleware';

@Module({
  imports: [TasksModule, BookingsModule, CatalogModule, ActivitiesModule, StateModule, ProviderVerificationModule, TicketsModule, AvailabilityModule, UploadsModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggingMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
