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
import { AuthModule } from './modules/auth/auth.module';
import { EmployeeOperationsModule } from './modules/employee-operations/employee-operations.module';
import { ProviderDocumentsModule } from './modules/provider-documents/provider-documents.module';
import { ReviewsModule } from './modules/reviews/reviews.module';

@Module({
  imports: [AuthModule, TasksModule, BookingsModule, CatalogModule, ActivitiesModule, StateModule, ProviderVerificationModule, TicketsModule, AvailabilityModule, UploadsModule, EmployeeOperationsModule, ProviderDocumentsModule, ReviewsModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggingMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
