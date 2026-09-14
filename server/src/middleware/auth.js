import { getUserFromToken, ROLE_PERMISSIONS } from '../services/authService.js';

export async function authenticate(req, res, next) {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
  const user = await getUserFromToken(token);

  if (!user) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }

  req.user = user;
  next();
}

export function requirePasswordChanged(req, res, next) {
  if (req.user?.mustChangePassword) {
    return res.status(428).json({ error: 'Altere a senha inicial antes de continuar.' });
  }
  next();
}

export function requirePermission(permission) {
  return (req, res, next) => {
    const permissions = ROLE_PERMISSIONS[req.user?.role] || [];
    if (!permissions.includes(permission)) {
      return res.status(403).json({ error: 'Seu perfil não possui permissão para esta ação.' });
    }
    next();
  };
}
