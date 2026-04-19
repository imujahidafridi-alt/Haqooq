import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebaseConfig';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  }),
});

export async function registerForPushNotificationsAsync(userId: string) {
  let token;
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Push Token:', token);
    
    // Send this token to Firebase user document
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { expoPushToken: token });
      console.log('Successfully recorded push token for user', userId);
    } catch (error) {
      console.error('Error saving push token', error);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}

/**
 * Enterprise trigger for Push Notification via Firebase Functions.
 * Appends a document to 'notifications' which a Cloud Function listens to and dispatches.
 */
export const triggerPushNotification = async (targetUserId: string, title: string, body: string, data?: any) => {
  try {
    const notificationsRef = collection(db, 'notifications');
    await addDoc(notificationsRef, {
      userId: targetUserId,
      title,
      body,
      data: data || {},
      status: 'pending',
      createdAt: serverTimestamp()
    });
    console.log('[NotificationService] Queued Notification for', targetUserId);
  } catch (error) {
    console.warn('[NotificationService] Failed to queue Push Notification', error);
  }
};


