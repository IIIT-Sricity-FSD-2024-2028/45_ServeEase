import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { CreateStateEntryDto } from './dto/create-state-entry.dto';
import { UpdateStateEntryDto } from './dto/update-state-entry.dto';
import { StateEntry } from './state-entry.entity';

@Injectable()
export class StateRepository {
  private readonly entries = new Map<string, StateEntry>();

  constructor() {
    const file = this.filePath();
    if (!existsSync(file)) return;
    try {
      const persisted = JSON.parse(readFileSync(file, 'utf8')) as StateEntry[];
      if (Array.isArray(persisted)) persisted.forEach((entry) => {
        if (entry?.key) this.entries.set(entry.key, entry);
      });
    } catch {
      // A corrupt runtime cache must not prevent the API from starting.
    }
  }

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
    this.persist();
    return entry;
  }

  update(id: string, data: UpdateStateEntryDto): StateEntry | undefined {
    const entry = this.findById(id);
    if (!entry) return undefined;
    if (data.key && data.key !== id) {
      this.entries.delete(id);
      entry.key = data.key;
    }
    if (data.value !== undefined) {
      entry.value = data.value;
    }
    entry.updatedAt = new Date().toISOString();
    this.entries.set(entry.key, entry);
    this.persist();
    return entry;
  }

  delete(id: string): StateEntry | undefined {
    const entry = this.findById(id);
    if (!entry) return undefined;
    this.entries.delete(id);
    this.persist();
    return entry;
  }

  private filePath(): string {
    if (process.env.SERVEEASE_STATE_FILE) return resolve(process.env.SERVEEASE_STATE_FILE);
    const cwd = process.cwd();
    return resolve(cwd.toLowerCase().endsWith('back-end') ? cwd : resolve(cwd, 'back-end'), 'data', 'state.json');
  }

  private persist(): void {
    const file = this.filePath();
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(this.findAll(), null, 2), 'utf8');
  }
}
