import React, { useState } from 'react';
import { View, StyleSheet, Text, Modal, Alert, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { useAuthStore } from '../../../store/authStore';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';
import { Colors } from '../../../utils/Colors';

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
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (!imageUri) {
      Alert.alert('Missing Proof', 'Please upload a screenshot of your Easypaisa transaction.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload image to Firebase Storage
      const storage = getStorage();
      const filename = `receipts/${user.id}_${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      
      const response = await fetch(imageUri);
      const blob = await response.blob();
      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);

      // Create request in Firestore
      await addDoc(collection(db, 'credit_purchases'), {
        lawyerId: user.id,
        planName,
        credits,
        amount,
        proofUrl: downloadUrl,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      Alert.alert('Request Submitted', 'Your payment proof has been submitted. The admin will review and assign your credits shortly.');
      setImageUri(null);
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
        <View style={styles.content}>
          <Text style={styles.title}>Secure Payment via Easypaisa</Text>
          
          <View style={styles.receiptBox}>
            <Text style={styles.receiptLabel}>Plan:</Text>
            <Text style={styles.receiptValue}>{planName}</Text>
            <Text style={styles.receiptLabel}>Credits:</Text>
            <Text style={styles.receiptValue}>{credits}</Text>
            <Text style={styles.receiptLabel}>Total to Pay:</Text>
            <Text style={styles.receiptPrice}>PKR {amount}</Text>
          </View>

          <View style={styles.paymentInfo}>
            <Text style={styles.infoTitle}>Transfer Exactly PKR {amount} to:</Text>
            <Text style={styles.infoDetail}>Account Name: Mujahid Afridi</Text>
            <Text style={styles.infoDetail}>Account Number: 03369993032</Text>
            <Text style={styles.infoDetail}>Bank: Easypaisa</Text>
          </View>

          <Text style={styles.instruction}>
            After completing the transfer, take a screenshot of the digital receipt and upload it below.
          </Text>

          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
            ) : (
              <Text style={styles.imagePickerText}>Tap to Upload Receipt Screenshot</Text>
            )}
          </TouchableOpacity>

          <View style={styles.actions}>
            <Button title="Cancel" variant="outline" onPress={onClose} disabled={isSubmitting} style={styles.btn} />
            <View style={{ width: 12 }} />
            <Button title="Submit Request" onPress={submitRequest} isLoading={isSubmitting} style={styles.btn} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center'
  },
  receiptBox: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20
  },
  receiptLabel: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8
  },
  receiptValue: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '500'
  },
  receiptPrice: {
    fontSize: 22,
    color: Colors.primary,
    fontWeight: '700',
    marginTop: 4
  },
  paymentInfo: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 8
  },
  infoDetail: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '600'
  },
  instruction: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
    textAlign: 'center'
  },
  imagePicker: {
    height: 120,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden'
  },
  imagePickerText: {
    color: '#94a3b8',
    fontWeight: '500'
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  btn: {
    flex: 1
  }
});
