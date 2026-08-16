export interface Meal {
  id: string;
  seller_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  /** NULL = own-selling meal; non-null = belongs to a food store (categories table) */
  category_id: string | null;
  /** Denormalized from categories via left join (NULL when category_id is NULL or category is inactive/missing) */
  category_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface MealListItem {
  id: string;
  name: string;
  price_cents: number;
  category_id: string | null;
  category_name: string | null;
  is_active: boolean;
}
