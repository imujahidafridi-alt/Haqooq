import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, Alert, TouchableOpacity } from 'react-native';
import { Colors } from '../../../utils/Colors';
import { Typography } from '../../../utils/Typography';
import { Button } from '../../../components/ui/Button';
import { submitLawyerRating } from '../services/ratingService';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  caseId: string;
  lawyerId: string;
  clientId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const RateLawyerModal: React.FC<Props> = ({ visible, caseId, lawyerId, clientId, onClose, onSuccess }) => {
  const [rating, setRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating from 1 to 5 stars.');
      return;
    }

    try {
      setLoading(true);
      await submitLawyerRating(caseId, lawyerId, clientId, rating, reviewText);
      Alert.alert('Success', 'Thank you for your feedback!');
      onSuccess();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit rating.');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={36}
              color={Colors.primary}
              style={{ marginHorizontal: 4 }}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={[Typography.title, { marginBottom: 16, textAlign: 'center' }]}>Rate Your Lawyer</Text>
          <Text style={[Typography.body, { marginBottom: 24, textAlign: 'center' }]}>
            How would you rate the service provided by this lawyer?
          </Text>

          {renderStars()}

          <TextInput
            style={styles.input}
            placeholder="Write a review (optional)"
            placeholderTextColor={Colors.textSecondary}
            value={reviewText}
            onChangeText={setReviewText}
            multiline
            numberOfLines={4}
          />

          <View style={styles.buttons}>
            <Button title="Cancel" variant="outline" onPress={onClose} style={{ flex: 1, marginRight: 8 }} />
            <Button
              title="Submit"
              onPress={handleSubmit}
              isLoading={loading}
              disabled={loading}
              style={{ flex: 1, marginLeft: 8 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: Colors.surface,
    padding: 24,
    borderRadius: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
