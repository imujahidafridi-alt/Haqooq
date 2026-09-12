import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  ScrollView, 
  Alert, 
  KeyboardAvoidingView, 
  Platform,
  TouchableOpacity 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { useAuthStore } from '../../../store/authStore';
import { postCaseToMarketplace } from '../services/caseService';
import { Colors } from '../../../utils/Colors';
import { Ionicons } from '@expo/vector-icons';

const CATEGORIES = [
  'Property / Real Estate Law',
  'Family Law',
  'Corporate Law',
  'Criminal Law',
  'Civil Litigation',
  'Labor & Employment'
];

export const PostCaseScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Civil Litigation');
  const [isPosting, setIsPosting] = useState(false);

  const handlePostListing = async () => {
    if (title.trim().length < 5) {
      Alert.alert('Details Needed', 'Please provide a descriptive case title (at least 5 characters).');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Category Required', 'Please select a legal practice area for your listing.');
      return;
    }

    if (description.trim().length < 15) {
      Alert.alert('Details Needed', 'Please explain your situation with a bit more detail (at least 15 characters) so advocates can evaluate your case.');
      return;
    }

    const parsedBudget = budget.trim() ? parseFloat(budget.trim().replace(/,/g, '')) : undefined;
    if (parsedBudget !== undefined && (isNaN(parsedBudget) || parsedBudget < 0)) {
      Alert.alert('Invalid Budget', 'Please enter a valid numerical budget or leave it blank.');
      return;
    }

    setIsPosting(true);
    try {
      await postCaseToMarketplace(
        user!.id,
        user!.displayName || 'Client',
        title.trim(),
        description.trim(),
        selectedCategory,
        parsedBudget
      );

      Alert.alert(
        'Listing Published',
        'Your case listing is now live on the marketplace. Verified advocates will review and submit proposals.',
        [
          {
            text: 'View My Cases',
            onPress: () => {
              setTitle('');
              setDescription('');
              setBudget('');
              setSelectedCategory('Civil Litigation');
              navigation.navigate('Cases');
            }
          }
        ]
      );

      setTitle('');
      setDescription('');
      setBudget('');
      setSelectedCategory('Civil Litigation');

    } catch (error: any) {
      Alert.alert('Error Posting Listing', error?.message || 'Unable to publish listing. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
      >
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="document-text-outline" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.header}>Post a Case Listing</Text>
            <Text style={styles.subtext}>
              Connect directly with verified legal professionals across Pakistan. Describe your matter, set your estimated budget, and receive competitive proposals.
            </Text>
          </View>

          {/* Form Card */}
          <Card style={styles.card}>
            <Input 
              label="Listing Title *" 
              placeholder="e.g. Property Boundary Dispute in Gulberg"
              value={title}
              onChangeText={setTitle}
            />

            {/* Category Selector */}
            <View style={styles.categorySection}>
              <Text style={styles.fieldLabel}>Practice Area / Category *</Text>
              <View style={styles.chipsContainer}>
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                      onPress={() => setSelectedCategory(cat)}
                      activeOpacity={0.7}
                    >
                      <Ionicons 
                        name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
                        size={15} 
                        color={isSelected ? '#FFFFFF' : Colors.textSecondary} 
                        style={{ marginRight: 6 }}
                      />
                      <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            
            <Input 
              label="Detailed Description *" 
              placeholder="Explain the background, timeline, parties involved, and what assistance you need from an advocate..."
              multiline
              numberOfLines={5}
              style={{ height: 110, textAlignVertical: 'top' }}
              value={description}
              onChangeText={setDescription}
            />

            <Input 
              label="Estimated Budget (Optional - PKR)" 
              placeholder="e.g. 50000"
              keyboardType="numeric"
              value={budget}
              onChangeText={setBudget}
            />

            <View style={styles.infoNotice}>
              <Ionicons name="shield-checkmark-outline" size={18} color={Colors.success} style={{ marginRight: 8 }} />
              <Text style={styles.infoNoticeText}>
                Your contact information is protected. Advocates communicate through secure in-app messaging.
              </Text>
            </View>

            <Button 
              title="Post Listing" 
              onPress={handlePostListing} 
              isLoading={isPosting}
              style={{ marginTop: 8 }}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 18,
  },
  headerContainer: {
    marginBottom: 18,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  header: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  subtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  card: {
    marginBottom: 16,
    padding: 18,
  },
  categorySection: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#F8FAFC',
    marginBottom: 4,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  infoNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#166534',
    lineHeight: 16,
  }
});
