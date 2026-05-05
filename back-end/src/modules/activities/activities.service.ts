import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Activity } from './activity.entity';
import { ActivitiesRepository } from './activities.repository';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger('ServeEaseActivity');

  constructor(private readonly activitiesRepository: ActivitiesRepository) {}

  findAll(): Activity[] {
    return this.activitiesRepository.findAll();
  }

  findById(id: string): Activity {
    this.validateId(id);
    const activity = this.activitiesRepository.findById(id);
    if (!activity) {
      throw new NotFoundException(`Activity with id "${id}" was not found.`);
    }
    return activity;
  }

  create(data: CreateActivityDto): Activity {
    const activity = this.activitiesRepository.create(data);
    this.logger.log(`${activity.action} on ${activity.page}${activity.details ? ` - ${activity.details}` : ''}`);
    return activity;
  }

  update(id: string, data: UpdateActivityDto): Activity {
    this.validateId(id);
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field must be provided for update.');
    }
    const activity = this.activitiesRepository.update(id, data);
    if (!activity) {
      throw new NotFoundException(`Activity with id "${id}" was not found.`);
    }
    return activity;
  }

  delete(id: string): Activity {
    this.validateId(id);
    const activity = this.activitiesRepository.delete(id);
    if (!activity) {
      throw new NotFoundException(`Activity with id "${id}" was not found.`);
    }
    return activity;
  }

  private validateId(id: string): void {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!id || !uuidPattern.test(id)) {
      throw new BadRequestException('Invalid activity id. Expected a UUID string.');
    }
  }
}
