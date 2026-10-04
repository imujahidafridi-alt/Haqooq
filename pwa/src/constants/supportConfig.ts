export const SUPPORT_CONFIG = {
  phoneNumber: '03139330041',
  phone: '03139330041',
  phoneDisplay: '+92 313 9330041',
  email: 'imujahidafridi@gmail.com',
  whatsAppNumber: '923139330041',
  whatsappNumber: '923139330041',
  operatingHours: 'Mon–Sat: 9:00 AM – 8:00 PM PKT',
};

export const getPhoneUrl = () => `tel:${SUPPORT_CONFIG.phoneNumber}`;

export const getEmailUrl = (subject = 'Haqooq Support & Verification Inquiry') => 
  `mailto:${SUPPORT_CONFIG.email}?subject=${encodeURIComponent(subject)}`;

export const getWhatsAppUrl = (message = 'Hello Haqooq Support, I need assistance with my account.') => 
  `https://wa.me/${SUPPORT_CONFIG.whatsAppNumber}?text=${encodeURIComponent(message)}`;
