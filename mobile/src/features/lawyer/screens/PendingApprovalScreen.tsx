import React, { useState } from 'react';
import { View, StyleSheet, Text, Alert, Platform, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { storage, db } from '../../../services/firebaseConfig';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { useAuthStore } from '../../../store/authStore';
import { logoutUser } from '../../auth/services/authService';
import { Colors } from '../../../utils/Colors';
import { 
  SUPPORT_CONFIG, 
  contactSupportViaPhone, 
  contactSupportViaEmail, 
  contactSupportViaWhatsApp 
} from '../../../constants/supportConfig';

export const PendingApprovalScreen = () => {
  const { user, logout } = useAuthStore();
  const [isUploading, setIsUploading] = useState(false);
  const [hasUploaded, setHasUploaded] = useState(false);

  const isSuspended = user?.status === 'suspended';
  const isRejected = user?.status === 'rejected';
  const isUnderReview = user?.status === 'under_review' || (user?.credentialUrl && !isRejected && !isSuspended) || hasUploaded;

  const handleUploadCredential = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;
      if (!user) return;

      setIsUploading(true);
      const asset = result.assets[0];
      const fileUri = asset.uri;
      const mimeType = asset.mimeType || 'application/pdf';
      const extension = mimeType.includes('pdf') ? 'pdf' : 'jpg';
      
      // Convert URI to Blob
      const response = await fetch(fileUri);
      const blob = await response.blob();
      
      // Upload to Firebase Storage conforming to storage.rules: /credentials/{userId}/{filename}
      const storageRef = ref(storage, `credentials/${user.id}/${Date.now()}_credential.${extension}`);
      await uploadBytes(storageRef, blob, { contentType: mimeType });
      const downloadURL = await getDownloadURL(storageRef);

      // Update User Document with credentialUrl (status remains pending/under_review for admin verification)
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        credentialUrl: downloadURL
      });

      setIsUploading(false);
      setHasUploaded(true);
      Alert.alert(
        'Credentials Submitted',
        'Your credentials have been securely uploaded and are now under review by our legal compliance team.'
      );
    } catch (error: any) {
      console.error('Credential upload error:', error);
      setIsUploading(false);
      Alert.alert('Upload Error', error?.message || 'Failed to upload document.');
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.warn('Logout error:', e);
    }
    logout();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.title}>Welcome, {user?.displayName || (user?.role === 'lawyer' ? 'Counselor' : 'Member')}!</Text>

        {isSuspended ? (
          <>
            <View style={[styles.statusBox, { backgroundColor: '#FEF2F2', borderColor: Colors.error }]}>
              <Text style={[styles.statusText, { color: Colors.error }]}>
                Status: <Text style={{ fontWeight: 'bold' }}>ACCOUNT SUSPENDED</Text>
              </Text>
            </View>
            <Text style={styles.subtitle}>
              Your account has been temporarily suspended by administrative review. If you believe this is an error, please contact Haqooq support.
            </Text>
          </>
        ) : isRejected ? (
          <>
            <View style={[styles.statusBox, { backgroundColor: '#FEF2F2', borderColor: Colors.error }]}>
              <Text style={[styles.statusText, { color: Colors.error }]}>
                Status: <Text style={{ fontWeight: 'bold' }}>APPLICATION REJECTED</Text>
              </Text>
            </View>
            <Text style={styles.subtitle}>
              Your submitted credentials could not be verified. Please re-upload a clear copy of your Bar Council License or valid High Court Certificate.
            </Text>
            <Button 
              title="Upload New Credentials (PDF/Image)" 
              onPress={handleUploadCredential}
              isLoading={isUploading}
              style={{ width: '100%', marginTop: 12 }}
            />
          </>
        ) : isUnderReview ? (
          <>
            <View style={[styles.statusBox, { backgroundColor: '#F0FDF4', borderColor: Colors.success }]}>
              <Text style={[styles.statusText, { color: Colors.success }]}>
                Status: <Text style={{ fontWeight: 'bold' }}>UNDER COMPLIANCE REVIEW</Text>
              </Text>
            </View>
            <Text style={styles.successText}>
              ✅ Your verification documents have been received and are being audited by Haqooq Legal Compliance.
            </Text>
            <Text style={styles.subtitle}>
              Once approved, your marketplace access will unlock automatically. No further action is required.
            </Text>
            <Button 
              title="Update Credentials" 
              variant="outline"
              onPress={handleUploadCredential}
              isLoading={isUploading}
              style={{ width: '100%', marginTop: 12 }}
            />
          </>
        ) : (
          <>
            <View style={styles.statusBox}>
              <Text style={styles.statusText}>
                Status: <Text style={styles.pendingTag}>WAITING FOR CREDENTIALS</Text>
              </Text>
            </View>
            <Text style={styles.subtitle}>
              To bid on cases and interact with clients on Haqooq, Pakistan law requires verification of your Bar Council license.
            </Text>
            <Button 
              title="Upload Bar License / CNIC (PDF/Image)" 
              onPress={handleUploadCredential}
              isLoading={isUploading}
              style={{ width: '100%', marginTop: 12 }}
            />
          </>
        )}

        {/* Support & Verification Helpline */}
        <View style={styles.supportBox}>
          <Text style={styles.supportTitle}>Need Help or Expedited Approval?</Text>
          <Text style={styles.supportDesc}>
            Contact Haqooq Legal Operations for assistance:
          </Text>

          <View style={styles.supportActionsRow}>
            <TouchableOpacity style={styles.supportBtn} activeOpacity={0.7} onPress={contactSupportViaPhone}>
              <Ionicons name="call" size={14} color={Colors.primary} />
              <Text style={styles.supportBtnText}>{SUPPORT_CONFIG.phoneNumber}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.supportBtn} activeOpacity={0.7} onPress={() => contactSupportViaEmail()}>
              <Ionicons name="mail" size={14} color={Colors.primary} />
              <Text style={styles.supportBtnText}>Email Desk</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.supportBtn, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]} activeOpacity={0.7} onPress={() => contactSupportViaWhatsApp()}>
              <Ionicons name="logo-whatsapp" size={14} color="#15803D" />
              <Text style={[styles.supportBtnText, { color: '#15803D' }]}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Button 
          title="Sign Out" 
          variant="outline" 
          onPress={handleLogout}
          style={{ marginTop: 16, width: '100%' }}
        />
      </Card>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    justifyContent: 'center', 
    padding: 20, 
    backgroundColor: Colors.background
  },
  card: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 22, 
    fontWeight: 'bold', 
    marginBottom: 12, 
    textAlign: 'center',
    color: Colors.primary
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  statusBox: {
    backgroundColor: '#FFFBEA', // Keep subtle warning background
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.warning,
    marginBottom: 24,
    width: '100%',
    alignItems: 'center'
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text
  },
  pendingTag: {
    color: Colors.warning,
    fontWeight: 'bold'
  },
  successText: {
    color: Colors.success,
    textAlign: 'center',
    marginVertical: 10,
    lineHeight: 20,
    fontWeight: '500'
  },
  supportBox: {
    marginTop: 20,
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
    alignItems: 'center',
  },
  supportTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  supportDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 16,
  },
  supportActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  supportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 5,
  },
  supportBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
});
