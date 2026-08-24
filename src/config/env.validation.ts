import { plainToInstance } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET!: string;

  @IsOptional()
  @IsString()
  GOOGLE_CLIENT_ID?: string;

  @IsOptional()
  @IsString()
  GOOGLE_CLIENT_IDS?: string;

  @IsOptional()
  @IsString()
  PORT?: string;

  @IsOptional()
  @IsString()
  FRONTEND_URL?: string;

  @IsOptional()
  @IsString()
  GMAIL_USER?: string;

  @IsOptional()
  @IsString()
  GMAIL_PASS?: string;

  @IsOptional()
  @IsString()
  CONTACT_TO_EMAIL?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  // Allow empty optional Google client during local boot
  const normalized = {
    ...config,
    GOOGLE_CLIENT_ID: config.GOOGLE_CLIENT_ID || undefined,
    GOOGLE_CLIENT_IDS: config.GOOGLE_CLIENT_IDS || undefined,
    GMAIL_USER: config.GMAIL_USER || undefined,
    GMAIL_PASS: config.GMAIL_PASS || undefined,
    CONTACT_TO_EMAIL: config.CONTACT_TO_EMAIL || undefined,
  };
  const validated = plainToInstance(EnvironmentVariables, normalized, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed: ${errors
        .map((e) => Object.values(e.constraints || {}).join(', '))
        .join('; ')}`,
    );
  }
  return validated;
}
