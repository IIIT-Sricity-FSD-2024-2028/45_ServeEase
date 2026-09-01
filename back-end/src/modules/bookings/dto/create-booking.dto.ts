import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: 'CUS002', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  customerId?: string;

  @ApiProperty({ example: 'Kitchen Cleaning' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(120)
  service: string;

  @ApiProperty({ example: 'CleanPro Services' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  provider: string;

  @ApiProperty({ example: 'cleanpro-services' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  providerId: string;

  @ApiProperty({ example: '2026-05-12' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  date: string;

  @ApiProperty({ example: '10:00 AM - 12:00 PM' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  time: string;

  @ApiProperty({ example: '123 MG Road, Chennai, Tamil Nadu' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(300)
  address: string;

  @ApiProperty({ example: 889 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: 799, required: false })
  @IsOptional()
  @IsNumber()
  serviceFee?: number;

  @ApiProperty({ example: 10, required: false })
  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @ApiProperty({ example: 79.9, required: false })
  @IsOptional()
  @IsNumber()
  taxAmount?: number;

  @ApiProperty({ example: 5, required: false })
  @IsOptional()
  @IsNumber()
  platformFeeRate?: number;

  @ApiProperty({ example: 39.95, required: false })
  @IsOptional()
  @IsNumber()
  platformFeeAmount?: number;

  @ApiProperty({ example: 918.85, required: false })
  @IsOptional()
  @IsNumber()
  customerTotal?: number;

  @ApiProperty({ example: 10, required: false })
  @IsOptional()
  @IsNumber()
  providerCommissionRate?: number;

  @ApiProperty({ example: 79.9, required: false })
  @IsOptional()
  @IsNumber()
  providerCommissionAmount?: number;

  @ApiProperty({ example: 719.1, required: false })
  @IsOptional()
  @IsNumber()
  providerPayout?: number;

  @ApiProperty({ example: 719.1, required: false })
  @IsOptional()
  @IsNumber()
  providerPayoutAmount?: number;

  @ApiProperty({ example: 119.85, required: false })
  @IsOptional()
  @IsNumber()
  platformRevenueAmount?: number;

  @ApiProperty({ example: '2026-05-12', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  payoutDate?: string;

  @ApiProperty({ example: 'Pending', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  payoutStatus?: string;

  @ApiProperty({ example: 'Pending', required: false, enum: ['Pending', 'Accepted', 'Completed', 'Cancelled'] })
  @IsOptional()
  @IsString()
  @IsIn(['Pending', 'Accepted', 'Completed', 'Cancelled', 'Rejected'])
  status?: string;

  @ApiProperty({ example: 'Home Cleaning', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @ApiProperty({ example: 'Pending', required: false, enum: ['Pending', 'Successful', 'Refunded', 'Failed'] })
  @IsOptional()
  @IsIn(['Pending', 'Successful', 'Refunded', 'Failed'])
  paymentStatus?: string;

  @ApiProperty({ example: 'UPI - Google Pay', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentMethod?: string;

  @ApiProperty({ example: '2026-05-11', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  paymentDate?: string;

  @ApiProperty({ example: '2026-05-12', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  receivedDate?: string;

  @ApiProperty({ example: 'Raghava Kumar' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(80)
  customerName: string;

  @ApiProperty({ example: '+91 98765 43210' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  customerPhone: string;

  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail()
  customerEmail: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  cancelledAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  cancellationActor?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  cancellationPolicy?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  refundAmount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  refundServiceFee?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  refundPlatformFee?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  refundTax?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  refundStatus?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  taxRefundAmount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  refundDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  paymentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  statusUpdatedAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  stateVersion?: number;

  @ApiProperty({ example: 50, required: false })
  @IsOptional()
  @IsNumber()
  customerPlatformFeeAmount?: number;
}
