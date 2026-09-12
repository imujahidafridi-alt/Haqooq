import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  Alert, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity,
  Modal,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getCountFromServer } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { EmailAuthProvider, reauthenticateWithCredential, sendEmailVerification, deleteUser } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { db, auth, storage, functions } from '../../../services/firebaseConfig';
import { useAuthStore } from '../../../store/authStore';
import { Colors } from '../../../utils/Colors';
import { Button } from '../../../components/ui/Button';
import { Avatar } from '../../../components/ui/Avatar';
import { Card } from '../../../components/ui/Card';
import { KeyboardAwareScrollView, KeyboardAwareTextInput } from '../../../components/ui/KeyboardAwareScrollView';
import { UserProfile, LawyerProfile } from '../../../types/models';
import { logoutUser } from '../../auth/services/authService';
import { 
  CANONICAL_PRACTICE_AREAS, 
  PracticeArea, 
  normalizeSpecialization, 
  CITIES,
  PRACTICE_AREA_ICONS 
} from '../../../constants/legalDomains';
import { editableClientProfileSchema, editableLawyerProfileSchema } from '../../../types/schemas';
import { 
  SUPPORT_CONFIG, 
  contactSupportViaPhone, 
  contactSupportViaEmail, 
  contactSupportViaWhatsApp 
} from '../../../constants/supportConfig';
import { isVerifiedLawyer } from '../../../utils/userUtils';

