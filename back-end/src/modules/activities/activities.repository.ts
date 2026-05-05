import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Activity } from './activity.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@Injectable()
export class ActivitiesRepository {
  private readonly activities: Activity[] = [];

  findAll(): Activity[] {
    return this.activities;
  }

  findById(id: string): Activity | undefined {
    return this.activities.find((activity) => activity.id === id);
  }

  create(data: CreateActivityDto): Activity {
    const activity = {
      id: randomUUID(),
      action: data.action,
      page: data.page,
      details: data.details ?? '',
      createdAt: new Date().toISOString(),
    };
    this.activities.unshift(activity);
    return activity;
  }

  update(id: string, data: UpdateActivityDto): Activity | undefined {
    const activity = this.findById(id);
    if (!activity) return undefined;
    Object.assign(activity, data);
    return activity;
  }

  delete(id: string): Activity | undefined {
    const index = this.activities.findIndex((activity) => activity.id === id);
    if (index === -1) return undefined;
    const [deletedActivity] = this.activities.splice(index, 1);
    return deletedActivity;
  }
}
