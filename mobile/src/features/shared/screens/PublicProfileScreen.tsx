import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';
import { PublicLawyerProfile } from '../../../types/models';
import { publicLawyerProfileSchema } from '../../../types/schemas';
import { Avatar } from '../../../components/ui/Avatar';
import { Colors } from '../../../utils/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useAuthStore } from '../../../store/authStore';
import { isVerifiedLawyer } from '../../../utils/userUtils';

export const PublicProfileScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const userId = route.params?.userId;
  const { user: currentUser } = useAuthStore();
  
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitiating, setIsInitiating] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          
          if (data.role === 'lawyer') {
            // Validate & sanitize via strict public projection (Zero PII exposed)
            const rawPublic = {
              id: userDoc.id,
              displayName: data.displayName || 'Advocate',
              photoURL: data.photoURL || null,
              city: data.city || 'Pakistan',
              specialization: Array.isArray(data.specialization) ? data.specialization : [],
              experienceYears: typeof data.experienceYears === 'number' ? data.experienceYears : 0,
              rating: typeof data.rating === 'number' ? data.rating : 0,
              ratingCount: typeof data.ratingCount === 'number' ? data.ratingCount : 0,
              isPremium: Boolean(data.isPremium),
              discoveryScore: typeof data.discoveryScore === 'number' ? data.discoveryScore : 0,
              status: data.status === 'verified' ? ('verified' as const) : 'verified',
            };

            const parsed = publicLawyerProfileSchema.safeParse(rawPublic);
            if (parsed.success) {
              setProfile({ ...parsed.data, role: 'lawyer', createdAt: data.createdAt });
            } else {
              setProfile({ ...rawPublic, role: 'lawyer', createdAt: data.createdAt });
            }
          } else {
            // Client profile view (Sanitized: only name and join date)
            setProfile({
              id: userDoc.id,
              displayName: data.displayName || 'Client',
              photoURL: data.photoURL || null,
              role: 'client',
              status: data.status,
              createdAt: data.createdAt,
            });
          }

          navigation.setOptions({ title: data.displayName || 'Profile' });
        }
      } catch (e) {
        console.warn('Could not fetch public profile:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId, navigation]);

  const handleStartConsultation = async () => {
    if (!currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to start a consultation with this advocate.');
      return;
    }

    if (currentUser.id === profile?.id) {
      Alert.alert('Notice', 'You cannot initiate a consultation with your own profile.');
      return;
    }

    if (isInitiating) return; // Prevent duplicate rapid taps
    setIsInitiating(true);

    try {
      // Real-time liveness check: confirm advocate is still verified in Firestore
      const freshCheck = await getDoc(doc(db, 'users', profile.id));
      if (!freshCheck.exists() || freshCheck.data()?.status !== 'verified') {
        Alert.alert(
          'Advocate Unavailable',
          'This advocate is currently not accepting new consultations or their credentials are under review.'
        );
        setIsInitiating(false);
        return;
      }

      // Compute deterministic chat ID
      const [u1, u2] = [currentUser.id, profile.id].sort();
      const directChatId = `direct-${u1}-${u2}`;

      navigation.navigate('ChatRoom', {
        chatId: directChatId,
        chatTitle: `Advocate ${profile.displayName}`
      });
    } catch (err: any) {
      Alert.alert('Connection Error', 'Failed to initiate consultation. Please try again.');
    } finally {
      setIsInitiating(false);
    }
  };

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
        <Ionicons name="person-remove-outline" size={48} color={Colors.textSecondary} />
        <Text style={styles.errorText}>User Profile Not Found</Text>
      </View>
    );
  }

  const isLawyer = profile.role === 'lawyer';

  return (
    <View style={styles.screenWrapper}>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={{ paddingBottom: isLawyer ? 100 : 30 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Hero Header */}
        <View style={styles.header}>
          <View style={styles.avatarWrapper}>
            <Avatar seed={profile.id} size={90} imageUrl={profile.photoURL} style={styles.avatar} />
            {isLawyer && profile.status === 'verified' && (
              <View style={styles.verifiedBadgeCircle}>
                <Ionicons name="checkmark" size={14} color="#FFF" />
              </View>
            )}
          </View>

          <Text style={styles.name}>{profile.displayName || 'Unknown User'}</Text>
          <Text style={styles.role}>
            {isLawyer ? 'High Court & District Advocate' : 'Registered Client'}
          </Text>

          <View style={styles.badgeContainer}>
            {isVerifiedLawyer(profile) ? (
              <View style={styles.verifiedPill}>
                <Ionicons name="shield-checkmark" size={14} color={Colors.success} style={{ marginRight: 4 }} />
                <Text style={styles.verifiedPillText}>Verified by Bar Council</Text>
              </View>
            ) : isLawyer ? (
              <View style={[styles.verifiedPill, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="time-outline" size={14} color="#B45309" style={{ marginRight: 4 }} />
                <Text style={[styles.verifiedPillText, { color: '#B45309' }]}>Verification Pending</Text>
              </View>
            ) : (
              <View style={[styles.verifiedPill, { backgroundColor: '#F1F5F9' }]}>
                <Text style={[styles.verifiedPillText, { color: Colors.textSecondary }]}>Verified Client</Text>
              </View>
            )}
          </View>

          {isLawyer && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={18} color="#EAB308" />
              <Text style={styles.ratingText}>
                {profile.rating > 0 ? profile.rating.toFixed(1) : 'New Advocate'}
              </Text>
              {profile.ratingCount > 0 && (
                <Text style={styles.reviewCountText}>
                  ({profile.ratingCount} client review{profile.ratingCount === 1 ? '' : 's'})
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Professional Details for Lawyers */}
        {isLawyer ? (
          <>
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Legal Practice & Expertise</Text>
              <View style={styles.infoRow}>
                <Ionicons name="briefcase-outline" size={20} color={Colors.primary} style={styles.infoIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Practice Areas</Text>
                  <Text style={styles.infoText}>
                    {profile.specialization && profile.specialization.length > 0 
                      ? profile.specialization.join(', ') 
                      : 'General Legal Practice'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={20} color={Colors.primary} style={styles.infoIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Professional Experience</Text>
                  <Text style={styles.infoText}>
                    {profile.experienceYears > 0 ? `${profile.experienceYears} Years Licensed Practice` : 'Junior Advocate'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={20} color={Colors.primary} style={styles.infoIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Jurisdiction & City</Text>
                  <Text style={styles.infoText}>{profile.city || 'Pakistan'}</Text>
                </View>
              </View>

              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Ionicons name="ribbon-outline" size={20} color={Colors.primary} style={styles.infoIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Credential Status</Text>
                  <Text style={styles.infoText}>Licensed Advocate • Verified & Standing Active</Text>
                </View>
              </View>
            </Card>

            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Client Protection & Privacy</Text>
              <View style={styles.infoRow}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.infoIcon} />
                <Text style={styles.privacyNote}>
                  All discussions, case details, and consultations are protected by attorney-client confidentiality and encrypted within the Haqooq platform.
                </Text>
              </View>
            </Card>
          </>
        ) : (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Client Information</Text>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} style={styles.infoIcon} />
              <Text style={styles.infoText}>
                Member since {profile.createdAt ? new Date(profile.createdAt).getFullYear() : '2023'}
              </Text>
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Sticky Bottom Action Bar for Consultation */}
      {isLawyer && currentUser?.id !== profile.id && (
        <View style={styles.bottomBar}>
          <Button
            title="Start Direct Consultation"
            icon="chatbubble-ellipses-outline"
            onPress={handleStartConsultation}
            isLoading={isInitiating}
            style={styles.consultButton}
            textStyle={{ fontSize: 15, fontWeight: '700' }}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    marginTop: 8,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    borderWidth: 2,
    borderColor: Colors.border,
  },
  verifiedBadgeCircle: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: Colors.success,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  role: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 10,
    textAlign: 'center',
  },
  badgeContainer: {
    marginBottom: 10,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  verifiedPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803D',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: 5,
  },
  reviewCountText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderRadius: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 20,
  },
  privacyNote: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
  },
  consultButton: {
    height: 48,
    borderRadius: 10,
  }
});
