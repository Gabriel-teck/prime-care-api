import { SetMetadata } from '@nestjs/common';
import { ApiRole } from '../../config/roles';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: ApiRole[]) => SetMetadata(ROLES_KEY, roles);
