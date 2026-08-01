import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class WeeklyScheduleSlotsDto {
  @ApiProperty({ example: ['09:00-12:00', '13:00-17:00'], required: false }) @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true }) monday?: string[];
  @ApiProperty({ example: ['09:00-12:00'], required: false }) @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true }) tuesday?: string[];
  @ApiProperty({ example: ['09:00-12:00'], required: false }) @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true }) wednesday?: string[];
  @ApiProperty({ example: ['09:00-12:00'], required: false }) @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true }) thursday?: string[];
  @ApiProperty({ example: ['09:00-12:00'], required: false }) @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true }) friday?: string[];
  @ApiProperty({ example: [], required: false }) @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true }) saturday?: string[];
  @ApiProperty({ example: [], required: false }) @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true }) sunday?: string[];
}

export class UpsertWeeklyScheduleDto {
  @ApiProperty({
    type: WeeklyScheduleSlotsDto,
    example: { monday: ['09:00-12:00', '13:00-17:00'], tuesday: ['09:00-12:00'], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] },
  })
  @IsNotEmpty() @ValidateNested() @Type(() => WeeklyScheduleSlotsDto)
  weeklySchedule: WeeklyScheduleSlotsDto;
}
