import { PracticeArea } from '../constants/legalDomains';

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
  credentialUrl?: string; // added for lawyer verification
  expoPushToken?: string; // device push notification token
  credits?: number;
  createdAt: number;
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

export interface EditableClientProfile {
  displayName: string;
  phone?: string;
  city?: string;
}

export interface EditableLawyerProfile {
  displayName: string;
  phone?: string;
  city?: string;
  specialization: PracticeArea[];
}

export interface TrustedLawyerMetrics {
  experienceYears: number;
  rating: number;
  ratingCount: number;
  discoveryScore: number;
  isPremium: boolean;
  credits: number;
  status: UserStatus;
  accountState?: AccountState;
}

/**
 * Sanitized public discovery projection.
 * Exposes strictly verified public profile attributes and guarantees ZERO PII
 * (no email, phone, CNIC, or credential document URLs).
 */
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
}

export type CaseStatus = 
  | 'open'          // Canonical active marketplace status (UI: "Receiving proposals")
  | 'under_review'  // Client actively evaluating received bids
  | 'active'        // Lawyer proposal accepted & matter engaged
  | 'closed'        // Resolved or completed
  | 'cancelled';    // Withdrawn by client

export type UrgencyLevel = 'urgent' | 'standard' | 'flexible';
export type CourtLevel = 'district' | 'high_court' | 'supreme_court' | 'tribunal' | 'other';
export type BudgetType = 'fixed' | 'open_to_quotes';

export interface LegalCase {
  id: string;
  clientId: string;
  clientName: string; // Derived / compatibility field
  assignedLawyerId?: string;
  title: string;
  description: string;
  category: string;

  // Jurisdiction & Forum
  city?: string;
  jurisdictionCity?: string;
  courtLevel?: CourtLevel;

  // Urgency & Response Turnaround (Marketplace metadata)
  urgency?: UrgencyLevel;
  targetResponseAt?: number;

  // Canonical Budget
  budgetType?: BudgetType;
  budgetAmount?: number;
  currency?: 'PKR';
  budget?: number; // Deprecated write-through compatibility field

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
  updatedAt: number;
  unreadCount?: Record<string, number>;
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
