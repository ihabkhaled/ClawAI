import nodemailer from 'nodemailer';

import { buildSmtpTransportOptions, createSmtpEmailTransport } from '../smtp-email.utility';

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(),
  },
}));

describe('SMTP email utility', () => {
  const smtp = {
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    user: 'mailer',
    pass: 'secret',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires STARTTLS and disables file and URL attachment access', () => {
    expect(buildSmtpTransportOptions(smtp)).toEqual({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: 'mailer', pass: 'secret' },
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  });

  it('uses implicit TLS only on port 465', () => {
    expect(buildSmtpTransportOptions({ ...smtp, port: 465, secure: true })).toMatchObject({
      secure: true,
      requireTLS: false,
    });
  });

  it('sends an in-memory PDF attachment with a stable message id', async () => {
    const sendMail = jest.fn().mockResolvedValue({ messageId: 'accepted' });
    jest.mocked(nodemailer.createTransport).mockReturnValue({ sendMail } as never);
    const transport = createSmtpEmailTransport(smtp);
    const content = new Uint8Array([37, 80, 68, 70]);

    await transport.send({
      from: 'billing@claw.ai',
      to: 'buyer@example.com',
      subject: 'Invoice CLAW-00000001',
      text: 'Your invoice is attached.',
      html: '<p>Your invoice is attached.</p>',
      messageId: 'invoice-1@claw.ai',
      attachments: [
        {
          filename: 'CLAW-00000001.pdf',
          content,
          contentType: 'application/pdf',
        },
      ],
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        messageId: 'invoice-1@claw.ai',
        attachments: [
          expect.objectContaining({
            filename: 'CLAW-00000001.pdf',
            contentType: 'application/pdf',
            content: expect.any(Buffer),
          }),
        ],
      }),
    );
  });
});
