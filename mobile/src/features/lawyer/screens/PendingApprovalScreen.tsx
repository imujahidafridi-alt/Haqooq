import React, { useState } from 'react';
import { View, StyleSheet, Text, Alert, Platform, SafeAreaView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db } from '../../../services/firebaseConfig';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { useAuthStore } from '../../../store/authStore';
import { logoutUser } from '../../auth/services/authService';
import { Colors } from '../../../utils/Colors';

export const PendingApprovalScreen = () => {
  const { user, logout } = useAuthStore();
  const [isUploading, setIsUploading] = useState(false);
  const [hasUploaded, setHasUploaded] = useState(false);

  const handleUploadCredential = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;
      if (!user) return;

      setIsUploading(true);
      const fileUri = result.assets[0].uri;
      
      // Convert URI to Blob
      const response = await fetch(fileUri);
      const blob = await response.blob();
      
      // Upload to Firebase Storage
      const storageRef = ref(storage, `credentials/${user.id}_${Date.now()}`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      // Update User Document
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        credentialUrl: downloadURL
      });

      setIsUploading(false);
      setHasUploaded(true);
      Alert.alert('Success', 'Your credentials have been securely uploaded to Firebase Storage and are awaiting Admin review.');
    } catch (error) {
      console.error(error);
      setIsUploading(false);
      Alert.alert('Upload Error', 'Failed to upload document.');
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    logout();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.title}>Welcome, {user?.displayName}!</Text>
        <Text style={styles.subtitle}>
          To unlock the lawyer marketplace, we need to verify your identity and legal credentials.
        </Text>

        <View style={styles.statusBox}>
          <Text style={styles.statusText}>
            Status: <Text style={styles.pendingTag}>WAITING FOR DOCUMENTS</Text>
          </Text>
        </View>

        {!hasUploaded ? (
          <Button 
            title="Upload Credentials (PDF/Image)" 
            onPress={handleUploadCredential}
            isLoading={isUploading}
          />
        ) : (
          <Text style={styles.successText}>
            ✅ Documents received. Our admin team will review your account shortly. Please check back later.
          </Text>
        )}

        <Button 
          title="Sign Out" 
          variant="outline" 
          onPress={handleLogout}
          style={{ marginTop: 20 }}
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
  }
});
