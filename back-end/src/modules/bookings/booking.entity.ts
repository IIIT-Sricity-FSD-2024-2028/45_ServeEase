import { ApiProperty } from '@nestjs/swagger';

export class Booking {
  @ApiProperty({ example: 'BOOK-20260805-1435-0001' })
  id: string;

  @ApiProperty({ example: 'CUS002', required: false })
  customerId?: string;

  @ApiProperty({ example: 'Kitchen Cleaning' })
  service: string;

  @ApiProperty({ example: 'CleanPro Services' })
  provider: string;

  @ApiProperty({ example: 'cleanpro-services' })
  providerId: string;

  @ApiProperty({ example: '2026-05-12' })
  date: string;

  @ApiProperty({ example: '10:00 AM - 12:00 PM' })
  time: string;

  @ApiProperty({ example: '123 MG Road, Chennai, Tamil Nadu' })
  address: string;

  @ApiProperty({ example: 'Pending' })
  status: string;

  @ApiProperty({ example: 'Pending' })
  category: string;

  @ApiProperty({ example: 'Pending' })
  paymentStatus: string;

  @ApiProperty({ example: 'UPI - Google Pay', required: false })
  paymentMethod?: string;

  @ApiProperty({ example: '2026-05-11', required: false })
  paymentDate?: string;

  @ApiProperty({ example: '2026-05-12', required: false })
  receivedDate?: string;

  @ApiProperty({ example: 889 })
  amount: number;

  @ApiProperty({ example: 799, required: false })
  serviceFee?: number;

  @ApiProperty({ example: 10, required: false })
  taxRate?: number;

  @ApiProperty({ example: 79.9, required: false })
  taxAmount?: number;

  @ApiProperty({ example: 5, required: false })
  platformFeeRate?: number;

  @ApiProperty({ example: 39.95, required: false })
  platformFeeAmount?: number;

  @ApiProperty({ example: 918.85, required: false })
  customerTotal?: number;

  @ApiProperty({ example: 10, required: false })
  providerCommissionRate?: number;

  @ApiProperty({ example: 79.9, required: false })
  providerCommissionAmount?: number;

  @ApiProperty({ example: 719.1, required: false })
  providerPayout?: number;

  @ApiProperty({ example: '2026-05-12', required: false })
  payoutDate?: string;

  @ApiProperty({ example: 'Pending', required: false })
  payoutStatus?: string;

  @ApiProperty({ example: 'Raghava Kumar' })
  customerName: string;

  @ApiProperty({ example: '+91 98765 43210' })
  customerPhone: string;

  @ApiProperty({ example: 'customer@example.com' })
  customerEmail: string;

  @ApiProperty({ example: '2026-08-05T14:35:00.000Z' })
  createdAt: string;

  @ApiProperty({ required: false })
  cancellationReason?: string;
}
