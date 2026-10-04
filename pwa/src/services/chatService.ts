import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  limit, 
  where, 
  increment, 
  getDoc,
  Unsubscribe 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ChatThread, UserProfile, LegalCase, ChatMessage } from '../types/models';
export type { ChatThread, ChatMessage };

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  if (!userId) return null;
  try {
    const d = await getDoc(doc(db, 'users', userId));
    return d.exists() ? ({ id: d.id, ...d.data() } as UserProfile) : null;
  } catch (error) {
    return null;
  }
};

export const getCaseDetails = async (caseId: string): Promise<LegalCase | null> => {
  if (!caseId) return null;
  try {
    const d = await getDoc(doc(db, 'cases', caseId));
    return d.exists() ? ({ id: d.id, ...d.data() } as LegalCase) : null;
  } catch (error) {
    return null;
  }
};

export const ensureChatThread = async (
  chatId: string, 
  currentUserId: string,
  targetUserId?: string,
  caseId?: string
) => {
  if (!chatId || !currentUserId) return;

  const chatRef = doc(db, 'chats', chatId);
  try {
    const chatDoc = await getDoc(chatRef);
    if (!chatDoc.exists()) {
      const isDirect = chatId.startsWith('direct-');
      let participants: string[] = [];

      if (isDirect) {
        const parts = chatId.split('-');
        if (parts.length === 3) {
          participants = [parts[1], parts[2]];
        } else if (targetUserId) {
          participants = [currentUserId, targetUserId];
        }
      } else if (caseId) {
        try {
          const caseSnap = await getDoc(doc(db, 'cases', caseId));
          if (caseSnap.exists()) {
            const cData = caseSnap.data();
            participants = [cData.clientId, cData.assignedLawyerId].filter(Boolean);
          }
        } catch (e) {}
      }

      // Security rule requirement: participants must have size 2, both differ, and include current user
      if (
        participants.length === 2 && 
        participants[0] !== participants[1] && 
        participants.includes(currentUserId)
      ) {
        await setDoc(chatRef, {
          participants,
          caseId: isDirect ? null : (caseId || null),
          lastMessage: '',
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          unreadCount: {}
        });
      }
    }
  } catch (error) {
    console.warn('[chatService] ensureChatThread note:', error);
  }
};

export const subscribeToInboxChats = (
  userId: string, 
  callback: (chats: ChatThread[]) => void
): Unsubscribe => {
  const chatsRef = collection(db, 'chats');
  const q = query(chatsRef, where('participants', 'array-contains', userId));

  return onSnapshot(
    q, 
    (snapshot) => {
      const results: ChatThread[] = [];
      snapshot.forEach(d => {
        results.push({ id: d.id, ...d.data() } as ChatThread);
      });

      results.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.updatedAt || 0);
        const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.updatedAt || 0);
        return timeB - timeA;
      });

      callback(results);
    },
    (error) => {
      console.warn('[chatService] subscribeToInboxChats failed:', error);
      callback([]);
    }
  );
};

export const listenToMessages = (
  chatId: string,
  callback: (messages: ChatMessage[]) => void,
  limitCount: number = 60
): Unsubscribe => {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(limitCount));

  return onSnapshot(
    q, 
    (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach(d => {
        const data = d.data();
        msgs.push({
          id: d.id,
          chatId,
          senderId: data.senderId,
          text: data.text,
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now())
        });
      });
      callback(msgs);
    },
    (error) => {
      console.warn('[chatService] listenToMessages failed:', error);
      callback([]);
    }
  );
};

export const sendMessage = async (chatId: string, senderId: string, text: string) => {
  if (!text.trim()) return;

  const isDirect = chatId.startsWith('direct-');
  const parts = chatId.split('-');
  let defaultParticipants = isDirect && parts.length === 3 ? [parts[1], parts[2]] : [senderId];
  let recipientId = isDirect && parts.length === 3 ? parts.find(p => p !== senderId && p !== 'direct') : null;

  if (!isDirect) {
    try {
      const caseSnap = await getDoc(doc(db, 'cases', chatId));
      if (caseSnap.exists()) {
        const cData = caseSnap.data();
        const caseParticipants = [cData.clientId, cData.assignedLawyerId].filter(Boolean);
        if (caseParticipants.length > 0) {
          defaultParticipants = Array.from(new Set([...defaultParticipants, ...caseParticipants]));
          recipientId = defaultParticipants.find(p => p !== senderId) || null;
        }
      }
    } catch (err) {
      console.warn('Could not load case for chat thread creation:', err);
    }
  }

  const chatRef = doc(db, 'chats', chatId);
  const chatDoc = await getDoc(chatRef);

  // 1. FIRST ensure parent chat document exists with participants to satisfy Firestore rules
  if (!chatDoc.exists()) {
    await setDoc(chatRef, {
      participants: defaultParticipants,
      lastMessage: text.trim(),
      caseId: isDirect ? null : chatId,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      unreadCount: recipientId ? { [recipientId]: 1 } : {}
    });
  } else {
    const updatePayload: any = {
      lastMessage: text.trim(),
      updatedAt: serverTimestamp(),
      participants: defaultParticipants
    };
    if (recipientId) {
      updatePayload[`unreadCount.${recipientId}`] = increment(1);
    }
    await setDoc(chatRef, updatePayload, { merge: true });
  }

  // 2. SECOND add message document to subcollection
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  await addDoc(messagesRef, {
    chatId,
    senderId,
    text: text.trim(),
    createdAt: serverTimestamp(),
  });
};

export const markChatAsRead = async (chatId: string, userId: string) => {
  if (!chatId || !userId) return;
  try {
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);
    if (chatDoc.exists()) {
      await updateDoc(chatRef, {
        [`unreadCount.${userId}`]: 0
      });
    }
  } catch (e) {
    console.warn('[chatService] markChatAsRead note:', e);
  }
};

export const chatService = {
  subscribeToInboxChats,
  listenToMessages,
  sendMessage,
  markChatAsRead,
  getUserProfile,
  getCaseDetails,
  ensureChatThread,
};
