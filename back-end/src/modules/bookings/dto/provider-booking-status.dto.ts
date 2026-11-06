import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min, ValidateIf } from 'class-validator';

export class ProviderBookingStatusDto {
  @ApiProperty({ enum: ['Accepted', 'Rejected', 'Completed', 'Cancelled'] })
  @IsIn(['Accepted', 'Rejected', 'Completed', 'Cancelled'])
  status: 'Accepted' | 'Rejected' | 'Completed' | 'Cancelled';

  @ApiProperty({ required: false, example: 'Unable to provide the service at the requested time.' })
  @ValidateIf((value: ProviderBookingStatusDto) => value.status === 'Rejected')
  @IsString()
  @Matches(/\S/, { message: 'A rejection reason is required.' })
  @MaxLength(1000)
  rejectionReason?: string;

  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  stateVersion?: number;
}
