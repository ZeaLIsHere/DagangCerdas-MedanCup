// DagangCerdas — Cart Store (Zustand)

import { create } from 'zustand';
import type { CartItem, Product } from '../types';

interface CartStore {
  items: CartItem[];
  
  // Actions
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  incrementQuantity: (productId: string) => void;
  decrementQuantity: (productId: string) => void;
  clearCart: () => void;
  
  // Computed
  getTotal: () => number;
  getTotalItems: () => number;
  getItemCount: (productId: string) => number;
  getTotalProfit: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (product: Product) => {
    set((state) => {
      const existingItem = state.items.find(item => item.product.id === product.id);
      
      if (existingItem) {
        // Jangan melebihi stok
        if (existingItem.quantity >= product.stock) return state;
        
        return {
          items: state.items.map(item =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }
      
      if (product.stock <= 0) return state;
      
      return {
        items: [...state.items, {
          product: {
            id: product.id,
            name: product.name,
            price: product.price,
            costPrice: product.costPrice,
            stock: product.stock,
            unit: product.unit,
            imageUri: product.imageUri,
            category: product.category,
          },
          quantity: 1,
        }],
      };
    });
  },

  removeItem: (productId: string) => {
    set((state) => ({
      items: state.items.filter(item => item.product.id !== productId),
    }));
  },

  updateQuantity: (productId: string, quantity: number) => {
    set((state) => {
      if (quantity <= 0) {
        return { items: state.items.filter(item => item.product.id !== productId) };
      }
      
      return {
        items: state.items.map(item =>
          item.product.id === productId
            ? { ...item, quantity: Math.min(quantity, item.product.stock) }
            : item
        ),
      };
    });
  },

  incrementQuantity: (productId: string) => {
    set((state) => ({
      items: state.items.map(item =>
        item.product.id === productId && item.quantity < item.product.stock
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ),
    }));
  },

  decrementQuantity: (productId: string) => {
    set((state) => {
      const item = state.items.find(i => i.product.id === productId);
      if (!item) return state;
      
      if (item.quantity <= 1) {
        return { items: state.items.filter(i => i.product.id !== productId) };
      }
      
      return {
        items: state.items.map(i =>
          i.product.id === productId
            ? { ...i, quantity: i.quantity - 1 }
            : i
        ),
      };
    });
  },

  clearCart: () => set({ items: [] }),

  getTotal: () => {
    return get().items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  },

  getTotalItems: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },

  getItemCount: (productId: string) => {
    const item = get().items.find(i => i.product.id === productId);
    return item?.quantity || 0;
  },

  getTotalProfit: () => {
    return get().items.reduce(
      (sum, item) => sum + (item.product.price - item.product.costPrice) * item.quantity,
      0
    );
  },
}));
