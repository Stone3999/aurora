import { Product } from '../models/product.model';

/**
 * Catálogo semilla idéntico al diseño original.
 * Se usa como respaldo cuando Supabase aún no está configurado o sin conexión,
 * de modo que la tienda nunca se vea vacía.
 */
export const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'Cachetero Floral Lace',
    category: 'encaje',
    price: 24.9,
    colors: [
      { name: 'Lila Pastel', hex: '#E4DCE4', bgClass: 'bg-[#E4DCE4]' },
      { name: 'Rosa Blush', hex: '#F2E4DC', bgClass: 'bg-[#F2E4DC]' },
      { name: 'Verde Menta', hex: '#E4E6D8', bgClass: 'bg-[#E4E6D8]' }
    ],
    tag: 'Más Vendido',
    description:
      'Encaje francés floral de alta elasticidad con puente de algodón puro. Moldeado sin marcas.'
  },
  {
    id: 2,
    name: 'Cachetero Invisible Silk Touch',
    category: 'invisibles',
    price: 22.0,
    colors: [
      { name: 'Nude Marfil', hex: '#E6D7C4', bgClass: 'bg-[#E6D7C4]' },
      { name: 'Rosa Blush', hex: '#F2E4DC', bgClass: 'bg-[#F2E4DC]' }
    ],
    tag: 'Corte Láser',
    description:
      'Acabado ultra plano perfecto para usar bajo vestidos ceñidos o pantalones de tela liviana.'
  },
  {
    id: 3,
    name: 'Cachetero Satin & Encaje Gold',
    category: 'seda',
    price: 28.5,
    colors: [
      { name: 'Rosa Blush', hex: '#F2E4DC', bgClass: 'bg-[#F2E4DC]' },
      { name: 'Lila Pastel', hex: '#E4DCE4', bgClass: 'bg-[#E4DCE4]' },
      { name: 'Marfil Elegante', hex: '#F6F1E9', bgClass: 'bg-[#F6F1E9]' }
    ],
    tag: 'Lujo Intimo',
    description: 'Detalles en satén brillante y finos bordados dorados. Estilo sofisticado y romántico.'
  },
  {
    id: 4,
    name: 'Cachetero Soft Cotton Daily',
    category: 'seda',
    price: 19.9,
    colors: [
      { name: 'Verde Menta', hex: '#E4E6D8', bgClass: 'bg-[#E4E6D8]' },
      { name: 'Lila Pastel', hex: '#E4DCE4', bgClass: 'bg-[#E4DCE4]' }
    ],
    tag: 'Uso Diario',
    description: 'Algodón pima ultra suave transpirable con blonda delicada en contorno de cadera.'
  },
  {
    id: 5,
    name: 'Cachetero Royal Rose Encaje',
    category: 'encaje',
    price: 26.0,
    colors: [
      { name: 'Rosa Blush', hex: '#F2E4DC', bgClass: 'bg-[#F2E4DC]' },
      { name: 'Nude Marfil', hex: '#E6D7C4', bgClass: 'bg-[#E6D7C4]' }
    ],
    tag: 'Nuevo',
    description:
      'Diseño de pretina ancha que no marca ni saca rollitos. Cintura confortable de cobertura perfecta.'
  },
  {
    id: 6,
    name: 'Set x3 Cacheteros Pastel Box',
    category: 'encaje',
    price: 59.9,
    colors: [
      { name: 'Mix Pasteles', hex: '#E4DCE4', bgClass: 'bg-gradient-to-r from-[#F2E4DC] to-[#E4E6D8]' }
    ],
    tag: 'Edición Especial',
    description:
      'Caja de regalo incluye 3 cacheteros (Rosa, Lila y Menta) en empaque perfumado especial.'
  }
];

export interface CategoryFilter {
  key: string;
  label: string;
}

export const CATEGORY_FILTERS: CategoryFilter[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'encaje', label: 'Encaje Premium' },
  { key: 'seda', label: 'Seda & Algodón' },
  { key: 'invisibles', label: 'Corte Laser / Invisible' }
];