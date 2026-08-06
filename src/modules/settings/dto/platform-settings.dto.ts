import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class UpdatePlatformSettingsDto {
  @ApiProperty({ example: 'PrimeCare' })
  @IsString()
  @MinLength(1)
  brandName!: string;

  @ApiProperty({ example: 'support@primecare.health' })
  @IsEmail()
  supportEmail!: string;

  @ApiProperty({ example: 'Africa/Lagos' })
  @IsString()
  @MinLength(1)
  timezone!: string;
}
