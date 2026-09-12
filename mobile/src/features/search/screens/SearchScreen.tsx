import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../utils/Colors';
import { 
  searchAdvocatesPaginated, 
  SearchFilters, 
  DEFAULT_SEARCH_FILTERS 
} from '../services/algoliaService';
import { PublicLawyerProfile } from '../../../types/models';
import { Button } from '../../../components/ui/Button';
import { Avatar } from '../../../components/ui/Avatar';
import { SkeletonCard } from '../../../components/ui/SkeletonCard';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../store/authStore';

const CATEGORIES: { label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'All', icon: 'grid-outline' },
  { label: 'Corporate Law', icon: 'business-outline' },
  { label: 'Criminal Law', icon: 'shield-outline' },
  { label: 'Family Law', icon: 'people-outline' },
  { label: 'Property / Real Estate Law', icon: 'home-outline' },
  { label: 'Civil Litigation', icon: 'document-text-outline' },
  { label: 'Labor & Employment', icon: 'briefcase-outline' },
];

const CITIES = ['All Cities', 'Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Peshawar', 'Faisalabad', 'Multan', 'Quetta'];

const SORT_OPTIONS: { id: 'recommended' | 'rating' | 'experience'; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'recommended', label: 'Recommended', icon: 'sparkles-outline' },
  { id: 'rating', label: 'Top Rated', icon: 'star-outline' },
  { id: 'experience', label: 'Most Experienced', icon: 'time-outline' },
];

