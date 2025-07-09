import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'supersecret', // Use the same secret as in auth.module.ts
    });
    console.log('🔍 JWT Strategy: Initialized with secret: supersecret');
  }

  async validate(payload: any) {
    console.log('🔍 JWT Strategy: Validating payload:', payload);
    const result = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    console.log('🔍 JWT Strategy: Returning user object:', result);
    return result;
  }
}
