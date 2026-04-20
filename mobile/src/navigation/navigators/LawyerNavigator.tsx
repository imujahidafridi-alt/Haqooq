import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FeedScreen } from '../../features/lawyer/screens/FeedScreen';
import { ProServicesScreen } from '../../features/lawyer/screens/ProServicesScreen';
import { LawyerCasesScreen } from '../../features/lawyer/screens/LawyerCasesScreen';
import { ProfileScreen } from '../../features/shared/screens/ProfileScreen';
import { InboxScreen } from '../../features/chat/screens/InboxScreen';

export type LawyerStackParamList = {
  Feed: undefined;
  Clients: undefined;
  Pro: undefined;
  Inbox: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<LawyerStackParamList>();

export const LawyerNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'help-outline';

          if (route.name === 'Feed') iconName = focused ? 'list' : 'list-outline';
          else if (route.name === 'Clients') iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'Pro') iconName = focused ? 'star' : 'star-outline';
          else if (route.name === 'Inbox') iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#5856D6', // Using a different color to distinguish Lawyer UI
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Feed" component={FeedScreen} options={{ title: 'Case Feed' }} />
      <Tab.Screen name="Clients" component={LawyerCasesScreen} options={{ title: 'My Clients' }} />
      <Tab.Screen name="Pro" component={ProServicesScreen} options={{ title: 'Pro Tools' }} />
      <Tab.Screen name="Inbox" component={InboxScreen} options={{ title: 'Inbox' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
};


const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});