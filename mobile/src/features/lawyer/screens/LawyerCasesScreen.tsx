import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Alert, ActivityIndicator } from 'react-native';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';
import { closeCase } from '../../client/services/caseService';
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

export const LawyerCasesScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuthStore();
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'cases'),
      where('assignedLawyerId', '==', user.id)
    );

      const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, async (snapshot) => {
        const caseData = snapshot.docs.map(docId => ({
          id: docId.id,
          ...docId.data()
        })) as LegalCase[];

        const hydratedCases = await Promise.all(
          caseData.map(async (c) => {
            if (!c.clientName || c.clientName === 'Unknown Client' || c.clientName === 'Anonymous Client') {
              try {
                const userDoc = await getDoc(doc(db, 'users', c.clientId));
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  c.clientName = userData.displayName || userData.name || userData.email || 'Anonymous Person';
                }
              } catch (e) {}
            }
            return c;
          })
        );
        
        setCases(hydratedCases);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCloseCase = (caseId: string) => {
    Alert.alert(
      "Resolve Case",
      "Are you sure you want to mark this case as resolved? This removes it from your active queue.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Resolve Case", 
          style: "destructive",
          onPress: async () => {
            try {
              await closeCase(caseId, 'Lawyer');
              Alert.alert('Success', 'Case has been marked as resolved.');
            } catch (e) {
              Alert.alert('Error', 'Unable to resolve the case right now.');
            }
          }
        }
      ]
    );
  };

  const pushTimelineUpdate = async (caseId: string) => {
    if (!newEventTitle.trim()) {
      Alert.alert('Error', 'Update title is required.');
      return;
    }

    try {
      const newEvent = {
        id: Date.now().toString(),
        title: newEventTitle,
        description: newEventDesc,
        date: Date.now()
      };

      const caseRef = doc(db, 'cases', caseId);
      await updateDoc(caseRef, {
        timeline: arrayUnion(newEvent)
      });
      
      // Mock Push Notification logic here according to SRS
      console.log(`[PUSH NOTIFICATION] Client notified: Case timeline updated with event "${newEvent.title}"`);
      
      setNewEventTitle('');
      setNewEventDesc('');
      setActiveCaseId(null);
      Alert.alert('Success', 'Timeline updated successfully and client notified.');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not push update.');
    }
  };

  const renderTimeline = (c: LegalCase) => (
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

  const renderCase = ({ item }: { item: LegalCase }) => (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        {item.status === 'closed' && (
          <Text style={{ color: Colors.error, fontWeight: 'bold' }}>RESOLVED</Text>
        )}
      </View>
      <Text style={styles.categoryText}>{item.category}</Text>

        <Text style={styles.clientName}>Client: {item.clientName || 'Anonymous Client'}</Text>
  
      <Text style={styles.sectionHeader}>Case Timeline</Text>
      {renderTimeline(item)}

      {item.status === 'active' ? (
        activeCaseId === item.id ? (
          <View style={styles.formContainer}>
            <TextInput
              placeholder="Update Title (e.g. Hearing Completed)"
              placeholderTextColor="#94A3B8"
              style={[styles.input, { color: Colors.text }]}
              value={newEventTitle}
              onChangeText={setNewEventTitle}
            />
            <TextInput
              placeholder="Details (Optional)"
              placeholderTextColor="#94A3B8"
              style={[styles.input, { height: 60, color: Colors.text }]}
              multiline
              value={newEventDesc}
              onChangeText={setNewEventDesc}
            />
            <View style={styles.btnRow}>
               <Button title="Cancel" variant="outline" onPress={() => setActiveCaseId(null)} style={{flex: 1, marginRight: 8}}/>
               <Button title="Push Update" onPress={() => pushTimelineUpdate(item.id)} style={{flex: 1}}/>
            </View>
          </View>
        ) : (
          <View style={styles.cardFooter}>
            <View style={{ flexDirection: 'row', width: '100%', alignItems: 'center' }}>
              <Button 
                title="Update Status" 
                icon="time-outline"
                onPress={() => setActiveCaseId(item.id)}
                variant="outline"
                style={{ flex: 1, marginRight: 8, height: 48, paddingHorizontal: 12 }}
              />
              <Button 
                icon="chatbubble-ellipses-outline" 
                onPress={() => navigation.navigate('SharedChat', { screen: 'ChatRoom', params: { caseId: item.id } })}
                style={{ width: 48, minWidth: 48, height: 48, paddingHorizontal: 0, marginRight: 8, flexShrink: 0 }}
              />
              <Button 
                icon="checkmark-circle-outline" 
                onPress={() => handleCloseCase(item.id)}
                style={{ width: 48, minWidth: 48, height: 48, paddingHorizontal: 0, backgroundColor: Colors.error, borderColor: Colors.error, flexShrink: 0 }}
              />
            </View>
          </View>
        )
      ) : null}
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
              <Text style={Typography.body}>You have no active cases yet.</Text>
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
  cardTitle: { fontSize: 18, fontWeight: '700', color: Colors.primary, marginBottom: 4 },
  categoryText: { fontSize: 14, color: Colors.secondary, fontWeight: '600', marginBottom: 8 },
  clientName: { fontSize: 13, color: Colors.primary, fontStyle: 'italic', marginBottom: 8, opacity: 0.8 },
  caseDescription: { fontSize: 14, color: Colors.textSecondary, marginBottom: 16, lineHeight: 20 },
  sectionHeader: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 12 },
  timelineContainer: { paddingLeft: 8, marginBottom: 16 },
  timelineEvent: { flexDirection: 'row', marginBottom: 16 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.secondary, marginTop: 4, zIndex: 2 },
  timelineLine: { position: 'absolute', left: 5, top: 16, bottom: -16, width: 2, backgroundColor: Colors.border, zIndex: 1 },
  timelineContent: { marginLeft: 16, flex: 1 },
  timelineTitle: { fontSize: 14, fontWeight: 'bold', color: Colors.text },
  timelineDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  timelineDesc: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  formContainer: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 16 },
  input: { backgroundColor: Colors.background, borderRadius: 8, padding: 12, fontSize: 14, color: Colors.text, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  btnRow: { flexDirection: 'row', marginTop: 8 },
  cardFooter: { flexDirection: 'row', marginTop: 16, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 16 },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  skeletonContainer: { flex: 1, padding: 16 }
});
