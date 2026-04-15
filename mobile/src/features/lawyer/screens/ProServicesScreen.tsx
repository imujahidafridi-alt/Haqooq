import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { DummyPaymentModal } from '../../payments/components/DummyPaymentModal';
import { TransactionType } from '../../payments/services/paymentService';

export const ProServicesScreen = () => {
  const [modalVisible, setModalVisible] = useState(false);
  
  // Payment Intent State
  const [purchaseType, setPurchaseType] = useState<TransactionType>('pricing_tier' as any);
  const [purchaseAmount, setPurchaseAmount] = useState(0);
  const [purchaseName, setPurchaseName] = useState('');

  const initiateCheckout = (name: string, amount: number, type: TransactionType) => {
    setPurchaseName(name);
    setPurchaseAmount(amount);
    setPurchaseType(type);
    setModalVisible(true);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Lawyer Pro Tools</Text>
      <Text style={styles.subtext}>Upgrade your account to win more clients.</Text>

      <Card style={styles.card}>
        <Text style={styles.featureTitle}>Premium Profile Badge</Text>
        <Text style={styles.featureDesc}>Get a verified badge and rank higher in all organic client searches.</Text>
        <Text style={styles.price}>Rs. 5,000 / month</Text>
        <Button 
          title="Upgrade Profile" 
          onPress={() => initiateCheckout('Premium Profile Subscription', 5000, 'premium_profile')} 
          style={styles.actionBtn}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.featureTitle}>Buy Bidding Credits</Text>
        <Text style={styles.featureDesc}>You need 1 credit to submit a proposal to a new client case.</Text>
        <Text style={styles.price}>Rs. 1,000 for 100 Credits</Text>
        <Button 
          title="Purchase Credits" 
          onPress={() => initiateCheckout('100x Bidding Credits', 1000, 'bidding_credits')} 
          style={styles.actionBtn}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.featureTitle}>Keyword Boost</Text>
        <Text style={styles.featureDesc}>Sponsor a specific legal topic (e.g. "Divorce" or "Property") to be the #1 recommended lawyer.</Text>
        <Text style={styles.price}>Rs. 2,000 / keyword</Text>
        <Button 
          title="Sponsor Keyword" 
          onPress={() => initiateCheckout('Top Rank Boost (Divorce)', 2000, 'keyword_boost')} 
          style={styles.actionBtn}
        />
      </Card>

      <DummyPaymentModal 
        isVisible={modalVisible}
        onClose={() => setModalVisible(false)}
        productName={purchaseName}
        amount={purchaseAmount}
        type={purchaseType}
        metadata={{ keyword: 'Divorce' }} // example metadata config
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F5f5f5',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333'
  },
  subtext: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20
  },
  card: {
    marginBottom: 16,
    padding: 16
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8
  },
  featureDesc: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 12
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 16
  },
  actionBtn: {
    backgroundColor: '#5856D6'
  }
});
