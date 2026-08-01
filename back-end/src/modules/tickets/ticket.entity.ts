import { ApiProperty } from '@nestjs/swagger';

export type TicketRaisedByType = 'customer' | 'provider';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TicketStatus =
  | 'Pending'
  | 'In Progress'
  | 'Resolved by Support'
  | 'Escalated'
  | 'Under Review'
  | 'Resolved'
  | 'Rejected';

export type TicketFinalDecision =
  | 'Refund Approved'
  | 'Refund Rejected'
  | 'Rework Scheduled'
  | 'Provider Warning Issued'
  | 'Provider Suspended'
  | 'Ticket Rejected'
  | 'No Action Required';

export class TicketStatusHistory {
  @ApiProperty({ example: 'Pending' })
  status: TicketStatus;

  @ApiProperty({ example: 'Ticket created.' })
  note: string;

  @ApiProperty({ example: 'Customer' })
  updatedBy: string;

  @ApiProperty({ example: '2026-05-20T10:30:00.000Z' })
  updatedAt: string;
}

export class SupportTicket {
  @ApiProperty({ example: 'TKT-20260520-1001' })
  ticketId: string;

  @ApiProperty({ example: 'customer', enum: ['customer', 'provider'] })
  raisedByType: TicketRaisedByType;

  @ApiProperty({ example: 'CUS001' })
  raisedById: string;

  @ApiProperty({ example: 'Raghava Kumar' })
  raisedByName: string;

  @ApiProperty({ example: 'user@serveease.com' })
  raisedByEmail: string;

  @ApiProperty({ example: '9876543210' })
  raisedByPhone: string;

  @ApiProperty({ example: 'BOOK-2026-1045', required: false })
  relatedBookingId?: string;

  @ApiProperty({ example: 'TXN-2026-4582', required: false })
  relatedPaymentId?: string;

  @ApiProperty({ example: 'cleanpro-services', required: false })
  providerId?: string;

  @ApiProperty({ example: 'CleanPro Services', required: false })
  providerName?: string;

  @ApiProperty({ example: 'CUS001', required: false })
  customerId?: string;

  @ApiProperty({ example: 'Raghava Kumar', required: false })
  customerName?: string;

  @ApiProperty({ example: 'Late Arrival' })
  ticketType: string;

  @ApiProperty({ example: 'Provider arrived late' })
  subject: string;

  @ApiProperty({ example: 'Provider arrived 90 minutes late and service was rushed.' })
  description: string;

  @ApiProperty({ example: 'late-proof.jpg', required: false })
  attachmentUrl?: string;

  @ApiProperty({ example: 'High' })
  priority: TicketPriority;

  @ApiProperty({ example: 'Pending' })
  status: TicketStatus;

  @ApiProperty({ example: 'Verified booking details.', required: false })
  supportRemarks?: string;

  @ApiProperty({ example: 'Refund approved.', required: false })
  adminRemarks?: string;

  @ApiProperty({ example: 'Refund approval required.', required: false })
  escalationReason?: string;

  @ApiProperty({ example: 'Refund Approved', required: false })
  finalDecision?: TicketFinalDecision;

  @ApiProperty({ example: 'SUP001', required: false })
  assignedSupportId?: string;

  @ApiProperty({ example: 'Priya Sharma', required: false })
  assignedSupportName?: string;

  @ApiProperty({ example: 'Support', required: false })
  resolvedBy?: string;

  @ApiProperty({ example: '2026-05-20T10:30:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-05-20T10:30:00.000Z' })
  updatedAt: string;

  @ApiProperty({ example: '2026-05-20T11:30:00.000Z', required: false })
  resolvedAt?: string;

  @ApiProperty({ example: '2026-05-20T11:00:00.000Z', required: false })
  escalatedAt?: string;

  @ApiProperty({ type: [TicketStatusHistory] })
  statusHistory: TicketStatusHistory[];
}
