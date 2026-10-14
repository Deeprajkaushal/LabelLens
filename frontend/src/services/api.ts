import {
  Product,
  AnalyzeLabelResponse,
  PortionCalculationResponse,
  ProductCompareResponse,
  DailyFoodLogSummary,
  FoodLogEntry,
  Reminder,
  IngredientExplanation
} from '../types';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const fullUrl = `${API_BASE}${url}`;
  try {
    const res = await fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });

    if (!res.ok) {
      let errMsg = `Request failed with status ${res.status}`;
      try {
        const errorData = await res.json();
        errMsg = errorData.detail || errMsg;
      } catch {
        // ignore
      }
      throw new Error(errMsg);
    }
    return (await res.json()) as T;
  } catch (err: any) {
    console.warn(`API Error on ${url}:`, err.message);
    throw err;
  }
}

export const api = {
  // System Health
  async checkHealth(): Promise<{ status: string; app: string; database: string }> {
    return fetchJson<{ status: string; app: string; database: string }>('/health');
  },

  // Label Analysis & Portion Math
  async scanImages(files: File[], language = 'en'): Promise<AnalyzeLabelResponse> {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    formData.append('language', language);

    const fullUrl = `${API_BASE}/api/scan`;
    const res = await fetch(fullUrl, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      let errMsg = `Scan failed with status ${res.status}`;
      try {
        const errorData = await res.json();
        if (typeof errorData.detail === 'object') {
          errMsg = errorData.detail.message || errorData.detail.code || errMsg;
        } else if (errorData.detail) {
          errMsg = errorData.detail;
        }
      } catch {}
      throw new Error(errMsg);
    }
    return (await res.json()) as AnalyzeLabelResponse;
  },

  async analyzeLabel(rawText: string, language = 'en'): Promise<AnalyzeLabelResponse> {
    return fetchJson<AnalyzeLabelResponse>('/api/analyze-label', {
      method: 'POST',
      body: JSON.stringify({ raw_text: rawText, language }),
    });
  },

  async calculatePortion(payload: {
    energy_kcal_basis: number;
    basis?: string;
    basis_quantity?: number;
    portion_size: number;
    portion_unit?: string;
    protein_g?: number;
    carbohydrates_g?: number;
    total_sugar_g?: number;
    total_fat_g?: number;
    saturated_fat_g?: number;
    sodium_mg?: number;
    fibre_g?: number;
  }): Promise<PortionCalculationResponse> {
    return fetchJson<PortionCalculationResponse>('/api/calculate-portion', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Products CRUD
  async getProducts(q?: string, favoriteOnly = false): Promise<Product[]> {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (favoriteOnly) params.set('favorite_only', 'true');
    const queryStr = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<Product[]>(`/api/products${queryStr}`);
  },

  async getProduct(id: string): Promise<Product> {
    return fetchJson<Product>(`/api/products/${id}`);
  },

  async createProduct(product: Partial<Product>): Promise<Product> {
    return fetchJson<Product>('/api/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    return fetchJson<Product>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteProduct(id: string): Promise<{ success: boolean; message: string }> {
    return fetchJson<{ success: boolean; message: string }>(`/api/products/${id}`, {
      method: 'DELETE',
    });
  },

  async toggleFavorite(id: string): Promise<{ product_id: string; is_favorite: boolean }> {
    return fetchJson<{ product_id: string; is_favorite: boolean }>(`/api/products/${id}/favorite`, {
      method: 'POST',
    });
  },

  // Comparison
  async compareProducts(payload: {
    product_a_id?: string;
    product_b_id?: string;
    product_a?: Partial<Product>;
    product_b?: Partial<Product>;
  }): Promise<ProductCompareResponse> {
    return fetchJson<ProductCompareResponse>('/api/compare', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Daily Food Log
  async getDailyFoodLog(logDate?: string): Promise<DailyFoodLogSummary> {
    const q = logDate ? `?log_date=${logDate}` : '';
    return fetchJson<DailyFoodLogSummary>(`/api/food-log${q}`);
  },

  async addFoodLogEntry(entry: Partial<FoodLogEntry>): Promise<FoodLogEntry> {
    return fetchJson<FoodLogEntry>('/api/food-log', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  },

  async updateFoodLogEntry(id: string, updates: Partial<FoodLogEntry>): Promise<FoodLogEntry> {
    return fetchJson<FoodLogEntry>(`/api/food-log/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteFoodLogEntry(id: string): Promise<{ success: boolean; message: string }> {
    return fetchJson<{ success: boolean; message: string }>(`/api/food-log/${id}`, {
      method: 'DELETE',
    });
  },

  // Reminders
  async getReminders(): Promise<Reminder[]> {
    return fetchJson<Reminder[]>('/api/reminders');
  },

  async createReminder(rem: Partial<Reminder>): Promise<Reminder> {
    return fetchJson<Reminder>('/api/reminders', {
      method: 'POST',
      body: JSON.stringify(rem),
    });
  },

  async updateReminder(id: string, updates: Partial<Reminder>): Promise<Reminder> {
    return fetchJson<Reminder>(`/api/reminders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteReminder(id: string): Promise<{ success: boolean; message: string }> {
    return fetchJson<{ success: boolean; message: string }>(`/api/reminders/${id}`, {
      method: 'DELETE',
    });
  },

  // Ingredients Explorer & Demo Products
  async searchIngredients(q: string): Promise<IngredientExplanation[]> {
    return fetchJson<IngredientExplanation[]>(`/api/ingredients/search?q=${encodeURIComponent(q)}`);
  },

  async getCommonIngredients(): Promise<IngredientExplanation[]> {
    return fetchJson<IngredientExplanation[]>('/api/ingredients/common');
  },

  async getDemoProducts(): Promise<Product[]> {
    return fetchJson<Product[]>('/api/ingredients/demo-products');
  },
};
