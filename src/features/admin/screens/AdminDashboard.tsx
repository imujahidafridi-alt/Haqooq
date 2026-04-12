import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, FlatList, ActivityIndicator, Alert, Linking, SafeAreaView } from 'react-native';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { getPendingLawyers, approveLawyer } from '../services/adminService';
import { UserProfile } from '../../../types/models';
import { useAuthStore } from '../../../store/authStore';
import { logoutUser } from '../../auth/services/authService';

export const AdminDashboard = () => {
  const { logout } = useAuthStore();
  const [pendingLawyers, setPendingLawyers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLawyers = async () => {
    setLoading(true);
    const lawyers = await getPendingLawyers();
    setPendingLawyers(lawyers);
    setLoading(false);
  };


  useEffect(() => {
    fetchLawyers();
  }, []);

  const handleApprove = async (id: string, name: string | null) => {
    try {
      await approveLawyer(id);
      Alert.alert('Success', `${name || 'The lawyer'} has been verified.`);
      // Remove from UI list instantly
      setPendingLawyers(prev => prev.filter(l => l.id !== id));
    } catch (error: any) {
      // Mock fallback if needed
      Alert.alert('Mock Approval', `${name} approved in dummy mode.`);
      setPendingLawyers(prev => prev.filter(l => l.id !== id));
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    logout();
  };

  const renderItem = ({ item }: { item: UserProfile }) => (
    <Card style={styles.card}>
      <View style={styles.infoRow}>
        <View>
          <Text style={styles.name}>{item.displayName || 'Unknown Name'}</Text>
          <Text style={styles.email}>{item.email}</Text>
        </View>
        <Text style={styles.badge}>Pending</Text>
      </View>
      <View style={styles.actionRow}>
        <Button
          title="View Docs"
          variant="outline"
          onPress={() => {
            if (item.credentialUrl) {
              Linking.openURL(item.credentialUrl).catch(() => Alert.alert('Error', 'Failed to open URL'));
            } else {
              Alert.alert('No Docs', 'User has not uploaded documents yet.');
            }
          }}
          disabled={!item.credentialUrl}
          style={{ flex: 1, marginRight: 8 }}
        />
        <Button
          title="Approve"
          onPress={() => handleApprove(item.id, item.displayName)}
          style={{ flex: 1, marginLeft: 8 }}
        />
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Verification Queue</Text>
        <Button title="Logout" variant="outline" onPress={handleLogout} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={pendingLawyers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No pending lawyers in the queue.</Text>
          }
          refreshing={loading}
          onRefresh={fetchLawyers}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  },
  card: {
    padding: 16,
    marginBottom: 12
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4
  },
  email: {
    color: '#666'
  },
  badge: {
    backgroundColor: '#FFE58F',
    color: '#D97706',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 'bold',
    overflow: 'hidden'
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 40,
    fontSize: 16
  }
});
