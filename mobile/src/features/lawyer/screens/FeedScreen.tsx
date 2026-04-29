import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, FlatList, ActivityIndicator, Modal, Alert, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Avatar } from '../../../components/ui/Avatar';
import { formatCurrency } from '../../../utils/currencyFormatter';
import { getOpenCases, submitProposal, getLawyerBiddedCaseIds, reportCase } from '../services/marketplaceService';
import { LegalCase } from '../../../types/models';
import { useAuthStore } from '../../../store/authStore';
import { Colors } from '../../../utils/Colors';
import { useNavigation } from '@react-navigation/native';

export const FeedScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [biddedCaseIds, setBiddedCaseIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedCase, setSelectedCase] = useState<LegalCase | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isReportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [caseToReport, setCaseToReport] = useState<LegalCase | null>(null);

  const fetchCases = async () => {
    setLoading(true);
    const [data, bids] = await Promise.all([
      getOpenCases(),
      user ? getLawyerBiddedCaseIds(user.id) : Promise.resolve([])
    ]);
    setCases(data);
    setBiddedCaseIds(new Set(bids));
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
      await submitProposal(selectedCase!.id, user!.id, parseFloat(bidAmount), message);
      Alert.alert('Success', 'Your proposal has been successfully submitted to the client.');
      closeBidModal();
      setBiddedCaseIds(prev => new Set(prev).add(selectedCase!.id));
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReportCase = async () => {
    if (!reportReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for reporting.');
      return;
    }
    if (!caseToReport || !user) return;
    
    setIsSubmitting(true);
    try {
      await reportCase(caseToReport.id, user.id, reportReason);
      Alert.alert('Success', 'Case reported. Our team will review it.');
      setReportModalVisible(false);
      setCaseToReport(null);
      setReportReason('');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCase = ({ item }: { item: LegalCase }) => {
    const hasBid = biddedCaseIds.has(item.id);
    const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.title}>{item.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.categoryBadge}>{item.category}</Text>
            <TouchableOpacity onPress={() => { setCaseToReport(item); setReportModalVisible(true); }} style={{ marginLeft: 8, padding: 4 }}>
              <Ionicons name="warning-outline" size={20} color={Colors.error} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <TouchableOpacity onPress={() => navigation.navigate('SharedChat', { screen: 'PublicProfile', params: { userId: item.clientId } })}>
            <Avatar seed={item.clientId} size={30} style={{ marginRight: 8 }} />
          </TouchableOpacity>
          <View>
            <TouchableOpacity onPress={() => navigation.navigate('SharedChat', { screen: 'PublicProfile', params: { userId: item.clientId } })}>
              <Text style={styles.clientName}>Posted by: {item.clientName || 'Anonymous Client'}</Text>
            </TouchableOpacity>
            {dateStr ? <Text style={{ fontSize: 12, color: Colors.textSecondary }}>{dateStr}</Text> : null}
          </View>
        </View>
        <Text style={styles.description}>{item.description}</Text>
        
        <View style={styles.footerRow}>
          <Text style={styles.budget}>
            Budget: {item.budget ? formatCurrency(item.budget) : 'Negotiable'}
          </Text>
          <Button 
            title={hasBid ? "Bid Sent ✓" : "Submit Bid"} 
            onPress={() => openBidModal(item)}
            disabled={hasBid}
            style={[styles.bidButton, hasBid ? { backgroundColor: Colors.success } : {}]}
            textStyle={styles.bidButtonText}
          />
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
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
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -20}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>

          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Submit Proposal</Text>
            <Text style={styles.modalSub}>For: {selectedCase?.title}</Text>

            <Input
              label="Proposed Fee (PKR)"
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
                style={{ flex: 1, marginLeft: 8, backgroundColor: Colors.primary }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Report Modal */}
      <Modal visible={isReportModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>

          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report Case</Text>
            <Text style={styles.modalSub}>Why are you reporting this?</Text>
            <Input
              label="Reason for reporting"
              placeholder="Spam, inappropriate, etc..."
              value={reportReason}
              onChangeText={setReportReason}
            />
            <View style={styles.modalActions}>
              <Button title="Cancel" variant="outline" onPress={() => { setReportModalVisible(false); setReportReason(''); setCaseToReport(null); }} style={{ flex: 1, marginRight: 8 }} />
              <Button title="Submit Report" variant="primary" onPress={handleReportCase} isLoading={isSubmitting} style={{ flex: 1, marginLeft: 8, backgroundColor: Colors.error, borderColor: Colors.error }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.background,
  },
  card: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    color: Colors.primary
  },
  categoryBadge: {
    backgroundColor: Colors.background,
    color: Colors.secondary,
    borderColor: Colors.secondary,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden'
  },
  clientName: {
    fontSize: 14,
    color: Colors.primary,
    fontStyle: 'italic',
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 16
  },
  budget: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.success
  },
  bidButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 120,
    backgroundColor: Colors.primary,
  },
  bidButtonText: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
    color: Colors.primary
  },
  modalSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 16
  }
});
