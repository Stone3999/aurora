const express = require('express');
const { getSupabase, seedProducts } = require('../supabase');

const router = express.Router();

/** Catálogo público. */
router.get('/products', async (req, res, next) => {
  try {
    const supabase = getSupabase();

    if (!supabase) {
      return res.json({ ok: true, source: 'seed', products: seedProducts });
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('id', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.json({ ok: true, source: 'seed', products: seedProducts });
    }

    return res.json({ ok: true, source: 'database', products: data });
  } catch (err) {
    console.error('[GET /products]', err);
    return res.json({ ok: true, source: 'seed', products: seedProducts });
  }
});

/** Detalle de un producto. */
router.get('/products/:id', (req, res) => {
  const { id } = req.params;
  const product = seedProducts.find((p) => String(p.id) === String(id));

  if (!product) {
    return res.status(404).json({ ok: false, message: 'Producto no encontrado.' });
  }

  return res.json({ ok: true, product });
});

module.exports = router;