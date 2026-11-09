import { z } from 'zod';

export const addressSchema = z.object({
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(100),
  region: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().min(1).max(20),
  country: z.string().trim().length(2, 'Use an ISO 3166-1 alpha-2 country code'),
});
export type Address = z.infer<typeof addressSchema>;

export const customerInputSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(30).optional(),
  address: addressSchema.optional(),
});
export type CustomerInput = z.input<typeof customerInputSchema>;

export const customerUpdateSchema = customerInputSchema.partial();
export type CustomerUpdate = z.input<typeof customerUpdateSchema>;

export interface Customer {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  address: Address | null;
  createdAt: string;
  updatedAt: string;
}
