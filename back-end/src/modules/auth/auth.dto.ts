import { IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, Max, Min, MinLength } from 'class-validator';

export class LoginDto {
  @IsOptional() @IsEmail() email?: string;
  @IsString() password!: string;
  @IsIn(['customer', 'provider', 'employee', 'superuser']) role!: string;
  @IsOptional() @IsString() employeeId?: string;
  @IsOptional() @IsIn(['Customer Operations', 'Provider Operations', 'Support']) department?: string;
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
}
