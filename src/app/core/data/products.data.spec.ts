import { FALLBACK_PRODUCTS, filterProductsByTier } from './products.data';

describe('catálogo LANË · visibilidad por sesión', () => {
  it('oculta las 5 piezas premium cuando no hay sesión', () => {
    const visible = filterProductsByTier(FALLBACK_PRODUCTS, false);

    expect(visible.length).toBe(5);
    expect(visible.every((product) => product.tier === 'basico')).toBeTrue();
    expect(visible.some((product) => product.category === 'premium')).toBeFalse();
  });

  it('muestra las 10 piezas cuando hay sesión', () => {
    const visible = filterProductsByTier(FALLBACK_PRODUCTS, true);

    expect(visible.length).toBe(10);
    expect(visible.filter((product) => product.tier === 'premium').length).toBe(5);
  });

  it('mantiene el orden del catálogo al filtrar', () => {
    const visible = filterProductsByTier(FALLBACK_PRODUCTS, false);

    expect(visible.map((product) => product.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it('no muta el arreglo original', () => {
    const originalLength = FALLBACK_PRODUCTS.length;
    filterProductsByTier(FALLBACK_PRODUCTS, false);

    expect(FALLBACK_PRODUCTS.length).toBe(originalLength);
  });
});
