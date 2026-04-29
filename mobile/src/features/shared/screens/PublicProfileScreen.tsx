import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';
import { UserProfile, LawyerProfile } from '../../../types/models';
import { Avatar } from '../../../components/ui/Avatar';
import { Colors } from '../../../utils/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../../components/ui/Card';

export const PublicProfileScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const userId = route.params?.userId;
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      const fetchProfile = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            setProfile({ id: userDoc.id, ...userDoc.data() } as UserProfile);
            navigation.setOptions({ title: userDoc.data().displayName || 'Profile' });
          }
        } catch (e) {
          console.warn("Could not fetch user profile", e);
        } finally {
          setLoading(false);
        }
      };
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [userId, navigation]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>User Profile Not Found</Text>
      </View>
    );
  }

  const isLawyer = profile.role === 'lawyer';
  const lawyerData = profile as LawyerProfile;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Avatar seed={profile.id} size={100} style={styles.avatar} />
        <Text style={styles.name}>{profile.displayName || 'Unknown User'}</Text>
        <Text style={styles.role}>{isLawyer ? 'Legal Professional' : 'Client'}</Text>
        <View style={styles.badgeContainer}>
          {profile.status === 'verified' && <Ionicons name="checkmark-circle" size={20} color={Colors.success} />}
          <Text style={styles.badgeText}>{profile.status === 'verified' ? ' Verified User' : ' Unverified'}</Text>
        </View>
      </View>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} />
          <Text style={styles.infoText}>Protected Email Contact</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />
          <Text style={styles.infoText}>Member since {profile.createdAt ? new Date(profile.createdAt).getFullYear() : '2023'}</Text>
        </View>
      </Card>

      {isLawyer ? (
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Professional Details</Text>
          <View style={styles.infoRow}>
            <Ionicons name="briefcase-outline" size={20} color={Colors.primary} />
            <Text style={styles.infoText}>{lawyerData.specialization?.join(', ') || 'General Law'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color={Colors.primary} />
            <Text style={styles.infoText}>{lawyerData.experienceYears} Years Experience</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="documents-outline" size={20} color={Colors.primary} />
            <Text style={styles.infoText}>License: {lawyerData.credentialUrl ? 'Registered & Verified' : 'Pending Verification'}</Text>
          </View>
        </Card>
      ) : (
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Client Activity</Text>
          <View style={styles.infoRow}>
            <Ionicons name="folder-open-outline" size={20} color={Colors.primary} />
            <Text style={styles.infoText}>Active Cases via haqooq marketplace</Text>
          </View>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  card: {
    margin: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
    flex: 1,
  },
});
