import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Platform } from 'react-native';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { DummyPaymentModal } from '../../payments/components/DummyPaymentModal';
import { TransactionType } from '../../payments/services/paymentService';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../utils/Colors';

export const ProServicesScreen = () => {
  const [modalVisible, setModalVisible] = useState(false);
  
  // Payment Intent State
  const [purchaseType, setPurchaseType] = useState<TransactionType>('premium_profile');
  const [purchaseAmount, setPurchaseAmount] = useState(0);
  const [purchaseName, setPurchaseName] = useState('');

  const initiateCheckout = (name: string, amount: number, type: TransactionType) => {
    setPurchaseName(name);
    setPurchaseAmount(amount);
    setPurchaseType(type);
    setModalVisible(true);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.headerContainer}>
        <View style={styles.titleRow}>
          <Ionicons name="star" size={24} color={Colors.primary} style={styles.headerIcon} />
          <Text style={styles.header}>Lawyer Pro Tools</Text>
        </View>
        <Text style={styles.subtext}>Elevate your legal practice with enterprise-grade premium features.</Text>
      </View>

      <View style={[styles.cardWrapper, styles.premiumBadge]}>
        <View style={styles.cardHeader}>
          <Ionicons name="shield-checkmark" size={24} color="#D4AF37" />
          <Text style={styles.featureTitle}>Premium Verified Profile</Text>
        </View>
        <Text style={styles.featureDesc}>Stand out instantly. Attain a verified elite badge, gain higher algorithmic placement in the marketplace, and build immediate trust with high-value clients.</Text>
        <View style={styles.pricingContainer}>
          <Text style={styles.price}>PKR 5,000</Text>
          <Text style={styles.billingCycle}>/ month</Text>
        </View>
        <Button 
          title="Upgrade Profile to Premium" 
          onPress={() => initiateCheckout('Enterprise Premium Profile Subscription', 5000, 'premium_profile')} 
          style={styles.premiumActionBtn}
          textStyle={styles.premiumBtnText}
        />
      </View>

      <View style={styles.cardWrapper}>
        <View style={styles.cardHeader}>
          <Ionicons name="briefcase" size={24} color={Colors.primary} />
          <Text style={[styles.featureTitle, { color: Colors.primary }]}>Procure Bidding Credits</Text>
        </View>
        <Text style={[styles.featureDesc, { color: '#666' }]}>Acquire active lead allocation credits. Each credit empowers you to pitch a precise, highly-competitive proposal to a newly opened client listing.</Text>
        <View style={styles.pricingContainer}>
          <Text style={[styles.price, { color: Colors.primary }]}>PKR 1,000</Text>
          <Text style={styles.billingCycle}>for 100 Credits</Text>
        </View>
        <Button 
          title="Purchase Credits Package" 
          onPress={() => initiateCheckout('100x Enterprise Bidding Credits', 1000, 'bidding_credits')} 
          style={styles.standardActionBtn}
        />
      </View>

      <DummyPaymentModal 
        isVisible={modalVisible}
        onClose={() => setModalVisible(false)}
        productName={purchaseName}
        amount={purchaseAmount}
        type={purchaseType}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerIcon: {
    marginRight: 8,
  },
  header: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  subtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  cardWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 5,
      },
    }),
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  premiumBadge: {
    backgroundColor: '#1E1E1E',
    borderColor: '#333',
    ...Platform.select({
      ios: {
        shadowColor: '#D4AF37',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 12,
    color: '#D4AF37',
    letterSpacing: 0.2,
  },
  featureDesc: {
    fontSize: 15,
    color: '#E0E0E0',
    lineHeight: 24,
    marginBottom: 24,
  },
  pricingContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 24,
  },
  price: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
  },
  billingCycle: {
    fontSize: 14,
    color: '#A0A0A0',
    marginLeft: 6,
    fontWeight: '500',
  },
  premiumActionBtn: {
    backgroundColor: '#D4AF37',
    borderRadius: 8,
    paddingVertical: 14,
  },
  premiumBtnText: {
    color: '#1A1A1A',
    fontWeight: 'bold',
    fontSize: 16,
  },
  standardActionBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
  },
});
