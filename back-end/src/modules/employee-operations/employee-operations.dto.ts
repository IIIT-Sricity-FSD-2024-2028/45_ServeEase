import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { CUSTOMER_ACCOUNT_STATUSES, CustomerAccountStatus } from '../../common/customer-account-status';
import { ManagedProviderStatus, PROVIDER_ACCOUNT_STATUSES } from '../../common/provider-account-status';

// customer-operations-detail.html status dialog: a reason is required, admin remarks are optional.
export class UpdateCustomerStatusDto {
  @ApiProperty({ enum: CUSTOMER_ACCOUNT_STATUSES, example: 'Blocked', description: "'Blocked' suspends the customer; 'Active' reactivates them." })
  @IsIn(CUSTOMER_ACCOUNT_STATUSES)
  status!: CustomerAccountStatus;

  @ApiProperty({ example: 'Repeated payment disputes under review.' })
  @IsString()
  @MaxLength(500)
  @Matches(/\S/, { message: 'A reason is required.' })
  reason!: string;

  @ApiPropertyOptional({ example: 'Reviewed with the support team.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remarks?: string;
}

// provider-verification-review.html decision dialog: approval takes optional remarks; rejection needs a
// reason (same 5–300 character rule as the superuser RejectProviderDto).
export class ProviderVerificationDecisionDto {
  @ApiProperty({ enum: ['approve', 'reject'], example: 'reject' })
  @IsIn(['approve', 'reject'])
  decision!: 'approve' | 'reject';

  @ApiPropertyOptional({ example: 'Experience proof does not match the declared work history.', description: 'Required when rejecting; not used when approving.' })
  @ValidateIf((body: ProviderVerificationDecisionDto) => body.decision === 'reject')
  @IsString()
  @MinLength(5, { message: 'A rejection reason of at least 5 characters is required.' })
  @MaxLength(300)
  reason?: string;

  @ApiPropertyOptional({ example: 'Documents checked against the registration details.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;
}

// provider-operations.html status modal, with the same field names and limits as the customer status change.
export class UpdateProviderStatusDto {
  @ApiProperty({ enum: PROVIDER_ACCOUNT_STATUSES, example: 'Suspended', description: "'Suspended' blocks a verified provider; 'Active' reactivates them." })
  @IsIn(PROVIDER_ACCOUNT_STATUSES)
  status!: ManagedProviderStatus;

  @ApiProperty({ example: 'Repeated no-shows under review.' })
  @IsString()
  @MaxLength(500)
  @Matches(/\S/, { message: 'A reason is required.' })
  reason!: string;

  @ApiPropertyOptional({ example: 'Agreed with the operations lead.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remarks?: string;
}
