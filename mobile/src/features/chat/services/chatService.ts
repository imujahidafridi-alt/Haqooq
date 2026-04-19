import { collection, addDoc, query, orderBy, onSnapshot, doc, setDoc, updateDoc, serverTimestamp, limit, startAfter, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';

export interface ChatMessage {
  id?: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: number | any; // allow any for serverTimestamp
}

/**
 * Sends a message and updates the parent ChatThread document with the last message 
 * to easily preview in a list view without fetching all messages.
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

    // Update parent document's read preview
    const chatRef = doc(db, 'chats', chatId);
    await setDoc(chatRef, {
      lastMessage: text,
      updatedAt: serverTimestamp(),
      participants: [senderId] // ensure participants exist partially (will append nicely if we set more robust setDoc later, or rely on initialization)
    }, { merge: true });

  } catch (error) {
    console.error("Failed to send message:", error);
    throw error;
  }
};

/**
 * Returns an unsubscribe listener function for frontend components 
 * with pagination support (Enterprise Standard).
 */
export const listenToMessages = (
  chatId: string, 
  callback: (messages: ChatMessage[], fromCache: boolean, lastVisible: QueryDocumentSnapshot | null) => void,
  messageLimit: number = 50,
  startAfterDoc?: QueryDocumentSnapshot | null
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
      startAfter(startAfterDoc),
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
