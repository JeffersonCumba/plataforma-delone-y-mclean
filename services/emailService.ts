import nodemailer from "nodemailer";
import { TRIAL_DAYS } from "@/lib/constants";

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const secure = process.env.SMTP_SECURE === "true";
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      throw new Error("SMTP configuration missing. Set SMTP_HOST, SMTP_USER, SMTP_PASS");
    }

    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }
  return transporter;
}

export async function sendEmail(options: EmailOptions): Promise<{ ok: boolean; message: string }> {
  try {
    const transport = getTransporter();
    const from = process.env.SMTP_FROM ?? `"Plataforma DeLone & McLean" <noreply@delone-mclean.com>`;

    await transport.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
    });

    return { ok: true, message: "Email sent successfully" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error sending email";
    console.error("Email send error:", error);
    return { ok: false, message };
  }
}

export async function sendTrialExpiringEmail(
  teacherEmail: string,
  teacherName: string,
  daysRemaining: number,
  excelBuffer?: Buffer | null,
  pdfBuffer?: Buffer | null,
): Promise<{ ok: boolean; message: string }> {
  const subject = `Tu prueba de ${TRIAL_DAYS} días expira en ${daysRemaining} día(s) - DeLone & McLean`;
  const hasAttachments = Boolean(excelBuffer && pdfBuffer);

  const text = `
Estimado/a ${teacherName},

Tu período de prueba de ${TRIAL_DAYS} días en la plataforma DeLone & McLean expira en ${daysRemaining} día(s).

${hasAttachments ? "Para que no pierdas tus datos, hemos adjuntado:\n- Un archivo Excel con la información de tus cursos y estudiantes\n- Un archivo PDF con el reporte completo de analíticas" : "Los reportes de respaldo no estuvieron disponibles en este momento."}

Por favor, contacta al administrador si deseas renovar tu acceso.

Saludos,
Equipo DeLone & McLean
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 560px; margin: 0 auto; padding: 24px; background: #f1f5f9; }
    .card { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04); }
    .header { background: #f8fafc; padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e2e8f0; }
    .body { padding: 28px 32px 32px; }
    .badge { display: inline-block; background: #fef3c7; color: #92400e; font-size: 13px; font-weight: 500; padding: 4px 12px; border-radius: 999px; margin-bottom: 12px; }
    .timer-block { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0; }
    .attachments { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0; }
    .warning { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px 32px; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; }
    h1 { color: #0f172a; font-size: 20px; margin: 12px 0 0; font-weight: 600; letter-spacing: -0.01em; }
    p { margin: 0 0 12px; font-size: 15px; }
    ul { margin: 8px 0 0; padding: 0 0 0 20px; }
    li { margin-bottom: 6px; font-size: 14px; color: #475569; }
    .strong { font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
      <h1>Tu prueba est&aacute; por expirar</h1>
    </div>
    <div class="body">
      <p>Estimado/a <strong>${teacherName}</strong>,</p>
      <p>Tu per&iacute;odo de prueba de <strong>${TRIAL_DAYS} d&iacute;as</strong> en la plataforma DeLone &amp; McLean expira en:</p>

      <div class="timer-block">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td valign="middle" style="padding-right: 12px; width: 28px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2v4"/>
                <path d="M12 18v4"/>
                <path d="M4.93 4.93l2.83 2.83"/>
                <path d="M16.24 16.24l2.83 2.83"/>
                <path d="M2 12h4"/>
                <path d="M18 12h4"/>
                <path d="M4.93 19.07l2.83-2.83"/>
                <path d="M16.24 7.76l2.83-2.83"/>
              </svg>
            </td>
            <td>
              <p style="margin: 0; font-size: 24px; font-weight: 700; color: #dc2626; letter-spacing: -0.02em;">${daysRemaining} d&iacute;a(s) restantes</p>
            </td>
          </tr>
        </table>
      </div>

      <div class="warning">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td valign="top" style="padding-right: 10px; padding-top: 1px; width: 18px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </td>
            <td>
              <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.5;">
                <strong>Acci&oacute;n requerida:</strong> Para no perder acceso a tus cursos, estudiantes y datos anal&iacute;ticos, contacta al administrador para renovar tu suscripci&oacute;n.
              </p>
            </td>
          </tr>
        </table>
      </div>

      ${
        hasAttachments
          ? `
      <div class="attachments">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td valign="top" style="padding-right: 10px; padding-top: 1px; width: 18px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </td>
            <td>
              <p style="color: #166534; font-size: 14px; font-weight: 600; margin: 0 0 6px;">Archivos adjuntos (respaldos)</p>
              <ul style="margin: 0;">
                <li><strong>backup_${teacherName.replace(/\s+/g, "_")}.xlsx</strong> — Cursos, estudiantes y m&eacute;tricas en Excel</li>
                <li><strong>reporte_${teacherName.replace(/\s+/g, "_")}.pdf</strong> — Reporte completo de anal&iacute;ticas DeLone &amp; McLean</li>
              </ul>
            </td>
          </tr>
        </table>
      </div>`
          : `
      <div class="warning">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td valign="top" style="padding-right: 10px; padding-top: 1px; width: 18px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </td>
            <td>
              <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.5;">
                Los reportes de respaldo no estuvieron disponibles en este momento. Ser&aacute;n generados en la pr&oacute;xima ejecuci&oacute;n autom&aacute;tica.
              </p>
            </td>
          </tr>
        </table>
      </div>`
      }

      <p>Si ya has renovado tu acceso, puedes ignorar este mensaje.</p>
      <p style="margin-bottom: 0;">Saludos cordiales,<br>Equipo DeLone &amp; McLean</p>
    </div>
    <div class="footer">
      Este es un mensaje autom&aacute;tico, por favor no respondas a este correo.
    </div>
  </div>
</body>
</html>
  `.trim();

  const attachments = hasAttachments
    ? [
        {
          filename: `backup_${teacherName.replace(/\s+/g, "_")}.xlsx`,
          content: excelBuffer!,
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" as const,
        },
        {
          filename: `reporte_${teacherName.replace(/\s+/g, "_")}.pdf`,
          content: pdfBuffer!,
          contentType: "application/pdf" as const,
        },
      ]
    : [];

  return sendEmail({
    to: teacherEmail,
    subject,
    text,
    html,
    attachments,
  });
}

