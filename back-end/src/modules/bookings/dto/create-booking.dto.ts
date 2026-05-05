import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateBookingDto {
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

  @ApiProperty({ example: 'cleanpro-services', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  providerId?: string;

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

  @ApiProperty({ example: 'Pending', required: false, enum: ['Pending', 'Accepted', 'Completed', 'Cancelled'] })
  @IsOptional()
  @IsString()
  @IsIn(['Pending', 'Accepted', 'Completed', 'Cancelled'])
  status?: string;

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
}
