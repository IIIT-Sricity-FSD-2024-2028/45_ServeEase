import { ApiProperty } from '@nestjs/swagger';

export class StateEntry {
  @ApiProperty({ example: 'serveEaseCustomerModuleData' })
  key: string;

  @ApiProperty({ example: { bookings: [], payments: [], tickets: [] } })
  value: Record<string, unknown>;

  @ApiProperty({ example: '2026-05-05T05:20:00.000Z' })
  updatedAt: string;
}
