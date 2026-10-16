import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class SaveReviewDto {
  @IsInt() @Min(1) @Max(5) rating!: number;
  @IsOptional() @IsString() @MaxLength(1000) feedback?: string;
}
