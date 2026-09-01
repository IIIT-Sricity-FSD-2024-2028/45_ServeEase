import { forwardRef, Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { StateModule } from '../state/state.module';
import { AvailabilityController } from './availability.controller';
import { AvailabilityRepository } from './availability.repository';
import { AvailabilityService } from './availability.service';

@Module({
  imports: [forwardRef(() => BookingsModule), StateModule],
  controllers: [AvailabilityController],
  providers: [AvailabilityService, AvailabilityRepository],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
