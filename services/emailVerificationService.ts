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
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #1e293b; font-size: 20px; margin: 0;">Verificación de Correo</h1>
          </div>
          <div style="background: white; border-radius: 8px; padding: 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
            <p style="color: #475569; font-size: 15px; line-height: 1.5; margin: 0 0 20px;">
              Usa el siguiente código para verificar tu correo electrónico en la plataforma:
            </p>
            <div style="text-align: center; margin: 24px 0;">
              <span style="display: inline-block; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #2563eb; background: #eff6ff; padding: 12px 24px; border-radius: 8px; font-family: monospace;">
                ${code}
              </span>
            </div>
            <p style="color: #94a3b8; font-size: 13px; margin: 0;">
              Este código expira en <strong>10 minutos</strong>. Si no solicitaste esta verificación, ignora este correo.
            </p>
          </div>
          <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
            Plataforma DeLone y McLean &mdash; Evaluación de Calidad de Software
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
