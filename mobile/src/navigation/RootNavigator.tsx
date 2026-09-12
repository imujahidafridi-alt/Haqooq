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
import { PendingApprovalScreen } from '../features/lawyer/screens/PendingApprovalScreen';
import { ChatRoomScreen } from '../features/chat/screens/ChatRoomScreen';
import { PublicProfileScreen } from '../features/shared/screens/PublicProfileScreen';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';
import { fetchUserProfileWithStatus, recoverOrphanProfile, logoutUser } from '../features/auth/services/authService';
import { registerForPushNotificationsAsync } from '../services/notificationService';
import { UserProfile } from '../types/models';

const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();

const ChatStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
    <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
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
  const { user, isLoading, setUser, setLoading, logout } = useAuthStore();

  useEffect(() => {
    // Enterprise Zero-Trust: Sync strictly with Firebase root auth state
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // If we already have the user in state with matching UID, unblock immediately
          const currentStoreUser = useAuthStore.getState().user;
          if (currentStoreUser && currentStoreUser.id === firebaseUser.uid) {
            setLoading(false);
            registerForPushNotificationsAsync(firebaseUser.uid);
            // Background sync with Firestore ensures fresh role, status, and credits
            fetchUserProfileWithStatus(firebaseUser.uid).then(res => {
              if (res.status === 'success') {
                setUser(res.profile);
              }
            }).catch(e => console.warn("Background profile sync note:", e));
            return;
          }

          // Fetch profile with distinct error taxonomy (offline vs missing vs success)
          const result = await fetchUserProfileWithStatus(firebaseUser.uid);
          
          if (result.status === 'success') {
            setUser(result.profile);
            registerForPushNotificationsAsync(result.profile.id);
            setLoading(false);
          } else if (result.status === 'genuinely_missing') {
            // Affirmatively missing document -> trigger idempotent orphan recovery
            try {
              const recovered = await recoverOrphanProfile(firebaseUser);
              setUser(recovered);
              registerForPushNotificationsAsync(recovered.id);
            } catch (recoveryErr) {
              console.warn("Orphan profile recovery deferred/incomplete:", recoveryErr);
            } finally {
              setLoading(false);
            }
          } else {
            // Offline or network error: retain persisted user profile without false logout
            console.warn("Profile fetch encountered offline/network error, retaining session.");
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
    };
  }, []);

  // Real-time listener for user profile (credits, status, etc.)
  useEffect(() => {
    if (!user?.id) return;
    
    const unsubscribeProfile = onSnapshot(doc(db, 'users', user.id), (docSnap) => {
      if (docSnap.exists()) {
        const newData = docSnap.data() as UserProfile;
        newData.id = docSnap.id;
        
        // Prevent infinite loops by checking deeply or just update store
        const currentUserStr = JSON.stringify(useAuthStore.getState().user);
        const newUserStr = JSON.stringify(newData);
        
        if (currentUserStr !== newUserStr) {
          setUser(newData);
        }
      } else {
        // Document no longer exists in Firestore (deleted account) -> terminate session
        console.warn("User profile no longer exists in Firestore. Logging out...");
        logoutUser().catch(() => {});
        logout();
      }
    }, (error) => {
      console.warn("Real-time profile sync error:", error);
    });

    return () => unsubscribeProfile();
  }, [user?.id]);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      {user ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user.status === 'suspended' ? (
            <Stack.Screen name="SuspendedAccount" component={PendingApprovalScreen} />
          ) : (
            <>
              {user.role === 'client' && <Stack.Screen name="ClientRoot" component={ClientNavigator} />}
              {user.role === 'lawyer' && (
                <Stack.Screen name="LawyerRoot" component={LawyerNavigator} />
              )}
              {(user.role === 'admin' || user.email === 'imujahidafridi@gmail.com') && (
                <Stack.Screen name="AdminRoot" component={AdminDashboard} />
              )}
              
              {/* Shared Screens accessible regardless of role */}
              <Stack.Screen name="SharedChat" component={ChatStack} />
            </>
          )}
        </Stack.Navigator>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};
