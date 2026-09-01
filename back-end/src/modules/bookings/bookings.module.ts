import { forwardRef, Module } from '@nestjs/common';
import { AvailabilityModule } from '../availability/availability.module';
import { BookingsController } from './bookings.controller';
import { BookingsRepository } from './bookings.repository';
import { BookingsService } from './bookings.service';
import { StateModule } from '../state/state.module';

@Module({
  imports: [forwardRef(() => AvailabilityModule), StateModule],
  controllers: [BookingsController],
  providers: [BookingsService, BookingsRepository],
  exports: [BookingsService, BookingsRepository],
})
export class BookingsModule {}