export const SearchScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  
  // Canonical typed filter state
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_SEARCH_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  
  // Paginated data state
  const [advocates, setAdvocates] = useState<PublicLawyerProfile[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setFilters(prev => ({ ...prev, query: searchInput.trim() }));
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Load first page whenever search criteria or sort mode changes
  const fetchFirstPage = useCallback(async (currentFilters: SearchFilters) => {
    setIsLoading(true);
    setIsError(false);
    try {
      const result = await searchAdvocatesPaginated({
        ...currentFilters,
        page: 0,
        pageSize: 15,
      });
      setAdvocates(result.advocates);
      setTotalCount(result.totalCount);
      setCurrentPage(0);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('[SearchScreen] Search failed:', err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFirstPage(filters);
  }, [filters, fetchFirstPage]);

  // Infinite scrolling pagination: load next chunk
  const handleLoadMore = async () => {
    if (isLoading || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    const nextPage = currentPage + 1;

    try {
      const result = await searchAdvocatesPaginated({
        ...filters,
        page: nextPage,
        pageSize: 15,
      });

      setAdvocates(prev => {
        // Enforce duplicate suppression via ID map
        const existingIds = new Set(prev.map(a => a.id));
        const newItems = result.advocates.filter(a => !existingIds.has(a.id));
        return [...prev, ...newItems];
      });

      setCurrentPage(nextPage);
      setHasMore(result.hasMore);
    } catch (err) {
      console.warn('[SearchScreen] Failed to load next page:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setFilters(DEFAULT_SEARCH_FILTERS);
  };

  const isFilterActive = filters.query !== '' || filters.category !== 'All' || filters.city !== '' || filters.sortBy !== 'recommended';

  // Navigation handlers
  const handleOpenProfile = (advocateId: string) => {
    navigation.navigate('SharedChat', {
      screen: 'PublicProfile',
      params: { userId: advocateId }
    });
  };

  const handleStartChat = (advocate: PublicLawyerProfile) => {
    if (!user) return;
    const [u1, u2] = [user.id, advocate.id].sort();
    const directChatId = `direct-${u1}-${u2}`;
    navigation.navigate('SharedChat', { 
      screen: 'ChatRoom', 
      params: { 
        chatId: directChatId, 
        chatTitle: `Advocate ${advocate.displayName}` 
      } 
    });
  };

  // Render Advocate Card
  const renderAdvocateCard = ({ item }: { item: PublicLawyerProfile }) => {
    return (
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => handleOpenProfile(item.id)}
      >
        {/* Card Header: Avatar, Name, Verified Badge, Pro Badge */}
        <View style={styles.cardHeader}>
          <View style={styles.avatarWrapper}>
            <Avatar 
              seed={item.id} 
              size={54} 
              imageUrl={item.photoURL} 
              style={styles.avatar} 
            />
            <View style={styles.verifiedDot}>
              <Ionicons name="checkmark" size={10} color="#FFF" />
            </View>
          </View>

          <View style={styles.headerDetails}>
            <View style={styles.nameRow}>
              <Text style={styles.advocateName} numberOfLines={1}>
                {item.displayName}
              </Text>
              {item.isPremium && (
                <View style={styles.proBadge}>
                  <Text style={styles.proText}>PRO</Text>
                </View>
              )}
            </View>

            <View style={styles.verifiedTagRow}>
              <Ionicons name="shield-checkmark" size={13} color={Colors.success} style={{ marginRight: 3 }} />
              <Text style={styles.verifiedTagText}>Bar Verified Advocate</Text>
            </View>
          </View>
        </View>

        {/* Credentials & Metrics Row */}
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Ionicons name="star" size={15} color="#EAB308" style={{ marginRight: 4 }} />
            <Text style={styles.ratingValue}>
              {item.rating > 0 ? item.rating.toFixed(1) : 'New'}
            </Text>
            {item.ratingCount > 0 && (
              <Text style={styles.reviewCount}>({item.ratingCount})</Text>
            )}
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricItem}>
            <Ionicons name="time-outline" size={14} color={Colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={styles.metricText}>
              {item.experienceYears > 0 ? `${item.experienceYears} Years Exp` : 'Licensed'}
            </Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricItem}>
            <Ionicons name="location-outline" size={14} color={Colors.textSecondary} style={{ marginRight: 3 }} />
            <Text style={styles.metricText} numberOfLines={1}>
              {item.city || 'Pakistan'}
            </Text>
          </View>
        </View>

        {/* Specialization Tags */}
        <View style={styles.specializationsContainer}>
          {(item.specialization.length > 0 ? item.specialization : ['General Law Practice'])
            .slice(0, 3)
            .map((spec) => (
              <View key={spec} style={styles.specPill}>
                <Text style={styles.specPillText} numberOfLines={1}>
                  {spec}
                </Text>
              </View>
            ))}
          {item.specialization.length > 3 && (
            <View style={[styles.specPill, styles.specMorePill]}>
              <Text style={styles.specMoreText}>+{item.specialization.length - 3}</Text>
            </View>
          )}
        </View>

        {/* Card Footer Actions */}
        <View style={styles.cardActions}>
          <Button
            title="View Profile"
            variant="outline"
            icon="person-outline"
            onPress={() => handleOpenProfile(item.id)}
            style={styles.actionBtnSecondary}
            textStyle={styles.actionBtnSecondaryText}
          />
          <Button
            title="Consult"
            variant="primary"
            icon="chatbubble-ellipses-outline"
            onPress={() => handleStartChat(item)}
            style={styles.actionBtnPrimary}
            textStyle={styles.actionBtnPrimaryText}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar Header */}
      <View style={styles.header}>
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search advocate name, specialty, or court..."
            placeholderTextColor="#94A3B8"
            value={searchInput}
            onChangeText={setSearchInput}
            returnKeyType="search"
          />
          {searchInput.length > 0 && (
            <TouchableOpacity onPress={() => setSearchInput('')} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Filter Horizontal Scroll */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.categoriesScroll}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = filters.category === cat.label;
            return (
              <TouchableOpacity
                key={cat.label}
                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                onPress={() => setFilters(prev => ({ ...prev, category: cat.label }))}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={cat.icon} 
                  size={14} 
                  color={isSelected ? '#FFF' : Colors.textSecondary} 
                  style={{ marginRight: 6 }} 
                />
                <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Secondary Filter & Sort Bar */}
        <View style={styles.secondaryFilterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
            {/* City Chips */}
            {CITIES.map((city) => {
              const isSelected = (city === 'All Cities' && !filters.city) || filters.city === city;
              return (
                <TouchableOpacity
                  key={city}
                  style={[styles.cityChip, isSelected && styles.cityChipActive]}
                  onPress={() => setFilters(prev => ({ ...prev, city: city === 'All Cities' ? '' : city }))}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cityChipText, isSelected && styles.cityChipTextActive]}>
                    {city}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Sort & Result Status Bar */}
        <View style={styles.statusBar}>
          <Text style={styles.resultsCountText}>
            {isLoading ? 'Searching verified advocates...' : `Found ${totalCount} verified advocate${totalCount === 1 ? '' : 's'}`}
          </Text>

          {/* Sort Selector */}
          <View style={styles.sortContainer}>
            {SORT_OPTIONS.map((sort) => {
              const isSelected = filters.sortBy === sort.id;
              return (
                <TouchableOpacity
                  key={sort.id}
                  style={[styles.sortButton, isSelected && styles.sortButtonActive]}
                  onPress={() => setFilters(prev => ({ ...prev, sortBy: sort.id }))}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={sort.icon} 
                    size={12} 
                    color={isSelected ? Colors.primary : Colors.textSecondary} 
                    style={{ marginRight: 3 }}
                  />
                  <Text style={[styles.sortButtonText, isSelected && styles.sortButtonTextActive]}>
                    {sort.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Active Filter Pill with One-Tap Reset */}
        {isFilterActive && (
          <View style={styles.activeFilterNotice}>
            <Text style={styles.activeFilterNoticeText} numberOfLines={1}>
              Active Filters: {filters.category !== 'All' ? filters.category : ''} {filters.city ? `• ${filters.city}` : ''} {filters.query ? `• "${filters.query}"` : ''}
            </Text>
            <TouchableOpacity onPress={handleResetFilters} style={styles.resetBtn}>
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Main List Area */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <SkeletonCard height={170} borderRadius={14} />
          <SkeletonCard height={170} borderRadius={14} />
          <SkeletonCard height={170} borderRadius={14} />
        </View>
      ) : isError ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorTitle}>Unable to Load Advocates</Text>
          <Text style={styles.errorSubtitle}>Please verify your connection and try again.</Text>
          <Button 
            title="Retry" 
            onPress={() => fetchFirstPage(filters)} 
            style={{ marginTop: 12, paddingHorizontal: 24 }}
          />
        </View>
      ) : (
        <FlatList
          data={advocates}
          keyExtractor={(item) => item.id}
          renderItem={renderAdvocateCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="search" size={32} color={Colors.textSecondary} />
              </View>
              <Text style={styles.emptyTitle}>No Advocates Found</Text>
              <Text style={styles.emptySubtitle}>
                No verified legal practitioners matched your search criteria. Try removing filters or searching for another practice area.
              </Text>
              {isFilterActive && (
                <Button 
                  title="Clear All Filters" 
                  variant="outline" 
                  onPress={handleResetFilters} 
                  style={{ marginTop: 16 }}
                />
              )}
            </View>
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.footerLoaderText}>Loading more verified advocates...</Text>
              </View>
            ) : !hasMore && advocates.length > 0 ? (
              <View style={styles.footerEndNotice}>
                <Text style={styles.footerEndNoticeText}>
                  All verified advocates matching your criteria have been loaded
                </Text>
              </View>
            ) : null
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
    backgroundColor: Colors.surface,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    height: '100%',
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.border,
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
  secondaryFilterBar: {
    paddingTop: 6,
    paddingLeft: 16,
  },
  cityChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
  },
  cityChipActive: {
    backgroundColor: '#CBD5E1',
  },
  cityChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  cityChipTextActive: {
    color: Colors.text,
    fontWeight: '700',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  resultsCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  sortButtonActive: {
    backgroundColor: 'rgba(26, 54, 93, 0.08)',
  },
  sortButtonText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  activeFilterNotice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  activeFilterNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#1E40AF',
    fontWeight: '500',
  },
  resetBtn: {
    marginLeft: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: '#DBEAFE',
  },
  resetBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E40AF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  verifiedDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.success,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  headerDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  advocateName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  proBadge: {
    backgroundColor: '#FEF08A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FDE047',
  },
  proText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#854D0E',
  },
  verifiedTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedTagText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 10,
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  reviewCount: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginLeft: 2,
  },
  metricText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  specializationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  specPill: {
    backgroundColor: 'rgba(26, 54, 93, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  specPillText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
  },
  specMorePill: {
    backgroundColor: '#F1F5F9',
  },
  specMoreText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  actionBtnSecondary: {
    flex: 1,
    height: 40,
    paddingVertical: 0,
    borderRadius: 8,
  },
  actionBtnSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionBtnPrimary: {
    flex: 1,
    height: 40,
    paddingVertical: 0,
    borderRadius: 8,
  },
  actionBtnPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  loadingContainer: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    marginTop: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 32,
    marginTop: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  errorSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  footerEndNotice: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerEndNoticeText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  }
});