export const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const { user, setUser, logout } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | LawyerProfile | null>(user);

  // Form states & draft dirty tracking
  const [isDirty, setIsDirty] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [city, setCity] = useState(user?.city || (user?.role === 'lawyer' ? (user as LawyerProfile).city || 'Lahore' : 'Lahore'));
  
  const updateDisplayName = (val: string) => {
    setDisplayName(val);
    setIsDirty(true);
  };
  const updatePhone = (val: string) => {
    setPhone(val);
    setIsDirty(true);
  };
  const updateCity = (val: string) => {
    setCity(val);
    setIsDirty(true);
  };
  
  // Lawyer-specific specializations (normalized)
  const initialSpecs = (user?.role === 'lawyer' && (user as LawyerProfile).specialization)
    ? (user as LawyerProfile).specialization.map(s => normalizeSpecialization(s))
    : ['Property / Real Estate Law' as PracticeArea];
  const [selectedSpecs, setSelectedSpecs] = useState<PracticeArea[]>(Array.from(new Set(initialSpecs)).slice(0, 5));

  // Client Activity Metrics (Server-side counts)
  const [activeCasesCount, setActiveCasesCount] = useState<number | null>(null);
  const [openCasesCount, setOpenCasesCount] = useState<number | null>(null);

  // UI state
  const [saving, setSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [inlineNotice, setInlineNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [showHelpModal, setShowHelpModal] = useState(false);

  const isLawyer = profile?.role === 'lawyer';
  const lawyerMetrics = isLawyer ? (profile as LawyerProfile) : null;
  const isEmailAuth = auth.currentUser?.providerData.some(p => p.providerId === 'password');

  // Load fresh profile & client activity metrics
  useEffect(() => {
    if (!user?.id) return;

    const loadData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.id));
        if (userDoc.exists()) {
          const freshData = userDoc.data() as UserProfile | LawyerProfile;
          setProfile(freshData);
          // Draft Isolation: Never overwrite user's unsaved form edits
          if (!isDirty) {
            if (freshData.displayName) setDisplayName(freshData.displayName);
            if (freshData.phone) setPhone(freshData.phone);
            if (freshData.city) setCity(freshData.city);
            if (freshData.role === 'lawyer' && (freshData as LawyerProfile).specialization) {
              const normalized = (freshData as LawyerProfile).specialization.map(s => normalizeSpecialization(s));
              setSelectedSpecs(Array.from(new Set(normalized)).slice(0, 5));
            }
          }
          setUser(freshData);
        }

        // Fetch client activity via server-side getCountFromServer
        if (user.role === 'client') {
          const openQ = query(collection(db, 'cases'), where('clientId', '==', user.id), where('status', '==', 'open'));
          const activeQ = query(collection(db, 'cases'), where('clientId', '==', user.id), where('status', 'in', ['active', 'under_review']));
          
          const [openSnap, activeSnap] = await Promise.all([
            getCountFromServer(openQ),
            getCountFromServer(activeQ)
          ]);
          setOpenCasesCount(openSnap.data().count);
          setActiveCasesCount(activeSnap.data().count);
        }
      } catch (e) {
        console.warn('Silent background profile load note:', e);
      }
    };

    loadData();
  }, [user?.id]);

  // Deterministic Avatar Upload (Zero orphaned files)
  const handleAvatarUpdate = async () => {
    if (isUploadingAvatar || !user) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
      });

      if (result.canceled || !result.assets[0]?.uri) return;

      setIsUploadingAvatar(true);
      const { uri } = result.assets[0];

      const response = await fetch(uri);
      const blob = await response.blob();

      // Deterministic path: /avatars/{userId}/profile.jpg
      const storageRef = ref(storage, `avatars/${user.id}/profile.jpg`);
      await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
      const downloadUrl = await getDownloadURL(storageRef);

      // Update Firestore
      await updateDoc(doc(db, 'users', user.id), { photoURL: downloadUrl });

      setProfile(prev => prev ? { ...prev, photoURL: downloadUrl } : prev);
      setUser({ ...user, photoURL: downloadUrl } as typeof user);

      setInlineNotice({ text: 'Avatar successfully updated!', type: 'success' });
      setTimeout(() => setInlineNotice(null), 4000);
    } catch (e: any) {
      setInlineNotice({ text: 'Failed to update avatar. Please try again.', type: 'error' });
      setTimeout(() => setInlineNotice(null), 4000);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Toggle Lawyer Specialization (Max 5, min 1)
  const toggleSpecialization = (area: PracticeArea) => {
    setIsDirty(true);
    if (selectedSpecs.includes(area)) {
      if (selectedSpecs.length <= 1) {
        Alert.alert('Required', 'You must maintain at least 1 primary practice area.');
        return;
      }
      setSelectedSpecs(prev => prev.filter(s => s !== area));
    } else {
      if (selectedSpecs.length >= 5) {
        Alert.alert('Limit Reached', 'You can select up to 5 legal practice areas.');
        return;
      }
      setSelectedSpecs(prev => [...prev, area]);
    }
  };

  // Save Profile (Restricted to editable contract fields)
  const handleSaveProfile = async () => {
    if (!user || !profile || saving) return;
    setSaving(true);
    setInlineNotice(null);

    try {
      const userRef = doc(db, 'users', user.id);

      if (isLawyer) {
        // Validate lawyer contract
        const validated = editableLawyerProfileSchema.parse({
          displayName: displayName.trim(),
          phone: phone.trim() || undefined,
          city: city.trim() || undefined,
          specialization: selectedSpecs,
        });

        const updatePayload = {
          displayName: validated.displayName,
          phone: validated.phone || null,
          city: validated.city || 'Lahore',
          specialization: validated.specialization,
        };

        await updateDoc(userRef, updatePayload);
        setProfile(prev => prev ? ({ ...prev, ...updatePayload } as any) : prev);
        setUser({ ...user, ...updatePayload } as any);
      } else {
        // Validate client contract
        const validated = editableClientProfileSchema.parse({
          displayName: displayName.trim(),
          phone: phone.trim() || undefined,
          city: city.trim() || undefined,
        });

        const updatePayload = {
          displayName: validated.displayName,
          phone: validated.phone || null,
          city: validated.city || 'Lahore',
        };

        await updateDoc(userRef, updatePayload);
        setProfile(prev => prev ? ({ ...prev, ...updatePayload } as any) : prev);
        setUser({ ...user, ...updatePayload } as any);
      }

      setInlineNotice({ text: 'Profile updated successfully!', type: 'success' });
      setIsDirty(false);
      setTimeout(() => setInlineNotice(null), 4000);
    } catch (err: any) {
      const errMsg = err?.errors?.[0]?.message || err?.message || 'Unable to update profile.';
      setInlineNotice({ text: errMsg, type: 'error' });
      setTimeout(() => setInlineNotice(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  // Resend Email Verification
  const handleResendEmailVerification = async () => {
    if (!auth.currentUser) return;
    try {
      await sendEmailVerification(auth.currentUser);
      Alert.alert('Verification Sent', 'A verification email has been sent to your inbox.');
    } catch (e: any) {
      Alert.alert('Notice', 'Unable to send verification email. Please try again later.');
    }
  };

  // Open Privacy Policy in WebBrowser
  const handleOpenPrivacyPolicy = async () => {
    try {
      await WebBrowser.openBrowserAsync('https://haqooq.pk/privacy');
    } catch (e) {
      Alert.alert('Privacy Policy', 'Haqooq protects all client-advocate communications under strict legal confidentiality.');
    }
  };

  // Open Terms of Service in WebBrowser
  const handleOpenTerms = async () => {
    try {
      await WebBrowser.openBrowserAsync('https://haqooq.pk/privacy');
    } catch (e) {
      Alert.alert('Terms of Service', 'Available at https://haqooq.pk/terms');
    }
  };

  // Two-Step Re-Authentication + Server-Authoritative Account Deletion
  const handleConfirmAccountDeletion = async () => {
    setDeleteError(null);

    if (deleteConfirmText.trim() !== 'DELETE') {
      setDeleteError('Please type "DELETE" exactly to confirm.');
      return;
    }

    setIsDeleting(true);
    try {
      const currentAuthUser = auth.currentUser;
      if (!currentAuthUser) throw new Error('Authentication expired. Please log in again.');

      // 1. Explicit Re-Authentication for Password users
      if (isEmailAuth) {
        if (!deletePassword) {
          setDeleteError('Please enter your account password to confirm ownership.');
          setIsDeleting(false);
          return;
        }
        const credential = EmailAuthProvider.credential(currentAuthUser.email!, deletePassword);
        await reauthenticateWithCredential(currentAuthUser, credential);
      }

      // 2. Server-Authoritative Cleanup (with direct Spark Plan fallback)
      try {
        const deleteUserFn = httpsCallable(functions, 'deleteUserAccount');
        await deleteUserFn();
      } catch (fnErr: any) {
        console.warn('Cloud function deleteUserAccount not deployed, executing direct client cleanup:', fnErr?.message);
        await deleteDoc(doc(db, 'users', currentAuthUser.uid));
        await deleteUser(currentAuthUser);
      }

      // 3. Clear Local Store and Logout
      setShowDeleteModal(false);
      logout();
      Alert.alert('Account Deleted', 'Your account and personal data have been permanently removed.');
    } catch (err: any) {
      console.error('[Account Deletion Failed]', err);
      setDeleteError(err?.message || 'Failed to verify credentials or complete deletion.');
    } finally {
      setIsDeleting(false);
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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAwareScrollView 
        style={styles.container} 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={45}
      >
        {/* Inline Notice Toast */}
        {inlineNotice && (
          <View style={[
            styles.noticeBanner, 
            inlineNotice.type === 'success' ? styles.noticeSuccess : styles.noticeError
          ]}>
            <Ionicons 
              name={inlineNotice.type === 'success' ? 'checkmark-circle' : 'alert-circle'} 
              size={18} 
              color={inlineNotice.type === 'success' ? '#059669' : '#DC2626'} 
              style={{ marginRight: 8 }} 
            />
            <Text style={[
              styles.noticeText, 
              inlineNotice.type === 'success' ? styles.noticeTextSuccess : styles.noticeTextError
            ]}>
              {inlineNotice.text}
            </Text>
          </View>
        )}

        {/* ============================================================ */}
        {/* LAWYER ROLE VIEW */}
        {/* ============================================================ */}
        {isLawyer ? (
          <>
            {/* Professional Hero */}
            <View style={styles.lawyerHeroCard}>
              <View style={styles.heroTopRow}>
                <TouchableOpacity 
                  onPress={handleAvatarUpdate} 
                  style={styles.avatarWrapper} 
                  activeOpacity={0.8}
                  disabled={isUploadingAvatar}
                >
                  <Avatar seed={profile?.id || 'lawyer'} size={84} imageUrl={profile?.photoURL} />
                  {isUploadingAvatar ? (
                    <View style={styles.avatarLoadingOverlay}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    </View>
                  ) : (
                    <View style={styles.cameraBadge}>
                      <Ionicons name="camera" size={14} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.heroDetails}>
                  <Text style={styles.lawyerName} numberOfLines={1}>{profile?.displayName || 'Counselor'}</Text>
                  
                  {/* Verified Bar Standing Pill */}
                  <View style={styles.standingPillRow}>
                    {isVerifiedLawyer(profile) ? (
                      <View style={styles.verifiedPill}>
                        <Ionicons name="shield-checkmark" size={13} color="#059669" style={{ marginRight: 4 }} />
                        <Text style={styles.verifiedPillText}>Verified by Bar Council</Text>
                      </View>
                    ) : (
                      <View 
                        style={[styles.pendingPill, { 
                          backgroundColor: profile?.status === 'suspended' ? '#FEF2F2' : '#FEF3C7', 
                          borderColor: profile?.status === 'suspended' ? Colors.error : '#F59E0B' 
                        }]}
                      >
                        <Ionicons 
                          name={profile?.status === 'suspended' ? 'alert-circle' : 'time-outline'} 
                          size={13} 
                          color={profile?.status === 'suspended' ? Colors.error : '#B45309'} 
                          style={{ marginRight: 4 }} 
                        />
                        <Text 
                          style={[styles.pendingPillText, { 
                            color: profile?.status === 'suspended' ? Colors.error : '#B45309', 
                            fontWeight: '700' 
                          }]}
                        >
                          {profile?.status === 'suspended' 
                            ? 'Account Suspended' 
                            : profile?.status === 'under_review' 
                              ? 'Verification In Review' 
                              : profile?.status === 'rejected'
                                ? 'Verification Rejected'
                                : 'Pending Bar Verification'}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Ionicons name="location-sharp" size={13} color={Colors.textSecondary} style={{ marginRight: 3 }} />
                    <Text style={styles.cityText}>{city || 'Pakistan'}</Text>
                  </View>
                </View>
              </View>

              {/* Verified Metrics Stat Row */}
              <View style={styles.statMetricsRow}>
                <View style={styles.statMetricItem}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="star" size={15} color="#EAB308" style={{ marginRight: 4 }} />
                    <Text style={styles.statMetricValue}>
                      {lawyerMetrics?.rating ? lawyerMetrics.rating.toFixed(1) : 'New'}
                    </Text>
                  </View>
                  <Text style={styles.statMetricLabel}>
                    {lawyerMetrics?.ratingCount ? `${lawyerMetrics.ratingCount} Reviews` : 'No reviews yet'}
                  </Text>
                </View>

                <View style={styles.statMetricDivider} />

                <View style={styles.statMetricItem}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="lock-closed" size={13} color={Colors.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.statMetricValue}>
                      {lawyerMetrics?.experienceYears ? `${lawyerMetrics.experienceYears} Years` : 'Junior'}
                    </Text>
                  </View>
                  <Text style={styles.statMetricLabel}>Bar Standing</Text>
                </View>

                <View style={styles.statMetricDivider} />

                <View style={styles.statMetricItem}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="ribbon" size={14} color="#1D4ED8" style={{ marginRight: 4 }} />
                    <Text style={[styles.statMetricValue, { color: '#1D4ED8' }]}>Active</Text>
                  </View>
                  <Text style={styles.statMetricLabel}>Enrollment</Text>
                </View>
              </View>
            </View>

            {/* Bar Council Verification Status Card if not verified */}
            {profile?.status !== 'verified' && (
              <Card style={[styles.card, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A', borderWidth: 1.5 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Ionicons name="shield-checkmark" size={22} color="#D97706" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#92400E' }}>Bar Council Verification Required</Text>
                </View>
                <Text style={{ fontSize: 13, color: '#78350F', marginBottom: 12, lineHeight: 18 }}>
                  {profile?.status === 'suspended'
                    ? 'Your advocate account is currently suspended. Please reach out to Haqooq legal support for assistance.'
                    : profile?.status === 'rejected'
                      ? 'Your Bar Council credentials could not be verified by compliance. Please contact support to provide updated documentation.'
                      : 'Advocate marketplace access requires administrative verification of your Bar Council standing. Once approved by compliance, you will be able to submit case proposals.'}
                </Text>
                <Button
                  title="Contact Support Desk"
                  onPress={() => setShowHelpModal(true)}
                  variant="outline"
                  style={{ borderColor: '#D97706' }}
                />
              </Card>
            )}

            {/* Practice & Specializations Card */}
            <Card style={styles.card}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Practice Areas & Specialization</Text>
                <Text style={styles.specCountBadge}>{selectedSpecs.length}/5</Text>
              </View>
              <Text style={styles.sectionSub}>
                Select up to 5 primary legal areas where you accept client matters:
              </Text>

              <View style={styles.chipsContainer}>
                {CANONICAL_PRACTICE_AREAS.map(area => {
                  const isSelected = selectedSpecs.includes(area);
                  return (
                    <TouchableOpacity
                      key={area}
                      style={[styles.specChip, isSelected && styles.specChipActive]}
                      onPress={() => toggleSpecialization(area)}
                      activeOpacity={0.7}
                    >
                      <Ionicons 
                        name={PRACTICE_AREA_ICONS[area]} 
                        size={15} 
                        color={isSelected ? '#FFFFFF' : Colors.primary} 
                        style={{ marginRight: 5 }}
                      />
                      <Text style={[styles.specChipText, isSelected && styles.specChipTextActive]}>
                        {area}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Operational City Selector */}
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Primary Operational City</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8 }}>
                {CITIES.map(c => {
                  const isSelected = city === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[styles.cityChip, isSelected && styles.cityChipActive]}
                      onPress={() => updateCity(c)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.cityChipText, isSelected && styles.cityChipTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Personal Contact Fields */}
              <Text style={styles.inputLabel}>Advocate Full Name</Text>
              <KeyboardAwareTextInput
                style={styles.textInput}
                value={displayName}
                onChangeText={updateDisplayName}
                placeholder="e.g. Barrister Ali Khan"
                placeholderTextColor={Colors.textSecondary}
              />

              <Text style={styles.inputLabel}>Direct Contact Phone (Private)</Text>
              <KeyboardAwareTextInput
                style={styles.textInput}
                value={phone}
                onChangeText={updatePhone}
                placeholder="e.g. +92 300 1234567"
                keyboardType="phone-pad"
                placeholderTextColor={Colors.textSecondary}
              />

              {/* Read-Only Verified Experience Banner */}
              <View style={styles.readOnlyExperienceBox}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#1D4ED8" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.readOnlyExperienceTitle}>
                    Verified Experience: {lawyerMetrics?.experienceYears || 0} Years
                  </Text>
                  <Text style={styles.readOnlyExperienceSub}>
                    Standing years are permanently bound to your Bar Council enrollment certificate.
                  </Text>
                </View>
              </View>

              <Button
                title={saving ? "Saving Changes..." : "Save Profile Details"}
                onPress={handleSaveProfile}
                isLoading={saving}
                style={{ marginTop: 12 }}
              />
            </Card>

            {/* Bidding Credits & Reputation Card */}
            <Card style={styles.card}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Bidding Credits & Standing</Text>
                {lawyerMetrics?.isPremium && (
                  <View style={styles.proBadge}>
                    <Text style={styles.proBadgeText}>PRO ADVOCATE</Text>
                  </View>
                )}
              </View>
              <Text style={styles.sectionSub}>Credits are used to submit verified proposals on open client matters.</Text>

              <View style={styles.creditsDisplayRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.creditIconCircle}>
                    <Ionicons name="sparkles" size={20} color="#1D4ED8" />
                  </View>
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.creditCount}>{lawyerMetrics?.credits || 0} Credits</Text>
                    <Text style={styles.creditSub}>Available Proposal Balance</Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.getCreditsBtn}
                  onPress={() => navigation.navigate('Pro')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.getCreditsBtnText}>Get Credits →</Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* Public Presence Card */}
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Public Client Profile</Text>
              <Text style={styles.sectionSub}>
                Preview your sanitized public card as prospective clients see it when searching for advocates.
              </Text>

              <TouchableOpacity
                style={styles.previewButton}
                onPress={() => navigation.navigate('PublicProfile', { userId: user!.id })}
                activeOpacity={0.75}
              >
                <Ionicons name="eye-outline" size={18} color={Colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.previewButtonText}>Preview My Public Profile</Text>
                <Ionicons name="arrow-forward" size={16} color={Colors.primary} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            </Card>
          </>
        ) : (
          /* ============================================================ */
          /* CLIENT ROLE VIEW */
          /* ============================================================ */
          <>
            {/* Client Identity Card */}
            <Card style={styles.card}>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <TouchableOpacity 
                  onPress={handleAvatarUpdate} 
                  style={styles.avatarWrapper} 
                  activeOpacity={0.8}
                  disabled={isUploadingAvatar}
                >
                  <Avatar seed={profile?.id || 'client'} size={90} imageUrl={profile?.photoURL} />
                  {isUploadingAvatar ? (
                    <View style={styles.avatarLoadingOverlay}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    </View>
                  ) : (
                    <View style={styles.cameraBadge}>
                      <Ionicons name="camera" size={14} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={styles.clientHeroName}>{profile?.displayName || 'Registered Client'}</Text>
                <Text style={styles.clientHeroEmail}>{profile?.email}</Text>
              </View>

              <Text style={styles.inputLabel}>Full Name</Text>
              <KeyboardAwareTextInput
                style={styles.textInput}
                value={displayName}
                onChangeText={updateDisplayName}
                placeholder="e.g. Fatima Ahmed"
                placeholderTextColor={Colors.textSecondary}
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <KeyboardAwareTextInput
                style={styles.textInput}
                value={phone}
                onChangeText={updatePhone}
                placeholder="e.g. +92 300 1234567"
                keyboardType="phone-pad"
                placeholderTextColor={Colors.textSecondary}
              />

              <Text style={styles.inputLabel}>Preferred City (Auto-fills Post Case)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8 }}>
                {CITIES.map(c => {
                  const isSelected = city === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[styles.cityChip, isSelected && styles.cityChipActive]}
                      onPress={() => updateCity(c)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.cityChipText, isSelected && styles.cityChipTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Button
                title={saving ? "Saving Changes..." : "Update Profile"}
                onPress={handleSaveProfile}
                isLoading={saving}
                style={{ marginTop: 6 }}
              />
            </Card>

            {/* Client Activity Summary Card */}
            <Card style={styles.card}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>My Legal Engagements</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Cases')}>
                  <Text style={styles.viewAllLink}>View All →</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.sectionSub}>Summary of your marketplace case postings:</Text>

              <View style={styles.clientStatsRow}>
                <View style={styles.clientStatBox}>
                  <Text style={styles.clientStatNumber}>
                    {openCasesCount !== null ? openCasesCount : '…'}
                  </Text>
                  <Text style={styles.clientStatTitle}>Open Matters</Text>
                  <Text style={styles.clientStatSub}>Receiving bids</Text>
                </View>

                <View style={styles.clientStatBox}>
                  <Text style={[styles.clientStatNumber, { color: '#059669' }]}>
                    {activeCasesCount !== null ? activeCasesCount : '…'}
                  </Text>
                  <Text style={styles.clientStatTitle}>Active Cases</Text>
                  <Text style={styles.clientStatSub}>Lawyer engaged</Text>
                </View>
              </View>
            </Card>
          </>
        )}

        {/* ============================================================ */}
        {/* COMMON ACCOUNT & SECURITY SECTION (Both Roles) */}
        {/* ============================================================ */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Account & Security</Text>
          <Text style={styles.sectionSub}>Manage authentication, legal policies, and platform data.</Text>

          {/* Email Verification Status */}
          <View style={styles.accountRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.accountRowTitle}>Email Verification</Text>
              <Text style={styles.accountRowSub}>{profile?.email}</Text>
            </View>
            {auth.currentUser?.emailVerified ? (
              <View style={styles.verifiedTag}>
                <Ionicons name="checkmark-circle" size={14} color="#059669" style={{ marginRight: 4 }} />
                <Text style={styles.verifiedTagText}>Verified</Text>
              </View>
            ) : (
              <TouchableOpacity onPress={handleResendEmailVerification} style={styles.unverifiedBtn}>
                <Text style={styles.unverifiedBtnText}>Send Link</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Connected Provider */}
          <View style={styles.accountRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.accountRowTitle}>Sign-In Provider</Text>
              <Text style={styles.accountRowSub}>
                {isEmailAuth ? 'Email & Password' : 'Google Authentication'}
              </Text>
            </View>
            <Ionicons 
              name={isEmailAuth ? 'mail-outline' : 'logo-google'} 
              size={18} 
              color={Colors.primary} 
            />
          </View>

          {/* Real Destinations: Privacy Policy */}
          <TouchableOpacity style={styles.settingLinkRow} onPress={handleOpenPrivacyPolicy} activeOpacity={0.7}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} style={{ marginRight: 10 }} />
              <Text style={styles.settingLinkText}>Privacy Policy</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>

          {/* Terms of Service */}
          <TouchableOpacity style={styles.settingLinkRow} onPress={handleOpenTerms} activeOpacity={0.7}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="document-text-outline" size={20} color={Colors.primary} style={{ marginRight: 10 }} />
              <Text style={styles.settingLinkText}>Terms of Service</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>

          {/* Admin Verification Portal Access */}
          {Boolean(user?.role === 'admin' || user?.email === 'imujahidafridi@gmail.com') && (
            <TouchableOpacity 
              style={[styles.settingLinkRow, { backgroundColor: '#EFF6FF', borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#BFDBFE' }]} 
              onPress={() => navigation.navigate('AdminRoot')} 
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="shield-checkmark" size={20} color="#1D4ED8" style={{ marginRight: 10 }} />
                <Text style={[styles.settingLinkText, { color: '#1D4ED8', fontWeight: '700' }]}>Admin Verification Portal</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#1D4ED8" />
            </TouchableOpacity>
          )}

          {/* Help & Support Modal */}
          <TouchableOpacity style={styles.settingLinkRow} onPress={() => setShowHelpModal(true)} activeOpacity={0.7}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="help-buoy-outline" size={20} color={Colors.primary} style={{ marginRight: 10 }} />
              <Text style={styles.settingLinkText}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>

          {/* Google Play Compliant Account Deletion */}
          <TouchableOpacity 
            style={styles.deleteAccountRow} 
            onPress={() => {
              setDeletePassword('');
              setDeleteConfirmText('');
              setDeleteError(null);
              setShowDeleteModal(true);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color="#DC2626" style={{ marginRight: 10 }} />
            <Text style={styles.deleteAccountText}>Delete Account & Data</Text>
          </TouchableOpacity>
        </Card>

        {/* Secure Log Out Button */}
        <Button
          title="Log Out Securely"
          onPress={handleLogout}
          variant="outline"
          style={styles.logoutBtn}
          textStyle={{ color: Colors.error, fontWeight: '700' }}
        />
      </KeyboardAwareScrollView>

      {/* Two-Step Re-Authentication + Deletion Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalBackdrop} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.deleteModalContent, { maxHeight: '90%' }]}>
            <KeyboardAwareScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              extraScrollHeight={30}
              contentContainerStyle={{ alignItems: 'center' }}
            >
              <View style={styles.deleteModalHeader}>
                <View style={styles.deleteWarningCircle}>
                  <Ionicons name="warning" size={28} color="#DC2626" />
                </View>
                <Text style={styles.deleteModalTitle}>Delete Account Permanently</Text>
                <Text style={styles.deleteModalSub}>
                  This action is irreversible. Your profile, authentication credentials, and active listings will be removed. Transactional history will be anonymized.
                </Text>
              </View>

              {/* Re-Authentication password if Email user */}
              {isEmailAuth && (
                <View style={{ width: '100%', marginBottom: 12 }}>
                  <Text style={styles.deleteModalInputLabel}>Enter Your Password to Verify Identity *</Text>
                  <KeyboardAwareTextInput
                    style={styles.deleteTextInput}
                    secureTextEntry
                    placeholder="Account Password"
                    placeholderTextColor={Colors.textSecondary}
                    value={deletePassword}
                    onChangeText={setDeletePassword}
                  />
                </View>
              )}

              <View style={{ width: '100%', marginBottom: 16 }}>
                <Text style={styles.deleteModalInputLabel}>Type "DELETE" to Confirm *</Text>
                <KeyboardAwareTextInput
                  style={styles.deleteTextInput}
                  placeholder="DELETE"
                  placeholderTextColor={Colors.textSecondary}
                  autoCapitalize="characters"
                  value={deleteConfirmText}
                  onChangeText={setDeleteConfirmText}
                />
              </View>

              {deleteError && (
                <View style={styles.deleteErrorBox}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" style={{ marginRight: 6 }} />
                  <Text style={styles.deleteErrorText}>{deleteError}</Text>
                </View>
              )}

              <Button
                title="Permanently Delete My Account"
                onPress={handleConfirmAccountDeletion}
                isLoading={isDeleting}
                style={{ width: '100%', backgroundColor: '#DC2626', marginBottom: 10 }}
              />

              <TouchableOpacity 
                onPress={() => setShowDeleteModal(false)} 
                disabled={isDeleting}
                style={{ paddingVertical: 8 }}
              >
                <Text style={styles.cancelDeleteText}>Cancel and Keep Account</Text>
              </TouchableOpacity>
            </KeyboardAwareScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Help & Support Modal */}
      <Modal
        visible={showHelpModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHelpModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.helpModalContent}>
            <View style={styles.helpHeaderRow}>
              <Text style={styles.helpTitle}>Haqooq Help & Support</Text>
              <TouchableOpacity onPress={() => setShowHelpModal(false)}>
                <Ionicons name="close-circle" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.helpItem} activeOpacity={0.7} onPress={contactSupportViaPhone}>
              <Ionicons name="call-outline" size={20} color={Colors.primary} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.helpItemTitle}>Helpline & Legal Concierge (Tap to Call)</Text>
                <Text style={[styles.helpItemVal, { color: Colors.primary, fontWeight: '700' }]}>{SUPPORT_CONFIG.phoneNumber}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.helpItem} activeOpacity={0.7} onPress={() => contactSupportViaEmail()}>
              <Ionicons name="mail-outline" size={20} color={Colors.primary} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.helpItemTitle}>Official Support Email (Tap to Mail)</Text>
                <Text style={[styles.helpItemVal, { color: Colors.primary, fontWeight: '700' }]}>{SUPPORT_CONFIG.email}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.helpItem} activeOpacity={0.7} onPress={() => contactSupportViaWhatsApp()}>
              <Ionicons name="logo-whatsapp" size={20} color="#16A34A" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.helpItemTitle}>Direct WhatsApp Support</Text>
                <Text style={[styles.helpItemVal, { color: '#16A34A', fontWeight: '700' }]}>{SUPPORT_CONFIG.phoneNumber}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles.helpItem}>
              <Ionicons name="time-outline" size={20} color={Colors.primary} style={{ marginRight: 10 }} />
              <View>
                <Text style={styles.helpItemTitle}>Operating Hours</Text>
                <Text style={styles.helpItemVal}>{SUPPORT_CONFIG.operatingHours}</Text>
              </View>
            </View>

            <Button
              title="Close"
              variant="outline"
              onPress={() => setShowHelpModal(false)}
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
  },
  noticeSuccess: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  noticeError: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  noticeText: { fontSize: 13, fontWeight: '600', flex: 1 },
  noticeTextSuccess: { color: '#065F46' },
  noticeTextError: { color: '#991B1B' },

  lawyerHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  avatarLoadingOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Colors.primary,
    padding: 6,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  heroDetails: {
    flex: 1,
  },
  lawyerName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  standingPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DEF7EC',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  verifiedPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#03543F',
  },
  pendingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  pendingPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  cityText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  statMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statMetricItem: {
    alignItems: 'center',
  },
  statMetricValue: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  statMetricLabel: {
    fontSize: 10.5,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statMetricDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  sectionSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
    lineHeight: 17,
  },
  specCountBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    backgroundColor: '#EFF6FF',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  specChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  specChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  specChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  cityChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cityChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  cityChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  cityChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.text,
    marginBottom: 12,
  },
  readOnlyExperienceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    marginBottom: 6,
  },
  readOnlyExperienceTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  readOnlyExperienceSub: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 1,
  },

  proBadge: {
    backgroundColor: '#FDF2F8',
    borderColor: '#F472B6',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DB2777',
  },
  creditsDisplayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  creditIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditCount: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  creditSub: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  getCreditsBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  getCreditsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    borderRadius: 10,
  },
  previewButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },

  clientHeroName: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 8,
  },
  clientHeroEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  viewAllLink: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  clientStatsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  clientStatBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    alignItems: 'center',
  },
  clientStatNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 2,
  },
  clientStatTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  clientStatSub: {
    fontSize: 10.5,
    color: Colors.textSecondary,
    marginTop: 1,
  },

  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  accountRowTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  accountRowSub: {
    fontSize: 11.5,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  verifiedTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  unverifiedBtn: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  unverifiedBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  settingLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingLinkText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: Colors.text,
  },
  deleteAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
  },
  deleteAccountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  logoutBtn: {
    marginTop: 8,
    borderColor: Colors.error,
    borderWidth: 1.5,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
  },
  deleteModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteWarningCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  deleteModalSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  deleteModalInputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  deleteTextInput: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.text,
  },
  deleteErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
    width: '100%',
  },
  deleteErrorText: {
    fontSize: 11.5,
    color: '#DC2626',
    fontWeight: '600',
    flex: 1,
  },
  cancelDeleteText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  helpModalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  helpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  helpTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  helpItemTitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  helpItemVal: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 1,
  },
});
