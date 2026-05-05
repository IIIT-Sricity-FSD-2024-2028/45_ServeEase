import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './task.entity';

@Injectable()
export class TasksRepository {
  private readonly tasks: Task[] = [];

  findAll(): Task[] {
    return this.tasks;
  }

  findById(id: string): Task | undefined {
    return this.tasks.find((task) => task.id === id);
  }

  create(data: CreateTaskDto): Task {
    const task = { id: randomUUID(), ...data };
    this.tasks.push(task);
    return task;
  }

  update(id: string, data: UpdateTaskDto): Task | undefined {
    const task = this.findById(id);
    if (!task) return undefined;
    Object.assign(task, data);
    return task;
  }

  delete(id: string): Task | undefined {
    const index = this.tasks.findIndex((task) => task.id === id);
    if (index === -1) return undefined;
    const [deletedTask] = this.tasks.splice(index, 1);
    return deletedTask;
  }
}
