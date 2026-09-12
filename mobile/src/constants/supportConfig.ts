import { Linking, Alert } from 'react-native';

export const SUPPORT_CONFIG = {
  phoneNumber: '03139330041',
  phoneDisplay: '+92 313 9330041',
  email: 'imujahidafridi@gmail.com',
  whatsAppNumber: '923139330041',
  operatingHours: 'Mon–Sat: 9:00 AM – 8:00 PM PKT',
};

export const contactSupportViaPhone = async () => {
  const url = `tel:${SUPPORT_CONFIG.phoneNumber}`;
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Helpline', `Please dial: ${SUPPORT_CONFIG.phoneDisplay}`);
    }
  } catch {
    Alert.alert('Helpline', `Please dial: ${SUPPORT_CONFIG.phoneDisplay}`);
  }
};

export const contactSupportViaEmail = async (subject = 'Haqooq App Support & Verification Inquiry') => {
  const url = `mailto:${SUPPORT_CONFIG.email}?subject=${encodeURIComponent(subject)}`;
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Support Email', `Please email us at: ${SUPPORT_CONFIG.email}`);
    }
  } catch {
    Alert.alert('Support Email', `Please email us at: ${SUPPORT_CONFIG.email}`);
  }
};

export const contactSupportViaWhatsApp = async (message = 'Hello Haqooq Support, I need assistance with my account.') => {
  const url = `https://wa.me/${SUPPORT_CONFIG.whatsAppNumber}?text=${encodeURIComponent(message)}`;
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('WhatsApp Support', `Contact via WhatsApp: ${SUPPORT_CONFIG.phoneDisplay}`);
    }
  } catch {
    Alert.alert('WhatsApp Support', `Contact via WhatsApp: ${SUPPORT_CONFIG.phoneDisplay}`);
  }
};
