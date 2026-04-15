import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';
import { LegalCase } from '../../../types/models';
import { useAuthStore } from '../../../store/authStore';
import { Colors } from '../../../utils/Colors';
import { Typography } from '../../../utils/Typography';
import { Button } from '../../../components/ui/Button';
import { SkeletonCard } from '../../../components/ui/SkeletonCard';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface Props {
  navigation: any;
}

export const ActiveCasesScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuthStore();
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'cases'),
      where('clientId', '==', user.id)
    );

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const caseData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LegalCase[];
      
      // Sort by creation date descending
      caseData.sort((a, b) => b.createdAt - a.createdAt);
      setCases(caseData);
      
      // Stop the skeleton loader if we have ANY data, or if the server confirms it is completely empty
      if (caseData.length > 0 || !snapshot.metadata.fromCache) {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const renderTimeline = (c: LegalCase) => {
    return (
      <View style={styles.timelineContainer}>
        {c.timeline.map((event, index) => (
          <View key={event.id} style={styles.timelineEvent}>
            <View style={styles.timelineDot} />
            {index !== c.timeline.length - 1 && <View style={styles.timelineLine} />}
            <View style={styles.timelineContent}>
               <Text style={styles.timelineTitle}>{event.title}</Text>
               <Text style={styles.timelineDate}>{new Date(event.date).toLocaleDateString()}</Text>
               {event.description && <Text style={styles.timelineDesc}>{event.description}</Text>}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderCase = ({ item }: { item: LegalCase }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <View style={[styles.statusBadge, item.status === 'active' ? styles.statusActive : styles.statusOpen]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.categoryText}>{item.category}</Text>

      <Text style={styles.sectionHeader}>Case Timeline</Text>
      {renderTimeline(item)}

      {item.status === 'open' && (
        <View style={styles.cardFooter}>
          <Button 
            title="View Proposals" 
            onPress={() => navigation.navigate('Proposals', { caseId: item.id })}
            variant="primary"
          />
        </View>
      )}

      {item.status === 'active' && item.assignedLawyerId && (
        <View style={styles.cardFooter}>
          <Button 
            title="Chat with Lawyer" 
            onPress={() => navigation.navigate('SharedChat', { screen: 'ChatRoom', params: { caseId: item.id } })}
            variant="outline"
          />
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={cases}
        keyExtractor={item => item.id}
        renderItem={renderCase}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={Typography.body}>You have no active or completed cases yet.</Text>
              <Button title="Post a New Case" onPress={() => navigation.navigate('Home')} style={{marginTop: 16}}/>
            </View>
          ) : (
            <View style={styles.skeletonContainer}>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </View>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 16 },
  card: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusOpen: { backgroundColor: '#E0F2F1' },
  statusActive: { backgroundColor: '#E3F2FD' },
  statusText: { fontSize: 10, fontWeight: 'bold', color: Colors.primary },
  categoryText: { fontSize: 14, color: Colors.textSecondary, marginBottom: 16 },
  sectionHeader: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 12 },
  timelineContainer: { paddingLeft: 8 },
  timelineEvent: { flexDirection: 'row', marginBottom: 16 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary, marginTop: 4, zIndex: 2 },
  timelineLine: { position: 'absolute', left: 5, top: 16, bottom: -16, width: 2, backgroundColor: Colors.border, zIndex: 1 },
  timelineContent: { marginLeft: 16, flex: 1 },
  timelineTitle: { fontSize: 14, fontWeight: 'bold', color: Colors.text },
  timelineDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  timelineDesc: { fontSize: 13, color: Colors.text, marginTop: 4 },
  cardFooter: { marginTop: 16, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 16 },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  skeletonContainer: { flex: 1, padding: 16 }
});