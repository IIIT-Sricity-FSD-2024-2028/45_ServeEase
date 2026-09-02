import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ProviderServiceDto {
  @IsString()
  @IsOptional()
  @MaxLength(120)
  id?: string;

  @IsString()
  @MaxLength(120)
  name: string;

  @IsString()
  @MaxLength(80)
  category: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @IsOptional()
  cityId?: number;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  cityName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  location?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  status?: string;
}

export class UpdateProviderServiceDto extends PartialType(ProviderServiceDto) {}
