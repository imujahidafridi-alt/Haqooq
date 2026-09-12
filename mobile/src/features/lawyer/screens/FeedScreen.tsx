import React, { useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  FlatList, 
  ActivityIndicator, 
  Modal, 
  Alert, 
  KeyboardAvoidingView, 
  Platform, 
  Keyboard, 
  TouchableWithoutFeedback, 
  TouchableOpacity,
  ScrollView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Avatar } from '../../../components/ui/Avatar';
import { KeyboardAwareScrollView } from '../../../components/ui/KeyboardAwareScrollView';
import { getOpenCases, submitProposal, getLawyerBiddedCaseIds } from '../services/marketplaceService';
import { ReportModal } from '../../shared/components/ReportModal';
import { LegalCase } from '../../../types/models';
import { useAuthStore } from '../../../store/authStore';
import { Colors } from '../../../utils/Colors';
import { useNavigation } from '@react-navigation/native';
import { isVerifiedLawyer } from '../../../utils/userUtils';
import { 
  SUPPORT_CONFIG, 
  contactSupportViaPhone, 
  contactSupportViaWhatsApp 
} from '../../../constants/supportConfig';

const formatRelativeTime = (timestamp?: number): string => {
  if (!timestamp) return '';
  const diff = Math.max(0, Date.now() - timestamp);
  const mins = Math.floor(diff / (60 * 1000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const getCourtLevelLabel = (level?: string): string => {
  switch (level) {
    case 'high_court': return 'High Court';
    case 'supreme_court': return 'Supreme Court';
    case 'tribunal': return 'Special Tribunal';
    case 'district':
    default: return 'District Court';
  }
};

const getCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
  if (/property|real estate/i.test(category)) return 'home-outline';
  if (/family/i.test(category)) return 'people-outline';
  if (/corporate|business/i.test(category)) return 'business-outline';
  if (/criminal/i.test(category)) return 'shield-outline';
  if (/labor|employment/i.test(category)) return 'briefcase-outline';
  return 'document-text-outline';
};

export const FeedScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [biddedCaseIds, setBiddedCaseIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Proposal Modal state
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedCase, setSelectedCase] = useState<LegalCase | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Full Brief Modal state
  const [isBriefModalVisible, setBriefModalVisible] = useState(false);
  const [caseForBrief, setCaseForBrief] = useState<LegalCase | null>(null);

  // Report Modal state
  const [isReportModalVisible, setReportModalVisible] = useState(false);
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
    if (user?.status === 'suspended') {
      Alert.alert('Account Suspended', 'Your advocate account is suspended. Please contact Haqooq support.');
      return;
    }
    // UX Gating: verified lawyers only (authoritative enforcement in Firestore security rules)
    if (!isVerifiedLawyer(user)) {
      Alert.alert(
        'Bar Verification Required',
        'Only Bar Council verified advocates can submit proposals to client cases. Your profile is currently ' + (user?.status === 'pending' ? 'pending verification' : user?.status || 'unverified') + '. Once verified by our compliance team, you will be able to submit proposals.',
        [{ text: 'OK' }]
      );
      return;
    }
    setSelectedCase(caseItem);
    const initialBid = caseItem.budgetAmount || caseItem.budget;
    setBidAmount(initialBid ? initialBid.toString() : '');
    setMessage('');
    setModalVisible(true);
  };

  const closeBidModal = () => {
    setModalVisible(false);
    setSelectedCase(null);
  };

  const openBriefModal = (caseItem: LegalCase) => {
    setCaseForBrief(caseItem);
    setBriefModalVisible(true);
  };

  const closeBriefModal = () => {
    setBriefModalVisible(false);
    setCaseForBrief(null);
  };

  const handleBidSubmit = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'You must be signed in as an advocate to submit a proposal.');
      return;
    }
    if (user.role !== 'lawyer') {
      Alert.alert('Advocate Only', 'Only registered advocates can submit proposals on client cases.');
      return;
    }
    if (user.status === 'suspended') {
      Alert.alert('Account Suspended', 'Your advocate account is suspended. Please contact Haqooq support.');
      return;
    }
    // UX Gating: verified lawyers only (authoritative enforcement in Firestore security rules)
    if (!isVerifiedLawyer(user)) {
      Alert.alert(
        'Bar Verification Required',
        'Only Bar Council verified advocates can submit proposals to client cases. Please ensure your Bar Council credentials have been verified.',
        [{ text: 'OK' }]
      );
      return;
    }
    const currentCredits = typeof user.credits === 'number' ? user.credits : 10;
    if (currentCredits < 1) {
      Alert.alert(
        'Insufficient Credits',
        'You have 0 bidding credits remaining. Each proposal costs 1 credit. Would you like to view credit packages?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Get Credits', 
            onPress: () => { 
              closeBidModal(); 
              navigation.navigate('Pro'); 
            } 
          }
        ]
      );
      return;
    }

    const numBid = parseFloat(bidAmount);
    if (!bidAmount || isNaN(numBid) || numBid <= 0) {
      Alert.alert('Missing Fee', 'Please provide a valid proposed fee amount in PKR.');
      return;
    }
    if (!message.trim() || message.trim().length < 10) {
      Alert.alert('Message Needed', 'Please provide a proposal message (at least 10 characters) explaining your strategy to the client.');
      return;
    }
    setIsSubmitting(true);
    try {
      await submitProposal(selectedCase!.id, user.id, numBid, message.trim());
      Alert.alert('Proposal Submitted', 'Your proposal has been delivered directly to the client. You will be notified if they accept.');
      closeBidModal();
      setBiddedCaseIds(prev => new Set(prev).add(selectedCase!.id));
    } catch (error: any) {
      Alert.alert('Proposal Error', error.message || 'Unable to submit proposal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCase = ({ item }: { item: LegalCase }) => {
    const hasBid = biddedCaseIds.has(item.id);
    const isUrgent = item.urgency === 'urgent';
    const isFlexible = item.urgency === 'flexible';
    const locationStr = `${item.jurisdictionCity || item.city || 'Pakistan'} • ${getCourtLevelLabel(item.courtLevel)}`;
    const relativeTime = formatRelativeTime(item.createdAt);

    return (
      <Card style={styles.card}>
        {/* Top Badges Row */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.categoryBadge}>
            <Ionicons 
              name={getCategoryIcon(item.category)} 
              size={13} 
              color={Colors.primary} 
              style={{ marginRight: 4 }} 
            />
            <Text style={styles.categoryBadgeText} numberOfLines={1}>{item.category}</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {/* Urgency Chip */}
            <View style={[
              styles.urgencyBadge,
              isUrgent ? styles.urgencyBadgeUrgent : (isFlexible ? styles.urgencyBadgeFlexible : styles.urgencyBadgeStandard)
            ]}>
              <Text style={[
                styles.urgencyBadgeText,
                isUrgent ? styles.urgencyBadgeTextUrgent : (isFlexible ? styles.urgencyBadgeTextFlexible : styles.urgencyBadgeTextStandard)
              ]}>
                {isUrgent ? '🚨 Target: 24–48h' : (isFlexible ? '💬 Advisory' : '📅 Standard')}
              </Text>
            </View>

            {/* Report Icon */}
            <TouchableOpacity 
              onPress={() => { setCaseToReport(item); setReportModalVisible(true); }} 
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="ellipsis-vertical" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Jurisdiction & Forum Line */}
        <View style={styles.jurisdictionRow}>
          <Ionicons name="location-sharp" size={13} color="#DC2626" style={{ marginRight: 4 }} />
          <Text style={styles.jurisdictionText}>{locationStr}</Text>
        </View>

        {/* Matter Title */}
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>

        {/* Sanitized Brief Snippet */}
        <Text style={styles.descriptionSnippet} numberOfLines={2}>
          {item.description}
        </Text>

        {/* Financial & Relative Time Row */}
        <View style={styles.financialRow}>
          <View style={styles.budgetContainer}>
            {item.budgetType === 'open_to_quotes' || (!item.budgetAmount && !item.budget) ? (
              <View style={styles.openQuotesBadge}>
                <Ionicons name="chatbubbles-outline" size={13} color={Colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.openQuotesText}>Open to Quotes</Text>
              </View>
            ) : (
              <View style={styles.fixedBudgetBadge}>
                <Text style={styles.fixedBudgetLabel}>Budget:</Text>
                <Text style={styles.fixedBudgetValue}>PKR {(item.budgetAmount || item.budget)?.toLocaleString()}</Text>
              </View>
            )}
          </View>

          {relativeTime ? (
            <View style={styles.timeContainer}>
              <Ionicons name="time-outline" size={12} color={Colors.textSecondary} style={{ marginRight: 3 }} />
              <Text style={styles.timeText}>{relativeTime}</Text>
            </View>
          ) : null}
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.viewBriefBtn}
            onPress={() => openBriefModal(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.viewBriefBtnText}>View Brief</Text>
          </TouchableOpacity>

          <Button 
            title={hasBid ? "Proposal Sent ✓" : "Submit Proposal"} 
            onPress={() => openBidModal(item)}
            disabled={hasBid}
            style={[styles.bidButton, hasBid ? { backgroundColor: '#059669' } : {}]}
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
          contentContainerStyle={{ paddingBottom: 24, paddingTop: 6 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="briefcase-outline" size={48} color={Colors.border} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No Open Matters</Text>
              <Text style={styles.emptyText}>There are currently no active legal listings awaiting proposals.</Text>
            </View>
          }
        />
      )}

      {/* Full Matter Brief Modal */}
      <Modal visible={isBriefModalVisible} animationType="slide" transparent onRequestClose={closeBriefModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.briefModalContent}>
            <View style={styles.briefModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.briefModalCategory}>{caseForBrief?.category}</Text>
                <Text style={styles.briefModalTitle}>{caseForBrief?.title}</Text>
              </View>
              <TouchableOpacity onPress={closeBriefModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {/* Meta Grid */}
              <View style={styles.metaGrid}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaItemLabel}>Jurisdiction</Text>
                  <Text style={styles.metaItemValue}>{caseForBrief?.jurisdictionCity || caseForBrief?.city || 'Pakistan'}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaItemLabel}>Court Level</Text>
                  <Text style={styles.metaItemValue}>{getCourtLevelLabel(caseForBrief?.courtLevel)}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaItemLabel}>Urgency</Text>
                  <Text style={[styles.metaItemValue, caseForBrief?.urgency === 'urgent' && { color: '#DC2626' }]}>
                    {caseForBrief?.urgency === 'urgent' ? 'Target: 24–48h' : (caseForBrief?.urgency === 'flexible' ? 'Advisory' : 'Standard (3–7d)')}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaItemLabel}>Client Budget</Text>
                  <Text style={styles.metaItemValue}>
                    {caseForBrief?.budgetType === 'open_to_quotes' || (!caseForBrief?.budgetAmount && !caseForBrief?.budget)
                      ? 'Open to Quotes'
                      : `PKR ${(caseForBrief?.budgetAmount || caseForBrief?.budget)?.toLocaleString()}`}
                  </Text>
                </View>
              </View>

              {/* Description */}
              <Text style={styles.briefSectionLabel}>Client Matter Description</Text>
              <Text style={styles.briefFullDescription}>{caseForBrief?.description}</Text>

              {/* Author Info */}
              <View style={styles.briefAuthorRow}>
                <Avatar seed={caseForBrief?.clientId || 'anonymous'} size={28} style={{ marginRight: 8 }} />
                <Text style={styles.briefAuthorText}>Posted by: {caseForBrief?.clientName || 'Client'}</Text>
              </View>
            </ScrollView>

            <View style={styles.briefActions}>
              <Button
                title={caseForBrief && biddedCaseIds.has(caseForBrief.id) ? "Proposal Already Sent ✓" : "Submit Proposal"}
                onPress={() => {
                  if (caseForBrief) {
                    closeBriefModal();
                    openBidModal(caseForBrief);
                  }
                }}
                disabled={Boolean(caseForBrief && biddedCaseIds.has(caseForBrief.id))}
                style={{ width: '100%' }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Proposal Submission Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent onRequestClose={closeBidModal}>
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>

          <View style={[styles.modalContent, { maxHeight: '88%' }]}>
            <KeyboardAwareScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              extraScrollHeight={50}
            >
              <Text style={styles.modalTitle}>Submit Formal Proposal</Text>
              <Text style={styles.modalSub} numberOfLines={1}>For: {selectedCase?.title}</Text>

              <View style={styles.creditInfoBanner}>
                <Ionicons name="flash" size={14} color="#D97706" style={{ marginRight: 6 }} />
                <Text style={styles.creditInfoText}>
                  Costs 1 Credit • Your Balance: <Text style={{ fontWeight: '700' }}>{typeof user?.credits === 'number' ? user.credits : 0}</Text>
                </Text>
              </View>

              <Input
                label="Proposed Fee (PKR) *"
                placeholder="e.g. 50000"
                keyboardType="numeric"
                value={bidAmount}
                onChangeText={setBidAmount}
              />

              <Input
                label="Proposal Message & Strategy *"
                placeholder="Outline your approach, experience in this court forum, and why you are the best advocate for this case..."
                multiline
                numberOfLines={4}
                style={{ height: 95, textAlignVertical: 'top' }}
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
                  title="Send Proposal" 
                  variant="primary" 
                  onPress={handleBidSubmit}
                  isLoading={isSubmitting}
                  style={{ flex: 1, marginLeft: 8, backgroundColor: Colors.primary }}
                />
              </View>
            </KeyboardAwareScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Report Modal */}
      {caseToReport && user && (
        <ReportModal
          visible={isReportModalVisible}
          entityId={caseToReport.id}
          entityType="case"
          reporterId={user.id}
          entityTitle={caseToReport.title}
          onClose={() => { setReportModalVisible(false); setCaseToReport(null); }}
          onSuccess={() => { setReportModalVisible(false); setCaseToReport(null); }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 14,
    backgroundColor: Colors.background,
  },
  card: {
    marginBottom: 12,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 14,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1.5,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    maxWidth: '65%',
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  urgencyBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  urgencyBadgeUrgent: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  urgencyBadgeStandard: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  urgencyBadgeFlexible: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  urgencyBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  urgencyBadgeTextUrgent: {
    color: '#DC2626',
  },
  urgencyBadgeTextStandard: {
    color: Colors.primary,
  },
  urgencyBadgeTextFlexible: {
    color: '#059669',
  },
  jurisdictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  jurisdictionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 22,
    marginBottom: 5,
  },
  descriptionSnippet: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginBottom: 10,
  },
  budgetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  openQuotesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  openQuotesText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.primary,
  },
  fixedBudgetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fixedBudgetLabel: {
    fontSize: 11.5,
    color: Colors.textSecondary,
  },
  fixedBudgetValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewBriefBtn: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBriefBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.text,
  },
  bidButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  bidButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  briefModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  briefModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 12,
    marginBottom: 12,
  },
  briefModalCategory: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 2,
  },
  briefModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
    gap: 10,
    marginBottom: 14,
  },
  metaItem: {
    width: '47%',
  },
  metaItemLabel: {
    fontSize: 10.5,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  metaItemValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 1,
  },
  briefSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  briefFullDescription: {
    fontSize: 13.5,
    lineHeight: 21,
    color: Colors.text,
    marginBottom: 14,
  },
  briefAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginBottom: 10,
  },
  briefAuthorText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  briefActions: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 2,
    color: Colors.primary,
  },
  modalSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  creditInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 14,
  },
  creditInfoText: {
    fontSize: 12.5,
    color: '#92400E',
    fontWeight: '500',
  },
});
