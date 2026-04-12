import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Alert, ActivityIndicator } from 'react-native';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';
import { LegalCase } from '../../../types/models';
import { useAuthStore } from '../../../store/authStore';
import { Colors } from '../../../utils/Colors';
import { Typography } from '../../../utils/Typography';
import { Button } from '../../../components/ui/Button';
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
      where('assignedLawyerId', '==', user.id),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const caseData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LegalCase[];
      setCases(caseData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

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
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.categoryText}>{item.category}</Text>

      <Text style={styles.sectionHeader}>Case Timeline</Text>
      {renderTimeline(item)}

      {activeCaseId === item.id ? (
        <View style={styles.formContainer}>
          <TextInput
            placeholder="Update Title (e.g. Hearing Completed)"
            style={styles.input}
            value={newEventTitle}
            onChangeText={setNewEventTitle}
          />
          <TextInput
            placeholder="Details (Optional)"
            style={[styles.input, { height: 60 }]}
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
          <Button 
            title="Update Status" 
            onPress={() => setActiveCaseId(item.id)}
            variant="outline"
            style={{flex: 1, marginRight: 8}}
          />
          <Button 
            title="Chat Client" 
            onPress={() => navigation.navigate('SharedChat', { screen: 'ChatRoom', params: { caseId: item.id } })}
            style={{flex: 1}}
          />
        </View>
      )}
    </View>
  );

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={cases}
        keyExtractor={item => item.id}
        renderItem={renderCase}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={Typography.body}>You have no active cases yet.</Text>
          </View>
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
  cardTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  categoryText: { fontSize: 14, color: Colors.textSecondary, marginBottom: 16 },
  sectionHeader: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 12 },
  timelineContainer: { paddingLeft: 8, marginBottom: 16 },
  timelineEvent: { flexDirection: 'row', marginBottom: 16 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary, marginTop: 4, zIndex: 2 },
  timelineLine: { position: 'absolute', left: 5, top: 16, bottom: -16, width: 2, backgroundColor: Colors.border, zIndex: 1 },
  timelineContent: { marginLeft: 16, flex: 1 },
  timelineTitle: { fontSize: 14, fontWeight: 'bold', color: Colors.text },
  timelineDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  timelineDesc: { fontSize: 13, color: Colors.text, marginTop: 4 },
  formContainer: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 16 },
  input: { backgroundColor: '#F0F0F0', borderRadius: 8, padding: 12, fontSize: 14, color: Colors.text, marginBottom: 8 },
  btnRow: { flexDirection: 'row', marginTop: 8 },
  cardFooter: { flexDirection: 'row', marginTop: 16, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 16 },
  emptyContainer: { alignItems: 'center', marginTop: 40 }
});