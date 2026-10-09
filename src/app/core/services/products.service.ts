import { Injectable, computed, inject, signal } from '@angular/core';
import { CATEGORY_FILTERS, FALLBACK_PRODUCTS } from '../data/products.data';
import { Product, ProductColor } from '../models/product.model';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  private supabaseService = inject(SupabaseService);

  public readonly products = signal<Product[]>(FALLBACK_PRODUCTS);
  public readonly filters = CATEGORY_FILTERS;
  public readonly activeFilter = signal<string>('todos');
  public readonly selectedColors = signal<Record<number, ProductColor>>({});
  public readonly selectedSizes = signal<Record<number, string>>({});
  public readonly isLoading = signal<boolean>(true);
  public readonly isFromDatabase = signal<boolean>(false);

  public readonly visibleProducts = computed(() => {
    const filter = this.activeFilter();
    const list = this.products();
    return filter === 'todos' ? list : list.filter((p) => p.category === filter);
  });

  constructor() {
    const initial: Record<number, ProductColor> = {};
    FALLBACK_PRODUCTS.forEach((p) => (initial[p.id] = p.colors[0]));
    this.selectedColors.set(initial);
    this.load();
  }

  async load() {
    this.isLoading.set(true);
    try {
      const rows = await this.supabaseService.getProducts();
      if (rows && rows.length > 0) {
        const mapped: Product[] = rows.map((r: any) => ({
          id: Number(r.id),
          name: r.name,
          slug: r.slug,
          category: r.category,
          price: Number(r.price),
          tag: r.tag ?? '',
          description: r.description ?? '',
          colors: (r.colors ?? []) as ProductColor[]
        }));
        this.products.set(mapped);
        this.isFromDatabase.set(true);

        const preset: Record<number, ProductColor> = {};
        mapped.forEach((p) => {
          if (p.colors.length) preset[p.id] = p.colors[0];
        });
        this.selectedColors.set(preset);
      }
    } catch (err) {
      console.error('No se pudo leer el catálogo de Supabase, usando catálogo local:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  setFilter(key: string) {
    this.activeFilter.set(key);
  }

  getColor(productId: number): ProductColor | undefined {
    const product = this.products().find((p) => p.id === productId);
    return this.selectedColors()[productId] ?? product?.colors[0];
  }

  getSize(productId: number): string {
    return this.selectedSizes()[productId] ?? 'M';
  }

  setSize(productId: number, size: string) {
    this.selectedSizes.update((sizes) => ({ ...sizes, [productId]: size }));
  }

  selectColor(productId: number, color: ProductColor) {
    this.selectedColors.update((colors) => ({ ...colors, [productId]: color }));
  }

  colorCount(productId: number): number {
    return this.products().find((p) => p.id === productId)?.colors.length ?? 0;
  }

  /** Cambia el color y vuelve a renderizar la tarjeta correspondiente. */
  changeColor(productId: number, colorIndex: number) {
    const product = this.products().find((p) => p.id === productId);
    if (!product) return;
    const color = product.colors[colorIndex];
    if (color) this.selectColor(productId, color);
  }
}