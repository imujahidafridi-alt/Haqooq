// Defines the primary data models across the application

export type UserRole = 'guest' | 'client' | 'lawyer' | 'admin';

export interface UserProfile {
  id: string;
  role: UserRole;
  email: string | null;
  displayName: string | null;
  status: 'pending' | 'verified' | 'rejected';
  photoURL?: string | null;
  phone?: string;
  credentialUrl?: string; // added for lawyer verification
  expoPushToken?: string; // device push notification token
  createdAt: number;
}

export interface LawyerProfile extends UserProfile {
  role: 'lawyer';
  specialization: string[];
  experienceYears: number;
  city: string;
  rating?: number;
  isPremium: boolean;
  biddingCredits: number;
}

export interface LegalCase {
  id: string;
  clientId: string;
  clientName: string; // Added to distinguish the creator
  assignedLawyerId?: string;
  title: string;
  description: string;
  category: string;
  budget?: number;
  status: 'open' | 'active' | 'closed';
  timeline: TimelineEvent[];
  createdAt: number;
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
