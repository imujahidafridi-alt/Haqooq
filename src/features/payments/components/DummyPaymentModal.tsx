import React, { useState } from 'react';
import { View, StyleSheet, Text, Modal, Alert } from 'react-native';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { paymentService, TransactionType } from '../services/paymentService';
import { useAuthStore } from '../../../store/authStore';

interface DummyPaymentModalProps {
  isVisible: boolean;
  onClose: () => void;
  productName: string;
  amount: number;
  type: TransactionType;
  metadata?: Record<string, any>;
  onSuccess?: () => void;
}

export const DummyPaymentModal: React.FC<DummyPaymentModalProps> = ({
  isVisible,
  onClose,
  productName,
  amount,
  type,
  metadata,
  onSuccess
}) => {
  const { user } = useAuthStore();
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242'); // Stripe dummy test card
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvc] = useState('123');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePay = async () => {
    if (!user) return;

    setIsProcessing(true);
    const result = await paymentService.initiatePayment({
      userId: user.id,
      amount,
      type,
      metadata
    });

    setIsProcessing(false);

    if (result.success) {
      Alert.alert('Payment Successful', `Receipt: ${result.transactionId}`);
      if (onSuccess) onSuccess();
      onClose();
    } else {
      Alert.alert('Payment Failed', result.errorMessage || 'Transaction could not be completed.');
    }
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Secure Checkout</Text>
          
          <View style={styles.receiptBox}>
            <Text style={styles.receiptLabel}>Item:</Text>
            <Text style={styles.receiptValue}>{productName}</Text>
            <Text style={styles.receiptLabel}>Total:</Text>
            <Text style={styles.receiptPrice}>Rs. {amount}</Text>
          </View>

          <Text style={styles.warning}>
            Test Mode: This modal routes through the PaymentService abstraction. No real money will be charged.
          </Text>

          <Input
            label="Card Number"
            value={cardNumber}
            onChangeText={setCardNumber}
            keyboardType="numeric"
            maxLength={19}
          />
          <View style={styles.row}>
            <Input
              label="Expiry (MM/YY)"
              value={expiry}
              onChangeText={setExpiry}
              style={{ flex: 1, marginRight: 8 }}
            />
            <Input
              label="CVV"
              value={cvv}
              onChangeText={setCvc}
              secureTextEntry
              keyboardType="numeric"
              maxLength={4}
              style={{ flex: 1, marginLeft: 8 }}
            />
          </View>

          <View style={styles.actions}>
            <Button 
              title="Cancel" 
              variant="outline" 
              onPress={onClose} 
              style={{ flex: 1, marginRight: 8 }}
              disabled={isProcessing}
            />
            <Button 
              title={`Pay Rs. ${amount}`} 
              onPress={handlePay} 
              isLoading={isProcessing}
              style={{ flex: 1, marginLeft: 8, backgroundColor: '#000' }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#FFF',
    padding: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center'
  },
  receiptBox: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEE'
  },
  receiptLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    fontWeight: 'bold'
  },
  receiptValue: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333'
  },
  receiptPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32'
  },
  warning: {
    fontSize: 12,
    color: '#D97706',
    backgroundColor: '#FFFBEA',
    padding: 8,
    borderRadius: 4,
    marginBottom: 20,
    textAlign: 'center',
    overflow: 'hidden'
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actions: {
    flexDirection: 'row',
    marginTop: 10,
  }
});
