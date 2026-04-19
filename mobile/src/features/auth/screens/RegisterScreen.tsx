import React, { useState } from 'react';
import {
  View, StyleSheet, TextInput, Text, Alert,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView,
  Platform, TouchableWithoutFeedback, Keyboard, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../store/authStore';
import { registerUser, signInWithGoogleCredential } from '../services/authService';
import { UserRole } from '../../../types/models';
import { GoogleSignin, statusCodes, isErrorWithCode } from '@react-native-google-signin/google-signin';
import { Ionicons } from '@expo/vector-icons';
import { handleAuthError } from '../../../utils/authErrorHandler';

export const RegisterScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('client');
  const [city, setCity] = useState('');
  const [specialization, setSpecialization] = useState<string>('');
  const [isLocalLoading, setIsLocalLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi'];
  const CATEGORIES = ['Family Law', 'Corporate Law', 'Criminal Law', 'Civil Litigation', 'Property / Real Estate Law'];

  const { setUser } = useAuthStore();

  const validateInputs = () => {
    if (!displayName.trim()) {
      Alert.alert('Validation Error', 'Please enter your full name.');
      return false;
    }
    if (!email.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please enter email and password.');
      return false;
    }
    
    // Enterprise stringency: Minimum 8 characters, at least 1 uppercase, 1 lowercase, and 1 number.
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      Alert.alert(
        'Weak Password',
        'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, and a number.'
      );
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return false;
    }

    if (role === 'lawyer') {
      if (!city) {
        Alert.alert('Validation Error', 'Please select your city.');
        return false;
      }
      if (!specialization) {
        Alert.alert('Validation Error', 'Please select your specialization category.');
        return false;
      }
    }

    return true;
  };

  const handleGoogleRegisterBtn = async () => {
    try {
      setIsGoogleLoading(true);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;

      if (idToken) {
        const profile = await signInWithGoogleCredential(idToken, role, true);
        setUser(profile);
      } else {
        throw new Error('Google Sign-In failed to return an ID token.');
      }
    } catch (error: any) {
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) return;
        if (error.code === statusCodes.IN_PROGRESS) {
          Alert.alert('Please Wait', 'Sign in is already in progress.');
          return;
        }
        if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          Alert.alert('Google Play Services', 'Google Play Services are not available or outdated.');
          return;
        }
      }
      Alert.alert("Google Auth Error", handleAuthError(error));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!validateInputs()) return;

    try {
      Keyboard.dismiss();
      setIsLocalLoading(true);
      const profile = await registerUser(
        email, 
        password, 
        role, 
        displayName,
        role === 'lawyer' ? city : undefined,
        role === 'lawyer' ? [specialization] : undefined
      );
      setUser(profile);
    } catch (error: any) {
      Alert.alert("Registration Failed", handleAuthError(error));
    } finally {
      setIsLocalLoading(false);
    }
  };

  const isLoading = isLocalLoading || isGoogleLoading;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header Section */}
            <View style={styles.headerContainer}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join Haqooq to get started</Text>
            </View>

            {/* Role Selection */}
            <View style={styles.roleWrapper}>
              <Text style={styles.roleLabel}>I am signing up as a:</Text>
              <View style={styles.roleContainer}>
                <TouchableOpacity
                  style={[styles.roleButton, role === 'client' && styles.roleActive, isLoading && { opacity: 0.7 }]}
                  onPress={() => !isLoading && setRole('client')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="person-outline" size={20} color={role === 'client' ? '#fff' : '#64748B'} style={styles.roleIcon} />
                  <Text style={role === 'client' ? styles.roleTextActive : styles.roleText}>Client</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleButton, role === 'lawyer' && styles.roleActive, isLoading && { opacity: 0.7 }]}
                  onPress={() => !isLoading && setRole('lawyer')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="briefcase-outline" size={20} color={role === 'lawyer' ? '#fff' : '#64748B'} style={styles.roleIcon} />
                  <Text style={role === 'lawyer' ? styles.roleTextActive : styles.roleText}>Lawyer</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Form Section */}
            <View style={styles.formContainer}>
              <View style={[styles.inputContainer, isLoading && styles.inputDisabled]}>
                <Ionicons name="person-circle-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                  value={displayName}
                  onChangeText={setDisplayName}
                  editable={!isLoading}
                />
              </View>

              <View style={[styles.inputContainer, isLoading && styles.inputDisabled]}>
                <Ionicons name="mail-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                  editable={!isLoading}
                />
              </View>

              <View style={[styles.inputContainer, isLoading && styles.inputDisabled]}>
                <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  editable={!isLoading}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} disabled={isLoading}>
                  <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {role === 'lawyer' && (
                <View style={styles.lawyerSetupContainer}>
                  <Text style={styles.sectionTitle}>Lawyer Details</Text>
                  
                  <Text style={styles.label}>Select City</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                    {CITIES.map((c) => (
                      <TouchableOpacity
                        key={c}
                        style={[styles.chip, city === c && styles.chipActive]}
                        onPress={() => setCity(c)}
                      >
                        <Text style={[styles.chipText, city === c && styles.chipTextActive]}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={styles.label}>Select Specialization</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                    {CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.chip, specialization === cat && styles.chipActive]}
                        onPress={() => setSpecialization(cat)}
                      >
                        <Text style={[styles.chipText, specialization === cat && styles.chipTextActive]}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <TouchableOpacity 
                style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]} 
                onPress={handleRegister}
                disabled={isLoading}
              >
                {isLocalLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Register</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.line} />
            </View>

            {/* Social Auth */}
            <TouchableOpacity
              style={[styles.googleBtn, isLoading && styles.googleBtnDisabled]}
              onPress={handleGoogleRegisterBtn}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              {isGoogleLoading ? (
                <ActivityIndicator size="small" color="#333" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color="#DB4437" style={{ marginRight: 12 }} />
                  <Text style={styles.googleBtnText}>Sign up with Google</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.goBack()} disabled={isLoading}>
                <Text style={styles.footerLink}>Login Here</Text>
              </TouchableOpacity>
            </View>
            
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  headerContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A365D',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
  },
  roleWrapper: {
    marginBottom: 24,
  },
  roleLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
    fontWeight: '600',
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 4,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleActive: {
    backgroundColor: '#1A365D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  roleIcon: {
    marginRight: 6,
  },
  roleText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 15,
  },
  roleTextActive: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  formContainer: {
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 14,
    height: 56,
  },
  inputDisabled: {
    backgroundColor: '#F1F5F9',
    opacity: 0.7,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0F172A',
    height: '100%',
  },
  primaryBtn: {
    backgroundColor: '#1A365D',
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
  },
  primaryBtnDisabled: {
    backgroundColor: '#94A3B8',
    elevation: 0,
    shadowOpacity: 0,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  orText: {
    marginHorizontal: 16,
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 56,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  googleBtnDisabled: {
    backgroundColor: '#F8FAFC',
    opacity: 0.7,
  },
  googleBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#64748B',
    fontSize: 15,
  },
  footerLink: {
    color: '#1A365D',
    fontSize: 15,
    fontWeight: '700',
  },
  lawyerSetupContainer: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginTop: 8,
    marginBottom: 8,
  },
  chipScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#1A365D',
    borderColor: '#1A365D',
  },
  chipText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
  }
});
