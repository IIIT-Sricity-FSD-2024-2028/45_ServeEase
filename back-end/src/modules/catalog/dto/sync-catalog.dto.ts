import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CatalogCategoryDto {
  @ApiProperty({ example: 'home-cleaning' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  id: string;

  @ApiProperty({ example: 'Home Cleaning' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  icon?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  bgImage?: string;

  @ApiProperty({ example: ['Kitchen Cleaning', 'Bathroom Cleaning'] })
  @IsArray()
  @IsString({ each: true })
  subServices: string[];
}

export class CatalogProviderDto {
  @ApiProperty({ example: 'cleanpro-service' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  id: string;

  @ApiProperty({ example: 'CleanPro Services' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  name: string;

  @ApiProperty({ example: 'home-cleaning' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category: string;

  @ApiProperty({ example: ['Kitchen Cleaning', 'Bathroom Cleaning'] })
  @IsArray()
  @IsString({ each: true })
  subServices: string[];

  @ApiProperty({ example: 6 })
  @IsNumber()
  years: number;

  @ApiProperty({ example: 4.8 })
  @IsNumber()
  rating: number;

  @ApiProperty({ example: 245 })
  @IsNumber()
  reviews: number;

  @ApiProperty({ example: '2.5 km' })
  @IsString()
  @MaxLength(40)
  distance: string;

  @ApiProperty({ example: 799 })
  @IsNumber()
  startingPrice: number;

  @ApiProperty({ example: 'Chennai, Tamil Nadu' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  location: string;

  @ApiProperty({ example: 520 })
  @IsNumber()
  jobsDone: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  availableToday: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  verified: boolean;

  @ApiProperty({ example: 1 })
  @IsNumber()
  cityId: number;

  @ApiProperty({ example: 'assets/images/home-cleaning/clean1.jpg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  image: string;

  @ApiProperty({ required: false, example: ['09:00 AM - 11:00 AM'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availabilitySlots?: string[];

  @ApiProperty({ required: false, example: 'PRO002' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  ownerProviderId?: string;

  @ApiProperty({ required: false, example: 'fresh@example.com' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  ownerProviderEmail?: string;
}

export class PopularServiceDto {
  @ApiProperty({ example: 'Kitchen Cleaning' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiProperty({ required: false, example: '₹799' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  price?: string;

  @ApiProperty({ required: false, example: 4.8 })
  @IsOptional()
  @IsNumber()
  rating?: number;

  @ApiProperty({ example: 'home-cleaning' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  categoryId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  image?: string;
}

export class SyncCatalogDto {
  @ApiProperty({ type: [CatalogCategoryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CatalogCategoryDto)
  categories: CatalogCategoryDto[];

  @ApiProperty({ type: [CatalogProviderDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CatalogProviderDto)
  providers: CatalogProviderDto[];

  @ApiProperty({ type: [PopularServiceDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PopularServiceDto)
  popularServices?: PopularServiceDto[];
}
