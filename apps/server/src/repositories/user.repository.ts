import { prisma } from '../db.js';
import type { Role, Plan } from '@prisma/client';

export async function findByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function findById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function create(data: {
  email: string;
  name?: string;
  passwordHash?: string;
  role?: Role;
  plan?: Plan;
}) {
  return prisma.user.create({ data });
}

export async function updateById(id: string, data: Partial<{ name: string; passwordHash: string; role: Role; plan: Plan }>) {
  return prisma.user.update({ where: { id }, data });
}
