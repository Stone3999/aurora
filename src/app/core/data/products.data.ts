import { Product } from '../models/product.model';

/**
 * Catálogo semilla de LANË.
 *
 * - `tier: 'basico'`  -> visible para todas las visitas (incluso sin sesión).
 * - `tier: 'premium'` -> solo visible con sesión iniciada.
 *
 * Las fotos viven en `public/products/`. Angular las copia tal cual a
 * `dist/lane/browser/products/`, así que Vercel las sirve como estáticos.
 * Para cambiar una foto basta con reemplazar el archivo y mantener el nombre.
 */
export const FALLBACK_PRODUCTS: Product[] = [
  // ---------------------------------------------------------------- Línea Alpaca
  {
    id: 1,
    name: 'Cachetero Alpaca Verde Oscuro',
    slug: 'alpaca-verde-oscuro',
    category: 'alpaca',
    tier: 'basico',
    price: 299,
    tag: 'Más Vendido',
    description:
      'Punto de alpaca ultra suave y transpirable. Pretina ancha que abraza sin marcar, ideal para el día a día.',
    image: 'products/alpaca-verde-oscuro.jpg',
    colors: [{ name: 'Verde Oscuro', hex: '#43573F', bgClass: 'bg-[#43573F]' }]
  },
  {
    id: 2,
    name: 'Cachetero Alpaca Rosa Empolvado',
    slug: 'alpaca-rosa-empolvado',
    category: 'alpaca',
    tier: 'basico',
    price: 299,
    tag: 'Nuevo',
    description:
      'El rosa empolvado que combina con todo. Tejido elástico que se adapta al cuerpo sin apretar.',
    image: 'products/alpaca-rosa-empolvado.jpg',
    colors: [{ name: 'Rosa Empolvado', hex: '#B2747F', bgClass: 'bg-[#B2747F]' }]
  },
  {
    id: 3,
    name: 'Cachetero Alpaca Azul Polvoriento',
    slug: 'alpaca-azul-polvoriento',
    category: 'alpaca',
    tier: 'basico',
    price: 299,
    tag: 'Favorito',
    description:
      'Serenidad en azul polvoriento. Fibra natural que mantiene la frescura y la suavidad todo el día.',
    image: 'products/alpaca-azul-polvoriento.jpg',
    colors: [{ name: 'Azul Polvoriento', hex: '#758DA4', bgClass: 'bg-[#758DA4]' }]
  },
  {
    id: 4,
    name: 'Cachetero Alpaca Mostaza',
    slug: 'alpaca-mostaza',
    category: 'alpaca',
    tier: 'basico',
    price: 299,
    tag: 'Edición Otoño',
    description:
      'Un cálido mostaza para romper la rutina. Corte cómodo, cobertura perfecta y acabado sin costuras.',
    image: 'products/alpaca-mostaza.jpg',
    colors: [{ name: 'Mostaza', hex: '#B8862F', bgClass: 'bg-[#B8862F]' }]
  },
  {
    id: 5,
    name: 'Cachetero Alpaca Morado Oscuro',
    slug: 'alpaca-morado-oscuro',
    category: 'alpaca',
    tier: 'basico',
    price: 299,
    tag: 'Últimas Piezas',
    description:
      'Profundo y elegante. Alpaca fina que cuida la piel sensible y se siente como una segunda piel.',
    image: 'products/alpaca-morado-oscuro.jpg',
    colors: [{ name: 'Morado Oscuro', hex: '#4C3144', bgClass: 'bg-[#4C3144]' }]
  },

  // ------------------------------------------------------- Maison du Soie (premium)
  {
    id: 6,
    name: 'Cachetero Maison du Soie Negro',
    slug: 'maison-negro',
    category: 'premium',
    tier: 'premium',
    price: 999,
    tag: 'Icono LANË',
    description:
      'Encaje francés cosido a mano y satén de seda con dije dorado. Presentado en caja de regalo Maison du Soie.',
    image: 'products/maison-negro.jpg',
    colors: [{ name: 'Negro', hex: '#1E1B20', bgClass: 'bg-[#1E1B20]' }]
  },
  {
    id: 7,
    name: 'Cachetero Maison du Soie Vino',
    slug: 'maison-vino',
    category: 'premium',
    tier: 'premium',
    price: 999,
    tag: 'Edición Limitada',
    description:
      'Un vino intenso en seda y encaje floral. El detalle de lujo que convierte lo cotidiano en una ocasión especial.',
    image: 'products/maison-vino.jpg',
    colors: [{ name: 'Vino', hex: '#7A2233', bgClass: 'bg-[#7A2233]' }]
  },
  {
    id: 8,
    name: 'Cachetero Maison du Soie Marfil',
    slug: 'maison-marfil',
    category: 'premium',
    tier: 'premium',
    price: 999,
    tag: 'Lujo Íntimo',
    description:
      'Marfil luminoso con blonda de encaje y dije dorado. Delicadeza y confort en una pieza de colección.',
    image: 'products/maison-marfil.jpg',
    colors: [{ name: 'Marfil', hex: '#E9E0D2', bgClass: 'bg-[#E9E0D2]' }]
  },
  {
    id: 9,
    name: 'Cachetero Maison du Soie Nude',
    slug: 'maison-nude',
    category: 'premium',
    tier: 'premium',
    price: 999,
    tag: 'Best Seller',
    description:
      'El nude que se funde con la piel. Seda suave, encaje ligero y un ajuste que no marca bajo la ropa.',
    image: 'products/maison-nude.jpg',
    colors: [{ name: 'Nude', hex: '#C4A791', bgClass: 'bg-[#C4A791]' }]
  },
  {
    id: 10,
    name: 'Cachetero Maison du Soie Pizarra',
    slug: 'maison-pizarra',
    category: 'premium',
    tier: 'premium',
    price: 999,
    tag: 'Nuevo',
    description:
      'Azul pizarra con encaje escultural. Una edición sofisticada para quienes coleccionan detalles únicos.',
    image: 'products/maison-pizarra.jpg',
    colors: [{ name: 'Pizarra', hex: '#5E6470', bgClass: 'bg-[#5E6470]' }]
  }
];

export interface CategoryFilter {
  key: string;
  label: string;
  /** Solo se muestra si la visitante tiene sesión iniciada. */
  requiresSession?: boolean;
}

export const CATEGORY_FILTERS: CategoryFilter[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'alpaca', label: 'Línea Alpaca' },
  { key: 'premium', label: 'Encaje Premium', requiresSession: true }
];

/**
 * Regla única de visibilidad del catálogo.
 * Sin sesión: solo `tier: 'basico'`. Con sesión: catálogo completo.
 * Se exporta aparte para poder probarla sin levantar Angular.
 */
export function filterProductsByTier(products: Product[], loggedIn: boolean): Product[] {
  return loggedIn ? products : products.filter((product) => product.tier !== 'premium');
}
