import { z } from 'zod';
import { CANONICAL_PRACTICE_AREAS, CITIES } from '../constants/legalDomains';

export const postCaseInputSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters').max(100, 'Title cannot exceed 100 characters'),
  description: z.string().min(25, 'Description must provide at least 25 characters of detail').max(2500, 'Description cannot exceed 2,500 characters'),
  category: z.string().min(1, 'Category is required'),
  city: z.string().min(1, 'City is required'),
  jurisdictionCity: z.string().min(1, 'Jurisdiction city is required'),
  courtLevel: z.enum(['district', 'high_court', 'supreme_court', 'tribunal', 'other']).default('district'),
  urgency: z.enum(['urgent', 'standard', 'flexible']).default('standard'),
  budgetType: z.enum(['fixed', 'open_to_quotes']).default('open_to_quotes'),
  budgetAmount: z.number().min(5000, 'Fixed budget must be at least PKR 5,000').max(50000000, 'Budget cannot exceed PKR 50,000,000').optional(),
});

export type PostCaseInput = z.infer<typeof postCaseInputSchema>;

export const searchFiltersSchema = z.object({
  query: z.string().default(''),
  category: z.string().default('All'),
  city: z.string().default(''),
  sortBy: z.enum(['recommended', 'rating', 'experience']).default('recommended'),
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(50).default(15),
});

export const publicLawyerProfileSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  photoURL: z.string().nullable().optional(),
  city: z.string().default('Pakistan'),
  specialization: z.array(z.string()).default([]),
  experienceYears: z.number().nonnegative().default(0),
  rating: z.number().min(0).max(5).default(0),
  ratingCount: z.number().int().nonnegative().default(0),
  isPremium: z.boolean().default(false),
  discoveryScore: z.number().default(0),
  status: z.literal('verified'),
});
