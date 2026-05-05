import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './task.entity';
import { TasksRepository } from './tasks.repository';

@Injectable()
export class TasksService {
  constructor(private readonly tasksRepository: TasksRepository) {}

  findAll(): Task[] {
    return this.tasksRepository.findAll();
  }

  findById(id: string): Task {
    this.validateId(id);
    const task = this.tasksRepository.findById(id);
    if (!task) {
      throw new NotFoundException(`Task with id "${id}" was not found.`);
    }
    return task;
  }

  create(data: CreateTaskDto): Task {
    return this.tasksRepository.create(data);
  }

  update(id: string, data: UpdateTaskDto): Task {
    this.validateId(id);
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field must be provided for update.');
    }
    const task = this.tasksRepository.update(id, data);
    if (!task) {
      throw new NotFoundException(`Task with id "${id}" was not found.`);
    }
    return task;
  }

  delete(id: string): Task {
    this.validateId(id);
    const task = this.tasksRepository.delete(id);
    if (!task) {
      throw new NotFoundException(`Task with id "${id}" was not found.`);
    }
    return task;
  }

  private validateId(id: string): void {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!id || !uuidPattern.test(id)) {
      throw new BadRequestException('Invalid task id. Expected a UUID string.');
    }
  }
}
