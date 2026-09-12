import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, FlatList, ActivityIndicator, Alert, Linking, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getPendingLawyers, approveLawyer, rejectLawyer, getAdminStats } from '../services/adminService';
import { UserProfile } from '../../../types/models';
import { useAuthStore } from '../../../store/authStore';
import { logoutUser } from '../../auth/services/authService';

export const AdminDashboard = () => {
  const navigation = useNavigation<any>();
  const { logout } = useAuthStore();
  const [pendingLawyers, setPendingLawyers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState({ totalClients: 0, totalLawyers: 0, pendingVerifications: 0, totalCases: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [lawyers, dashStats] = await Promise.all([
        getPendingLawyers(),
        getAdminStats()
      ]);
      setPendingLawyers(lawyers);
      setStats(dashStats as any);
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };
    init();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleApprove = async (id: string, name: string | null) => {
    try {
      await approveLawyer(id);
      Alert.alert('Advocate Verified', `${name || 'The lawyer'} has been officially verified and granted marketplace bidding privileges.`);
      setPendingLawyers(prev => prev.filter(l => l.id !== id));
      setStats(prev => ({ ...prev, pendingVerifications: Math.max(0, prev.pendingVerifications - 1), totalLawyers: prev.totalLawyers + 1 }));
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Approval failed. Please verify admin permissions in Firestore.');
    }
  };

  const handleReject = (id: string, name: string | null) => {
    Alert.alert(
      'Reject Verification',
      `Reject verification application for ${name || 'this advocate'}? They will be prompted to re-upload clear Bar credentials.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectLawyer(id);
              Alert.alert('Application Rejected', `${name || 'The advocate'} has been marked as rejected.`);
              setPendingLawyers(prev => prev.filter(l => l.id !== id));
              setStats(prev => ({ ...prev, pendingVerifications: Math.max(0, prev.pendingVerifications - 1) }));
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Rejection failed.');
            }
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    await logoutUser();
    logout();
  };

  const renderStatCard = (title: string, value: number, color: string) => (
    <View style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  const renderItem = ({ item }: { item: UserProfile }) => {
    const hasDocs = Boolean(item.credentialUrl);
    return (
      <Card style={styles.card}>
        <View style={styles.infoRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{item.displayName?.charAt(0).toUpperCase() || 'U'}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.name}>{item.displayName || 'Advocate'}</Text>
            <Text style={styles.email}>{item.email || 'No email'}</Text>
            {item.city ? <Text style={styles.cityText}>📍 {item.city}</Text> : null}
          </View>
          <View style={[styles.badgeContainer, { backgroundColor: hasDocs ? '#ECFDF5' : '#FEF3C7', borderColor: hasDocs ? '#A7F3D0' : '#FDE68A', borderWidth: 1 }]}>
            <Text style={[styles.badge, { color: hasDocs ? '#065F46' : '#92400E' }]}>
              {hasDocs ? 'Docs Ready' : 'Awaiting Docs'}
            </Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Button
            title={hasDocs ? "View License" : "No Docs"}
            variant="outline"
            onPress={() => {
              if (item.credentialUrl) {
                Linking.openURL(item.credentialUrl).catch(() => Alert.alert('Error', 'Failed to open document URL.'));
              } else {
                Alert.alert('No Documents', 'This advocate has not uploaded their Bar license or CNIC yet.');
              }
            }}
            disabled={!hasDocs}
            style={{ flex: 1, marginRight: 6, paddingVertical: 8 }}
          />
          <Button
            title="Reject"
            variant="outline"
            onPress={() => handleReject(item.id, item.displayName)}
            style={{ flex: 0.8, marginRight: 6, paddingVertical: 8, borderColor: '#EF4444' }}
            textStyle={{ color: '#DC2626' }}
          />
          <Button
            title="Approve"
            onPress={() => handleApprove(item.id, item.displayName)}
            style={{ flex: 1, paddingVertical: 8, backgroundColor: '#16A34A' }}
          />
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {navigation.canGoBack() && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12, padding: 4 }}>
              <Ionicons name="arrow-back" size={24} color="#0F172A" />
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.greeting}>Haqooq System</Text>
            <Text style={styles.title}>Admin Portal</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#1d4ed8" />
        </View>
      ) : (
        <FlatList
          data={pendingLawyers}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <>
              <View style={styles.statsGrid}>
                {renderStatCard('Total Users', stats.totalClients, '#3b82f6')}
                {renderStatCard('Verified Lawyers', stats.totalLawyers, '#10b981')}
                {renderStatCard('Total Cases Logged', stats.totalCases, '#8b5cf6')}
                {renderStatCard('Pending Requests', stats.pendingVerifications, '#f59e0b')}
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Verification Queue</Text>
                <Text style={styles.sectionBadge}>{pendingLawyers.length} Requests</Text>
              </View>
            </>
          }
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>✓</Text>
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptyText}>There are no pending lawyers to verify today.</Text>
            </View>
          }
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={{ paddingBottom: 24, paddingTop: 16 }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#1E293B',
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  greeting: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 4,
  },
  logoutBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    width: '47%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  statTitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionBadge: {
    backgroundColor: '#DBEAFE',
    color: '#1D4ED8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 0,
    shadowColor: 'transparent',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  email: {
    fontSize: 13,
    color: '#64748B',
  },
  cityText: {
    fontSize: 12,
    color: '#0F766E',
    marginTop: 2,
    fontWeight: '500',
  },
  badgeContainer: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badge: {
    color: '#D97706',
    fontSize: 12,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    color: '#10B981',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});