/**
 * Middleware: valida el token de Supabase del cliente.
 * Si no viene un `Authorization: Bearer <access_token>` devuelve 401.
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, message: 'Falta el token de autenticación.' });
  }

  const token = authHeader.slice(7).trim();
  const { getSupabase } = require('../supabase');
  const supabase = getSupabase();

  if (!supabase) {
    // Si Supabase no está configurado, no se puede validar: se deja pasar
    // para no bloquear el desarrollo local.
    req.user = null;
    return next();
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ ok: false, message: 'Sesión inválida o expirada.' });
    }

    req.user = data.user;
    return next();
  } catch (err) {
    return res.status(500).json({ ok: false, message: 'No se pudo validar la sesión.' });
  }
}

module.exports = { requireAuth };