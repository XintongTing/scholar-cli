import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import * as userRepo from '../repositories/user.repository.js';

export async function ensureBootstrapAdmin() {
  const email = config.bootstrapAdmin.email.trim();
  const password = config.bootstrapAdmin.password;

  if (!email || !password) return;

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await userRepo.findByEmail(email);

  if (!existing) {
    await userRepo.create({
      email,
      name: config.bootstrapAdmin.name,
      passwordHash,
      role: 'ADMIN',
      plan: 'PRO'
    });
    return;
  }

  await userRepo.updateById(existing.id, {
    name: existing.name || config.bootstrapAdmin.name,
    passwordHash,
    role: 'ADMIN',
    plan: 'PRO'
  });
}
