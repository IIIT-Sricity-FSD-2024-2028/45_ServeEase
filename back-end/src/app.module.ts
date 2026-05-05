import { Module } from '@nestjs/common';
import { ActivitiesModule } from './modules/activities/activities.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { StateModule } from './modules/state/state.module';
import { TasksModule } from './modules/tasks/tasks.module';

@Module({
  imports: [TasksModule, BookingsModule, CatalogModule, ActivitiesModule, StateModule],
})
export class AppModule {}
