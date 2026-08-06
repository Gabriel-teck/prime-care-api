import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { CallsService } from './calls.service';
import { CallIdDto, StartCallDto } from './dto/call.dto';

@ApiTags('Calls')
@ApiBearerAuth('JWT')
@Controller('consultations/:id/calls')
@UseGuards(JwtAuthGuard)
export class CallsController {
  constructor(private calls: CallsService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start a voice or video call for a consultation' })
  start(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: StartCallDto,
  ) {
    return this.calls.start(user, id, dto.mode);
  }

  @Post('accept')
  @ApiOperation({ summary: 'Accept an incoming consultation call' })
  accept(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CallIdDto,
  ) {
    return this.calls.accept(user, id, dto.callId);
  }

  @Post('decline')
  @ApiOperation({ summary: 'Decline an incoming consultation call' })
  decline(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CallIdDto,
  ) {
    return this.calls.decline(user, id, dto.callId);
  }

  @Post('end')
  @ApiOperation({ summary: 'End an active consultation call' })
  end(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CallIdDto,
  ) {
    return this.calls.end(user, id, dto.callId);
  }
}
