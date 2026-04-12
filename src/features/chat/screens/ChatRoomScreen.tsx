import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator
} from 'react-native';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { ChatBubble } from '../components/ChatBubble';
import { listenToMessages, sendMessage, ChatMessage } from '../services/chatService';
import { useAuthStore } from '../../../store/authStore';

export const ChatRoomScreen = ({ route, navigation }: any) => {
  // `chatId` and `chatTitle` passed dynamically via navigation params based on the active case
  const { chatId = 'mock-chat-123', chatTitle = 'Active Case Chat' } = route?.params || {};
  const { user } = useAuthStore();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Dynamically set navigation header
    navigation.setOptions({ title: chatTitle });

    // Attach native Firestore listener.
    const unsubscribe = listenToMessages(chatId, (msgs) => {
      setMessages(msgs);
      setIsLoading(false);
      // Give UI brief moment to render then scroll to bottom
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
    });

    // Cleanup memory when component unmounts
    return () => unsubscribe();
  }, [chatId]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;

    setIsSending(true);
    try {
      await sendMessage(chatId, user.id, newMessage.trim());
      setNewMessage('');
    } catch (e) {
      console.warn("Message dropped.");
    } finally {
      setIsSending(false);
    }
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isSelf = item.senderId === user?.id; // If not user, it belongs to the other party
    return (
      <ChatBubble 
        text={item.text} 
        isSelf={isSelf} 
        timestamp={item.createdAt} 
      />
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {isLoading ? (
        <View style={styles.centerLoad}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item.id || index.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Input Row */}
      <View style={styles.inputArea}>
        <Input 
          style={styles.textInput}
          placeholder="Type a message..."
          value={newMessage}
          onChangeText={setNewMessage}
          onSubmitEditing={handleSend}
        />
        <Button 
          title="Send" 
          onPress={handleSend} 
          isLoading={isSending} 
          style={styles.sendBtn}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5f5f5',
  },
  centerLoad: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center'
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
    justifyContent: 'flex-end', // Pushes fewer messages to bottom naturally
  },
  inputArea: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderColor: '#EEE',
    alignItems: 'center'
  },
  textInput: {
    flex: 1,
    marginBottom: 0, // reset Input.tsx default margin
    marginRight: 8,
  },
  sendBtn: {
    marginBottom: 0,
    marginTop: 0,
  }
});
