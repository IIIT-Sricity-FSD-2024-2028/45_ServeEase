import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateActivityDto {
  @ApiProperty({ example: 'login_success' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  action: string;

  @ApiProperty({ example: 'login.html' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  page: string;

  @ApiProperty({ example: 'customer user@serveease.com', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  details?: string;
}
