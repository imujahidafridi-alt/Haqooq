import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';

export type TransactionType = 'premium_profile' | 'bidding_credits';

export interface PaymentIntent {
  userId: string;
  amount: number;
  type: TransactionType;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  errorMessage?: string;
}

/**
 * Abstract Payment Service
 * Purpose: Routes all transactions through a single unified engine.
 * Currently uses a mock processor, but architected to seamlessly plug into 
 * Stripe or Easypaisa API SDKs strictly by replacing the `processMockPayment` call.
 */
class PaymentService {
  
  async initiatePayment(intent: PaymentIntent): Promise<PaymentResult> {
    try {
      // 1. Send data to Gateway (Mocked for now)
      const isSuccess = await this.processMockPayment(intent.amount);

      if (!isSuccess) {
        return { success: false, errorMessage: 'Card declined by issuing bank.' };
      }

      // 2. If Gateway responds Success, record transaction to Cloud Firestore (Audit Trail)
      const txRef = await addDoc(collection(db, 'transactions'), {
        ...intent,
        status: 'completed',
        timestamp: Date.now()
      });

      // 3. Fulfill the purchase based on intent type
      await this.fulfillPurchase(intent);

      return { success: true, transactionId: txRef.id };
    } catch (error: any) {
      console.error("Payment Gateway Error:", error);
      return { success: false, errorMessage: error.message };
    }
  }

  // --- PRIVATE METHODS ---

  /**
   * Simulates network latency and randomly succeeds or fails 
   * to test failure-handling UI. (90% success rate)
   */
  private processMockPayment(amount: number): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const isApproved = Math.random() > 0.1; 
        resolve(isApproved);
      }, 1500); 
    });
  }

  /**
   * Applies the business logic to unlock whatever the lawyer purchased.
   */
  private async fulfillPurchase(intent: PaymentIntent) {
    // ⚠️ ENTERPRISE SAFEGUARD:
    // In production, this logic MUST be moved to a secure Cloud Function 
    // listening to 'onCreate' on the 'transactions' collection to prevent users from altering their own credits.
    // For MVP presentation, we fallback to updating from the client side explicitly via rules exception.
    const userRef = doc(db, 'users', intent.userId);

    try {
      switch (intent.type) {
        case 'premium_profile':
          await updateDoc(userRef, { isPremium: true });
          break;
        case 'bidding_credits':
          const creditsPurchased = Math.floor(intent.amount / 10);
          await updateDoc(userRef, { biddingCredits: increment(creditsPurchased) });
          break;
      }
    } catch (e) {
       console.error('[PaymentService] Failed to simulate account upgrade. Ensure Firestore Rules are relaxed for the MVP demo.', e);
       throw e;
    }
  }
}

export const paymentService = new PaymentService();
