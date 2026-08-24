import nodemailer from 'nodemailer';
import prisma from '../utils/prisma';
import { decryptSecret } from '../utils/crypto';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private static async getActiveConfig() {
    const config = await prisma.emailConfig.findFirst({
      where: { status: 'active' },
      orderBy: { updatedAt: 'desc' },
    });

    if (!config) {
      const settings = await prisma.systemSetting.findMany();
      const map: Record<string, string> = {};
      settings.forEach((s) => (map[s.key] = s.value));

      let host = map['smtpHost'] || 'smtp.sendgrid.net';
      if (host.includes('fsfsff') || host.includes('invalid') || !host.includes('.')) {
        host = 'smtp.sendgrid.net';
      }

      return {
        provider: map['emailProvider'] || 'SMTP',
        host,
        port: Number(map['smtpPort']) || 587,
        username: map['smtpUsername'] || 'apikey',
        password: map['smtpPassword'] || '',
        fromEmail: map['smtpFromEmail'] || 'notifications@supplybridge.io',
        fromName: map['smtpFromName'] || 'SupplyBridge Enterprise PIM',
      };
    }

    let host = config.host || 'smtp.sendgrid.net';
    if (host.includes('fsfsff') || host.includes('invalid') || !host.includes('.')) {
      host = 'smtp.sendgrid.net';
    }

    return {
      provider: config.provider,
      host,
      port: config.port || 587,
      username: config.username || '',
      password: config.encryptedPassword ? decryptSecret(config.encryptedPassword) : config.apiKey || '',
      fromEmail: config.fromEmail,
      fromName: config.fromName,
    };
  }

  static async sendEmail({ to, subject, html, text }: EmailOptions) {
    try {
      const config = await this.getActiveConfig();

      console.log(`[EmailService] Dispatching email via Provider: ${config.provider} (Host: ${config.host}) to ${to}`);

      // Create Nodemailer transport based on dynamic driver configuration
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: config.username
          ? {
              user: config.username,
              pass: config.password || 'demo_key',
            }
          : undefined,
        tls: {
          rejectUnauthorized: false,
        },
        connectionTimeout: 4000,
      });

      try {
        const info = await transporter.sendMail({
          from: `"${config.fromName}" <${config.fromEmail}>`,
          to,
          subject,
          html,
          text: text || html.replace(/<[^>]*>?/gm, ''),
        });

        console.log(`[EmailService] Message sent successfully: ${info.messageId}`);
        return { success: true, messageId: info.messageId, provider: config.provider };
      } catch (err: any) {
        console.error('[EmailService] SMTP connection or authentication failed:', err.message);
        throw err; // Throw to the outer catch block to return success: false
      }
    } catch (error: any) {
      console.error('[EmailService] Failed to send email:', error);
      return { success: false, error: error.message };
    }
  }

  static async sendTestEmail(targetEmail: string) {
    return this.sendEmail({
      to: targetEmail,
      subject: 'SupplyBridge Test Email Notification',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #4f46e5; margin-bottom: 8px;">SupplyBridge Email Integration Test</h2>
          <p style="color: #475569; font-size: 14px;">This is a test email sent from SupplyBridge Enterprise PIM.</p>
          <div style="background-color: #f8fafc; padding: 12px; border-radius: 8px; font-size: 13px; color: #334155; margin-top: 15px;">
            <strong>Status:</strong> Email provider connection verified successfully.<br/>
            <strong>Timestamp:</strong> ${new Date().toLocaleString()}
          </div>
        </div>
      `,
    });
  }
}
