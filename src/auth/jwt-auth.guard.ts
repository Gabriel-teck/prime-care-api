import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    console.log('🔍 JWT Auth Guard: Checking authentication...');
    const request = context.switchToHttp().getRequest();
    console.log(
      '🔍 JWT Auth Guard: Authorization header:',
      request.headers.authorization,
    );
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    console.log('🔍 JWT Auth Guard: handleRequest called');
    console.log('🔍 JWT Auth Guard: Error:', err);
    console.log('🔍 JWT Auth Guard: User:', user);
    console.log('🔍 JWT Auth Guard: Info:', info);

    if (err || !user) {
      console.log('🔍 JWT Auth Guard: Authentication failed');
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
