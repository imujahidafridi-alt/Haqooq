import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { SplashScreen } from '../components/ui/SplashScreen';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { RegisterScreen } from '../features/auth/screens/RegisterScreen';
import { ForgotPasswordScreen } from '../features/auth/screens/ForgotPasswordScreen';
import { ClientNavigator } from './navigators/ClientNavigator';
import { LawyerNavigator } from './navigators/LawyerNavigator';
import { AdminDashboard } from '../features/admin/screens/AdminDashboard';
import { ChatRoomScreen } from '../features/chat/screens/ChatRoomScreen';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { getCurrentUserProfile } from '../features/auth/services/authService';
import { registerForPushNotificationsAsync } from '../services/notificationService';

const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();

const ChatStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
  </Stack.Navigator>
);

const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
    <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
  </AuthStack.Navigator>
);

export const RootNavigator = () => {
  const { user, isLoading, setUser, setLoading } = useAuthStore();
  const [isSplashMinTimeDone, setIsSplashMinTimeDone] = useState(false);

  useEffect(() => {
    // Enforce a minimum display time for the Splash Screen branding
    const splashTimer = setTimeout(() => {
      setIsSplashMinTimeDone(true);
    }, 2500); // 2.5 seconds minimum to allow animations to breathe

    // Enterprise Standard: Sync strictly with Firebase root auth state to handle token expiry / persistence
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // If we already have the user in state with matching UID, don't overwrite 
          const currentStoreUser = useAuthStore.getState().user;
          if (currentStoreUser && currentStoreUser.id === firebaseUser.uid) {
            setLoading(false);
            // Optionally, refresh push token on resume
            registerForPushNotificationsAsync(firebaseUser.uid);
            return;
          }

          // Fetch robust profile from Firestore
          const profile = await getCurrentUserProfile(firebaseUser.uid);
          
          if (profile) {
            setUser(profile);
            registerForPushNotificationsAsync(profile.id);
          } else {
            // Profile document not found yet (could be in middle of registration transaction)
            // Register fn will sync the state
            setLoading(false);
          }
        } else {
          setUser(null);
          setLoading(false);
        }
      } catch (error) {
        console.error("Auth hydration error:", error);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(splashTimer);
    };
  }, []);

  if (isLoading || !isSplashMinTimeDone) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      {user ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user.role === 'client' && <Stack.Screen name="ClientRoot" component={ClientNavigator} />}
          {user.role === 'lawyer' && <Stack.Screen name="LawyerRoot" component={LawyerNavigator} />}
          {user.role === 'admin' && <Stack.Screen name="AdminRoot" component={AdminDashboard} />}
          
          {/* Shared Screens accessible regardless of role */}
          <Stack.Screen name="SharedChat" component={ChatStack} />
        </Stack.Navigator>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};
