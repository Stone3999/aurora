import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { STORAGE_KEYS, StorageService } from './storage.service';
import { SupabaseService } from './supabase.service';
import { CartItem, Product, ProductColor } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class CartService {
  private supabaseService = inject(SupabaseService);
  private auth = inject(AuthService);
  private storage = inject(StorageService);

  public readonly items = signal<CartItem[]>([]);
  public readonly isCartOpen = signal(false);
  public readonly isQuickViewOpen = signal(false);
  public readonly selectedQuickViewProduct = signal<Product | null>(null);
  public readonly isAuthModalOpen = signal(false);
  public readonly toastMessage = signal<string | null>(null);
  public readonly toastVisible = signal(false);
  public readonly isCartSyncing = signal(false);

  public readonly totalItems = computed(() =>
    this.items().reduce((acc, item) => acc + item.quantity, 0)
  );

  public readonly subtotal = computed(() =>
    this.items().reduce((acc, item) => acc + item.price * item.quantity, 0)
  );

  constructor() {
    // Cuando ya sabemos si hay sesión (viene del espejo local, sin red), cargamos el carrito.
    this.auth.ready.then(() => this.hydrate());
    this.auth.user$.subscribe(() => this.hydrate());

    // En modo local persistimos el carrito en AsyncStorage para que sobreviva recargas.
    effect(() => {
      if (!this.auth.isLocalMode()) return;
      const user = this.auth.user();
      if (!user) return;
      void this.storage.set(`${STORAGE_KEYS.cart}:${user.id}`, this.items());
    });
  }

  private async hydrate() {
    const user = this.auth.user();
    if (!user) {
      this.items.set([]);
      return;
    }

    this.isCartSyncing.set(true);
    try {
      if (this.auth.isLocalMode()) {
        const local = await this.storage.get<CartItem[]>(`${STORAGE_KEYS.cart}:${user.id}`);
        this.items.set(local ?? []);
      } else {
        const dbItems = await this.supabaseService.getCartItems(user.id);
        this.items.set(
          dbItems.map((db: any) => ({
            id: db.id,
            product_id: db.product_id,
            name: db.products?.name ?? 'Cachetero LANË',
            price: Number(db.products?.price ?? 24.9),
            color: { name: db.color_name, hex: db.color_hex },
            size: db.size,
            quantity: db.quantity
          }))
        );
      }
    } catch (err) {
      console.warn('[CartService] no se pudo cargar el carrito', err);
    } finally {
      this.isCartSyncing.set(false);
    }
  }

  async loadRemoteCart() {
    await this.hydrate();
  }

  async addToCart(product: Product, color?: ProductColor, size = 'M', quantity = 1) {
    const user = this.auth.user();
    const chosenColor = color ?? product.colors[0];

    // Sin sesión no se permite comprar: se abre el modal de autenticación.
    if (!user) {
      this.isAuthModalOpen.set(true);
      return;
    }

    if (this.auth.isLocalMode()) {
      this.addLocalItem(product, chosenColor, size, quantity);
    } else {
      try {
        await this.supabaseService.addCartItem(
          user.id,
          product.id,
          chosenColor.name,
          chosenColor.hex,
          size,
          quantity
        );
        await this.hydrate();
      } catch (err) {
        console.warn('[CartService] Supabase falló, se guarda en local', err);
        this.addLocalItem(product, chosenColor, size, quantity);
      }
    }

    this.showToast(`"${product.name}" agregado a tu carrito`);
  }

  private addLocalItem(product: Product, color: ProductColor, size: string, quantity: number) {
    const existing = this.items().find(
      (i) => i.product_id === product.id && i.color.name === color.name && i.size === size
    );

    if (existing) {
      this.items.update((list) =>
        list.map((i) => (i.id === existing.id ? { ...i, quantity: i.quantity + quantity } : i))
      );
    } else {
      this.items.update((list) => [
        ...list,
        {
          id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          product_id: product.id,
          name: product.name,
          price: product.price,
          color,
          size,
          quantity
        }
      ]);
    }
  }

  async updateQuantity(itemId: string, delta: number) {
    const item = this.items().find((i) => i.id === itemId);
    if (!item) return;

    const newQty = item.quantity + delta;
    const isLocal = this.auth.isLocalMode() || itemId.startsWith('local-');

    if (newQty <= 0) {
      this.items.update((list) => list.filter((i) => i.id !== itemId));
    } else {
      this.items.update((list) => list.map((i) => (i.id === itemId ? { ...i, quantity: newQty } : i)));
    }

    if (isLocal) return;

    try {
      if (newQty <= 0) {
        await this.supabaseService.removeCartItem(itemId);
      } else {
        await this.supabaseService.updateCartItemQty(itemId, newQty);
      }
    } catch (err) {
      console.warn('[CartService] no se pudo actualizar la cantidad', err);
      await this.hydrate();
    }
  }

  async clearCart() {
    const user = this.auth.user();
    this.items.set([]);

    if (!user) return;

    if (this.auth.isLocalMode()) {
      await this.storage.remove(`${STORAGE_KEYS.cart}:${user.id}`);
      return;
    }

    try {
      await this.supabaseService.clearCart(user.id);
    } catch (err) {
      console.warn('[CartService] no se pudo vaciar el carrito', err);
    }
  }

  toggleCart() {
    this.isCartOpen.update((v) => !v);
  }

  openCart() {
    this.isCartOpen.set(true);
  }

  closeCart() {
    this.isCartOpen.set(false);
  }

  openQuickView(product: Product) {
    this.selectedQuickViewProduct.set(product);
    this.isQuickViewOpen.set(true);
  }

  closeQuickView() {
    this.isQuickViewOpen.set(false);
    this.selectedQuickViewProduct.set(null);
  }

  closeAuthModal() {
    this.isAuthModalOpen.set(false);
  }

  showToast(msg: string) {
    this.toastMessage.set(msg);
    this.toastVisible.set(true);
    setTimeout(() => {
      if (this.toastMessage() === msg) this.toastVisible.set(false);
    }, 3500);
  }
}