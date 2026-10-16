import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEmail, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

// Two inputs only. The identifier is an email (a self-registered customer, or the superuser) or a
// ServeEase-issued id (provider PRO147, employee EMP-CO-001): the account and its role are resolved
// from it, never claimed by the client.
export class LoginDto {
  @IsString() @IsNotEmpty() identifier!: string;
  @IsString() password!: string;
}

// A service the provider offers from registration: a sub-service of the chosen category and the provider's own price.
export class RegisterServiceDto {
  @IsString() @MinLength(1) @MaxLength(120) name!: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) @Max(1000000) price!: number;
}

export class RegisterDto {
  @IsIn(['customer', 'provider']) role!: 'customer' | 'provider';
  @IsString() @Matches(/^[A-Za-z\s]{3,}$/) fullName!: string;
  @IsEmail() email!: string;
  @Matches(/^\d{10}$/) phone!: string;
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/) password!: string;
  @IsOptional() @IsString() organisationName?: string;
  @IsOptional() @IsString() serviceType?: string;
  @IsOptional() @IsInt() @Min(0) @Max(50) experience?: number;
  @IsOptional() @IsInt() cityId?: number;
  @IsOptional() @IsString() @MinLength(5) address?: string;
  @IsOptional() @IsIn(['Aadhaar', 'PAN', 'Driving License']) idProofType?: string;
  @IsOptional() documents?: Array<Record<string, unknown>>;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => RegisterServiceDto) services?: RegisterServiceDto[];
}

// Fields a signed-in provider may change on their own account. Email, account id, category and status stay
// server-controlled: the email is the login and document-ownership key, the rest are set by registration/review.
export class UpdateProviderProfileDto {
  @IsOptional() @IsString() @Matches(/^[A-Za-z\s]{3,}$/) fullName?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) organisationName?: string;
  @IsOptional() @Matches(/^\d{10}$/) phone?: string;
  @IsOptional() @IsInt() @Min(1) @Max(5) cityId?: number;
  @IsOptional() @IsInt() @Min(0) @Max(50) experience?: number;
  @IsOptional() @IsString() @MaxLength(80) bankName?: string;
  @IsOptional() @IsString() @Matches(/^[A-Za-z\s.]{3,80}$/) accountHolder?: string;
  @IsOptional() @Matches(/^[0-9Xx]{9,18}$/) accountNumber?: string;
  @IsOptional() @Matches(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/) ifsc?: string;
}
