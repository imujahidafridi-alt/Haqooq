import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { useAuthStore } from '../../../store/authStore';
import { classifyCaseWithAI, postCaseToMarketplace } from '../services/caseService'
export const PostCaseScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  
  const [detectedCategory, setDetectedCategory] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const handleAnalyze = async () => {
    if (description.length < 10) {
      Alert.alert('Details Needed', 'Please provide a more detailed description of your issue.');
      return;
    }
    
    setIsAnalyzing(true);
    try {
      const category = await classifyCaseWithAI(description);
      setDetectedCategory(category);
    } catch (error) {
      Alert.alert('AI Engine Error', 'Unable to classify the case automatically.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePostCase = async () => {
    if (!title || !description || !detectedCategory) {
      Alert.alert('Missing Info', 'Please ensure your case has a title, description, and has been categorized.');
      return;
    }

    setIsPosting(true);
    try {
      await postCaseToMarketplace(
        user!.id,
        user!.displayName || 'Unknown Client',
        title,
        description,
        detectedCategory,
        budget ? parseFloat(budget) : undefined
      );

      Alert.alert('Success', 'Your case is now live on the marketplace!');

      setTitle('');
      setDescription('');
      setBudget('');
      setDetectedCategory(null);
      
      // Navigate user to their 'My Cases' tab where they can see the newly open case
      navigation.navigate('Cases'); 

    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
      >
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.header}>Find Legal Help</Text>
        <Text style={styles.subtext}>Describe your problem in plain english. Our AI will categorize it and match you with the right experts.</Text>

        <Card style={styles.card}>
          <Input 
            label="Case Title" 
            placeholder="e.g. Stop Eviction Notice"
            value={title}
            onChangeText={setTitle}
          />
          
          <Input 
            label="Detailed Description" 
            placeholder="Explain what happened..."
            multiline
            numberOfLines={4}
            style={{ height: 100, textAlignVertical: 'top' }}
            value={description}
            onChangeText={setDescription}
          />

          {!detectedCategory ? (
            <Button 
              title="Analyze with AI" 
              onPress={handleAnalyze} 
              isLoading={isAnalyzing} 
              variant="secondary"
            />
          ) : (
            <View style={styles.categoryBox}>
              <Text style={styles.categoryLabel}>AI Category Detected:</Text>
              <Text style={styles.categoryValue}>{detectedCategory}</Text>
            </View>
          )}
        </Card>

        {detectedCategory && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Marketplace Options</Text>
            <Input 
              label="Estimated Budget (Optional - Rs.)" 
              placeholder="e.g. 50000"
              keyboardType="numeric"
              value={budget}
              onChangeText={setBudget}
            />
            <Button 
              title="Post Case to Marketplace" 
              onPress={handlePostCase} 
              isLoading={isPosting} 
            />
          </Card>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  scrollContent: {
    padding: 20
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 8
  },
  subtext: {
    fontSize: 15,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22
  },
  card: {
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16
  },
  categoryBox: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A5D6A7',
    alignItems: 'center',
    marginTop: 8
  },
  categoryLabel: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4
  },
  categoryValue: {
    color: '#1B5E20',
    fontSize: 18,
    fontWeight: 'bold'
  }
});
