import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCustomerBookingDto {
  @ApiProperty({ example: 'Kitchen Cleaning' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(120)
  service: string;

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

  @ApiProperty({ example: 'Customer Name', required: false, description: 'Display value only; not verified identity.' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  customerName?: string;

  @ApiProperty({ example: '9876543210', required: false, description: 'Display/contact value only; not verified identity.' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  customerPhone?: string;
}
