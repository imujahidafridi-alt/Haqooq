import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';

export interface ChatMessage {
  id?: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: number;
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
      createdAt: Date.now()
    };

    // Add to subcollection
    const messagesRef = collection(db, `chats/${chatId}/messages`);
    await addDoc(messagesRef, msgData);

    // Update parent document's read preview
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      lastMessage: text,
      updatedAt: Date.now()
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
      msgs.push({ id: doc.id, ...doc.data() } as ChatMessage);
    });
    callback(msgs);
  }, (error) => {
    console.warn("Realtime listen detached or failed (likely off-brand dummy data):", error);
    // Dev mock
    callback([]);
  });
};
