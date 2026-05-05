import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({ example: 'Confirm service booking' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(80)
  title: string;

  @ApiProperty({ example: 'Call the customer and confirm the selected service slot.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(500)
  description: string;

  @ApiProperty({ example: 'pending', enum: ['pending', 'in-progress', 'completed'] })
  @IsString()
  @IsIn(['pending', 'in-progress', 'completed'])
  status: string;
}
