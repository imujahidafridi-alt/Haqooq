import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';
import { useAuthStore } from '../../../store/authStore';
import { Colors } from '../../../utils/Colors';
import { Typography } from '../../../utils/Typography';
import { Button } from '../../../components/ui/Button';
import { UserProfile, LawyerProfile } from '../../../types/models';
import { signOut } from 'firebase/auth';
import { auth } from '../../../services/firebaseConfig';

export const ProfileScreen = () => {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | LawyerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Lawyer specific
  const [city, setCity] = useState('');
  const [experience, setExperience] = useState('');
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'users', user.id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile | LawyerProfile;
          setProfile(data);
          setDisplayName(data.displayName || '');
          setPhone(data.phone || '');
          if (data.role === 'lawyer') {
            setCity((data as LawyerProfile).city || '');
            setExperience((data as LawyerProfile).experienceYears?.toString() || '');
          }
        }
      } catch (e) {
        console.error("Error fetching profile", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

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
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to update profile.');
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

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatar}>
           <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.emailText}>{profile?.email}</Text>
        <View style={[styles.badge, profile?.status === 'verified' ? styles.badgeVerified : styles.badgePending]}>
          <Text style={styles.badgeText}>{profile?.status.toUpperCase()}</Text>
        </View>
      </View>

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
          <Text style={styles.label}>City</Text>
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
        title={saving ? "Saving..." : "Save Changes"}
        onPress={handleUpdate}
        style={styles.saveBtn}
        disabled={saving}
      />

      <Button
        title="Logout"
        onPress={handleLogout}
        variant="danger"
        style={styles.logoutBtn}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 32 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#FFF' },
  emailText: { fontSize: 16, color: Colors.textSecondary, marginBottom: 8 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeVerified: { backgroundColor: '#E8F5E9' },
  badgePending: { backgroundColor: '#FFF3E0' },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: Colors.text },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, fontSize: 16, color: Colors.text, marginBottom: 20 },
  saveBtn: { marginTop: 12 },
  logoutBtn: { marginTop: 16, borderColor: '#F44336' }
});