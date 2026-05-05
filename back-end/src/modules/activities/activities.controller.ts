import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse, successResponse, successResponseSchema } from '../../common/api-response';
import { Roles } from '../../guards/roles.decorator';
import { RolesGuard } from '../../guards/roles.guard';
import { Activity } from './activity.entity';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@ApiTags('activities')
@ApiExtraModels(ApiSuccessResponse, Activity)
@ApiHeader({
  name: 'role',
  required: true,
  description: 'Use "admin" for full access or "user" for read-only GET access.',
})
@UseGuards(RolesGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Get frontend/backend activity logs' })
  @ApiOkResponse({ description: 'Activities returned successfully.', schema: successResponseSchema(Activity, true) })
  findAll() {
    return successResponse(this.activitiesService.findAll());
  }

  @Get(':id')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Get one activity by UUID' })
  @ApiOkResponse({ description: 'Activity returned successfully.', schema: successResponseSchema(Activity) })
  findById(@Param('id') id: string) {
    return successResponse(this.activitiesService.findById(id));
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create an activity log entry' })
  @ApiBody({ type: CreateActivityDto })
  @ApiOkResponse({ description: 'Activity logged successfully.', schema: successResponseSchema(Activity) })
  create(@Body() data: CreateActivityDto) {
    return successResponse(this.activitiesService.create(data));
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update an activity log entry' })
  @ApiBody({ type: UpdateActivityDto })
  @ApiOkResponse({ description: 'Activity updated successfully.', schema: successResponseSchema(Activity) })
  update(@Param('id') id: string, @Body() data: UpdateActivityDto) {
    return successResponse(this.activitiesService.update(id, data));
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete an activity log entry' })
  @ApiOkResponse({ description: 'Activity deleted successfully.', schema: successResponseSchema(Activity) })
  delete(@Param('id') id: string) {
    return successResponse(this.activitiesService.delete(id));
  }
}
