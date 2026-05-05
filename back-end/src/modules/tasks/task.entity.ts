import { ApiProperty } from '@nestjs/swagger';

export class Task {
  @ApiProperty({ example: 'b0965962-ee6d-4990-9a54-fb43c58a54b2' })
  id: string;

  @ApiProperty({ example: 'Confirm service booking' })
  title: string;

  @ApiProperty({ example: 'Call the customer and confirm the selected service slot.' })
  description: string;

  @ApiProperty({ example: 'pending' })
  status: string;
}
