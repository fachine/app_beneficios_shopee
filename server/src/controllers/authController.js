import { prisma } from '../prisma.js';
import {
  createAccessToken,
  hashPassword,
  normalizeUsername,
  toPublicUser,
  VALID_ROLES,
  verifyPassword
} from '../services/authService.js';

async function resolveManagedTenantId(req) {
  const requested = req.headers['x-tenant-id'] || req.user.tenantId;
  const tenant = await prisma.tenant.findFirst({
    where: {
      active: true,
      OR: [{ id: requested }, { slug: requested }]
    },
    select: { id: true }
  });
  return tenant?.id || req.user.tenantId;
}

export async function login(req, res) {
  try {
    const { username, password, tenant = 'shopee' } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Informe usuário e senha.' });
    }

    const selectedTenant = await prisma.tenant.findFirst({
      where: {
        active: true,
        OR: [{ id: tenant }, { slug: String(tenant).toLowerCase() }]
      }
    });

    if (!selectedTenant) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
    }

    const user = await prisma.user.findUnique({
      where: {
        tenantId_username: {
          tenantId: selectedTenant.id,
          username: normalizeUsername(username)
        }
      },
      include: { tenant: { select: { id: true, name: true, slug: true, active: true } } }
    });

    if (!user?.active || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
    }

    const token = await createAccessToken(user);
    res.json({ token, user: toPublicUser(user) });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Não foi possível entrar no sistema.' });
  }
}

export function me(req, res) {
  res.json({ user: toPublicUser(req.user) });
}

export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Informe a senha atual e a nova senha.' });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: 'A nova senha deve ter pelo menos 8 caracteres.' });
    }
    if (!verifyPassword(currentPassword, req.user.passwordHash)) {
      return res.status(400).json({ error: 'Senha atual incorreta.' });
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: hashPassword(newPassword), mustChangePassword: false },
      include: { tenant: { select: { id: true, name: true, slug: true, active: true } } }
    });

    res.json({ user: toPublicUser(updated), message: 'Senha alterada com sucesso.' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ error: 'Não foi possível alterar a senha.' });
  }
}

export async function listUsers(req, res) {
  const tenantId = await resolveManagedTenantId(req);
  const users = await prisma.user.findMany({
    where: { tenantId },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    select: {
      id: true, username: true, name: true, role: true, active: true,
      mustChangePassword: true, tenantId: true, createdAt: true
    }
  });
  res.json(users);
}

export async function createUser(req, res) {
  try {
    const tenantId = await resolveManagedTenantId(req);
    const { username, name, role, password } = req.body;
    const normalized = normalizeUsername(username);

    if (!normalized || !name || !password || !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Preencha nome, usuário, perfil e senha.' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres.' });
    }

    const user = await prisma.user.create({
      data: {
        tenantId,
        username: normalized,
        name: String(name).trim(),
        role,
        passwordHash: hashPassword(password),
        mustChangePassword: true
      },
      select: {
        id: true, username: true, name: true, role: true, active: true,
        mustChangePassword: true, tenantId: true, createdAt: true
      }
    });
    res.status(201).json(user);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Este nome de usuário já está cadastrado.' });
    }
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: 'Não foi possível criar o usuário.' });
  }
}

export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { name, role, active, password } = req.body;
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'Usuário não encontrado.' });
    if (target.id === req.user.id && active === false) {
      return res.status(400).json({ error: 'Você não pode desativar seu próprio acesso.' });
    }
    if (role !== undefined && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Perfil inválido.' });
    }
    if (password !== undefined && String(password).length < 8) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres.' });
    }

    const data = {};
    if (name !== undefined) data.name = String(name).trim();
    if (role !== undefined) data.role = role;
    if (active !== undefined) data.active = Boolean(active);
    if (password) {
      data.passwordHash = hashPassword(password);
      data.mustChangePassword = true;
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, username: true, name: true, role: true, active: true,
        mustChangePassword: true, tenantId: true, createdAt: true
      }
    });
    res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Não foi possível atualizar o usuário.' });
  }
}
