import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiHeader, ApiOkResponse, ApiOperation, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { Request } from 'express';
import { successResponse } from '../../common/api-response';
import { Roles } from '../../guards/roles.decorator';
import { RolesGuard } from '../../guards/roles.guard';
import { Booking } from './booking.entity';
import { BookingsService, BookingRequestContext } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { CreateCustomerBookingDto } from './dto/create-customer-booking.dto';

function header(request: Request, name: string): string {
  const value = request.headers[name];
  return (Array.isArray(value) ? value[0] : value) || '';
}

function callerFrom(request: Request): BookingRequestContext {
  return {
    role: header(request, 'role').toLowerCase(),
    userId: header(request, 'user-id'),
    email: header(request, 'user-email').toLowerCase(),
  };
}

@ApiTags('bookings')
@ApiExtraModels(Booking)
@ApiHeader({ name: 'role', required: true, description: 'Faculty-required role header. This is not caller authentication.' })
@ApiHeader({ name: 'user-id', required: false, description: 'Caller-supplied identifier used for UI-compatible booking filtering; not verified.' })
@ApiHeader({ name: 'user-email', required: false, description: 'Caller-supplied email used for UI-compatible booking filtering; not verified.' })
@UseGuards(RolesGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  @Roles('admin', 'provider', 'user')
  @ApiOperation({ summary: 'List bookings; non-admin filtering uses caller-supplied identity headers' })
  @ApiOkResponse({ description: 'Bookings returned successfully.', schema: { properties: {
    success: { type: 'boolean', example: true }, data: { type: 'array', items: { $ref: getSchemaPath(Booking) } },
  } } })
  findAll(@Req() request: Request) {
    return successResponse(this.bookingsService.findAll(callerFrom(request)));
  }

  @Get(':id')
  @Roles('admin', 'provider', 'user')
  @ApiOperation({ summary: 'Read a booking; non-admin identity headers are not verified' })
  @ApiOkResponse({ description: 'Booking returned successfully.', schema: { properties: {
    success: { type: 'boolean', example: true }, data: { $ref: getSchemaPath(Booking) },
  } } })
  findById(@Param('id') id: string, @Req() request: Request) {
    return successResponse(this.bookingsService.findById(id, callerFrom(request)));
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a booking (admin)' })
  @ApiBody({ type: CreateBookingDto })
  @ApiOkResponse({ description: 'Booking created successfully.', schema: { properties: {
    success: { type: 'boolean', example: true }, data: { $ref: getSchemaPath(Booking) },
  } } })
  create(@Body() data: CreateBookingDto) {
    return successResponse(this.bookingsService.create(data));
  }

  @Post('customer')
  @Roles('user')
  @ApiOperation({ summary: 'Create a customer booking using a restricted DTO; caller identity headers remain unverified' })
  @ApiBody({ type: CreateCustomerBookingDto })
  createForCustomer(@Body() data: CreateCustomerBookingDto, @Req() request: Request) {
    return successResponse(this.bookingsService.createForCustomer(data, callerFrom(request)));
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Replace booking fields (admin)' })
  @ApiBody({ type: UpdateBookingDto })
  @ApiOkResponse({ description: 'Booking updated successfully.', schema: { properties: {
    success: { type: 'boolean', example: true }, data: { $ref: getSchemaPath(Booking) },
  } } })
  updateWithPut(@Param('id') id: string, @Body() data: UpdateBookingDto) {
    return successResponse(this.bookingsService.update(id, data));
  }

  @Patch(':id')
  @Roles('admin', 'provider', 'user')
  @ApiOperation({ summary: 'Update a booking; customer/provider roles may change status only' })
  @ApiBody({ type: UpdateBookingDto })
  @ApiOkResponse({ description: 'Booking updated successfully.', schema: { properties: {
    success: { type: 'boolean', example: true }, data: { $ref: getSchemaPath(Booking) },
  } } })
  updateWithPatch(@Param('id') id: string, @Body() data: UpdateBookingDto, @Req() request: Request) {
    return successResponse(this.bookingsService.updateForCaller(id, data, callerFrom(request)));
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a booking (admin)' })
  @ApiOkResponse({ description: 'Booking deleted successfully.', schema: { properties: {
    success: { type: 'boolean', example: true }, data: { $ref: getSchemaPath(Booking) },
  } } })
  delete(@Param('id') id: string) {
    return successResponse(this.bookingsService.delete(id));
  }
}
