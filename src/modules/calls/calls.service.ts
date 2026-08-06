import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingStatus } from '../../generated/prisma/client';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { CallsGateway } from './calls.gateway';

const CALL_TTL_MS = 5 * 60 * 1000;

export type ActiveCall = {
  callId: string;
  consultationId: string;
  mode: 'audio' | 'video';
  starterId: string;
  peerId: string;
  createdAt: number;
};

export type CallSessionPayload = {
  callId: string;
  consultationId: string;
  mode: 'audio' | 'video';
  localPeerId: string;
  remotePeerId: string;
  isStarter: boolean;
};

@Injectable()
export class CallsService {
  private activeCalls = new Map<string, ActiveCall>();

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => CallsGateway))
    private gateway: CallsGateway,
  ) {}

  getCall(callId: string): ActiveCall | undefined {
    this.purgeExpired();
    return this.activeCalls.get(callId);
  }

  private purgeExpired() {
    const now = Date.now();
    for (const [id, call] of this.activeCalls) {
      if (now - call.createdAt > CALL_TTL_MS) {
        this.activeCalls.delete(id);
      }
    }
  }

  private async loadConsultation(id: string) {
    const row = await this.prisma.consultation.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, fullName: true } },
        doctor: { select: { id: true, fullName: true } },
      },
    });
    if (!row) throw new NotFoundException('Consultation not found');
    return row;
  }

  private assertParticipant(
    auth: AuthUser,
    row: { patientId: string; doctorId: string | null },
  ) {
    const isPatient = row.patientId === auth.userId;
    const isDoctor = row.doctorId === auth.userId;
    if (!isPatient && !isDoctor) {
      throw new ForbiddenException('Not a participant of this consultation');
    }
    return { isPatient, isDoctor };
  }

  private assertCallable(row: {
    doctorId: string | null;
    status: BookingStatus;
  }) {
    if (!row.doctorId) {
      throw new BadRequestException('Consultation has no assigned doctor yet');
    }
    if (
      row.status !== BookingStatus.CONFIRMED &&
      row.status !== BookingStatus.RESCHEDULED
    ) {
      throw new BadRequestException(
        'Consultation must be confirmed before calling',
      );
    }
  }

  private sessionPayload(auth: AuthUser, call: ActiveCall): CallSessionPayload {
    const isStarter = call.starterId === auth.userId;
    return {
      callId: call.callId,
      consultationId: call.consultationId,
      mode: call.mode,
      localPeerId: auth.userId,
      remotePeerId: isStarter ? call.peerId : call.starterId,
      isStarter,
    };
  }

  async start(
    auth: AuthUser,
    consultationId: string,
    mode: 'audio' | 'video',
  ): Promise<CallSessionPayload> {
    this.purgeExpired();
    const row = await this.loadConsultation(consultationId);
    this.assertCallable(row);
    this.assertParticipant(auth, row);

    const peerId =
      row.patientId === auth.userId ? row.doctorId! : row.patientId;
    const fromName =
      row.patientId === auth.userId
        ? row.patient.fullName
        : row.doctor?.fullName || 'Doctor';

    const callId = randomUUID();
    const call: ActiveCall = {
      callId,
      consultationId,
      mode,
      starterId: auth.userId,
      peerId,
      createdAt: Date.now(),
    };
    this.activeCalls.set(callId, call);

    this.gateway.emitToUser(peerId, 'callIncoming', {
      callId,
      consultationId,
      mode,
      from: { id: auth.userId, fullName: fromName },
    });

    return this.sessionPayload(auth, call);
  }

  async accept(
    auth: AuthUser,
    consultationId: string,
    callId: string,
  ): Promise<CallSessionPayload> {
    this.purgeExpired();
    const call = this.activeCalls.get(callId);
    if (!call || call.consultationId !== consultationId) {
      throw new NotFoundException('Call not found or expired');
    }
    if (call.peerId !== auth.userId) {
      throw new ForbiddenException('Only the callee can accept this call');
    }

    const row = await this.loadConsultation(consultationId);
    this.assertParticipant(auth, row);

    this.gateway.emitToUser(call.starterId, 'callAccepted', {
      callId,
      consultationId,
      mode: call.mode,
    });

    return this.sessionPayload(auth, call);
  }

  decline(auth: AuthUser, consultationId: string, callId: string) {
    this.purgeExpired();
    const call = this.activeCalls.get(callId);
    if (!call || call.consultationId !== consultationId) {
      throw new NotFoundException('Call not found or expired');
    }
    if (call.peerId !== auth.userId && call.starterId !== auth.userId) {
      throw new ForbiddenException();
    }

    this.activeCalls.delete(callId);
    const notifyId = auth.userId === call.peerId ? call.starterId : call.peerId;
    this.gateway.emitToUser(notifyId, 'callDeclined', {
      callId,
      consultationId,
    });
    return { ok: true };
  }

  end(auth: AuthUser, consultationId: string, callId: string) {
    this.purgeExpired();
    const call = this.activeCalls.get(callId);
    if (!call || call.consultationId !== consultationId) {
      return { ok: true };
    }
    if (call.peerId !== auth.userId && call.starterId !== auth.userId) {
      throw new ForbiddenException();
    }

    this.activeCalls.delete(callId);
    const notifyId = auth.userId === call.peerId ? call.starterId : call.peerId;
    this.gateway.emitToUser(notifyId, 'callEnded', {
      callId,
      consultationId,
    });
    return { ok: true };
  }
}
