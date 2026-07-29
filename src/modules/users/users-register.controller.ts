import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from '../auth/auth.service';
import { RegisterDto } from '../auth/dto/auth.dto';

@ApiTags('Users')
@Controller('users')
export class UsersRegisterController {
  constructor(private auth: AuthService) {}

  /** Compatibility alias for frontend POST /users/register */
  @Post('register')
  @ApiOperation({
    summary: 'Register a patient (alias of POST /auth/register)',
  })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }
}
