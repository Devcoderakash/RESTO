import { z } from "zod";

const uuid = z.string().trim().min(1).max(128);
const slug = z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const paymentMethod = z.enum(["counter", "upi", "cash", "card", "online"]);

export const restaurantSlugSchema = z.object({ slug });
export const menuQuerySchema = z.object({ restaurantSlug: slug });
export const availabilityQuerySchema = z.object({
  restaurantSlug: slug,
  date: z.string().optional(),
  time: z.string().optional(),
  partySize: z.coerce.number().int().min(1).max(30).optional(),
});

export const createOrderSchema = z.object({
  restaurantSlug: slug,
  tableNumber: z.coerce.number().int().positive(),
  customerName: z.string().trim().min(1).max(120).optional(),
  customerPhone: z.string().trim().max(40).optional(),
  specialInstructions: z.string().trim().max(1000).optional(),
  items: z.array(z.object({
    menuItemId: uuid,
    quantity: z.number().int().min(1).max(50),
    selectedAddons: z.array(z.object({
      id: z.string().trim().min(1).max(100),
      name: z.string().trim().max(100).optional(),
      price: z.number().min(0).optional(),
    })).max(20).default([]),
    spiceLevel: z.enum(["mild", "medium", "hot", "extra_hot"]).optional(),
    specialInstructions: z.string().trim().max(500).optional(),
  }).strict()).min(1).max(50),
  paymentMethod: paymentMethod.default("counter"),
  idempotencyKey: z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/),
}).strict();

export const trackingQuerySchema = z.object({ accessToken: z.string().min(1).max(512) });
export const serviceRequestSchema = z.object({
  restaurantSlug: slug,
  tableNumber: z.coerce.number().int().positive(),
  requestType: z.enum(["waiter", "bill", "water", "assistance", "other"]),
  orderId: uuid.optional(),
  message: z.string().trim().max(500).optional(),
  paymentPreference: z.string().trim().max(30).optional(),
});
export const listOrdersQuerySchema = z.object({
  status: z.enum(["pending", "confirmed", "preparing", "ready", "served", "completed", "cancelled"]).optional(),
  tableNumber: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export const orderStatusSchema = z.object({
  status: z.enum(["confirmed", "preparing", "ready", "served", "completed", "cancelled"]),
  reason: z.string().trim().max(500).optional(),
}).strict();
export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(256),
}).strict();
export const upsertMenuItemSchema = z.object({
  categoryId: uuid.nullable().optional(),
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(2000).nullable().optional(),
  price: z.number().positive().max(100000),
  imageUrl: z.string().url().nullable().optional(),
  foodType: z.enum(["veg", "non_veg"]).optional(),
  dietaryTags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  addons: z.array(z.object({
    id: z.string().trim().min(1).max(100),
    name: z.string().trim().min(1).max(100),
    price: z.number().min(0).max(100000),
  }).strict()).max(30).default([]),
  popular: z.boolean().default(false),
  preparationTimeMinutes: z.number().int().min(1).max(1440).default(15),
  calories: z.number().int().positive().nullable().optional(),
  allergens: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  available: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
}).strict();
export const categorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  sortOrder: z.number().int().default(0),
  isVisible: z.boolean().default(true),
}).strict();
export const staffInviteSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  role: z.enum(["restaurant_admin", "manager", "chef", "waiter"]),
}).strict();
export const staffStatusSchema = z.object({ isActive: z.boolean() }).strict();
export const tableSchema = z.object({
  tableNumber: z.number().int().positive(),
  capacity: z.number().int().min(1).max(30),
  zone: z.string().trim().min(1).max(80).default("Main Dining"),
  status: z.enum(["available", "occupied", "inactive"]).default("available"),
}).strict();
export const tableStatusSchema = z.object({
  status: z.enum(["available", "occupied", "inactive"]),
}).strict();
export const paymentStatusSchema = z.object({
  status: z.enum(["pending", "completed", "failed", "refunded"]),
  transactionReference: z.string().trim().max(120).optional(),
}).strict();
export const paymentCreateSchema = z.object({
  orderId: uuid,
}).strict();
export const restaurantSettingsSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  wifiSsid: z.string().trim().max(100).nullable().optional(),
  wifiPassword: z.string().max(150).nullable().optional(),
  taxPercentage: z.number().min(0).max(100).optional(),
  serviceChargePercentage: z.number().min(0).max(100).optional(),
  openingHours: z.record(z.string(), z.unknown()).optional(),
}).strict();
export const paramsIdSchema = z.object({ id: uuid });
