import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { StateModule } from '../state/state.module';
import { TicketsController } from './tickets.controller';
import { TicketsRepository } from './tickets.repository';
import { TicketsService } from './tickets.service';

@Module({
  imports: [BookingsModule, StateModule],
  controllers: [TicketsController],
  providers: [TicketsService, TicketsRepository],
  exports: [TicketsService],
})
export class TicketsModule {}
