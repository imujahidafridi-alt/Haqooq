import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Colors } from '../../../utils/Colors';
import { submitReport } from '../services/reportService';
import { ReportEntityType, ReportCategory } from '../../../types/models';

interface Props {
  visible: boolean;
  entityId: string;
  entityType: ReportEntityType;
  reporterId: string;
  entityTitle?: string; // Optional context like the case title
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES: { label: string, value: ReportCategory, icon: any }[] = [
  { label: 'Scam or Fraud', value: 'scam', icon: 'warning-outline' },
  { label: 'Spam', value: 'spam', icon: 'trash-outline' },
  { label: 'Harassment', value: 'harassment', icon: 'hand-left-outline' },
  { label: 'Inappropriate Content', value: 'inappropriate', icon: 'close-circle-outline' },
  { label: 'Other', value: 'other', icon: 'help-circle-outline' },
];

export const ReportModal: React.FC<Props> = ({ visible, entityId, entityType, reporterId, entityTitle, onClose, onSuccess }) => {
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!category) {
      Alert.alert('Selection Required', 'Please select a reason category.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await submitReport(entityId, entityType, reporterId, category, reason);
      Alert.alert('Success', 'Report submitted safely. Our trust & safety team will review this shortly.');
      
      // Reset state on successful close
      setCategory(null);
      setReason('');
      onSuccess();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setCategory(null);
    setReason('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
           <View style={{ flex: 1 }} />
        </TouchableWithoutFeedback>

        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Report this {entityType}</Text>
          {entityTitle && <Text style={styles.modalEntityContext}>For: {entityTitle}</Text>}
          
          <Text style={styles.modalSub}>Why are you reporting this?</Text>

          <View style={styles.categoryContainer}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity 
                key={cat.value} 
                style={[styles.categoryOption, category === cat.value && styles.categoryOptionSelected]}
                onPress={() => setCategory(cat.value)}
              >
                <Ionicons name={cat.icon} size={20} color={category === cat.value ? Colors.primary : Colors.textSecondary} />
                <Text style={[styles.categoryText, category === cat.value && styles.categoryTextSelected]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Additional details (optional)"
            placeholder="Please provide more context..."
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
            style={{ minHeight: 80, textAlignVertical: 'top' }}
          />

          <View style={styles.modalActions}>
            <Button title="Cancel" variant="outline" onPress={handleCancel} style={{ flex: 1, marginRight: 8 }} />
            <Button title="Submit Report" variant="primary" onPress={handleSubmit} isLoading={isSubmitting} style={{ flex: 1, marginLeft: 8, backgroundColor: Colors.error, borderColor: Colors.error }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
    color: Colors.primary,
    textTransform: 'capitalize'
  },
  modalEntityContext: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
    fontStyle: 'italic'
  },
  modalSub: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 16,
    fontWeight: '500'
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: Colors.surface
  },
  categoryOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#F0F7FF', // Light primary tint
  },
  categoryText: {
    marginLeft: 12,
    fontSize: 16,
    color: Colors.textSecondary
  },
  categoryTextSelected: {
    color: Colors.primary,
    fontWeight: '600'
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 16
  }
});
