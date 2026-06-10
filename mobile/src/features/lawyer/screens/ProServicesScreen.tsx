import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { useAuthStore } from '../../../store/authStore';
import { EasypaisaCheckoutModal } from '../../payments/components/EasypaisaCheckoutModal';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../utils/Colors';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';

export const ProServicesScreen = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'plans' | 'history'>('plans');
  const [modalVisible, setModalVisible] = useState(false);
  
  const [planName, setPlanName] = useState('');
  const [credits, setCredits] = useState(0);
  const [amount, setAmount] = useState(0);

  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Set up real-time listener for transaction history
  useEffect(() => {
    if (!user?.id) return;

    const q = query(
      collection(db, 'credit_purchases'),
      where('lawyerId', '==', user.id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHistory(docs);
      setLoadingHistory(false);
    }, (error) => {
      console.error("Error listening to credit purchases:", error);
      setLoadingHistory(false);
    });

    return () => unsubscribe();
  }, [user?.id]);

  const initiateCheckout = (name: string, assignedCredits: number, requiredAmount: number) => {
    setPlanName(name);
    setCredits(assignedCredits);
    setAmount(requiredAmount);
    setModalVisible(true);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'approved':
        return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0', label: 'Approved' };
      case 'rejected':
        return { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca', label: 'Rejected' };
      default:
        return { bg: '#fef3c7', text: '#b45309', border: '#fde68a', label: 'Pending' };
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Panel */}
      <View style={styles.headerPanel}>
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <Ionicons name="star" size={24} color={Colors.primary} style={styles.headerIcon} />
            <Text style={styles.header}>Lawyer Pro Tools</Text>
          </View>
          <View style={styles.balanceBadge}>
            <Text style={styles.balanceText}>{(user as any)?.credits || 0} Credits</Text>
          </View>
        </View>
        <Text style={styles.subtext}>Acquire bidding credits manually via Easypaisa to pitch to high-value client cases.</Text>
      </View>

      {/* Segmented Controller Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'plans' && styles.activeTabButton]}
          onPress={() => setActiveTab('plans')}
        >
          <Ionicons name="cart-outline" size={18} color={activeTab === 'plans' ? Colors.primary : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'plans' && styles.activeTabText]}>Available Plans</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'history' && styles.activeTabButton]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons name="receipt-outline" size={18} color={activeTab === 'history' ? Colors.primary : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>Purchase History</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'plans' ? (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
          {/* Starter Pack Card */}
          <View style={styles.cardWrapper}>
            <View style={styles.cardHeader}>
              <View style={styles.badgeContainer}>
                <Ionicons name="briefcase" size={22} color={Colors.primary} />
                <Text style={[styles.featureTitle, { color: Colors.primary }]}>Starter Pack</Text>
              </View>
              <Text style={styles.planValidity}>12 Months Validity</Text>
            </View>
            <Text style={styles.featureDesc}>Get started with applying for jobs. Essential manual credits for new legal cases.</Text>
            
            <View style={styles.benefitsContainer}>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={styles.benefitText}>10 Bidding Credits</Text>
              </View>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={styles.benefitText}>Standard Client Application</Text>
              </View>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={styles.benefitText}>Manual P2P Verification</Text>
              </View>
            </View>

            <View style={styles.pricingContainer}>
              <Text style={[styles.price, { color: Colors.primary }]}>PKR 100</Text>
              <Text style={styles.billingCycle}>for 10 Credits</Text>
            </View>
            <Button 
              title="Buy Starter Pack" 
              onPress={() => initiateCheckout('Starter Pack', 10, 100)} 
              style={styles.standardActionBtn}
            />
          </View>

          {/* Professional Pack Card */}
          <View style={[styles.cardWrapper, styles.premiumBadge]}>
            <View style={styles.cardHeader}>
              <View style={styles.badgeContainer}>
                <Ionicons name="shield-checkmark" size={22} color="#D4AF37" />
                <Text style={[styles.featureTitle, { color: '#FFFFFF' }]}>Professional Pack</Text>
              </View>
              <Text style={[styles.planValidity, { color: '#D4AF37', backgroundColor: '#1e293b' }]}>Lifetime Validity</Text>
            </View>
            <Text style={[styles.featureDesc, { color: '#E2E8F0' }]}>Recommended for active professionals. Substantial savings on credit acquisitions.</Text>
            
            <View style={[styles.benefitsContainer, { backgroundColor: '#1e293b' }]}>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={16} color="#D4AF37" />
                <Text style={[styles.benefitText, { color: '#F1F5F9' }]}>100 Bidding Credits</Text>
              </View>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={16} color="#D4AF37" />
                <Text style={[styles.benefitText, { color: '#F1F5F9' }]}>Featured Placement on Search</Text>
              </View>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={16} color="#D4AF37" />
                <Text style={[styles.benefitText, { color: '#F1F5F9' }]}>Priority Client Visibility</Text>
              </View>
            </View>

            <View style={styles.pricingContainer}>
              <Text style={[styles.price, { color: '#FFF' }]}>PKR 1,000</Text>
              <Text style={[styles.billingCycle, { color: '#cbd5e1' }]}>for 100 Credits</Text>
            </View>
            <Button 
              title="Buy Professional Pack" 
              onPress={() => initiateCheckout('Professional Pack', 100, 1000)} 
              style={styles.premiumActionBtn}
              textStyle={styles.premiumBtnText}
            />
          </View>

          {/* Elite Pack Card */}
          <View style={styles.cardWrapper}>
            <View style={styles.cardHeader}>
              <View style={styles.badgeContainer}>
                <Ionicons name="flash" size={22} color={Colors.primary} />
                <Text style={[styles.featureTitle, { color: Colors.primary }]}>Elite Pack</Text>
              </View>
              <Text style={styles.planValidity}>Lifetime Validity</Text>
            </View>
            <Text style={styles.featureDesc}>Massive value for law firm owners bidding on enterprise high-budget clients actively.</Text>
            
            <View style={styles.benefitsContainer}>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={styles.benefitText}>200 Bidding Credits</Text>
              </View>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={styles.benefitText}>Profile Verified Badge</Text>
              </View>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={styles.benefitText}>Top Highlight Profile Tag</Text>
              </View>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={styles.benefitText}>Fast-Track Admin Approval</Text>
              </View>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={styles.benefitText}>Dedicated Whatsapp Support</Text>
              </View>
            </View>

            <View style={styles.pricingContainer}>
              <Text style={[styles.price, { color: Colors.primary }]}>PKR 1,800</Text>
              <Text style={styles.billingCycle}>for 200 Credits</Text>
            </View>
            <Button 
              title="Buy Elite Pack" 
              onPress={() => initiateCheckout('Elite Pack', 200, 1800)} 
              style={styles.standardActionBtn}
            />
          </View>
        </ScrollView>
      ) : (
        /* Purchase History Tab */
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.historyContainer} showsVerticalScrollIndicator={false}>
          {loadingHistory ? (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Fetching transactions...</Text>
            </View>
          ) : history.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No Transactions Yet</Text>
              <Text style={styles.emptyDesc}>Your manual P2P purchase logs will appear here in real-time once submitted.</Text>
              <Button title="Buy Pro Credits Now" onPress={() => setActiveTab('plans')} style={styles.emptyBtn} />
            </View>
          ) : (
            history.map((item) => {
              const statusInfo = getStatusStyle(item.status);
              return (
                <View key={item.id} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <View>
                      <Text style={styles.historyPlanName}>{item.planName || 'Credits Purchase'}</Text>
                      <Text style={styles.historyTimestamp}>Submitted: {formatDate(item.createdAt)}</Text>
                    </View>
                    <View style={styles.badgeRow}>
                      <View style={[styles.statusTag, { backgroundColor: statusInfo.bg, borderColor: statusInfo.border }]}>
                        <Text style={[styles.statusTextTag, { color: statusInfo.text }]}>{statusInfo.label}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.historyDivider} />

                  <View style={styles.historyBody}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Reference ID</Text>
                      <Text style={styles.detailValue} numberOfLines={1}>{item.transactionId || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Amount Paid</Text>
                      <Text style={styles.detailValue}>PKR {item.amount}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Credits Added</Text>
                      <Text style={[styles.detailValue, { color: Colors.success, fontWeight: '700' }]}>+{item.credits || 0}</Text>
                    </View>
                  </View>

                  {item.status === 'rejected' && item.rejectionReason && (
                    <View style={styles.reasonBox}>
                      <Ionicons name="alert-circle-outline" size={16} color="#b91c1c" style={styles.reasonIcon} />
                      <Text style={styles.reasonText}>
                        <Text style={{ fontWeight: '700' }}>Rejection Reason: </Text>
                        {item.rejectionReason}
                      </Text>
                    </View>
                  )}

                  {item.processedAt && (
                    <View style={styles.processedRow}>
                      <Ionicons name="time-outline" size={14} color="#94a3b8" />
                      <Text style={styles.processedText}>Processed: {formatDate(item.processedAt)}</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <EasypaisaCheckoutModal 
        isVisible={modalVisible}
        onClose={() => setModalVisible(false)}
        planName={planName}
        credits={credits}
        amount={amount}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerPanel: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 8,
  },
  header: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subtext: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  balanceBadge: {
    backgroundColor: '#eff6ff',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  balanceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  activeTabButton: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 6,
  },
  activeTabText: {
    color: Colors.primary,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  historyContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  cardWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: -0.2,
  },
  planValidity: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  featureDesc: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 16,
  },
  benefitsContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  benefitText: {
    fontSize: 13,
    color: '#334155',
    marginLeft: 8,
    fontWeight: '500',
  },
  pricingContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  price: {
    fontSize: 24,
    fontWeight: '800',
  },
  billingCycle: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 6,
    fontWeight: '500',
  },
  premiumBadge: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    ...Platform.select({
      ios: {
        shadowColor: '#D4AF37',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  premiumActionBtn: {
    backgroundColor: '#D4AF37',
    borderRadius: 12,
    paddingVertical: 12,
  },
  premiumBtnText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 15,
  },
  standardActionBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyBtn: {
    paddingHorizontal: 20,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  historyPlanName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  historyTimestamp: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusTag: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusTextTag: {
    fontSize: 11,
    fontWeight: '700',
  },
  historyDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  historyBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flex: 1,
    paddingRight: 4,
  },
  detailLabel: {
    fontSize: 10,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  reasonBox: {
    flexDirection: 'row',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    alignItems: 'center',
  },
  reasonIcon: {
    marginRight: 6,
  },
  reasonText: {
    fontSize: 12,
    color: '#991b1b',
    flex: 1,
    lineHeight: 16,
  },
  processedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  processedText: {
    fontSize: 11,
    color: '#94a3b8',
    marginLeft: 4,
  },
});

