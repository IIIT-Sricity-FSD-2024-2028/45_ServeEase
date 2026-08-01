import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEmail, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ProviderActionDto {
  @ApiProperty({ example: 'Documents reviewed and phone verified.', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminRemarks?: string;
}

export class RejectProviderDto extends ProviderActionDto {
  @ApiProperty({ example: 'Required documents are incomplete.' })
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  rejectionReason: string;
}

export class RejectDocumentDto {
  @ApiProperty({ example: 'Uploaded file is unreadable.' })
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  rejectionReason: string;
}

export class CreateProviderDocumentDto {
  @ApiProperty({ example: 'ID Proof' })
  @IsString()
  documentType: string;

  @ApiProperty({ example: 'aadhaar.pdf' })
  @IsString()
  documentName: string;

  @ApiProperty({ example: '/documents/providers/PRO018/aadhaar.pdf' })
  @IsString()
  documentUrl: string;

  @ApiProperty({ example: true })
  @IsOptional()
  required?: boolean;
}

export class CreateProviderVerificationDto {
  @ApiProperty({ example: 'PRO018' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'Fresh Clean Services' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'fresh@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Fresh Clean Services', required: false })
  @IsOptional()
  @IsString()
  organisationName?: string;

  @ApiProperty({ example: '9876501234' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'Home cleaning' })
  @IsString()
  category: string;

  @ApiProperty({ example: 4 })
  @IsNumber()
  @Min(0)
  experience: number;

  @ApiProperty({ example: 'Chennai' })
  @IsString()
  location: string;

  @ApiProperty({ example: 'Anna Nagar, Chennai' })
  @IsString()
  address: string;

  @ApiProperty({ type: [CreateProviderDocumentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProviderDocumentDto)
  documents: CreateProviderDocumentDto[];
}
