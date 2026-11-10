import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { CATEGORY_FILTERS, FALLBACK_PRODUCTS } from '../data/products.data';
import { Product, ProductColor, ProductTier } from '../models/product.model';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  private supabaseService = inject(SupabaseService);
  private auth = inject(AuthService);

  public readonly products = signal<Product[]>(FALLBACK_PRODUCTS);
  public readonly activeFilter = signal<string>('todos');
  public readonly selectedColors = signal<Record<number, ProductColor>>({});
  public readonly selectedSizes = signal<Record<number, string>>({});
  public readonly isLoading = signal<boolean>(true);
  public readonly isFromDatabase = signal<boolean>(false);

  /** Filtros visibles: "Encaje Premium" solo aparece con sesión iniciada. */
  public readonly filters = computed(() => {
    const loggedIn = this.auth.isLoggedIn();
    return CATEGORY_FILTERS.filter((f) => loggedIn || !f.requiresSession);
  });

  /**
   * Productos que la visitante puede ver según su sesión:
   * sin sesión -> solo línea alpaca (tier 'basico');
   * con sesión -> catálogo completo, incluida la línea premium.
   */
  public readonly availableProducts = computed(() => {
    const loggedIn = this.auth.isLoggedIn();
    return this.products().filter((p) => loggedIn || p.tier !== 'premium');
  });

  public readonly visibleProducts = computed(() => {
    const filter = this.activeFilter();
    const list = this.availableProducts();
    return filter === 'todos' ? list : list.filter((p) => p.category === filter);
  });

  /** Cuántos productos premium se están ocultando (para el teaser del catálogo). */
  public readonly lockedPremiumCount = computed(() => {
    if (this.auth.isLoggedIn()) return 0;
    return this.products().filter((p) => p.tier === 'premium').length;
  });

  constructor() {
    const initial: Record<number, ProductColor> = {};
    FALLBACK_PRODUCTS.forEach((p) => (initial[p.id] = p.colors[0]));
    this.selectedColors.set(initial);
    this.load();

    // Si se cierra sesión estando en el filtro premium, volvemos a "Todos".
    effect(() => {
      if (!this.auth.isLoggedIn() && this.activeFilter() === 'premium') {
        this.activeFilter.set('todos');
      }
    });
  }

  async load() {
    this.isLoading.set(true);
    try {
      const rows = await this.supabaseService.getProducts();
      if (rows && rows.length > 0) {
        const mapped: Product[] = rows.map((r: any) => {
          const id = Number(r.id);
          const fallback = FALLBACK_PRODUCTS.find((p) => p.id === id);

          return {
            id,
            name: r.name,
            slug: r.slug,
            category: r.category,
            tier: this.normalizeTier(r.tier),
            price: Number(r.price),
            tag: r.tag ?? '',
            description: r.description ?? '',
            image: r.image || fallback?.image || 'products/alpaca-verde-oscuro.jpg',
            colors: (r.colors ?? []) as ProductColor[]
          };
        });
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

  private normalizeTier(value: unknown): ProductTier {
    return value === 'premium' ? 'premium' : 'basico';
  }
}
