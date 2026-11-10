export interface ProductColor {
  name: string;
  hex: string;
  bgClass?: string;
}

export type ProductTier = 'basico' | 'premium';

export interface Product {
  id: number;
  name: string;
  slug?: string;
  category: string;
  /** 'basico' = visible para todas; 'premium' = solo con sesión iniciada. */
  tier: ProductTier;
  price: number;
  tag: string;
  description: string;
  /** Ruta pública de la foto del producto (public/products/...). */
  image: string;
  colors: ProductColor[];
}

export interface CartItem {
  id: string;
  product_id: number;
  name: string;
  price: number;
  color: ProductColor;
  size: string;
  quantity: number;
}

export interface CheckoutPayload {
  customer_email: string;
  customer_name: string;
  shipping_address: string;
  items: Array<{
    product_id: number;
    product_name: string;
    price: number;
    quantity: number;
    color_name: string;
    color_hex: string;
    size: string;
  }>;
}
