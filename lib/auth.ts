import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { prisma } from "./db";
import { HttpError } from "./http";
const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = "boardo_session";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export function authConfigured() { return Boolean(process.env.BOARDO_OWNER_EMAIL && process.env.BOARDO_PASSWORD_HASH); }
export async function verifyPassword(password: string, encoded: string) {
  const [salt, key] = encoded.split(":");
  if (!salt || !/^[a-f0-9]{128}$/.test(key || "")) return false;
  const derived = await scrypt(password, salt, 64) as Buffer;
  return timingSafeEqual(derived, Buffer.from(key, "hex"));
}
export async function currentUser() {
  const cookieStore = await cookies();
  if (!authConfigured()) return null;
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await prisma.session.findUnique({ where: { tokenHash: hash(token) }, include: { user: true } });
  if (!session || session.expiresAt <= new Date() || session.credentialVersion !== hash(process.env.BOARDO_PASSWORD_HASH!)) return null;
  if (session.user.email !== process.env.BOARDO_OWNER_EMAIL!.trim().toLowerCase()) return null;
  return session.user;
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Please sign in to continue.");
  return user;
}
export async function requirePageUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
export async function login(password: string) {
  if (!authConfigured()) throw new HttpError(503, "Private access has not been configured yet. Follow the setup guide.");
  const now = new Date();
  const bucket = Math.floor(now.getTime() / 900000);
  const attempt = await prisma.loginWindow.upsert({ where: { key: `owner:${bucket}` },
    create: { key: `owner:${bucket}`, attempts: 1, expiresAt: new Date(now.getTime() + 900000) }, update: { attempts: { increment: 1 } } });
  if (attempt.attempts > 15) throw new HttpError(429, "Too many attempts. Try again in 15 minutes.");
  if (!await verifyPassword(password, process.env.BOARDO_PASSWORD_HASH!)) throw new HttpError(401, "Incorrect password.");
  const email = process.env.BOARDO_OWNER_EMAIL!.trim().toLowerCase();
  const user = await prisma.user.upsert({ where: { email }, create: { email }, update: {} });
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 86400000);
  await prisma.session.create({ data: { tokenHash: hash(token), userId: user.id, expiresAt, credentialVersion: hash(process.env.BOARDO_PASSWORD_HASH!) } });
  await prisma.session.deleteMany({ where: { expiresAt: { lt: now } } });
  await prisma.loginWindow.deleteMany({ where: { expiresAt: { lt: now } } });
  return { token, expiresAt };
}
export async function logout() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hash(token) } });
}
