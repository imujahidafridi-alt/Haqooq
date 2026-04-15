import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
    await updateDoc(chatRef, {
      lastMessage: text,
      updatedAt: serverTimestamp()
    });

  } catch (error) {
    console.error("Failed to send message:", error);
    throw error;
  }
};

/**
 * Returns an unsubscribe listener function for frontend components 
 * to handle real-time changes instantly.
 */
export const listenToMessages = (
  chatId: string, 
  callback: (messages: ChatMessage[]) => void
) => {
  const q = query(
    collection(db, `chats/${chatId}/messages`),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const msgs: ChatMessage[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      msgs.push({ 
        id: doc.id, 
        ...data,
        // Fallback to local time if server timestamp is still pending
        createdAt: data.createdAt ? (data.createdAt.toMillis ? data.createdAt.toMillis() : data.createdAt) : Date.now()
      } as ChatMessage);
    });
    callback(msgs);
  }, (error) => {
    console.warn("Realtime listen detached or failed:", error);
    callback([]);
  });
};
