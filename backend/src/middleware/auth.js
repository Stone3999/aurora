/**
 * Middleware: valida el token de Supabase del cliente.
 * Si no viene un `Authorization: Bearer <access_token>` devuelve 401.
 */
async function requireAuth(req, res, next) {
  const { getSupabase } = require('../supabase');
  const supabase = getSupabase();

  if (!supabase) {
    // Si Supabase no está configurado, no se puede validar: se deja pasar
    // para no bloquear el desarrollo local (modo demo).
    req.user = null;
    return next();
  }

  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, message: 'Falta el token de autenticación.' });
  }

  const token = authHeader.slice(7).trim();

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

/**
 * Middleware: intenta validar el token, pero NO bloquea si falta o es inválido.
 * Se usa en endpoints públicos que muestran más contenido a usuarias con sesión
 * (por ejemplo, la colección premium).
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.slice(7).trim();
  const { getSupabase } = require('../supabase');
  const supabase = getSupabase();

  if (!supabase) {
    req.user = null;
    return next();
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    req.user = error ? null : data?.user ?? null;
  } catch {
    req.user = null;
  }

  return next();
}

module.exports = { requireAuth, optionalAuth };