import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export class RescheduleBookingDto {
  @ApiProperty({ example: '2026-11-13', description: 'New service date, YYYY-MM-DD.' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must use YYYY-MM-DD format.' })
  date: string;

  @ApiProperty({ example: '09:00-12:00', description: 'New time slot exactly as returned by the availability endpoint.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  time: string;

  @ApiProperty({ required: false, example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  stateVersion?: number;
}
