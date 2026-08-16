import { z } from "zod";

export const placeOrderSchema = z.object({
  meal_id: z.string().uuid("Invalid meal ID"),
  quantity: z.number().int().positive().default(1),
  notes: z.string().max(500).optional(),
});

export const confirmOrderSchema = z.object({});
export const readyOrderSchema = z.object({
  fulfillment_notes: z.string().max(500).optional(),
});
export const deliverOrderSchema = z.object({
  fulfillment_notes: z.string().max(500).optional(),
});
export const cancelOrderSchema = z.object({
  fulfillment_notes: z.string().max(500).optional(),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
export type ConfirmOrderInput = z.infer<typeof confirmOrderSchema>;
export type ReadyOrderInput = z.infer<typeof readyOrderSchema>;
export type DeliverOrderInput = z.infer<typeof deliverOrderSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;

export const listOrdersQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
