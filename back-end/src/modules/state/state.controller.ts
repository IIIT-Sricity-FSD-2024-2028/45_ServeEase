import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse, successResponse, successResponseSchema } from '../../common/api-response';
import { Roles } from '../../guards/roles.decorator';
import { RolesGuard } from '../../guards/roles.guard';
import { CreateStateEntryDto } from './dto/create-state-entry.dto';
import { UpdateStateEntryDto } from './dto/update-state-entry.dto';
import { StateEntry } from './state-entry.entity';
import { StateService } from './state.service';

@ApiTags('state')
@ApiExtraModels(ApiSuccessResponse, StateEntry)
@ApiHeader({
  name: 'role',
  required: true,
  description: 'Use "admin" for full access or "user" for read-only GET access.',
})
@UseGuards(RolesGuard)
@Controller('state')
export class StateController {
  constructor(private readonly stateService: StateService) {}

  @Get()
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Get all frontend state entries mirrored in backend memory' })
  @ApiOkResponse({ description: 'State entries returned successfully.', schema: successResponseSchema(StateEntry, true) })
  findAll() {
    return successResponse(this.stateService.findAll());
  }

  @Get(':id')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Get one frontend state entry by key' })
  @ApiOkResponse({ description: 'State entry returned successfully.', schema: successResponseSchema(StateEntry) })
  findById(@Param('id') id: string) {
    return successResponse(this.stateService.findById(id));
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create or replace a frontend state entry' })
  @ApiBody({ type: CreateStateEntryDto })
  @ApiOkResponse({ description: 'State entry saved successfully.', schema: successResponseSchema(StateEntry) })
  create(@Body() data: CreateStateEntryDto) {
    return successResponse(this.stateService.create(data));
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Replace a frontend state entry' })
  @ApiBody({ type: UpdateStateEntryDto })
  @ApiOkResponse({ description: 'State entry updated successfully.', schema: successResponseSchema(StateEntry) })
  updateWithPut(@Param('id') id: string, @Body() data: UpdateStateEntryDto) {
    return successResponse(this.stateService.update(id, data));
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Partially update a frontend state entry' })
  @ApiBody({ type: UpdateStateEntryDto })
  @ApiOkResponse({ description: 'State entry updated successfully.', schema: successResponseSchema(StateEntry) })
  updateWithPatch(@Param('id') id: string, @Body() data: UpdateStateEntryDto) {
    return successResponse(this.stateService.update(id, data));
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a frontend state entry' })
  @ApiOkResponse({ description: 'State entry deleted successfully.', schema: successResponseSchema(StateEntry) })
  delete(@Param('id') id: string) {
    return successResponse(this.stateService.delete(id));
  }
}
