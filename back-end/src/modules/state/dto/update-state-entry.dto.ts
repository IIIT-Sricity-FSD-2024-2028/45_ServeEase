import { PartialType } from '@nestjs/swagger';
import { CreateStateEntryDto } from './create-state-entry.dto';

export class UpdateStateEntryDto extends PartialType(CreateStateEntryDto) {}
