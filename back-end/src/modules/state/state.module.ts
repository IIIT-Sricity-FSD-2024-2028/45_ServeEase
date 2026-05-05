import { Module } from '@nestjs/common';
import { StateController } from './state.controller';
import { StateRepository } from './state.repository';
import { StateService } from './state.service';

@Module({
  controllers: [StateController],
  providers: [StateService, StateRepository],
})
export class StateModule {}
