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

import { Colors } from '../../../utils/Colors';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

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
    const unsubscribe = listenToMessages(chatId, (msgs, fromCache) => {
      setMessages(msgs);
      if (!fromCache || msgs.length > 0) {
        setIsLoading(false);
      }
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
        <View style={styles.skeletonContainer}>
           <View style={[styles.skeletonBubble, { alignSelf: 'flex-start', width: '60%' }]} />
           <View style={[styles.skeletonBubble, { alignSelf: 'flex-end', width: '40%' }]} />
           <View style={[styles.skeletonBubble, { alignSelf: 'flex-start', width: '70%' }]} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item.id || index.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Input Row */}
      <View style={styles.inputArea}>
        <View style={styles.inputWrapper}>
          <Input 
            style={styles.textInput}
            placeholder="Write a message..."
            value={newMessage}
            onChangeText={setNewMessage}
            onSubmitEditing={handleSend}
          />
        </View>
        <TouchableOpacity 
          style={[styles.sendBtn, (!newMessage.trim() || isSending) && styles.sendBtnDisabled]} 
          onPress={handleSend}
          disabled={!newMessage.trim() || isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Ionicons name="send" size={20} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  skeletonContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-end',
  },
  skeletonBubble: {
    height: 40,
    backgroundColor: '#E0E0E0',
    borderRadius: 20,
    marginBottom: 16,
    opacity: 0.5
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
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center'
  },
  inputWrapper: {
    flex: 1,
    marginRight: 10,
    justifyContent: 'center'
  },
  textInput: {
    marginBottom: 0, // reset Input.tsx default margin
    borderWidth: 0,
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 45
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendBtnDisabled: {
    opacity: 0.5,
    elevation: 0,
    shadowOpacity: 0,
  }
});
