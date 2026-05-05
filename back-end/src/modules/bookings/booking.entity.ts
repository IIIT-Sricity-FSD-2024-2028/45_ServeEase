import { ApiProperty } from '@nestjs/swagger';

export class Booking {
  @ApiProperty({ example: '0691fb87-3660-4eca-82d4-b56e1c09f51e' })
  id: string;

  @ApiProperty({ example: 'Kitchen Cleaning' })
  service: string;

  @ApiProperty({ example: 'CleanPro Services' })
  provider: string;

  @ApiProperty({ example: 'cleanpro-services', required: false })
  providerId?: string;

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

  @ApiProperty({ example: 889 })
  amount: number;

  @ApiProperty({ example: 'Raghava Kumar' })
  customerName: string;

  @ApiProperty({ example: '+91 98765 43210' })
  customerPhone: string;

  @ApiProperty({ example: 'customer@example.com' })
  customerEmail: string;
}
