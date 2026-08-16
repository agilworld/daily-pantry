import { z } from "zod";
import { placeOrderSchema, confirmOrderSchema, readyOrderSchema, deliverOrderSchema, cancelOrderSchema, listOrdersQuerySchema } from "@dailypantry/shared";

export { placeOrderSchema, confirmOrderSchema, readyOrderSchema, deliverOrderSchema, cancelOrderSchema, listOrdersQuerySchema };

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
export type ConfirmOrderInput = z.infer<typeof confirmOrderSchema>;
export type ReadyOrderInput = z.infer<typeof readyOrderSchema>;
export type DeliverOrderInput = z.infer<typeof deliverOrderSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type ListOrdersQueryInput = z.infer<typeof listOrdersQuerySchema>;
