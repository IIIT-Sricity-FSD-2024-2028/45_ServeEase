import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiHeader, ApiOkResponse, ApiOperation, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { successResponse } from '../../common/api-response';
import { Roles } from '../../guards/roles.decorator';
import { RolesGuard } from '../../guards/roles.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './task.entity';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@ApiExtraModels(Task)
@ApiHeader({
  name: 'role',
  required: true,
  description: 'Use "admin" for full access or "user" for read-only GET access.',
})
@UseGuards(RolesGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Get all tasks' })
  @ApiOkResponse({
    description: 'Tasks returned successfully.',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: { type: 'array', items: { $ref: getSchemaPath(Task) } },
      },
    },
  })
  findAll() {
    return successResponse(this.tasksService.findAll());
  }

  @Get(':id')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Get one task by UUID' })
  @ApiOkResponse({
    description: 'Task returned successfully.',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: getSchemaPath(Task) },
      },
    },
  })
  findById(@Param('id') id: string) {
    return successResponse(this.tasksService.findById(id));
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a task' })
  @ApiBody({ type: CreateTaskDto })
  @ApiOkResponse({
    description: 'Task created successfully.',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: getSchemaPath(Task) },
      },
    },
  })
  create(@Body() data: CreateTaskDto) {
    return successResponse(this.tasksService.create(data));
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Replace task fields' })
  @ApiBody({ type: UpdateTaskDto })
  @ApiOkResponse({
    description: 'Task updated successfully.',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: getSchemaPath(Task) },
      },
    },
  })
  updateWithPut(@Param('id') id: string, @Body() data: UpdateTaskDto) {
    return successResponse(this.tasksService.update(id, data));
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Partially update a task' })
  @ApiBody({ type: UpdateTaskDto })
  @ApiOkResponse({
    description: 'Task updated successfully.',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: getSchemaPath(Task) },
      },
    },
  })
  updateWithPatch(@Param('id') id: string, @Body() data: UpdateTaskDto) {
    return successResponse(this.tasksService.update(id, data));
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a task' })
  @ApiOkResponse({
    description: 'Task deleted successfully.',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: getSchemaPath(Task) },
      },
    },
  })
  delete(@Param('id') id: string) {
    return successResponse(this.tasksService.delete(id));
  }
}
