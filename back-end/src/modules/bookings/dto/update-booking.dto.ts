import { PartialType } from '@nestjs/swagger';
import { CreateBookingDto } from './create-booking.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, ValidateIf } from 'class-validator';

export class UpdateBookingDto extends PartialType(CreateBookingDto) {
  @ApiProperty({ required: false, example: 'Unable to provide the service at the requested time.' })
  @ValidateIf((value: UpdateBookingDto) => value.status === 'Rejected')
  @IsString()
  @Matches(/\S/, { message: 'A rejection reason is required.' })
  @MaxLength(1000)
  rejectionReason?: string;
}
