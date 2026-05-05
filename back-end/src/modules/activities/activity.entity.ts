import { ApiProperty } from '@nestjs/swagger';

export class Activity {
  @ApiProperty({ example: '9f809193-3af0-4ca4-9e86-f6543f1c9b8a' })
  id: string;

  @ApiProperty({ example: 'login_success' })
  action: string;

  @ApiProperty({ example: 'login.html' })
  page: string;

  @ApiProperty({ example: 'customer user@serveease.com' })
  details: string;

  @ApiProperty({ example: '2026-05-05T04:30:00.000Z' })
  createdAt: string;
}
