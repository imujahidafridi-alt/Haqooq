import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { Colors } from '../../../utils/Colors';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getInboxChats, subscribeToInboxChats, markChatAsRead, getUserProfile, getCaseDetails } from '../services/chatService';
import { useAuthStore } from '../../../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { ChatThread } from '../../../types/models';
import { formatChatTimestamp } from '../../../utils/dateFormatter';

const ChatListItem = ({ item, currentUser, navigation }: { item: ChatThread, currentUser: any, navigation: any }) => {
  let partnerId = item.participants?.find((p) => p !== currentUser?.id);
  const isDirect = item.id.startsWith('direct-');
  
  const { data: partnerProfile } = useQuery({
    queryKey: ['userProfile', partnerId],
    queryFn: () => getUserProfile(partnerId!),
    enabled: !!partnerId,
    staleTime: 1000 * 60 * 60, // cache for an hour
  });

  const { data: caseDetails } = useQuery({
    queryKey: ['caseDetails', item.caseId || item.id],
    queryFn: () => getCaseDetails(item.caseId || item.id),
    enabled: !isDirect && !!(item.caseId || item.id),
    staleTime: 1000 * 60 * 60,
  });

  let title = 'Case Chat';
  let badgeText = '';

  if (isDirect && partnerProfile) {
    title = partnerProfile.displayName || `Direct Message`;
    badgeText = 'Direct';
  } else if (isDirect) {
    title = `Direct Message`;
    badgeText = 'Direct';
  } else if (caseDetails) {
    title = caseDetails.title || 'Case Chat';
    // If it's a case chat, show the other participant's name if we have it, else show "Case"
    badgeText = partnerProfile?.displayName ? partnerProfile.displayName.split(' ')[0] : 'Case';
  }

  let subtitle = item.lastMessage || 'No messages yet...';
  const unreadCount = currentUser?.id && item.unreadCount ? item.unreadCount[currentUser.id] : 0;
  const unread = Boolean(unreadCount && unreadCount > 0);

  return (
    <TouchableOpacity
      style={styles.chatCard}
      activeOpacity={0.7}
      onPress={() => {
        if (unread && currentUser?.id) {
          markChatAsRead(item.id, currentUser.id);
        }
        navigation.navigate('SharedChat', { 
            screen: 'ChatRoom', 
            params: { chatId: item.id, chatTitle: title } 
        });
      }}
    >
      <View style={[styles.avatar, isDirect ? styles.avatarDirect : styles.avatarCase, unread && styles.avatarUnread]}>
        <Ionicons name={isDirect ? "person" : "briefcase"} size={24} color="#FFFFFF" />
      </View>
      
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={[styles.chatTitle, unread && styles.textUnread]} numberOfLines={1}>
            {title}
          </Text>
          {item.updatedAt && (
              <Text style={[styles.timestamp, unread && styles.timestampUnread]}>
              {formatChatTimestamp(item.updatedAt)}
              </Text>
          )}
        </View>
        
        <View style={styles.messagePreviewContainer}>
          {badgeText ? (
            <View style={[styles.typeBadge, isDirect ? styles.typeBadgeDirect : styles.typeBadgeCase]}>
              <Text style={styles.typeBadgeText}>{badgeText}</Text>
            </View>
          ) : null}
          <Text 
            style={[styles.messagePreview, unread && styles.textUnread]} 
            numberOfLines={1}>
            {subtitle}
          </Text>
          {unread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const InboxScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Initial Fetch & Cache setup
  const { data: chats, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['inbox', user?.id],
    queryFn: () => getInboxChats(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes cache before full refetch
  });

  // Enterprise Real-time updates subscription
  useEffect(() => {
    if (!user?.id) return;
    
    // Subscribe directly to Firestore to feed Live updates to the screen
    const unsubscribe = subscribeToInboxChats(user.id, (freshChats) => {
      // Update TanStack query cache directly for a seamless experience
      queryClient.setQueryData(['inbox', user.id], freshChats);
    });

    return () => unsubscribe();
  }, [user?.id, queryClient]);

  const renderItem = ({ item }: { item: ChatThread }) => {
    return <ChatListItem item={item} currentUser={user} navigation={navigation} />;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onRefresh={refetch}
        refreshing={isRefetching}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color={Colors.textSecondary} />
            <Text style={styles.emptyTitle}>No Messages Yet</Text>
            <Text style={styles.emptySubtitle}>
              When you start chatting with a lawyer or client, your conversations will appear here instantly.
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarCase: {
    backgroundColor: Colors.secondary,
  },
  avatarDirect: {
    backgroundColor: Colors.primary,
  },
  avatarUnread: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  chatTitle: {
    flex: 1,
    marginRight: 8,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  textUnread: {
    fontWeight: '800',
    color: Colors.text,
  },
  timestamp: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  timestampUnread: {
    color: Colors.primary,
    fontWeight: '700',
  },
  messagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  typeBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  typeBadgeDirect: {
    backgroundColor: '#E0E7FF', // Light primary tint
  },
  typeBadgeCase: {
    backgroundColor: '#FEF3C7', // Light secondary tint
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  messagePreview: {
    color: Colors.textSecondary,
    fontSize: 14,
    flex: 1,
    paddingRight: 8,
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 64,
  },
  emptyTitle: {
    marginTop: 20,
    marginBottom: 12,
    color: Colors.primary,
    fontSize: 22,
    fontWeight: 'bold',
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
});
