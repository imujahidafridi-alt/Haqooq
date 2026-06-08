import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Modal, Alert, Image, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { useAuthStore } from '../../../store/authStore';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';
import { Colors } from '../../../utils/Colors';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  isVisible: boolean;
  onClose: () => void;
  planName: string;
  credits: number;
  amount: number;
}

export const EasypaisaCheckoutModal: React.FC<Props> = ({ isVisible, onClose, planName, credits, amount }) => {
  const { user } = useAuthStore();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [senderTitle, setSenderTitle] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [transactionAmount, setTransactionAmount] = useState(amount.toString());
  const [transactionDateTime, setTransactionDateTime] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default transaction time when modal opens
  useEffect(() => {
    if (isVisible) {
      resetToCurrentTime();
      setTransactionAmount(amount.toString());
      setSenderTitle('');
      setSenderNumber('');
      setTransactionId('');
      setImageUri(null);
    }
  }, [isVisible, amount]);

  const resetToCurrentTime = () => {
    const now = new Date();
    const formattedDate = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + ' ' +
      String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0');
    setTransactionDateTime(formattedDate);
  };

  const copyAccountNumber = async () => {
    await Clipboard.setStringAsync('03139330041');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 7],
      quality: 0.6,
    });

    if (!result.canceled && result.assets[0].uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  const submitRequest = async () => {
    if (!user) return;

    // Field Validations
    if (!senderTitle.trim()) {
      Alert.alert('Validation Error', 'Sender Account Title is required.');
      return;
    }
    if (!senderNumber.trim()) {
      Alert.alert('Validation Error', 'Sender Easypaisa Number is required.');
      return;
    }
    if (!transactionId.trim()) {
      Alert.alert('Validation Error', 'Transaction ID / Reference Number is required.');
      return;
    }
    if (!transactionAmount.trim()) {
      Alert.alert('Validation Error', 'Transaction Amount is required.');
      return;
    }
    if (!transactionDateTime.trim()) {
      Alert.alert('Validation Error', 'Transaction Date & Time is required.');
      return;
    }

    // Amount Verification
    const enteredAmount = parseFloat(transactionAmount);
    if (isNaN(enteredAmount) || enteredAmount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid Transaction Amount.');
      return;
    }
    if (enteredAmount !== amount) {
      Alert.alert('Verification Error', `Transaction Amount must match the plan price of PKR ${amount}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      // Duplicate transaction prevention (Client-Side Check)
      const duplicateQuery = query(
        collection(db, 'credit_purchases'),
        where('transactionId', '==', transactionId.trim())
      );
      const duplicateSnap = await getDocs(duplicateQuery);
      if (!duplicateSnap.empty) {
        Alert.alert('Duplicate Transaction ID', 'This Transaction ID / Reference Number has already been submitted.');
        setIsSubmitting(false);
        return;
      }

      // Upload image to Firebase Storage if selected (Screenshot is Optional)
      let downloadUrl = '';
      if (imageUri) {
        const storage = getStorage();
        const filename = `receipts/${user.id}_${Date.now()}.jpg`;
        const storageRef = ref(storage, filename);
        
        const response = await fetch(imageUri);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        downloadUrl = await getDownloadURL(storageRef);
      }

      // Create request in Firestore
      await addDoc(collection(db, 'credit_purchases'), {
        lawyerId: user.id,
        planName,
        credits,
        amount,
        senderTitle: senderTitle.trim(),
        senderNumber: senderNumber.trim(),
        transactionId: transactionId.trim(),
        transactionAmount: enteredAmount,
        transactionDateTime: transactionDateTime.trim(),
        proofUrl: downloadUrl || null,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      // Save a local verification notification log
      await addDoc(collection(db, 'notifications'), {
        userId: user.id,
        title: 'Transaction Submitted',
        body: `Your request for ${planName} (PKR ${amount}) is pending admin verification.`,
        message: `Your request for ${planName} (PKR ${amount}) is pending admin verification.`,
        read: false,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      Alert.alert('Request Submitted', 'Your payment proof has been submitted. The admin will verify and assign your credits shortly.');
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <KeyboardAvoidingView 
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.content}>
            <View style={styles.modalHeader}>
              <Text style={styles.title}>Secure Payment via Easypaisa</Text>
              <TouchableOpacity onPress={onClose} disabled={isSubmitting}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.receiptBox}>
                <Text style={styles.receiptLabel}>Selected Plan:</Text>
                <Text style={styles.receiptValue}>{planName}</Text>
                <Text style={styles.receiptLabel}>Credits:</Text>
                <Text style={styles.receiptValue}>{credits} Credits</Text>
                <Text style={styles.receiptLabel}>Total to Pay:</Text>
                <Text style={styles.receiptPrice}>PKR {amount}</Text>
              </View>

              <View style={styles.paymentInfo}>
                <Text style={styles.infoTitle}>Transfer Exactly PKR {amount} to:</Text>
                <Text style={styles.infoDetail}>Account Title: Mujahid Afridi</Text>
                
                <View style={styles.accountNumberRow}>
                  <Text style={styles.accountNumberText}>Number: 03139330041</Text>
                  <TouchableOpacity style={styles.copyBtn} onPress={copyAccountNumber}>
                    <Ionicons name={copied ? "checkmark-circle" : "copy-outline"} size={18} color={Colors.primary} />
                    <Text style={styles.copyText}>{copied ? "Copied" : "Copy"}</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.infoDetail}>Bank: Easypaisa</Text>
              </View>

              <View style={styles.notesContainer}>
                <Text style={styles.notesTitle}>Important Payment Notes:</Text>
                <Text style={styles.notesText}>• Please perform the transfer within 30 minutes.</Text>
                <Text style={styles.notesText}>• Double-check the Account Title before sending.</Text>
                <Text style={styles.notesText}>• Screenshot is optional, but helps speed up validation.</Text>
              </View>

              <Text style={styles.sectionTitle}>Verification Details</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Sender Account Title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. John Doe"
                  value={senderTitle}
                  onChangeText={setSenderTitle}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Sender Easypaisa Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 03001234567"
                  keyboardType="phone-pad"
                  value={senderNumber}
                  onChangeText={setSenderNumber}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Transaction ID / Reference Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 12345678901"
                  value={transactionId}
                  onChangeText={setTransactionId}
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Transaction Amount (PKR)</Text>
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  value={transactionAmount}
                  onChangeText={setTransactionAmount}
                  keyboardType="numeric"
                  placeholderTextColor="#94a3b8"
                  editable={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>Transaction Date & Time</Text>
                  <TouchableOpacity onPress={resetToCurrentTime} style={styles.timeHelper}>
                    <Text style={styles.timeHelperText}>Set to Now</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD HH:MM"
                  value={transactionDateTime}
                  onChangeText={setTransactionDateTime}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <Text style={styles.inputLabel}>Upload Receipt Screenshot (Optional)</Text>
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                {imageUri ? (
                  <View style={styles.previewContainer}>
                    <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                    <View style={styles.changeImageBadge}>
                      <Text style={styles.changeImageText}>Change Screenshot</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.placeholderContainer}>
                    <Ionicons name="camera" size={32} color="#94a3b8" />
                    <Text style={styles.imagePickerText}>Tap to Upload Receipt</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.actions}>
                <Button 
                  title="Cancel" 
                  variant="outline" 
                  onPress={onClose} 
                  disabled={isSubmitting} 
                  style={styles.btn} 
                />
                <View style={{ width: 12 }} />
                <Button 
                  title="Submit Proof" 
                  onPress={submitRequest} 
                  isLoading={isSubmitting} 
                  style={styles.btn} 
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  keyboardContainer: {
    width: '100%',
    maxHeight: '90%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: '100%',
    maxHeight: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  scrollContent: {
    padding: 24
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a'
  },
  receiptBox: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20
  },
  receiptLabel: {
    fontSize: 11,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 6
  },
  receiptValue: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '600'
  },
  receiptPrice: {
    fontSize: 22,
    color: Colors.primary,
    fontWeight: '800',
    marginTop: 2
  },
  paymentInfo: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e3a8a',
    marginBottom: 8
  },
  infoDetail: {
    fontSize: 14,
    color: '#1e40af',
    fontWeight: '600',
    marginVertical: 2
  },
  accountNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4
  },
  accountNumberText: {
    fontSize: 14,
    color: '#1e40af',
    fontWeight: '700'
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8
  },
  copyText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 4
  },
  notesContainer: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20
  },
  notesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 4
  },
  notesText: {
    fontSize: 12,
    color: '#b45309',
    lineHeight: 18
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
    marginTop: 8
  },
  inputContainer: {
    marginBottom: 16
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6
  },
  input: {
    height: 48,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#0f172a'
  },
  disabledInput: {
    backgroundColor: '#e2e8f0',
    color: '#64748b'
  },
  timeHelper: {
    paddingVertical: 2
  },
  timeHelperText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600'
  },
  imagePicker: {
    height: 140,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 6,
    overflow: 'hidden'
  },
  placeholderContainer: {
    alignItems: 'center'
  },
  imagePickerText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 13,
    marginTop: 8
  },
  previewContainer: {
    width: '100%',
    height: '100%',
    position: 'relative'
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },
  changeImageBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6
  },
  changeImageText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600'
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8
  },
  btn: {
    flex: 1
  }
});

