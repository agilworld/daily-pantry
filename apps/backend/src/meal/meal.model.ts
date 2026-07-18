export interface Meal {
  id: string;
  seller_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface MealListItem {
  id: string;
  name: string;
  price_cents: number;
  category: string;
  is_active: boolean;
}
