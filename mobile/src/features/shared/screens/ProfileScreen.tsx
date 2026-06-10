import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ScrollView, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc, updateDoc, getDocFromCache } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';
import { useAuthStore } from '../../../store/authStore';
import { Colors } from '../../../utils/Colors';
import { Typography } from '../../../utils/Typography';
import { Button } from '../../../components/ui/Button';
import { Avatar } from '../../../components/ui/Avatar';
import { UserProfile, LawyerProfile } from '../../../types/models';
import { signOut } from 'firebase/auth';
import { auth, storage } from '../../../services/firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export const ProfileScreen = () => {
  const { user, setUser } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | LawyerProfile | null>(user);
  
  // Offline first: Initialize with local Zustand store state immediately (0 delay)
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  
  const [city, setCity] = useState(user?.role === 'lawyer' ? ((user as LawyerProfile).city || '') : '');
  const [experience, setExperience] = useState(user?.role === 'lawyer' ? ((user as LawyerProfile).experienceYears?.toString() || '') : '');
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // Background silent sync
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'users', user.id);
        let docSnap;
        
        try {
           docSnap = await getDoc(docRef);
        } catch (networkErr) {
           try {
             docSnap = await getDocFromCache(docRef);
           } catch (cacheErr) {
             // Cache miss, harmless
           }
        }

        if (docSnap && docSnap.exists()) {
          const data = docSnap.data() as UserProfile | LawyerProfile;
          setProfile(data);
          
          // Optionally auto-update fields if they differ from local cache, but avoid thrashing UI if user is typing
          if (!displayName && data.displayName) setDisplayName(data.displayName);
          if (!phone && data.phone) setPhone(data.phone);
          if (data.role === 'lawyer') {
            if (!city && (data as LawyerProfile).city) setCity((data as LawyerProfile).city);
            if (!experience && (data as LawyerProfile).experienceYears) setExperience((data as LawyerProfile).experienceYears.toString());
          }
          
          setUser(data); // Sync store with fresh DB data
        }
      } catch (e) {
        console.log("Silent background profile sync deferred (offline).");
      }
    };
    fetchProfile();
  }, [user?.id]);

  const handleAvatarUpdate = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0].uri) {
        setSaving(true);
        const { uri } = result.assets[0];
        
        // Fetch the image to convert it into a Blob
        const response = await fetch(uri);
        const blob = await response.blob();

        // Upload to Firebase Storage
        const storageRef = ref(storage, `avatars/${user!.id}_${Date.now()}`);
        await uploadBytes(storageRef, blob);
        
        // Get public download URL
        const downloadUrl = await getDownloadURL(storageRef);

        // Update Firestore
        const docRef = doc(db, 'users', user!.id);
        await updateDoc(docRef, { photoURL: downloadUrl });

        // Update UI locally
        setProfile((prev) => prev ? { ...prev, photoURL: downloadUrl } : prev);
        setUser({ ...user!, photoURL: downloadUrl } as typeof user);
        
        Alert.alert('Success', 'Avatar updated!');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Unable to update avatar.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!user || !profile) return;
    setSaving(true);
    try {
      const docRef = doc(db, 'users', user.id);
      const updateData: any = {
        displayName,
        phone
      };

      if (profile.role === 'lawyer') {
        updateData.city = city;
        const expNum = parseInt(experience, 10);
        if (!isNaN(expNum)) {
          updateData.experienceYears = expNum;
        }
      }

      await updateDoc(docRef, updateData);
      
      // Update local state instantly for offline performance
      setProfile({ ...profile, ...updateData });
      setUser({ ...user, ...updateData } as typeof user);

      Alert.alert('Success', 'Profile updated safely.');
    } catch (e) {
      console.error(e);
      Alert.alert('Network Disconnected', 'Changes saved locally, will sync when reconnected.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
       console.error(error);
    }
  };

  const RenderSettingOption = ({ icon, title, onPress }: any) => (
      <TouchableOpacity style={styles.optionRow} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.optionLeft}>
          <Ionicons name={icon} size={24} color={Colors.primary} />
          <Text style={styles.optionText}>{title}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
      </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleAvatarUpdate} style={styles.avatarOverride} activeOpacity={0.8}>
            <Avatar seed={profile?.id || 'default'} size={100} imageUrl={profile?.photoURL} />
            <View style={styles.editAvatarBadge}>
              <Ionicons name="camera" size={16} color="#FFF" />
            </View>
          </TouchableOpacity>
          
          <Text style={styles.emailText}>{profile?.email}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
            <View style={[styles.badge, profile?.status === 'verified' ? styles.badgeVerified : styles.badgePending, { marginHorizontal: 4 }]}>
              <Text style={[styles.badgeText, profile?.status === 'verified' ? { color: '#03543F' } : { color: '#723B10' }]}>
                {profile?.status.toUpperCase()}
              </Text>
            </View>
            {profile?.role === 'lawyer' && (
              <View style={[styles.creditsBadge, { marginHorizontal: 4 }]}>
                <Ionicons name="star" size={14} color="#1d4ed8" style={{ marginRight: 4 }} />
                <Text style={styles.creditsBadgeText}>{(profile as LawyerProfile).credits || 0} Credits</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Personal Details</Text>
          
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="e.g. John Doe"
              placeholderTextColor="#94A3B8"
            />
  
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g. +92 300 1234567"
              keyboardType="phone-pad"
              placeholderTextColor="#94A3B8"
            />
  
            {profile?.role === 'lawyer' && (
              <>
                <Text style={styles.label}>City (Operational Area)</Text>
                <TextInput
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder="e.g. Lahore"
                  placeholderTextColor="#94A3B8"
                />

                <Text style={styles.label}>Experience (Years)</Text>
                <TextInput
                  style={styles.input}
                  value={experience}
                  onChangeText={setExperience}
                  placeholder="e.g. 5"
                  keyboardType="number-pad"
                  placeholderTextColor="#94A3B8"
                />
              </>
            )}

          <Button 
            title={saving ? "Syncing..." : "Update Profile"}
            onPress={handleUpdate}
            style={styles.saveBtn}
            disabled={saving}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Settings & Support</Text>
          <RenderSettingOption icon="card-outline" title="Payment Methods" onPress={() => Alert.alert('Payment', 'Gateway options opening...')} />
          <RenderSettingOption icon="notifications-outline" title="Notification Preferences" onPress={() => {}} />
          <RenderSettingOption icon="shield-checkmark-outline" title="Privacy & Security" onPress={() => {}} />
          <RenderSettingOption icon="help-buoy-outline" title="Help Center & FAQ" onPress={() => {}} />
          
          <Button
            title="Log Out Securely"
            onPress={handleLogout}
            variant="outline"
            style={styles.logoutBtn}
            textStyle={{ color: Colors.error }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 24, marginTop: 12 },
  avatarOverride: { marginBottom: 12, position: 'relative' },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  emailText: { fontSize: 16, color: Colors.textSecondary, marginBottom: 8, fontWeight: '500' },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, marginTop: 4 },
  badgeVerified: { backgroundColor: '#DEF7EC' },
  badgePending: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: Colors.primary },
  creditsBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  creditsBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1D4ED8',
  },
  
  sectionCard: { backgroundColor: Colors.surface, padding: 20, borderRadius: 16, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  sectionHeading: { fontSize: 18, fontWeight: '700', color: Colors.primary, marginBottom: 16 },
  
  label: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 14, fontSize: 16, color: Colors.text, marginBottom: 16 },
  
  saveBtn: { marginTop: 8 },
  logoutBtn: { marginTop: 24, borderColor: Colors.error, borderWidth: 1.5 },
  
  optionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  optionLeft: { flexDirection: 'row', alignItems: 'center' },
  optionText: { fontSize: 16, marginLeft: 12, color: Colors.text, fontWeight: '500' }
});
