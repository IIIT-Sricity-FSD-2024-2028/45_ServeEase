import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpsertDateOverrideDto {
  @ApiProperty({ example: false }) @IsBoolean() fullDayOff: boolean;
  @ApiProperty({ example: ['09:00-12:00'], required: false }) @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true }) disabledSlots?: string[];
  @ApiProperty({ example: ['13:00-17:00'], required: false }) @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true }) enabledSlots?: string[];
}
