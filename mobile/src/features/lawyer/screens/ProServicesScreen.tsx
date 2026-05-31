import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Platform } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { useAuthStore } from '../../../store/authStore';
import { EasypaisaCheckoutModal } from '../../payments/components/EasypaisaCheckoutModal';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../utils/Colors';

export const ProServicesScreen = () => {
  const { user } = useAuthStore();
  const [modalVisible, setModalVisible] = useState(false);
  
  const [planName, setPlanName] = useState('');
  const [credits, setCredits] = useState(0);
  const [amount, setAmount] = useState(0);

  const initiateCheckout = (name: string, assignedCredits: number, requiredAmount: number) => {
    setPlanName(name);
    setCredits(assignedCredits);
    setAmount(requiredAmount);
    setModalVisible(true);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.headerContainer}>
        <View style={styles.titleRow}>
          <Ionicons name="star" size={24} color={Colors.primary} style={styles.headerIcon} />
          <Text style={styles.header}>Lawyer Pro Tools</Text>
        </View>
        <Text style={styles.subtext}>Acquire bidding credits manually through Easypaisa to pitch to high-value clients.</Text>
        <View style={styles.balanceBadge}>
          <Text style={styles.balanceText}>Current Balance: {user?.credits || 0} Credits</Text>
        </View>
      </View>

      <View style={styles.cardWrapper}>
        <View style={styles.cardHeader}>
          <Ionicons name="briefcase" size={24} color={Colors.primary} />
          <Text style={[styles.featureTitle, { color: Colors.primary }]}>Starter Pack</Text>
        </View>
        <Text style={[styles.featureDesc, { color: '#666' }]}>Get a quick start. Essential manual credits for applying to new job cases.</Text>
        <View style={styles.pricingContainer}>
          <Text style={[styles.price, { color: Colors.primary }]}>PKR 250</Text>
          <Text style={styles.billingCycle}>for 10 Credits</Text>
        </View>
        <Button 
          title="Buy Starter Pack" 
          onPress={() => initiateCheckout('Starter Pack (10 Credits)', 10, 250)} 
          style={styles.standardActionBtn}
        />
      </View>

      <View style={[styles.cardWrapper, styles.premiumBadge]}>
        <View style={styles.cardHeader}>
          <Ionicons name="shield-checkmark" size={24} color="#D4AF37" />
          <Text style={styles.featureTitle}>Professional Pack</Text>
        </View>
        <Text style={styles.featureDesc}>Recommended for full-time professionals. Substantial savings on credit acquisitions.</Text>
        <View style={styles.pricingContainer}>
          <Text style={styles.price}>PKR 1,000</Text>
          <Text style={styles.billingCycle}>for 50 Credits</Text>
        </View>
        <Button 
          title="Buy Professional Pack" 
          onPress={() => initiateCheckout('Professional Pack (50 Credits)', 50, 1000)} 
          style={styles.premiumActionBtn}
          textStyle={styles.premiumBtnText}
        />
      </View>

      <View style={styles.cardWrapper}>
        <View style={styles.cardHeader}>
          <Ionicons name="flash" size={24} color={Colors.primary} />
          <Text style={[styles.featureTitle, { color: Colors.primary }]}>Elite Pack</Text>
        </View>
        <Text style={[styles.featureDesc, { color: '#666' }]}>Massive value for law firm owners bidding on enterprise clients actively.</Text>
        <View style={styles.pricingContainer}>
          <Text style={[styles.price, { color: Colors.primary }]}>PKR 1,800</Text>
          <Text style={styles.billingCycle}>for 100 Credits</Text>
        </View>
        <Button 
          title="Buy Elite Pack" 
          onPress={() => initiateCheckout('Elite Pack (100 Credits)', 100, 1800)} 
          style={styles.standardActionBtn}
        />
      </View>

      <EasypaisaCheckoutModal 
        isVisible={modalVisible}
        onClose={() => setModalVisible(false)}
        planName={planName}
        credits={credits}
        amount={amount}
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
  balanceBadge: {
    marginTop: 12,
    backgroundColor: '#eff6ff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  balanceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1d4ed8',
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
