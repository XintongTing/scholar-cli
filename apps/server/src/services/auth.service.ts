import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import * as userRepo from '../repositories/user.repository.js';

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

export function generateTokens(user: { id: string; email: string; role: string }) {
  const payload: TokenPayload = { id: user.id, email: user.email, role: user.role };
  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn']
  });
  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn']
  });
  return { accessToken, refreshToken };
}

export async function register(email: string, password: string, name?: string) {
  const existing = await userRepo.findByEmail(email);
  if (existing) throw Object.assign(new Error('邮箱已被注册'), { code: 'EMAIL_EXISTS' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await userRepo.create({ email, name, passwordHash });
  const tokens = generateTokens(user);
  return { user: { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan }, ...tokens };
}

export async function login(email: string, password: string) {
  const user = await userRepo.findByEmail(email);
  if (!user || !user.passwordHash) throw Object.assign(new Error('邮箱或密码错误'), { code: 'INVALID_CREDENTIALS' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw Object.assign(new Error('邮箱或密码错误'), { code: 'INVALID_CREDENTIALS' });

  const tokens = generateTokens(user);
  return { user: { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan }, ...tokens };
}

export async function refreshToken(token: string) {
  const payload = jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
  const user = await userRepo.findById(payload.id);
  if (!user) throw Object.assign(new Error('用户不存在'), { code: 'USER_NOT_FOUND' });

  const tokens = generateTokens(user);
  return tokens;
}

export async function getMe(userId: string) {
  const user = await userRepo.findById(userId);
  if (!user) throw Object.assign(new Error('用户不存在'), { code: 'USER_NOT_FOUND' });
  return { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan };
}
