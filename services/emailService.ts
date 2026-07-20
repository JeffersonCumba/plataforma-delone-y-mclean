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
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
    .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0; }
    .attachments { background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 16px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; }
    .timer { font-size: 24px; font-weight: bold; color: #dc2626; }
    .no-reports { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0; color: #92400e; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0; font-size: 24px;">⏳ Tu prueba está por expirar</h1>
  </div>
  <div class="content">
    <p>Estimado/a <strong>${teacherName}</strong>,</p>
    <p>Tu período de prueba de <strong>${TRIAL_DAYS} días</strong> en la plataforma DeLone & McLean expira en <strong class="timer">${daysRemaining} día(s)</strong>.</p>
    
    <div class="warning">
      <strong>⚠️ Acción requerida:</strong> Para no perder acceso a tus cursos, estudiantes y datos analíticos, por favor contacta al administrador para renovar tu suscripción.
    </div>

    ${
      hasAttachments
        ? `
    <div class="attachments">
      <strong>📎 Archivos adjuntos (respaldos):</strong>
      <ul>
        <li><strong>backup_${teacherName.replace(/\s+/g, "_")}.xlsx</strong> - Cursos, estudiantes y métricas en Excel</li>
        <li><strong>reporte_${teacherName.replace(/\s+/g, "_")}.pdf</strong> - Reporte completo de analíticas DeLone & McLean</li>
      </ul>
    </div>`
        : `
    <div class="no-reports">
      ⚠️ Los reportes de respaldo no estuvieron disponibles en este momento. Serán generados en la próxima ejecución automática.
    </div>`
    }

    <p>Si ya has renovado tu acceso, puedes ignorar este mensaje.</p>
    <p>Saludos cordiales,<br>Equipo DeLone & McLean</p>
  </div>
  <div class="footer">
    Este es un mensaje automático, por favor no respondas a este correo.
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
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
    .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; }
    .attachments { background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 16px; margin: 20px 0; }
    .error { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 16px; margin: 20px 0; color: #dc2626; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0; font-size: 24px;">❌ Tu cuenta ha expirado</h1>
  </div>
  <div class="content">
    <p>Estimado/a <strong>${teacherName}</strong>,</p>
    <p>Tu período de prueba de <strong>${TRIAL_DAYS} días</strong> en la plataforma DeLone & McLean ha expirado.</p>
    <p>Tu cuenta y todos los datos asociados (cursos, estudiantes, encuestas, reportes) han sido <strong>eliminados permanentemente</strong> del sistema.</p>
    ${
      hasAttachments
        ? `
    <div class="attachments">
      <strong>📎 Archivos adjuntos (respaldos finales):</strong>
      <ul>
        <li><strong>backup_${teacherName.replace(/\s+/g, "_")}.xlsx</strong> - Cursos, estudiantes y métricas en Excel</li>
        <li><strong>reporte_${teacherName.replace(/\s+/g, "_")}.pdf</strong> - Reporte completo de analíticas DeLone & McLean</li>
      </ul>
    </div>`
        : `
    <div class="error">
      ⚠️ No se pudieron generar los reportes de respaldo automáticamente. Contacta al administrador para solicitar una copia manual de tus datos.
    </div>
    `
    }
    <p>Si deseas recuperar el acceso, por favor contacta al administrador.</p>
    <p>Saludos cordiales,<br>Equipo DeLone & McLean</p>
  </div>
  <div class="footer">
    Este es un mensaje automático, por favor no respondas a este correo.
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

