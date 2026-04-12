import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';
import { LegalCase } from '../../../types/models';

/**
 * Simulates a Firebase Cloud Function calling an AI Engine 
 * to parse a natural language description into a legal category.
 */
export const classifyCaseWithAI = async (description: string): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const lowerDesc = description.toLowerCase();
      if (lowerDesc.includes('property') || lowerDesc.includes('land') || lowerDesc.includes('estate')) {
        resolve('Property / Real Estate Law');
      } else if (lowerDesc.includes('divorce') || lowerDesc.includes('child') || lowerDesc.includes('marriage')) {
        resolve('Family Law');
      } else if (lowerDesc.includes('business') || lowerDesc.includes('corporate') || lowerDesc.includes('contract')) {
        resolve('Corporate Law');
      } else if (lowerDesc.includes('arrest') || lowerDesc.includes('murder') || lowerDesc.includes('fraud') || lowerDesc.includes('police')) {
        resolve('Criminal Law');
      } else {
        resolve('Civil Litigation'); // Default fallback
      }
    }, 1200); // simulate 1.2s network latency
  });
};

/**
 * Submits a validated and categorized case to the Firestore 'cases' collection
 */
export const postCaseToMarketplace = async (
  clientId: string,
  title: string,
  description: string,
  category: string,
  budget?: number
): Promise<string> => {
  try {
    const caseData: Omit<LegalCase, 'id'> = {
      clientId,
      title,
      description,
      category,
      budget,
      status: 'open',
      timeline: [
        {
          id: Date.now().toString(),
          title: 'Case Posted',
          date: Date.now(),
          description: 'Case has been pushed to the marketplace for lawyer review.'
        }
      ],
      createdAt: Date.now(),
    };

    const docRef = await addDoc(collection(db, 'cases'), caseData);
    return docRef.id;
  } catch (error) {
    console.error("Error posting case:", error);
    throw new Error("Unable to post case. Please check your connection.");
  }
};
