const express = require('express');
const { getSupabase } = require('../supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/** Verifica que haya sesión (el frontend manda el access token de Supabase). */
router.get('/session', requireAuth, (req, res) => {
  res.json({
    ok: true,
    user: req.user ? { id: req.user.id, email: req.user.email } : null
  });
});

/**
 * Calcula el total del carrito. Útil para que el frontend valide antes de pagar.
 * body: { items: [{ product_id, price, quantity }] }
 */
router.post('/cart/summary', (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];

  const subtotal = items.reduce((acc, i) => acc + Number(i.price || 0) * Number(i.quantity || 0), 0);
  const itemCount = items.reduce((acc, i) => acc + Number(i.quantity || 0), 0);

  res.json({
    ok: true,
    itemCount,
    subtotal: Number(subtotal.toFixed(2)),
    shippingCost: 0,
    total: Number(subtotal.toFixed(2))
  });
});

/** Sincroniza el carrito completo de un usuario (replace). Requiere sesión. */
router.put('/cart', requireAuth, async (req, res) => {
  const supabase = getSupabase();

  if (!supabase) {
    return res.status(503).json({ ok: false, message: 'Supabase no configurado en el backend.' });
  }

  const userId = req.user?.id;
  const items = Array.isArray(req.body?.items) ? req.body.items : [];

  try {
    const { error: deleteError } = await supabase.from('cart_items').delete().eq('user_id', userId);
    if (deleteError) throw deleteError;

    if (items.length === 0) {
      return res.json({ ok: true, synced: 0 });
    }

    const rows = items.map((i) => ({
      user_id: userId,
      product_id: Number(i.product_id),
      color_name: i.color_name,
      color_hex: i.color_hex,
      size: i.size || 'M',
      quantity: Number(i.quantity) || 1
    }));

    const { error } = await supabase.from('cart_items').insert(rows);
    if (error) throw error;

    return res.json({ ok: true, synced: rows.length });
  } catch (err) {
    console.error('[PUT /cart]', err);
    return res.status(500).json({ ok: false, message: 'No se pudo sincronizar el carrito.' });
  }
});

module.exports = router;