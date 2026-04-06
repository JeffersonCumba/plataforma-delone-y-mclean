"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { type RowDataPacket } from "mysql2";

import {pool} from "@/lib/db";

export interface MoodleUser {
  id: number;
  username: string;
  firstname?: string;
  lastname?: string;
  fullname: string;
  email: string;
}

export type UserRole = "ADMIN" | "EVALUADOR";

export interface LoginResult {
  user: Pick<MoodleUser, "id" | "username" | "fullname" | "email">;
  role: UserRole;
}

interface MoodleUserRow extends RowDataPacket {
  id: number;
  username: string;
  password: string;
  firstname: string;
  lastname: string;
  email: string;
}

interface ParsedSha512Crypt {
  rounds: number;
  salt: string;
  hash: string;
  hasRoundsSegment: boolean;
}

const SHA512_CRYPT_PREFIX = "$6$";
const SHA512_CRYPT_DEFAULT_ROUNDS = 5000;
const SHA512_CRYPT_MIN_ROUNDS = 1000;
const SHA512_CRYPT_MAX_ROUNDS = 999_999_999;
const SHA512_CRYPT_B64 =
  "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function sha512(data: Buffer): Buffer {
  return createHash("sha512").update(data).digest();
}

function repeatToLength(source: Buffer, targetLength: number): Buffer {
  const result = Buffer.alloc(targetLength);
  let offset = 0;

  while (offset < targetLength) {
    const chunkLength = Math.min(source.length, targetLength - offset);
    source.copy(result, offset, 0, chunkLength);
    offset += chunkLength;
  }

  return result;
}

function b64From24Bit(a: number, b: number, c: number, outLen: number): string {
  let w = (a << 16) | (b << 8) | c;
  let out = "";

  for (let i = 0; i < outLen; i += 1) {
    out += SHA512_CRYPT_B64[w & 0x3f];
    w >>= 6;
  }

  return out;
}

function encodeSha512CryptDigest(digest: Buffer): string {
  const blocks: Array<[number, number, number, number]> = [
    [0, 21, 42, 4],
    [22, 43, 1, 4],
    [44, 2, 23, 4],
    [3, 24, 45, 4],
    [25, 46, 4, 4],
    [47, 5, 26, 4],
    [6, 27, 48, 4],
    [28, 49, 7, 4],
    [50, 8, 29, 4],
    [9, 30, 51, 4],
    [31, 52, 10, 4],
    [53, 11, 32, 4],
    [12, 33, 54, 4],
    [34, 55, 13, 4],
    [56, 14, 35, 4],
    [15, 36, 57, 4],
    [37, 58, 16, 4],
    [59, 17, 38, 4],
    [18, 39, 60, 4],
    [40, 61, 19, 4],
    [62, 20, 41, 4],
  ];

  let encoded = "";
  for (const [a, b, c, l] of blocks) {
    encoded += b64From24Bit(digest[a], digest[b], digest[c], l);
  }
  encoded += b64From24Bit(0, 0, digest[63], 2);

  return encoded;
}

function parseSha512Crypt(hash: string): ParsedSha512Crypt | null {
  if (!hash.startsWith(SHA512_CRYPT_PREFIX)) {
    return null;
  }

  const payload = hash.slice(SHA512_CRYPT_PREFIX.length);
  const parts = payload.split("$");

  if (parts.length < 2) {
    return null;
  }

  let rounds = SHA512_CRYPT_DEFAULT_ROUNDS;
  let hasRoundsSegment = false;
  let salt = "";
  let encodedHash = "";

  if (parts[0].startsWith("rounds=")) {
    hasRoundsSegment = true;
    const parsedRounds = Number.parseInt(parts[0].slice("rounds=".length), 10);
    if (Number.isNaN(parsedRounds)) {
      return null;
    }
    rounds = Math.max(
      SHA512_CRYPT_MIN_ROUNDS,
      Math.min(parsedRounds, SHA512_CRYPT_MAX_ROUNDS),
    );
    salt = parts[1] ?? "";
    encodedHash = parts[2] ?? "";
  } else {
    salt = parts[0] ?? "";
    encodedHash = parts[1] ?? "";
  }

  if (!salt || !encodedHash) {
    return null;
  }

  return {
    rounds,
    salt: salt.slice(0, 16),
    hash: encodedHash,
    hasRoundsSegment,
  };
}

