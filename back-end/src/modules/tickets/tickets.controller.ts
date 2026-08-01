import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiSuccessResponse, successResponse, successResponseSchema } from '../../common/api-response';
import { Roles } from '../../guards/roles.decorator';
import { RolesGuard } from '../../guards/roles.guard';
import {
  CreateCustomerTicketDto,
  CreateProviderTicketDto,
  TicketFinalDecisionDto,
  TicketPriorityDto,
  TicketRemarksDto,
  TicketStatusDto,
} from './dto/ticket.dto';
import { SupportTicket } from './ticket.entity';
import { TicketsService } from './tickets.service';

@ApiTags('tickets')
@ApiExtraModels(ApiSuccessResponse, SupportTicket)
@ApiHeader({ name: 'role', required: true, description: 'Use customer/user, provider, support, admin, or superuser role.' })
@UseGuards(RolesGuard)
@Controller()
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post('tickets/customer')
  @Roles('user', 'admin', 'superuser')
  @ApiOperation({ summary: 'Create a customer ticket linked to a booking' })
  @ApiBody({ type: CreateCustomerTicketDto })
  @ApiOkResponse({ description: 'Customer ticket created successfully.', schema: successResponseSchema(SupportTicket) })
  createCustomerTicket(@Body() data: CreateCustomerTicketDto, @Req() request: Request) {
    return successResponse(this.ticketsService.createCustomerTicket(data, request));
  }

  @Post('tickets/provider')
  @Roles('provider', 'admin', 'superuser')
  @ApiOperation({ summary: 'Create a provider support ticket' })
  @ApiBody({ type: CreateProviderTicketDto })
  @ApiOkResponse({ description: 'Provider ticket created successfully.', schema: successResponseSchema(SupportTicket) })
  createProviderTicket(@Body() data: CreateProviderTicketDto, @Req() request: Request) {
    return successResponse(this.ticketsService.createProviderTicket(data, request));
  }

  @Get('tickets/my-tickets')
  @Roles('user', 'admin', 'superuser')
  myTickets(@Req() request: Request) {
    return successResponse(this.ticketsService.findMyCustomerTickets(request));
  }

  @Get('tickets/my-provider-tickets')
  @Roles('provider', 'admin', 'superuser')
  myProviderTickets(@Req() request: Request) {
    return successResponse(this.ticketsService.findMyProviderTickets(request));
  }

  @Get('tickets/:id')
  @Roles('user', 'provider', 'support', 'admin', 'superuser')
  getTicket(@Param('id') id: string, @Req() request: Request) {
    return successResponse(this.ticketsService.findVisibleTicket(id, request));
  }

  @Get('support/tickets')
  @Roles('support', 'admin', 'superuser')
  supportTickets() {
    return successResponse(this.ticketsService.findAllForSupport());
  }

  @Get('support/tickets/:id')
  @Roles('support', 'admin', 'superuser')
  supportTicket(@Param('id') id: string) {
    return successResponse(this.ticketsService.findById(id));
  }

  @Patch('support/tickets/:id/status')
  @Roles('support', 'admin', 'superuser')
  supportStatus(@Param('id') id: string, @Body() data: TicketStatusDto) {
    return successResponse(this.ticketsService.updateStatus(id, data.status));
  }

  @Patch('support/tickets/:id/remarks')
  @Roles('support', 'admin', 'superuser')
  supportRemarks(@Param('id') id: string, @Body() data: TicketRemarksDto) {
    return successResponse(this.ticketsService.updateSupportRemarks(id, data));
  }

  @Patch('support/tickets/:id/resolve')
  @Roles('support', 'admin', 'superuser')
  supportResolve(@Param('id') id: string, @Body() data: TicketRemarksDto) {
    return successResponse(this.ticketsService.resolveBySupport(id, data));
  }

  @Patch('support/tickets/:id/escalate')
  @Roles('support', 'admin', 'superuser')
  supportEscalate(@Param('id') id: string, @Body() data: TicketRemarksDto) {
    return successResponse(this.ticketsService.escalate(id, data));
  }

  @Patch('support/tickets/:id/priority')
  @Roles('support', 'admin', 'superuser')
  supportPriority(@Param('id') id: string, @Body() data: TicketPriorityDto) {
    return successResponse(this.ticketsService.updatePriority(id, data.priority));
  }

  @Get('admin/escalated-tickets')
  @Roles('admin', 'superuser')
  adminEscalatedTickets() {
    return successResponse(this.ticketsService.findEscalatedForAdmin());
  }

  @Get('admin/tickets/:id')
  @Roles('admin', 'superuser')
  adminTicket(@Param('id') id: string) {
    return successResponse(this.ticketsService.findById(id));
  }

  @Patch('admin/tickets/:id/admin-remarks')
  @Roles('admin', 'superuser')
  adminRemarks(@Param('id') id: string, @Body() data: TicketRemarksDto) {
    return successResponse(this.ticketsService.adminRemarks(id, data));
  }

  @Patch('admin/tickets/:id/final-decision')
  @Roles('admin', 'superuser')
  finalDecision(@Param('id') id: string, @Body() data: TicketFinalDecisionDto) {
    return successResponse(this.ticketsService.finalDecision(id, data));
  }

  @Patch('admin/tickets/:id/resolve')
  @Roles('admin', 'superuser')
  resolve(@Param('id') id: string, @Body() data: TicketFinalDecisionDto) {
    return successResponse(this.ticketsService.resolve(id, data));
  }

  @Patch('admin/tickets/:id/reject')
  @Roles('admin', 'superuser')
  reject(@Param('id') id: string, @Body() data: TicketFinalDecisionDto) {
    return successResponse(this.ticketsService.reject(id, data));
  }
}
