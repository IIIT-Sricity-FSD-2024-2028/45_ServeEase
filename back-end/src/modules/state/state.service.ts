import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateStateEntryDto } from './dto/create-state-entry.dto';
import { UpdateStateEntryDto } from './dto/update-state-entry.dto';
import { StateEntry } from './state-entry.entity';
import { StateRepository } from './state.repository';

@Injectable()
export class StateService {
  private readonly logger = new Logger('ServeEaseState');

  constructor(private readonly stateRepository: StateRepository) {}

  findAll(): StateEntry[] {
    return this.stateRepository.findAll();
  }

  findById(id: string): StateEntry {
    this.validateKey(id);
    const entry = this.stateRepository.findById(id);
    if (!entry) {
      throw new NotFoundException(`State entry "${id}" was not found.`);
    }
    return entry;
  }

  create(data: CreateStateEntryDto): StateEntry {
    this.validateKey(data.key);
    const entry = this.stateRepository.create(data);
    this.logger.log(`state_saved ${entry.key}`);
    return entry;
  }

  update(id: string, data: UpdateStateEntryDto): StateEntry {
    this.validateKey(id);
    if (!Object.keys(data).length) {
      throw new BadRequestException('At least one field must be provided for update.');
    }
    const entry = this.stateRepository.update(id, data);
    if (!entry) {
      throw new NotFoundException(`State entry "${id}" was not found.`);
    }
    this.logger.log(`state_updated ${entry.key}`);
    return entry;
  }

  delete(id: string): StateEntry {
    this.validateKey(id);
    const entry = this.stateRepository.delete(id);
    if (!entry) {
      throw new NotFoundException(`State entry "${id}" was not found.`);
    }
    this.logger.log(`state_deleted ${entry.key}`);
    return entry;
  }

  private validateKey(key: string): void {
    if (!key || !/^[A-Za-z0-9:_-]{3,160}$/.test(key)) {
      throw new BadRequestException('Invalid state key.');
    }
  }
}
