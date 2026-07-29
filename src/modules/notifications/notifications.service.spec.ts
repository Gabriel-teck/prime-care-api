import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: '1' }),
  })),
}));

import * as nodemailer from 'nodemailer';

describe('NotificationsService', () => {
  const createTransport = nodemailer.createTransport as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs and skips send when gmail unset', async () => {
    const config = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;
    const service = new NotificationsService(config);
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    await service.sendPasswordResetEmail(
      'a@b.com',
      'http://localhost:3000/reset?token=x',
    );

    expect(warn).toHaveBeenCalled();
    expect(createTransport).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('sends mail when gmail credentials set', async () => {
    const sendMail = jest.fn().mockResolvedValue({ messageId: '1' });
    createTransport.mockReturnValue({ sendMail });
    const config = {
      get: jest.fn((key: string) =>
        key === 'GMAIL_USER' || key === 'GMAIL_PASS' ? 'x' : undefined,
      ),
    } as unknown as ConfigService;
    const service = new NotificationsService(config);

    await service.sendPasswordResetEmail(
      'a@b.com',
      'http://localhost:3000/reset?token=x',
    );

    expect(createTransport).toHaveBeenCalled();
    expect(sendMail).toHaveBeenCalled();
  });
});
