import { Injectable } from '@nestjs/common';
import { CreateStateEntryDto } from './dto/create-state-entry.dto';
import { UpdateStateEntryDto } from './dto/update-state-entry.dto';
import { StateEntry } from './state-entry.entity';

@Injectable()
export class StateRepository {
  private readonly entries = new Map<string, StateEntry>();

  findAll(): StateEntry[] {
    return Array.from(this.entries.values());
  }

  findById(id: string): StateEntry | undefined {
    return this.entries.get(id);
  }

  create(data: CreateStateEntryDto): StateEntry {
    const entry: StateEntry = {
      key: data.key,
      value: data.value,
      updatedAt: new Date().toISOString(),
    };
    this.entries.set(data.key, entry);
    return entry;
  }

  update(id: string, data: UpdateStateEntryDto): StateEntry | undefined {
    const entry = this.findById(id);
    if (!entry) return undefined;
    if (data.key && data.key !== id) {
      this.entries.delete(id);
      entry.key = data.key;
    }
    if (data.value) {
      entry.value = data.value;
    }
    entry.updatedAt = new Date().toISOString();
    this.entries.set(entry.key, entry);
    return entry;
  }

  delete(id: string): StateEntry | undefined {
    const entry = this.findById(id);
    if (!entry) return undefined;
    this.entries.delete(id);
    return entry;
  }
}
