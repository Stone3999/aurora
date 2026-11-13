const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

let client = null;
let unavailableReason = null;

/**
 * Devuelve el cliente de Supabase usando la SERVICE ROLE key
 * (el backend necesita saltarse RLS para leer productos y crear pedidos).
 */
function getSupabase() {
  if (!config.supabase.isConfigured) {
    unavailableReason =
      'Supabase no está configurado. Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el panel de Render.';
    return null;
  }

  if (!client) {
    client = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  return client;
}

function getUnavailableReason() {
  return unavailableReason;
}

/**
 * Catálogo semilla (respaldo si Supabase aún no tiene datos).
 * Debe mantenerse sincronizado con src/app/core/data/products.data.ts
 * y con supabase/schema.sql.
 */
const seedProducts = [
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
    colors: [{ name: 'Verde Oscuro', hex: '#43573F' }]
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
    colors: [{ name: 'Rosa Empolvado', hex: '#B2747F' }]
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
    colors: [{ name: 'Azul Polvoriento', hex: '#758DA4' }]
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
    colors: [{ name: 'Mostaza', hex: '#B8862F' }]
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
    colors: [{ name: 'Morado Oscuro', hex: '#4C3144' }]
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
    colors: [{ name: 'Negro', hex: '#1E1B20' }]
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
    colors: [{ name: 'Vino', hex: '#7A2233' }]
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
    colors: [{ name: 'Marfil', hex: '#E9E0D2' }]
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
    colors: [{ name: 'Nude', hex: '#C4A791' }]
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
    colors: [{ name: 'Pizarra', hex: '#5E6470' }]
  }
];

module.exports = { getSupabase, getUnavailableReason, seedProducts };