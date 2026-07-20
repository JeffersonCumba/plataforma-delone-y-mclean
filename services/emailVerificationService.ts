import { type RowDataPacket, type ResultSetHeader } from "mysql2";
import { pool } from "@/lib/db";
import { sendEmail } from "@/services/emailService";

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const MAX_ATTEMPTS = 5;

interface VerificationRow extends RowDataPacket {
  id: number;
  user_id: number;
  email: string;
  verification_code: string | null;
  code_expires_at: Date | null;
  attempts: number;
  verified: boolean;
  verified_at: Date | null;
}

export async function initializeEmailVerification(
  userId: number,
  email: string,
): Promise<void> {
  await pool.execute(
    `INSERT IGNORE INTO mdl_user_email_verification (user_id, email)
     VALUES (?, ?)`,
    [userId, email],
  );
}

export async function sendVerificationCode(
  userId: number,
): Promise<{ ok: boolean; message: string }> {
  const [rows] = await pool.execute<VerificationRow[]>(
    `SELECT * FROM mdl_user_email_verification WHERE user_id = ?`,
    [userId],
  );

  const record = rows[0];
  if (!record) {
    return { ok: false, message: "No se encontró registro de verificación." };
  }

  if (record.verified) {
    return { ok: false, message: "El correo ya está verificado." };
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.execute(
      `UPDATE mdl_user_email_verification
       SET verification_code = ?, code_expires_at = ?, attempts = 0, updated_at = NOW()
       WHERE user_id = ?`,
      [code, expiresAt, userId],
    );

  try {
    await sendEmail({
      to: record.email,
      subject: "Código de verificación — Plataforma DeLone y McLean",
      text: `Tu código de verificación es: ${code}\n\nEste código expira en 10 minutos.\n\nSi no solicitaste este código, ignora este mensaje.`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <div style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);">
            <div style="background: #f8fafc; padding: 32px 32px 20px; text-align: center; border-bottom: 1px solid #e2e8f0;">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="M22 4L12 13 2 4"/>
              </svg>
              <h1 style="color: #0f172a; font-size: 18px; margin: 14px 0 0; font-weight: 600; letter-spacing: -0.01em;">Verifica tu correo electrónico</h1>
            </div>
            <div style="padding: 24px 32px 32px;">
              <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
                Usa el siguiente código para verificar tu cuenta en la plataforma:
              </p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0f172a; font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace;">
                  ${code}
                </span>
              </div>
              <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 12px 14px; margin-top: 16px;">
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td valign="top" style="padding-right: 8px; padding-top: 1px;">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                    </td>
                    <td>
                      <p style="color: #92400e; font-size: 13px; margin: 0; line-height: 1.4;">
                        Este c&oacute;digo expira en <strong>10 minutos</strong>. Si no solicitaste esta verificaci&oacute;n, ignora este correo.
                      </p>
                    </td>
                  </tr>
                </table>
              </div>
            </div>
          </div>
          <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 16px;">
            Plataforma DeLone y McLean &mdash; Evaluaci&oacute;n de Calidad de Software
          </p>
        </div>
      `,
    });
    return { ok: true, message: "Código enviado a tu correo." };
  } catch (error) {
    console.error("[sendVerificationCode] Error sending email:", error);
    return { ok: false, message: "No se pudo enviar el código. Intenta de nuevo." };
  }
}

export async function verifyEmailCode(
  userId: number,
  code: string,
): Promise<{ ok: boolean; message: string }> {
  const [rows] = await pool.execute<VerificationRow[]>(
    `SELECT * FROM mdl_user_email_verification WHERE user_id = ?`,
    [userId],
  );

  const record = rows[0];
  if (!record) {
    return { ok: false, message: "No se encontró registro de verificación." };
  }

  if (record.verified) {
    return { ok: true, message: "El correo ya está verificado." };
  }

  if (!record.verification_code || !record.code_expires_at) {
    return { ok: false, message: "No se ha solicitado un código. Envía uno primero." };
  }

  if (new Date() > new Date(record.code_expires_at)) {
    return { ok: false, message: "El código ha expirado. Solicita uno nuevo." };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await pool.execute(
      `UPDATE mdl_user_email_verification
       SET verification_code = NULL, code_expires_at = NULL, updated_at = NOW()
       WHERE user_id = ?`,
      [userId],
    );
    return { ok: false, message: "Demasiados intentos fallidos. Solicita un nuevo código." };
  }

  if (record.verification_code !== code) {
    const newAttempts = record.attempts + 1;

    if (newAttempts >= MAX_ATTEMPTS) {
      await pool.execute(
        `UPDATE mdl_user_email_verification
         SET attempts = ?, verification_code = NULL, code_expires_at = NULL, updated_at = NOW()
         WHERE user_id = ?`,
        [newAttempts, userId],
      );
      return { ok: false, message: "Demasiados intentos fallidos. Solicita un nuevo código." };
    }

    await pool.execute(
      `UPDATE mdl_user_email_verification
       SET attempts = ?, updated_at = NOW()
       WHERE user_id = ?`,
      [newAttempts, userId],
    );
    return { ok: false, message: "Código incorrecto. Verifica e intenta de nuevo." };
  }

  await pool.execute(
    `UPDATE mdl_user_email_verification
     SET verified = TRUE, verified_at = NOW(), verification_code = NULL, code_expires_at = NULL, attempts = 0, updated_at = NOW()
     WHERE user_id = ?`,
    [userId],
  );

  return { ok: true, message: "Correo verificado correctamente." };
}

export async function isEmailVerified(userId: number): Promise<boolean> {
  const [rows] = await pool.execute<VerificationRow[]>(
    `SELECT verified FROM mdl_user_email_verification WHERE user_id = ?`,
    [userId],
  );
  return rows.length > 0 && rows[0].verified;
}

export async function resetVerificationIfEmailChanged(
  userId: number,
  newEmail: string,
): Promise<void> {
  const [rows] = await pool.execute<VerificationRow[]>(
    `SELECT * FROM mdl_user_email_verification WHERE user_id = ?`,
    [userId],
  );

  if (rows.length === 0) {
    await initializeEmailVerification(userId, newEmail);
    return;
  }

  const record = rows[0];
  if (record.email !== newEmail || !record.verified) {
    await pool.execute(
      `UPDATE mdl_user_email_verification
       SET email = ?, verified = FALSE, verified_at = NULL, verification_code = NULL, code_expires_at = NULL, updated_at = NOW()
       WHERE user_id = ?`,
      [newEmail, userId],
    );
  }
}
