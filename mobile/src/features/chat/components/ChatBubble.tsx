import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../../utils/Colors';

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
      <Text style={[styles.time, isSelf ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}>
        {timeString}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    maxWidth: '80%',
  },
  selfContainer: {
    alignSelf: 'flex-end',
  },
  otherContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selfBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  selfText: {
    color: '#FFF',
  },
  otherText: {
    color: Colors.text,
  },
  time: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  }
});
