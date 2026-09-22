import nodemailer from 'nodemailer';

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: {
    filename: string;
    content: Buffer;
    contentType?: string;
  }[];
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  simulated?: boolean;
  provider?: 'smtp' | 'resend' | 'simulated';
  error?: string;
}

/**
 * Dispatches email directly via standard SMTP (e.g. Gmail with App Password)
 */
async function sendViaSmtp(params: SendEmailParams, recipients: string[]): Promise<SendEmailResult> {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, '');
  const from = process.env.SMTP_FROM || `Quartzite Management System <${user}>`;

  if (!user || !pass) {
    throw new Error('SMTP credentials not configured (SMTP_USER and SMTP_PASS required).');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  const info = await transporter.sendMail({
    from,
    to: recipients,
    subject: params.subject,
    html: params.html,
    attachments: params.attachments?.map((att) => ({
      filename: att.filename,
      content: att.content,
      contentType: att.contentType || 'application/pdf',
    })),
  });

  return {
    success: true,
    messageId: info.messageId,
    provider: 'smtp',
  };
}

/**
 * Sends a transactional email with optional attachments.
 * Integrates directly with SMTP (Gmail App Password) or Resend if keys are provided.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const recipients = Array.isArray(params.to)
    ? params.to.map((r) => r.trim()).filter(Boolean)
    : [params.to.trim()];

  // Option B: Direct SMTP (Gmail with Google App Password)
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.replace(/\s+/g, '');

  if (smtpUser && smtpPass && smtpPass.length > 0) {
    try {
      return await sendViaSmtp(params, recipients);
    } catch (smtpErr: unknown) {
      const errMsg = smtpErr instanceof Error ? smtpErr.message : String(smtpErr);
      console.error('[emailService] SMTP dispatch failed:', errMsg);
      if (!process.env.RESEND_API_KEY) {
        return {
          success: false,
          provider: 'smtp',
          error: `SMTP dispatch error: ${errMsg}`,
        };
      }
      console.warn('[emailService] Falling back to Resend API...');
    }
  }

  // Option A: Resend API
  const resendApiKey = process.env.RESEND_API_KEY;
  let fromEmail = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || 'QMS Reports <onboarding@resend.dev>';

  // Resend forbids sending from public webmail domains (e.g. @gmail.com) without custom domain DNS verification.
  // In development or test mode, fallback to Resend's verified onboarding sender.
  if (fromEmail.toLowerCase().includes('@gmail.com') || fromEmail.toLowerCase().includes('@yahoo.com')) {
    console.warn(`[emailService] Notice: "${fromEmail}" is a public webmail domain unverified on Resend. Falling back to "QMS Reports <onboarding@resend.dev>".`);
    fromEmail = 'QMS Reports <onboarding@resend.dev>';
  }

  if (!resendApiKey) {
    console.log('[EMAIL SERVICE - SIMULATED DISPATCH]');
    console.log(`  To: ${recipients.join(', ')}`);
    console.log(`  From: ${fromEmail}`);
    console.log(`  Subject: ${params.subject}`);
    console.log(`  Attachments: ${params.attachments?.map((a) => `${a.filename} (${a.content.length} bytes)`).join(', ') || 'None'}`);
    
    return {
      success: true,
      simulated: true,
      messageId: `simulated-${Date.now()}`,
    };
  }

  try {
    const payload = {
      from: fromEmail,
      to: recipients,
      subject: params.subject,
      html: params.html,
      attachments: params.attachments?.map((att) => ({
        filename: att.filename,
        content: att.content.toString('base64'),
        contentType: att.contentType || 'application/pdf',
      })),
    };

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.warn('Resend API notice:', errorText);

      // If in testing sandbox and unverified recipients caused the 403, attempt fallback delivery to the account owner
      if (res.status === 403 && errorText.includes('testing emails to your own email address')) {
        const match = errorText.match(/\(([^)]+@[^)]+)\)/);
        const ownerEmail = match ? match[1] : null;
        if (ownerEmail && recipients.includes(ownerEmail) && recipients.length > 1) {
          console.info(`[emailService] Sandbox Mode: Retrying dispatch for account owner (${ownerEmail}) while custom domain verification is pending.`);
          const retryRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              ...payload,
              to: [ownerEmail],
              subject: `[Sandbox Delivery] ${params.subject}`,
            }),
          });
          if (retryRes.ok) {
            const retryData = await retryRes.json();
            return {
              success: true,
              messageId: retryData.id,
              error: `Sandbox mode: Delivered to ${ownerEmail}. Add & verify a domain at resend.com/domains to dispatch to all ${recipients.length} administrators.`,
            };
          }
        }
      }

      return {
        success: false,
        error: `Resend HTTP ${res.status}: ${errorText}`,
      };
    }

    const data = await res.json();
    return {
      success: true,
      messageId: data.id,
    };
  } catch (err: unknown) {
    console.error('Email dispatch error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown email dispatch error',
    };
  }
}
