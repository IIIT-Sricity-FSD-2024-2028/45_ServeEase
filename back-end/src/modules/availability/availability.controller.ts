import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { successResponse, successResponseSchema } from '../../common/api-response';
import { Roles } from '../../guards/roles.decorator';
import { RolesGuard } from '../../guards/roles.guard';
import { DateOverride, ProviderAvailability, WeeklySchedule } from './availability.entity';
import { AvailabilityService } from './availability.service';
import { UpsertDateOverrideDto } from './dto/upsert-date-override.dto';
import { UpsertWeeklyScheduleDto } from './dto/upsert-weekly-schedule.dto';

@ApiTags('availability')
@ApiExtraModels(WeeklySchedule, DateOverride, ProviderAvailability)
@ApiHeader({ name: 'role', required: true, description: 'Use provider or admin to manage schedules; user to view availability.' })
@UseGuards(RolesGuard)
@Controller('availability/providers/:providerId')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get('weekly-schedule') @Roles('admin', 'provider') @ApiOperation({ summary: 'Get a provider weekly schedule' }) @ApiOkResponse({ schema: successResponseSchema(WeeklySchedule) })
  getWeeklySchedule(@Param('providerId') providerId: string) { return successResponse(this.availabilityService.getWeeklySchedule(providerId)); }

  @Put('weekly-schedule') @Roles('admin', 'provider') @ApiOperation({ summary: 'Replace a provider recurring weekly schedule' }) @ApiBody({ type: UpsertWeeklyScheduleDto }) @ApiOkResponse({ schema: successResponseSchema(WeeklySchedule) })
  saveWeeklySchedule(@Param('providerId') providerId: string, @Body() data: UpsertWeeklyScheduleDto) { return successResponse(this.availabilityService.saveWeeklySchedule(providerId, data)); }

  @Get('date-overrides') @Roles('admin', 'provider') @ApiOperation({ summary: 'List a provider date overrides' }) @ApiOkResponse({ schema: successResponseSchema(DateOverride, true) })
  getDateOverrides(@Param('providerId') providerId: string) { return successResponse(this.availabilityService.getDateOverrides(providerId)); }

  @Put('date-overrides/:date') @Roles('admin', 'provider') @ApiOperation({ summary: 'Create or replace a date override' }) @ApiBody({ type: UpsertDateOverrideDto }) @ApiOkResponse({ schema: successResponseSchema(DateOverride) })
  saveDateOverride(@Param('providerId') providerId: string, @Param('date') date: string, @Body() data: UpsertDateOverrideDto) { return successResponse(this.availabilityService.saveDateOverride(providerId, date, data)); }

  @Delete('date-overrides/:date') @Roles('admin', 'provider') @ApiOperation({ summary: 'Remove a date override' }) @ApiOkResponse({ schema: successResponseSchema(DateOverride) })
  deleteDateOverride(@Param('providerId') providerId: string, @Param('date') date: string) { return successResponse(this.availabilityService.deleteDateOverride(providerId, date)); }

  @Get() @Roles('admin', 'provider', 'user') @ApiOperation({ summary: 'Generate customer-bookable availability for the configured booking window' }) @ApiOkResponse({ schema: successResponseSchema(ProviderAvailability) })
  getAvailability(@Param('providerId') providerId: string) { return successResponse(this.availabilityService.getAvailability(providerId)); }
}
