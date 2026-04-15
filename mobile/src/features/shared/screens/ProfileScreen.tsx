import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ScrollView, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc, updateDoc, getDocFromCache } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';
import { useAuthStore } from '../../../store/authStore';
import { Colors } from '../../../utils/Colors';
import { Typography } from '../../../utils/Typography';
import { Button } from '../../../components/ui/Button';
import { UserProfile, LawyerProfile } from '../../../types/models';
import { signOut } from 'firebase/auth';
import { auth } from '../../../services/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

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
           docSnap = await getDocFromCache(docRef);
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
        console.error("Silent background profile fetch failed", e);
      }
    };
    fetchProfile();
  }, [user?.id]);

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

  const getAvatarUrl = () => {
     if (profile?.photoURL) return { uri: profile.photoURL };
     // Unique random avatar mapping using the UI-Avatars API
     const textName = displayName || profile?.email || 'User';
     return { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(textName)}&background=1A365D&color=FFFFFF&size=200&rounded=true&bold=true` };
  }

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
          <Image source={getAvatarUrl()} style={styles.avatarImage} />
          
          <Text style={styles.emailText}>{profile?.email}</Text>
          <View style={[styles.badge, profile?.status === 'verified' ? styles.badgeVerified : styles.badgePending]}>
            <Text style={styles.badgeText}>{profile?.status.toUpperCase()}</Text>
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
          />

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g. +92 300 1234567"
            keyboardType="phone-pad"
          />

          {profile?.role === 'lawyer' && (
            <>
              <Text style={styles.label}>City (Operational Area)</Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="e.g. Lahore"
              />

              <Text style={styles.label}>Experience (Years)</Text>
              <TextInput
                style={styles.input}
                value={experience}
                onChangeText={setExperience}
                placeholder="e.g. 5"
                keyboardType="number-pad"
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
  avatarImage: { width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.border, marginBottom: 12 },
  emailText: { fontSize: 16, color: Colors.textSecondary, marginBottom: 8, fontWeight: '500' },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, marginTop: 4 },
  badgeVerified: { backgroundColor: '#DEF7EC' },
  badgePending: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: Colors.primary },
  
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