export async function sendTrialExpiredEmail(
  teacherEmail: string,
  teacherName: string,
  excelBuffer?: Buffer | null,
  pdfBuffer?: Buffer | null,
): Promise<{ ok: boolean; message: string }> {
  const subject = `Tu cuenta de prueba ha expirado - DeLone & McLean`;
  const hasAttachments = Boolean(excelBuffer && pdfBuffer);

  const text = `
Estimado/a ${teacherName},

Tu período de prueba de ${TRIAL_DAYS} días en la plataforma DeLone & McLean ha expirado.

Tu cuenta y todos los datos asociados (cursos, estudiantes, encuestas, reportes) han sido eliminados permanentemente del sistema.

${hasAttachments ? "Se adjuntan los reportes finales de respaldo." : "No se pudieron generar los reportes de respaldo."}

Si deseas recuperar el acceso, por favor contacta al administrador.

Saludos,
Equipo DeLone & McLean
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 560px; margin: 0 auto; padding: 24px; background: #f1f5f9; }
    .card { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04); }
    .header { background: #fef2f2; padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #fecaca; }
    .body { padding: 28px 32px 32px; }
    .badge { display: inline-block; background: #fef3c7; color: #92400e; font-size: 13px; font-weight: 500; padding: 4px 12px; border-radius: 999px; margin-bottom: 12px; }
    .expired-block { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .attachments { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0; }
    .error { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px 32px; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; }
    h1 { color: #991b1b; font-size: 20px; margin: 12px 0 0; font-weight: 600; letter-spacing: -0.01em; }
    p { margin: 0 0 12px; font-size: 15px; }
    ul { margin: 8px 0 0; padding: 0 0 0 20px; }
    li { margin-bottom: 6px; font-size: 14px; color: #475569; }
    .strong { font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
      <h1>Tu cuenta ha expirado</h1>
    </div>
    <div class="body">
      <p>Estimado/a <strong>${teacherName}</strong>,</p>
      <p>Tu per&iacute;odo de prueba de <strong>${TRIAL_DAYS} d&iacute;as</strong> en la plataforma DeLone &amp; McLean ha expirado.</p>

      <div class="expired-block">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td valign="top" style="padding-right: 12px; width: 24px;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </td>
            <td>
              <p style="color: #991b1b; font-size: 14px; font-weight: 600; margin: 0 0 2px;">Cuenta eliminada permanentemente</p>
              <p style="color: #b91c1c; font-size: 14px; margin: 0; line-height: 1.5;">
                Todos los datos asociados (cursos, estudiantes, encuestas, reportes) han sido eliminados del sistema.
              </p>
            </td>
          </tr>
        </table>
      </div>

      ${
        hasAttachments
          ? `
      <div class="attachments">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td valign="top" style="padding-right: 10px; padding-top: 1px; width: 18px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </td>
            <td>
              <p style="color: #166534; font-size: 14px; font-weight: 600; margin: 0 0 6px;">Respaldos finales adjuntos</p>
              <ul style="margin: 0;">
                <li><strong>backup_${teacherName.replace(/\s+/g, "_")}.xlsx</strong> &mdash; Cursos, estudiantes y m&eacute;tricas en Excel</li>
                <li><strong>reporte_${teacherName.replace(/\s+/g, "_")}.pdf</strong> &mdash; Reporte completo de anal&iacute;ticas DeLone &amp; McLean</li>
              </ul>
            </td>
          </tr>
        </table>
      </div>`
          : `
      <div class="error">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td valign="top" style="padding-right: 10px; padding-top: 1px; width: 18px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </td>
            <td>
              <p style="color: #991b1b; font-size: 14px; margin: 0; line-height: 1.5;">
                No se pudieron generar los reportes de respaldo autom&aacute;ticamente. Contacta al administrador para solicitar una copia manual de tus datos.
              </p>
            </td>
          </tr>
        </table>
      </div>`
      }

      <p>Si deseas recuperar el acceso, contacta al administrador.</p>
      <p style="margin-bottom: 0;">Saludos cordiales,<br>Equipo DeLone &amp; McLean</p>
    </div>
    <div class="footer">
      Este es un mensaje autom&aacute;tico, por favor no respondas a este correo.
    </div>
  </div>
</body>
</html>
  `.trim();

  const attachments = hasAttachments
    ? [
        {
          filename: `backup_${teacherName.replace(/\s+/g, "_")}.xlsx`,
          content: excelBuffer!,
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" as const,
        },
        {
          filename: `reporte_${teacherName.replace(/\s+/g, "_")}.pdf`,
          content: pdfBuffer!,
          contentType: "application/pdf" as const,
        },
      ]
    : [];

  return sendEmail({
    to: teacherEmail,
    subject,
    text,
    html,
    attachments,
  });
}

