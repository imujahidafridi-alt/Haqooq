import { PracticeArea } from '../constants/legalDomains';
export type { PracticeArea };

export type UserRole = 'guest' | 'client' | 'lawyer' | 'admin';
export type UserStatus = 'pending' | 'under_review' | 'verified' | 'rejected' | 'suspended';
export type AccountState = 'active' | 'deletion_pending' | 'deleted';

export interface UserProfile {
  id: string;
  role: UserRole;
  email: string | null;
  displayName: string | null;
  status: UserStatus;
  accountState?: AccountState;
  city?: string;
  photoURL?: string | null;
  phone?: string;
  credentialUrl?: string;
  expoPushToken?: string;
  credits?: number;
  bio?: string;
  createdAt: any;
  updatedAt?: any;
}

export interface LawyerProfile extends UserProfile {
  role: 'lawyer';
  specialization: PracticeArea[];
  experienceYears: number;
  city: string;
  rating?: number;
  ratingCount?: number;
  isPremium: boolean;
  credits: number;
  discoveryScore?: number;
}

export interface PublicLawyerProfile {
  id: string;
  displayName: string;
  photoURL?: string | null;
  city: string;
  specialization: string[];
  experienceYears: number;
  rating: number;
  ratingCount: number;
  isPremium: boolean;
  discoveryScore: number;
  status: 'verified';
  bio?: string;
}

export type CaseStatus = 
  | 'open'
  | 'under_review'
  | 'active'
  | 'closed'
  | 'cancelled';

export type UrgencyLevel = 'urgent' | 'standard' | 'flexible';
export type CourtLevel = 'district' | 'high_court' | 'supreme_court' | 'tribunal' | 'other';
export type BudgetType = 'fixed' | 'open_to_quotes';

export interface LegalCase {
  id: string;
  clientId: string;
  clientName: string;
  assignedLawyerId?: string;
  title: string;
  description: string;
  category: string;
  city?: string;
  jurisdictionCity?: string;
  courtLevel?: CourtLevel;
  urgency?: UrgencyLevel;
  targetResponseAt?: number;
  budgetType?: BudgetType;
  budgetAmount?: number;
  currency?: 'PKR';
  budget?: number;
  status: CaseStatus;
  hasBeenRated?: boolean;
  timeline: TimelineEvent[];
  createdAt: number;
  updatedAt?: number;
}

export interface TimelineEvent {
  id: string;
  title: string;
  date: number;
  description?: string;
}

export interface CaseProposal {
  id: string;
  caseId: string;
  lawyerId: string;
  bidAmount: number;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
}

export interface ChatThread {
  id: string;
  caseId?: string;
  participants: string[];
  lastMessage: string;
  updatedAt: any;
  createdAt?: any;
  unreadCount?: Record<string, number>;
}

export interface ChatMessage {
  id?: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: any;
}

export interface Review {
  id: string;
  caseId: string;
  lawyerId: string;
  clientId: string;
  rating: number;
  reviewText?: string;
  createdAt: number;
}

export type ReportEntityType = 'case' | 'user' | 'review' | 'message';
export type ReportCategory = 'scam' | 'spam' | 'harassment' | 'inappropriate' | 'other';

export interface Report {
  id: string;
  reporterId: string;
  entityId: string;
  entityType: ReportEntityType;
  category: ReportCategory;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: number;
}

export interface CreditPurchase {
  id: string;
  lawyerId: string;
  lawyerName?: string;
  packageId?: string;
  planName: string;
  credits: number;
  amount: number;
  senderTitle: string;
  senderNumber: string;
  transactionId: string;
  transactionDateTime: string;
  proofUrl?: string | null;
  receiptUrl?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: any;
}
