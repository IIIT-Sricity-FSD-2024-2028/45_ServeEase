import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsString, MaxLength } from 'class-validator';

export class CreateStateEntryDto {
  @ApiProperty({ example: 'serveEaseCustomerModuleData:CUS002' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  key: string;

  @ApiProperty({ example: { bookings: [], payments: [], tickets: [] } })
  @IsObject()
  value: Record<string, unknown>;
}
