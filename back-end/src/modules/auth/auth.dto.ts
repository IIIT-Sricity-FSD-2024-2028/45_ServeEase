import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { EMPLOYEE_DEPARTMENTS } from '../../common/employee-departments';

export class LoginDto {
  @IsOptional() @IsEmail() email?: string;
  @IsString() password!: string;
  @IsIn(['customer', 'provider', 'employee', 'superuser']) role!: string;
  @IsOptional() @IsString() employeeId?: string;
  @IsOptional() @IsIn(EMPLOYEE_DEPARTMENTS) department?: string;
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
