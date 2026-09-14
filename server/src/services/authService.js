import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual
} from 'crypto';
import { prisma } from '../prisma.js';

export const ROLE_PERMISSIONS = {
  ADMIN: [
    'tenants:read', 'tenants:create', 'users:manage',
    'tickets:read', 'tickets:create', 'tickets:update', 'tickets:treat', 'tickets:delete',
    'dashboard:read', 'hubs:read', 'settings:manage', 'ai:test'
  ],
  SAC: [
    'tenants:read', 'tickets:read', 'tickets:create', 'tickets:update', 'tickets:treat',
    'hubs:read', 'ai:test'
  ],
  RH: [
    'tenants:read', 'tickets:read', 'tickets:create', 'tickets:update', 'tickets:treat',
    'dashboard:read', 'hubs:read', 'ai:test'
  ],
  GESTOR: [
    'tenants:read', 'tickets:read', 'dashboard:read', 'hubs:read'
  ]
};

export const VALID_ROLES = Object.keys(ROLE_PERMISSIONS);

const DEFAULT_USERS = [
  { username: 'admin', name: 'Administrador', role: 'ADMIN', password: 'Admin@123' },
  { username: 'sac', name: 'Equipe SAC', role: 'SAC', password: 'Sac@123' },
  { username: 'rh', name: 'Equipe RH', role: 'RH', password: 'Rh@123' },
  { username: 'gestor', name: 'Gestor', role: 'GESTOR', password: 'Gestor@123' }
];

export function normalizeUsername(username = '') {
  return String(username).trim().toLowerCase();
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash = '') {
  const [salt, stored] = storedHash.split(':');
  if (!salt || !stored) return false;

  const candidate = scryptSync(String(password), salt, 64);
  const storedBuffer = Buffer.from(stored, 'hex');
  return candidate.length === storedBuffer.length && timingSafeEqual(candidate, storedBuffer);
}

async function getAuthSecret() {
  const existing = await prisma.setting.findUnique({ where: { key: 'auth_secret' } });
  if (existing) return existing.value;

  const secret = randomBytes(48).toString('hex');
  try {
    const created = await prisma.setting.create({
      data: { id: 'auth_secret', key: 'auth_secret', value: secret }
    });
    return created.value;
  } catch (error) {
    const concurrent = await prisma.setting.findUnique({ where: { key: 'auth_secret' } });
    if (concurrent) return concurrent.value;
    throw error;
  }
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function sign(encodedPayload, secret) {
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url');
}

export async function createAccessToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    iat: now,
    exp: now + (12 * 60 * 60)
  };
  const encodedPayload = encode(payload);
  const secret = await getAuthSecret();
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

export async function getUserFromToken(token) {
  if (!token || !token.includes('.')) return null;

  const [encodedPayload, suppliedSignature] = token.split('.');
  if (!encodedPayload || !suppliedSignature) return null;

  const secret = await getAuthSecret();
  const expectedSignature = sign(encodedPayload, secret);
  const suppliedBuffer = Buffer.from(suppliedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    suppliedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (!payload.sub || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { tenant: { select: { id: true, name: true, slug: true, active: true } } }
  });

  if (!user?.active || !user.tenant?.active || !ROLE_PERMISSIONS[user.role]) return null;
  return user;
}

export function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    active: user.active,
    mustChangePassword: user.mustChangePassword,
    tenantId: user.tenantId,
    tenant: user.tenant,
    permissions: ROLE_PERMISSIONS[user.role] || []
  };
}

export async function ensureDefaultUsers() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'shopee', active: true } });
  if (!tenant) {
    console.warn('[Auth] Empresa Shopee não encontrada; usuários iniciais não foram criados.');
    return;
  }

  for (const defaultUser of DEFAULT_USERS) {
    const username = normalizeUsername(defaultUser.username);
    const existing = await prisma.user.findUnique({
      where: { tenantId_username: { tenantId: tenant.id, username } }
    });

    if (!existing) {
      await prisma.user.create({
        data: {
          tenantId: tenant.id,
          username,
          name: defaultUser.name,
          role: defaultUser.role,
          passwordHash: hashPassword(defaultUser.password),
          mustChangePassword: true
        }
      });
    }
  }
}
