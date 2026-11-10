const express = require('express');
const { getSupabase, seedProducts } = require('../supabase');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * Catálogo público.
 * Sin sesión: solo la línea básica (alpaca).
 * Con `Authorization: Bearer <token>` válido: catálogo completo, incluida la premium.
 */
router.get('/products', optionalAuth, async (req, res, next) => {
  try {
    const supabase = getSupabase();
    const loggedIn = !!req.user;

    if (!supabase) {
      const products = loggedIn ? seedProducts : seedProducts.filter((p) => p.tier === 'basico');
      return res.json({ ok: true, source: 'seed', products });
    }

    let query = supabase.from('products').select('*').eq('is_active', true);
    if (!loggedIn) query = query.eq('tier', 'basico');

    const { data, error } = await query.order('id', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      const products = loggedIn ? seedProducts : seedProducts.filter((p) => p.tier === 'basico');
      return res.json({ ok: true, source: 'seed', products });
    }

    return res.json({ ok: true, source: 'database', products: data });
  } catch (err) {
    console.error('[GET /products]', err);
    const products = req.user ? seedProducts : seedProducts.filter((p) => p.tier === 'basico');
    return res.json({ ok: true, source: 'seed', products });
  }
});

/** Detalle de un producto. La premium exige sesión válida. */
router.get('/products/:id', optionalAuth, (req, res) => {
  const { id } = req.params;
  const product = seedProducts.find((p) => String(p.id) === String(id));

  if (!product) {
    return res.status(404).json({ ok: false, message: 'Producto no encontrado.' });
  }

  if (product.tier === 'premium' && !req.user) {
    return res.status(404).json({ ok: false, message: 'Producto no encontrado.' });
  }

  return res.json({ ok: true, product });
});

module.exports = router;
