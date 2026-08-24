import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsUUID } from 'class-validator';

export class StartCallDto {
  @ApiProperty({ enum: ['audio', 'video'] })
  @IsIn(['audio', 'video'])
  mode!: 'audio' | 'video';
}

export class CallIdDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  callId!: string;
}
