import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { getProposalsForCase, acceptProposal } from '../services/caseService';
import { CaseProposal, LawyerProfile } from '../../../types/models';
import { Colors } from '../../../utils/Colors';
import { Typography } from '../../../utils/Typography';
import { Button } from '../../../components/ui/Button';
import { SkeletonCard } from '../../../components/ui/SkeletonCard';
import { useAuthStore } from '../../../store/authStore';
import { db } from '../../../services/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

interface Props {
  route: any;
  navigation: any;
}

export const ProposalsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { caseId } = route.params;
  const { user } = useAuthStore();
  const [proposals, setProposals] = useState<{ proposal: CaseProposal, lawyer: LawyerProfile | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    try {
      const props = await getProposalsForCase(caseId);
      
      const enrichedProps = await Promise.all(
        props.map(async (p) => {
          const lawyerDoc = await getDoc(doc(db, 'users', p.lawyerId));
          return { proposal: p, lawyer: lawyerDoc.exists() ? (lawyerDoc.data() as LawyerProfile) : null };
        })
      );
      
      setProposals(enrichedProps.filter(p => p.proposal.status === 'pending'));
    } catch (e) {
      Alert.alert("Error", "Could not fetch proposals.");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (proposal: CaseProposal) => {
    if (!user) return;
    setAcceptingId(proposal.id);
    try {
      await acceptProposal(proposal.id, caseId, proposal.lawyerId, user.id);
      Alert.alert("Success", "Proposal accepted! You can now chat with the lawyer.");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", "Failed to accept proposal.");
      setAcceptingId(null);
    }
  };

  const renderItem = ({ item }: { item: { proposal: CaseProposal, lawyer: LawyerProfile | null } }) => (
    <View style={styles.card}>
      <Text style={styles.lawyerName}>{item.lawyer?.displayName || 'Unknown Lawyer'}</Text>
      <Text style={styles.specialization}>{item.lawyer?.specialization?.join(', ') || 'General'}</Text>
      
      <View style={styles.bidDetails}>
        <Text style={styles.bidAmount}>Bid: ${item.proposal.bidAmount}</Text>
        <Text style={styles.rating}>⭐ {item.lawyer?.rating?.toFixed(1) || 'New'}</Text>
      </View>
      
      <Text style={styles.message}>{item.proposal.message}</Text>
      
      <Button 
        title={acceptingId === item.proposal.id ? "Accepting..." : "Accept Proposal"} 
        onPress={() => handleAccept(item.proposal)}
        disabled={acceptingId !== null}
        style={{ marginTop: 12 }}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={proposals}
        keyExtractor={item => item.proposal.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={Typography.body}>No pending proposals yet for this case.</Text>
            </View>
          ) : (
            <View style={styles.skeletonContainer}>
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
  list: { padding: 16 },
  card: { padding: 16, backgroundColor: Colors.surface, borderRadius: 12, marginBottom: 12 },
  lawyerName: { fontSize: 18, fontWeight: 'bold' },
  specialization: { fontSize: 14, color: Colors.textSecondary, marginBottom: 8 },
  bidDetails: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  bidAmount: { fontSize: 16, fontWeight: '600', color: Colors.primary },
  rating: { fontSize: 16, fontWeight: 'bold' },
  message: { fontSize: 14, color: Colors.text, fontStyle: 'italic' },
  empty: { marginTop: 40, alignItems: 'center' },
  skeletonContainer: { flex: 1, padding: 16 }
});