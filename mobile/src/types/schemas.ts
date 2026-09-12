import { z } from 'zod';
import { CANONICAL_PRACTICE_AREAS } from '../constants/legalDomains';

export const editableClientProfileSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(60, 'Name cannot exceed 60 characters'),
  phone: z.string().max(25).optional(),
  city: z.string().max(50).optional(),
});

export const editableLawyerProfileSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(60, 'Name cannot exceed 60 characters'),
  phone: z.string().max(25).optional(),
  city: z.string().max(50).optional(),
  specialization: z
    .array(z.enum(CANONICAL_PRACTICE_AREAS))
    .min(1, 'Please select at least 1 legal practice area')
    .max(5, 'You can select up to 5 legal practice areas'),
});

export const lawyerProfileSchema = z.object({
  id: z.string(),
  role: z.literal('lawyer'),
  email: z.string().nullable().optional(),
  displayName: z.string().nullable().optional(),
  status: z.enum(['pending', 'under_review', 'verified', 'rejected', 'suspended']),
  photoURL: z.string().nullable().optional(),
  phone: z.string().optional(),
  credentialUrl: z.string().optional(),
  expoPushToken: z.string().optional(),
  createdAt: z.any().optional(),
  specialization: z.array(z.string()).default([]),
  experienceYears: z.number().default(0),
  city: z.string().default('Pakistan'),
  rating: z.number().optional(),
  ratingCount: z.number().optional(),
  isPremium: z.boolean().default(false),
  credits: z.number().default(0),
  discoveryScore: z.number().optional(),
});

/**
 * Validates public discovery projection records.
 * Enforces verified status and strips private fields (no email, phone, credentials).
 */
export const publicLawyerProfileSchema = z.object({
  id: z.string(),
  displayName: z.string().default('Advocate'),
  photoURL: z.string().nullable().optional(),
  city: z.string().default('Pakistan'),
  specialization: z.array(z.string()).default([]),
  experienceYears: z.number().default(0),
  rating: z.number().default(0),
  ratingCount: z.number().default(0),
  isPremium: z.boolean().default(false),
  discoveryScore: z.number().default(0),
  status: z.literal('verified').default('verified'),
});

export const searchFiltersSchema = z.object({
  query: z.string().default(''),
  category: z.string().default('All'),
  city: z.string().default(''),
  sortBy: z.enum(['recommended', 'rating', 'experience']).default('recommended'),
  page: z.number().default(0),
  pageSize: z.number().default(15),
});

export type SearchFiltersInput = z.infer<typeof searchFiltersSchema>;

export const postCaseInputSchema = z.object({
  title: z
    .string()
    .min(10, 'Title must be at least 10 characters')
    .max(100, 'Title cannot exceed 100 characters'),
  description: z
    .string()
    .min(25, 'Please explain your situation with at least 25 characters')
    .max(2500, 'Description cannot exceed 2500 characters'),
  category: z.enum([
    'Property / Real Estate Law',
    'Family Law',
    'Corporate Law',
    'Criminal Law',
    'Civil Litigation',
    'Labor & Employment',
  ]),
  city: z.string().min(2, 'Please select your city'),
  jurisdictionCity: z.string().min(2, 'Please select court/matter jurisdiction'),
  courtLevel: z.enum(['district', 'high_court', 'supreme_court', 'tribunal', 'other']).default('district'),
  urgency: z.enum(['urgent', 'standard', 'flexible']).default('standard'),
  budgetType: z.enum(['fixed', 'open_to_quotes']).default('open_to_quotes'),
  budgetAmount: z
    .number()
    .int('Budget must be a whole number')
    .min(5000, 'Minimum budget is PKR 5,000')
    .max(50000000, 'Maximum budget is PKR 50,000,000')
    .optional(),
});

export type PostCaseInput = z.infer<typeof postCaseInputSchema>;

export interface CaseDraftData {
  title: string;
  description: string;
  category: string;
  city: string;
  jurisdictionCity: string;
  courtLevel: 'district' | 'high_court' | 'supreme_court' | 'tribunal' | 'other';
  urgency: 'urgent' | 'standard' | 'flexible';
  budgetType: 'fixed' | 'open_to_quotes';
  budgetAmount?: number;
}

export interface CaseDraft {
  version: number;
  userId: string;
  updatedAt: number;
  data: CaseDraftData;
}

