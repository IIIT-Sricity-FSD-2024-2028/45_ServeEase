import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { TicketFinalDecision, TicketPriority, TicketStatus } from '../ticket.entity';

export const customerTicketTypes = [
  'Poor Service Quality',
  'Provider Not Arrived',
  'Late Arrival',
  'Overcharging',
  'Misbehavior',
  'Payment Issue',
  'Service Not Completed',
  'Refund Request',
  'Fraud',
  'Safety Concern',
  'Other',
];

export const providerTicketTypes = [
  'Payment Not Received',
  'Verification Issue',
  'Booking Assignment Issue',
  'Technical Problem',
  'Customer Misbehavior',
  'Profile Update Request',
  'Availability Issue',
  'Account Suspension Appeal',
  'Service Category Change',
  'Other',
];

export const ticketPriorities: TicketPriority[] = ['Low', 'Medium', 'High', 'Critical'];
export const supportStatuses: TicketStatus[] = ['In Progress'];
export const finalDecisions: TicketFinalDecision[] = [
  'Refund Approved',
  'Refund Rejected',
  'Rework Scheduled',
  'Provider Warning Issued',
  'Provider Suspended',
  'Ticket Rejected',
  'No Action Required',
];

export class CreateCustomerTicketDto {
  @ApiProperty({ example: 'BOOK-2026-1045' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  bookingId: string;

  @ApiProperty({ example: 'Late Arrival', enum: customerTicketTypes })
  @IsString()
  @IsIn(customerTicketTypes)
  ticketType: string;

  @ApiProperty({ example: 'Provider arrived late', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  subject?: string;

  @ApiProperty({ example: 'Provider arrived very late and did not complete the promised service.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(1000)
  description: string;

  @ApiProperty({ example: 'delay-proof.jpg', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(220)
  attachmentUrl?: string;

  @ApiProperty({ example: 'CUS001', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  customerId?: string;

  @ApiProperty({ example: 'Raghava Kumar', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerName?: string;
}

export class CreateProviderTicketDto {
  @ApiProperty({ example: 'Payment Not Received', enum: providerTicketTypes })
  @IsString()
  @IsIn(providerTicketTypes)
  ticketType: string;

  @ApiProperty({ example: 'Payment not received for completed booking' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  subject: string;

  @ApiProperty({ example: 'Payout for BOOK-2026-1101 is still pending.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(1000)
  description: string;

  @ApiProperty({ example: 'BOOK-2026-1101', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  relatedBookingId?: string;

  @ApiProperty({ example: 'TX-2026-7854', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  relatedPaymentId?: string;

  @ApiProperty({ example: 'Medium', enum: ticketPriorities, required: false })
  @IsOptional()
  @IsIn(ticketPriorities)
  priority?: TicketPriority;

  @ApiProperty({ example: 'payment-proof.jpg', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(220)
  attachmentUrl?: string;

  @ApiProperty({ example: 'PRO001', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  providerId?: string;

  @ApiProperty({ example: 'CleanPro Services', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  providerName?: string;

  @ApiProperty({ example: 'Raghava Kumar', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  customerName?: string;

  @ApiProperty({ example: 'Kitchen Cleaning', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  service?: string;
}

export class TicketStatusDto {
  @ApiProperty({ example: 'In Progress', enum: supportStatuses })
  @IsString()
  @IsIn(supportStatuses)
  status: TicketStatus;
}

export class TicketRemarksDto {
  @ApiProperty({ example: 'Checked booking and contacted both parties.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(1000)
  remarks: string;
}

export class TicketPriorityDto {
  @ApiProperty({ example: 'High', enum: ticketPriorities })
  @IsString()
  @IsIn(ticketPriorities)
  priority: TicketPriority;
}

export class TicketFinalDecisionDto {
  @ApiProperty({ example: 'Refund Approved', enum: finalDecisions })
  @IsString()
  @IsIn(finalDecisions)
  finalDecision: TicketFinalDecision;

  @ApiProperty({ example: 'Refund approved after support verified the service failure.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(1000)
  adminRemarks: string;
}
