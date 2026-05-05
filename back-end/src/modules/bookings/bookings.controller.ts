import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiHeader, ApiOkResponse, ApiOperation, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { successResponse } from '../../common/api-response';
import { Roles } from '../../guards/roles.decorator';
import { RolesGuard } from '../../guards/roles.guard';
import { Booking } from './booking.entity';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

@ApiTags('bookings')
@ApiExtraModels(Booking)
@ApiHeader({
  name: 'role',
  required: true,
  description: 'Use "admin" for full access or "user" for read-only GET access.',
})
@UseGuards(RolesGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Get all bookings' })
  @ApiOkResponse({
    description: 'Bookings returned successfully.',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: { type: 'array', items: { $ref: getSchemaPath(Booking) } },
      },
    },
  })
  findAll() {
    return successResponse(this.bookingsService.findAll());
  }

  @Get(':id')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Get one booking by UUID' })
  @ApiOkResponse({
    description: 'Booking returned successfully.',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: getSchemaPath(Booking) },
      },
    },
  })
  findById(@Param('id') id: string) {
    return successResponse(this.bookingsService.findById(id));
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a booking' })
  @ApiBody({ type: CreateBookingDto })
  @ApiOkResponse({
    description: 'Booking created successfully.',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: getSchemaPath(Booking) },
      },
    },
  })
  create(@Body() data: CreateBookingDto) {
    return successResponse(this.bookingsService.create(data));
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Replace booking fields' })
  @ApiBody({ type: UpdateBookingDto })
  @ApiOkResponse({
    description: 'Booking updated successfully.',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: getSchemaPath(Booking) },
      },
    },
  })
  updateWithPut(@Param('id') id: string, @Body() data: UpdateBookingDto) {
    return successResponse(this.bookingsService.update(id, data));
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Partially update a booking' })
  @ApiBody({ type: UpdateBookingDto })
  @ApiOkResponse({
    description: 'Booking updated successfully.',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: getSchemaPath(Booking) },
      },
    },
  })
  updateWithPatch(@Param('id') id: string, @Body() data: UpdateBookingDto) {
    return successResponse(this.bookingsService.update(id, data));
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a booking' })
  @ApiOkResponse({
    description: 'Booking deleted successfully.',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: getSchemaPath(Booking) },
      },
    },
  })
  delete(@Param('id') id: string) {
    return successResponse(this.bookingsService.delete(id));
  }
}
