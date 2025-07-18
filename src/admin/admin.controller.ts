import { Controller, Get, UseGuards } from '@nestjs/common';
import {JwtAuthGuard} from "../auth/jwt-auth.guard"
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorator/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  @Get('dasboard')
  getDashboard() {
    return 'Admin dashboard data';
  }
}