function sha512Crypt(password: string, salt: string, rounds: number): string {
  const passwordBuffer = Buffer.from(password, "utf8");
  const saltBuffer = Buffer.from(salt, "utf8");

  const alt = sha512(
    Buffer.concat([passwordBuffer, saltBuffer, passwordBuffer]),
  );

  const aParts: Buffer[] = [passwordBuffer, saltBuffer];
  let remaining = passwordBuffer.length;

  while (remaining > 64) {
    aParts.push(alt);
    remaining -= 64;
  }
  if (remaining > 0) {
    aParts.push(alt.subarray(0, remaining));
  }

  for (let bits = passwordBuffer.length; bits > 0; bits >>= 1) {
    aParts.push((bits & 1) === 1 ? alt : passwordBuffer);
  }

  let digest = sha512(Buffer.concat(aParts));

  const pDigest = sha512(
    Buffer.concat(
      Array.from({ length: passwordBuffer.length }, () => passwordBuffer),
    ),
  );
  const pSeq = repeatToLength(pDigest, passwordBuffer.length);

  const sDigest = sha512(
    Buffer.concat(Array.from({ length: 16 + digest[0] }, () => saltBuffer)),
  );
  const sSeq = repeatToLength(sDigest, saltBuffer.length);

  for (let i = 0; i < rounds; i += 1) {
    const parts: Buffer[] = [];

    parts.push((i & 1) === 1 ? pSeq : digest);
    if (i % 3 !== 0) {
      parts.push(sSeq);
    }
    if (i % 7 !== 0) {
      parts.push(pSeq);
    }
    parts.push((i & 1) === 1 ? digest : pSeq);

    digest = sha512(Buffer.concat(parts));
  }

  return encodeSha512CryptDigest(digest);
}

function verifySha512CryptPassword(
  password: string,
  storedHash: string,
): boolean {
  const parsed = parseSha512Crypt(storedHash);
  if (!parsed) {
    return false;
  }

  const computedHash = sha512Crypt(password, parsed.salt, parsed.rounds);
  const reconstructed = parsed.hasRoundsSegment
    ? `${SHA512_CRYPT_PREFIX}rounds=${parsed.rounds}$${parsed.salt}$${computedHash}`
    : `${SHA512_CRYPT_PREFIX}${parsed.salt}$${computedHash}`;

  const storedBuffer = Buffer.from(storedHash);
  const computedBuffer = Buffer.from(reconstructed);

  if (storedBuffer.length !== computedBuffer.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, computedBuffer);
}

const MOODLE_ADMIN_EMAIL = process.env.MOODLE_ADMIN_EMAIL?.trim().toLowerCase();

export async function login(
  email: string,
  password: string,
): Promise<LoginResult> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error("El email es obligatorio para iniciar sesion");
  }

  if (!password.trim()) {
    throw new Error("La contrasena es obligatoria para iniciar sesion");
  }

  const [rows] = await pool.execute<MoodleUserRow[]>(
    "SELECT id, username, password, firstname, lastname, email FROM mdl_user WHERE email = ? AND deleted = 0 LIMIT 1",
    [normalizedEmail],
  );

  const user = rows[0];

  if (!user) {
    throw new Error("No se encontro un usuario en Moodle con ese email");
  }

  const isValidPassword = verifySha512CryptPassword(password, user.password);

  if (!isValidPassword) {
    throw new Error("Credenciales incorrectas");
  }

  const fullname = `${user.firstname ?? ""} ${user.lastname ?? ""}`.trim();
  const isAdminByUsername = user.username.toLowerCase() === "admin";
  const isAdminByEmail = Boolean(
    MOODLE_ADMIN_EMAIL && user.email.toLowerCase() === MOODLE_ADMIN_EMAIL,
  );

  const role: UserRole =
    isAdminByUsername || isAdminByEmail ? "ADMIN" : "EVALUADOR";

  return {
    user: {
      id: user.id,
      username: user.username,
      fullname: fullname || user.username,
      email: user.email,
    },
    role,
  };
}
