import { z } from 'zod';

export const lawyerProfileSchema = z.object({
  id: z.string(),
  role: z.literal('lawyer'),
  email: z.string().email().nullable(),
  displayName: z.string().nullable(),
  status: z.enum(['pending', 'verified', 'rejected']),
  photoURL: z.string().nullable().optional(),
  phone: z.string().optional(),
  credentialUrl: z.string().optional(),
  expoPushToken: z.string().optional(),
  createdAt: z.number(),
  specialization: z.array(z.string()).default([]),
  experienceYears: z.number().default(0),
  city: z.string(),
  rating: z.number().optional(),
  isPremium: z.boolean().default(false),
  biddingCredits: z.number().default(0),
});

export const searchFiltersSchema = z.object({
  query: z.string().default(''),
  category: z.string().optional(),
  city: z.string().optional(),
  minExperience: z.number().optional(),
});
