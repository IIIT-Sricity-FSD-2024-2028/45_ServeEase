import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

export class ProviderBookingStatusDto {
  @ApiProperty({ enum: ['Accepted', 'Rejected', 'Completed', 'Cancelled'] })
  @IsIn(['Accepted', 'Rejected', 'Completed', 'Cancelled'])
  status: 'Accepted' | 'Rejected' | 'Completed' | 'Cancelled';

  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  stateVersion?: number;
}
