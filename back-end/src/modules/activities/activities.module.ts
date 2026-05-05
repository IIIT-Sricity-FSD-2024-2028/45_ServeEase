import { Module } from '@nestjs/common';
import { ActivitiesController } from './activities.controller';
import { ActivitiesRepository } from './activities.repository';
import { ActivitiesService } from './activities.service';

@Module({
  controllers: [ActivitiesController],
  providers: [ActivitiesService, ActivitiesRepository],
})
export class ActivitiesModule {}
