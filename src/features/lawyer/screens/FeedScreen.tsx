import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, FlatList, ActivityIndicator, Modal, Alert } from 'react-native';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { getOpenCases, submitProposal } from '../services/marketplaceService';
import { LegalCase } from '../../../types/models';
import { useAuthStore } from '../../../store/authStore';

export const FeedScreen = () => {
  const { user } = useAuthStore();
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [loading, setLoading] = useState(true);

  // Bidding Modal State
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedCase, setSelectedCase] = useState<LegalCase | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCases = async () => {
    setLoading(true);
    const data = await getOpenCases();
    setCases(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const openBidModal = (caseItem: LegalCase) => {
    setSelectedCase(caseItem);
    setBidAmount(caseItem.budget ? caseItem.budget.toString() : '');
    setMessage('');
    setModalVisible(true);
  };

  const closeBidModal = () => {
    setModalVisible(false);
    setSelectedCase(null);
  };

  const handleBidSubmit = async () => {
    if (!bidAmount || !message) {
      Alert.alert('Missing Info', 'Please provide a proposed fee and a message for the client.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitProposal(
        selectedCase!.id,
        user!.id,
        parseFloat(bidAmount),
        message
      );
      Alert.alert('Success', 'Your proposal has been successfully submitted to the client.');
      closeBidModal();
      
      // Optionally remove the case from the feed as we already bid on it
      setCases((prev) => prev.filter(c => c.id !== selectedCase!.id));
      
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCase = ({ item }: { item: LegalCase }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.categoryBadge}>{item.category}</Text>
      </View>
      <Text style={styles.description} numberOfLines={3}>{item.description}</Text>
      
      <View style={styles.footerRow}>
        <Text style={styles.budget}>
          Budget: {item.budget ? `Rs. ${item.budget}` : 'Negotiable'}
        </Text>
        <Button 
          title="Submit Bid" 
          onPress={() => openBidModal(item)}
          style={styles.bidButton}
          textStyle={styles.bidButtonText}
        />
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#5856D6" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={cases}
          keyExtractor={(item) => item.id}
          renderItem={renderCase}
          refreshing={loading}
          onRefresh={fetchCases}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No open cases found in the marketplace.</Text>
          }
        />
      )}

      {/* Proposal Submission Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Submit Proposal</Text>
            <Text style={styles.modalSub}>For: {selectedCase?.title}</Text>

            <Input
              label="Proposed Fee (Rs.)"
              placeholder="e.g. 50000"
              keyboardType="numeric"
              value={bidAmount}
              onChangeText={setBidAmount}
            />

            <Input
              label="Message to Client"
              placeholder="Explain why you are the best fit for this case..."
              multiline
              numberOfLines={4}
              style={{ height: 100, textAlignVertical: 'top' }}
              value={message}
              onChangeText={setMessage}
            />

            <View style={styles.modalActions}>
              <Button 
                title="Cancel" 
                variant="outline" 
                onPress={closeBidModal}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button 
                title="Send Bid" 
                variant="primary" 
                onPress={handleBidSubmit}
                isLoading={isSubmitting}
                style={{ flex: 1, marginLeft: 8, backgroundColor: '#5856D6' }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F5f5f5',
  },
  card: {
    marginBottom: 16,
    padding: 16
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
    color: '#333'
  },
  categoryBadge: {
    backgroundColor: '#E8EAF6',
    color: '#3F51B5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden'
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingTop: 12
  },
  budget: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32'
  },
  bidButton: {
    backgroundColor: '#5856D6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginVertical: 0
  },
  bidButtonText: {
    fontSize: 14
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 40,
    fontSize: 16
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#FFF',
    padding: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4
  },
  modalSub: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 16
  }
});
