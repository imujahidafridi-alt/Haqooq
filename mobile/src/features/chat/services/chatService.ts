import { collection, addDoc, query, orderBy, onSnapshot, doc, setDoc, updateDoc, serverTimestamp, limit, startAfter, QueryDocumentSnapshot, arrayUnion, where, getDocs, increment, getDoc } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';
import { ChatThread, UserProfile, LegalCase } from '../../../types/models';

export interface ChatMessage {
  id?: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: number | any; // allow any for serverTimestamp
}

/**
 * Get profile data to display the correct name and avatar in the list
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  if (!userId) return null;
  try {
    const d = await getDoc(doc(db, 'users', userId));
    return d.exists() ? d.data() as UserProfile : null;
  } catch (error) {
    return null;
  }
};

/**
 * Get case details to distinguish Case Chats from Direct Messages.
 */
export const getCaseDetails = async (caseId: string): Promise<LegalCase | null> => {
  if (!caseId) return null;
  try {
    const d = await getDoc(doc(db, 'cases', caseId));
    return d.exists() ? { id: d.id, ...d.data() } as LegalCase : null;
  } catch (error) {
    return null;
  }
};

export const getInboxChats = async (userId: string): Promise<ChatThread[]> => {
  try {
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, where('participants', 'array-contains', userId));
    const snapshot = await getDocs(q);
    const results: ChatThread[] = [];
    snapshot.forEach(doc => {
      results.push({ id: doc.id, ...doc.data() } as ChatThread);
    });
    return results.sort((a, b) => ((b.updatedAt as any)?.toMillis?.() || 0) - ((a.updatedAt as any)?.toMillis?.() || 0));
  } catch (error) {
    console.error("Error fetching inbox:", error);
    return [];
  }
};

/**
 * Enterprise standard: subscribe directly so users see chats come in live without pulling to refresh
 */
export const subscribeToInboxChats = (userId: string, callback: (chats: ChatThread[]) => void) => {
  const chatsRef = collection(db, 'chats');
  const q = query(chatsRef, where('participants', 'array-contains', userId));
  return onSnapshot(q, (snapshot) => {
    const results: ChatThread[] = [];
    snapshot.forEach(doc => {
      results.push({ id: doc.id, ...doc.data() } as ChatThread);
    });
    // Sort descending by highest timestamp timestamp properly checked
    callback(results.sort((a, b) => ((b.updatedAt as any)?.toMillis?.() || 0) - ((a.updatedAt as any)?.toMillis?.() || 0)));
  }, (error) => {
    console.error("Error subscribing to inbox:", error);
  });
};

/**
 * Sends a message and updates the parent ChatThread document with the last message 
 * to easily preview in a list view without fetching all messages. Also tracks unread notifications.
 */
export const sendMessage = async (chatId: string, senderId: string, text: string) => {
  try {
    const msgData: Partial<ChatMessage> = {
      chatId,
      senderId,
      text,
      createdAt: serverTimestamp() // Using server time for accurate cross-device ordering
    };

    // Add to subcollection
    const messagesRef = collection(db, `chats/${chatId}/messages`);
    await addDoc(messagesRef, msgData);

    // Parse the receiver immediately if direct
    const isDirect = chatId.startsWith('direct-');
    const parts = chatId.split('-');
    const defaultParticipants = isDirect && parts.length === 3 ? [parts[1], parts[2]] : arrayUnion(senderId);
    
    // Find the recipient implicitly if it's a direct message to increment their unread counter
    const recipientId = isDirect && parts.length === 3 ? parts.find(p => p !== senderId && p !== 'direct') : null;

    // Update parent document's read preview
    const chatRef = doc(db, 'chats', chatId);
    const updatePayload: any = {
      lastMessage: text,
      updatedAt: serverTimestamp(),
      participants: defaultParticipants
    };
    
    if (recipientId) {
      updatePayload[`unreadCount.${recipientId}`] = increment(1);
    }

    await setDoc(chatRef, updatePayload, { merge: true });

  } catch (error) {
    console.error("Failed to send message:", error);
    throw error;
  }
};

/**
 * Resets the unread count for the given user in a designated chat
 */
export const markChatAsRead = async (chatId: string, userId: string) => {
  if (!chatId || !userId) return;
  try {
    const chatRef = doc(db, 'chats', chatId);
    const payload: any = {};
    payload[`unreadCount.${userId}`] = 0;
    await updateDoc(chatRef, payload);
  } catch (error) {
    console.error("Failed to mark chat as read:", error);
  }
};

/**
 * Returns an unsubscribe listener function for frontend components 
 * with pagination support (Enterprise Standard).
 */
export const listenToMessages = (
  chatId: string, 
  callback: (messages: ChatMessage[], fromCache: boolean, lastVisible: any) => void,
  messageLimit: number = 50,
  startAfterDoc?: any
) => {
  let baseQuery = query(
    collection(db, `chats/${chatId}/messages`),
    orderBy('createdAt', 'desc'),
    limit(messageLimit)
  );

  if (startAfterDoc) {
    baseQuery = query(
      collection(db, `chats/${chatId}/messages`),
      orderBy('createdAt', 'desc'),
      startAfter(startAfterDoc), // Feed cursor into query
      limit(messageLimit)
    );
  }

  return onSnapshot(baseQuery, { includeMetadataChanges: true }, (snapshot) => {
    const msgs: ChatMessage[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      msgs.push({ 
        id: doc.id, 
        ...data,
        createdAt: data.createdAt ? (data.createdAt.toMillis ? data.createdAt.toMillis() : data.createdAt) : Date.now()
      } as ChatMessage);
    });

    const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
    callback(msgs.reverse(), snapshot.metadata.fromCache, lastVisible);
  }, (error) => {
    console.warn("Realtime listen detached or failed:", error);
    callback([], false, null);
  });
};
