export type UserRole = 'guest' | 'client' | 'lawyer' | 'admin';

export interface UserProfile {
  id: string;
  role: UserRole;
  email?: string | null;
  displayName?: string | null;
  status: 'pending' | 'verified' | 'rejected';
  photoURL?: string | null;
  phone?: string;
  credentialUrl?: string;
  expoPushToken?: string;
  createdAt: number;
  specialization?: string[];
  experienceYears?: number;
  city?: string;
  rating?: number;
  ratingCount?: number;
  isPremium?: boolean;
  biddingCredits?: number;
}

export interface LegalCase {
  id: string;
  clientId: string;
  clientName: string;
  assignedLawyerId?: string;
  title: string;
  description: string;
  category: string;
  budget?: number;
  status: 'open' | 'active' | 'closed';
  hasBeenRated?: boolean;
  timeline: Array<{ id: string; title: string; date: number; description?: string }>;
  createdAt: number;
}

export interface Report {
  id: string;
  reporterId: string;
  entityId: string;
  entityType: 'case' | 'user' | 'review' | 'message';
  category: 'scam' | 'spam' | 'harassment' | 'inappropriate' | 'other';
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: number;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'premium_profile' | 'bidding_credits';
  metadata?: Record<string, any>;
  status: 'completed' | 'failed' | 'pending';
  timestamp: number;
}

export interface AuditLog {
  id: string;
  action: string;
  entityId: string;
  entityType: string;
  previousState?: string;
  newState?: string;
  timestamp: number;
  actorId?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  status: 'pending' | 'sent' | 'failed';
  createdAt: number;
}
