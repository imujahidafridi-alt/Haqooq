import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ChatBubbleProps {
  text: string;
  isSelf: boolean;
  timestamp: number;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ text, isSelf, timestamp }) => {
  const timeString = new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <View style={[
      styles.container, 
      isSelf ? styles.selfContainer : styles.otherContainer
    ]}>
      <View style={[
        styles.bubble, 
        isSelf ? styles.selfBubble : styles.otherBubble
      ]}>
        <Text style={[
          styles.text, 
          isSelf ? styles.selfText : styles.otherText
        ]}>
          {text}
        </Text>
      </View>
      <Text style={styles.time}>{timeString}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  selfContainer: {
    alignSelf: 'flex-end',
  },
  otherContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    padding: 12,
    borderRadius: 16,
  },
  selfBubble: {
    backgroundColor: '#007AFF', // Standard iOS Blue
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#E5E5EA', // Standard iOS Grey
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  selfText: {
    color: '#FFF',
  },
  otherText: {
    color: '#000',
  },
  time: {
    fontSize: 10,
    color: '#8e8e93',
    marginTop: 4,
    alignSelf: 'flex-end',
  }
});
