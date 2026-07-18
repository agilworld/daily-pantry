export const MEAL_CATEGORIES = ["nasi", "mie", "snack", "minuman"] as const;

export type MealCategory = (typeof MEAL_CATEGORIES)[number];
