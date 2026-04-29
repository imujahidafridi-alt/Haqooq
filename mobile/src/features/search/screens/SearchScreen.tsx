import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../utils/Colors';
import { Typography } from '../../../utils/Typography';
import { executeAlgoliaSearch, SearchFilters } from '../services/algoliaService';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LawyerProfile } from '../../../types/models';
import { Button } from '../../../components/ui/Button';
import { useQuery } from '@tanstack/react-query';

// Define expected params, add real ones based on your navigator setup
type RootStackParamList = {
  ProfileScreen: { id: string };
  // ... other routes
  [key: string]: any; 
};

type SearchScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProfileScreen'>;

interface Props {
  navigation: SearchScreenNavigationProp;
}

const CATEGORIES = ['All', 'Family Law', 'Corporate Law', 'Criminal Law', 'Civil Litigation', 'Property / Real Estate Law'];
const CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi'];

import { useAuthStore } from '../../../store/authStore';

// Custom hook to debounce values preventing excessive query fetches
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export const SearchScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuthStore();
  const [queryInput, setQueryInput] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [activeCity, setActiveCity] = useState<string>('');
  
  const debouncedQuery = useDebounce(queryInput, 400);

  // TanStack React Query for seamless caching and background refetching
  const { data: results = [], isLoading, isError } = useQuery({
    queryKey: ['lawyersSearch', debouncedQuery, activeCategory, activeCity],
    queryFn: () => executeAlgoliaSearch({ 
      query: debouncedQuery, 
      category: activeCategory, 
      city: activeCity 
    }),
    staleTime: 1000 * 60 * 5, // Data stays fresh for 5 minutes (saves massive reads)
  });

  const renderLawyer = ({ item }: { item: LawyerProfile }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.displayName}</Text>
        {item.isPremium && <View style={styles.premiumBadge}><Text style={styles.premiumText}>PRO</Text></View>}
      </View>
      <Text style={styles.cardSubtitle}>{item.city} • {item.experienceYears} Years Exp</Text>
      
      <View style={styles.pillContainer}>
        {(item.specialization || []).map(spec => (
          <View key={spec} style={styles.pill}>
            <Text style={styles.pillText}>{spec}</Text>
          </View>
        ))}
      </View>

      <View style={styles.cardFooter}>
         <Text style={styles.ratingText}>⭐ {item.rating?.toFixed(1) || '0.0'}</Text>
         <Button 
            title="Chat Now" 
            onPress={() => {
              if (!user) return;
              // Generate a deterministic chat ID pairing the client and lawyer directly
              const directChatId = `direct-${user.id}-${item.id}`;
              navigation.navigate('SharedChat', { 
                screen: 'ChatRoom', 
                params: { chatId: directChatId, chatTitle: `Chat with ${item.displayName || 'Lawyer'}` } 
              });
            }} 
            variant="outline" 
            style={{ paddingVertical: 6, paddingHorizontal: 12 }} 
         />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search lawyers by name or specialty..."
          value={queryInput}
          onChangeText={setQueryInput}
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.filtersSection}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={item => item}
          renderItem={({ item }) => (
             <TouchableOpacity 
               style={[styles.filterChip, activeCategory === item && styles.activeChip]}
               onPress={() => setActiveCategory(item)}
             >
                <Text style={[styles.filterChipText, activeCategory === item && styles.activeChipText]}>{item}</Text>
             </TouchableOpacity>
          )}
        />
      </View>

       <View style={[styles.filtersSection, { marginTop: 4 }]}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['All Cities', ...CITIES]}
          keyExtractor={item => item}
          renderItem={({ item }) => {
            const isSelected = (item === 'All Cities' && !activeCity) || activeCity === item;
            return (
              <TouchableOpacity 
                style={[styles.filterChip, isSelected && styles.activeChip]}
                onPress={() => setActiveCity(item === 'All Cities' ? '' : item)}
              >
                  <Text style={[styles.filterChipText, isSelected && styles.activeChipText]}>{item}</Text>
              </TouchableOpacity>
            )
          }}
        />
      </View>


      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Text style={Typography.body}>Error connecting to server. Attempting to reload...</Text>
        </View>
      ) : (
        <FlatList
           data={results}
           keyExtractor={(item) => item.id}
           renderItem={renderLawyer}
           contentContainerStyle={styles.listContainer}
           ListEmptyComponent={
             <View style={styles.emptyContainer}>
               <Text style={Typography.body}>No lawyers matched your search.</Text>
             </View>
           }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInput: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
  },
  filtersSection: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 4,
  },
  activeChip: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  activeChipText: {
    color: '#FFF',
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  premiumBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  premiumText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000',
  },
  cardSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  pill: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  pillText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingTop: 12,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  }
});
