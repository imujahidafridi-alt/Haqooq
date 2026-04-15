import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PostCaseScreen } from '../../features/client/screens/PostCaseScreen';
import { SearchScreen } from '../../features/search/screens/SearchScreen';
import { ActiveCasesScreen } from '../../features/client/screens/ActiveCasesScreen';
import { ProfileScreen } from '../../features/shared/screens/ProfileScreen';
import { ProposalsScreen } from '../../features/client/screens/ProposalsScreen';

export type ClientTabParamList = {
  Home: undefined;
  Search: undefined;
  Cases: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<ClientTabParamList>();
const Stack = createNativeStackNavigator();

const ClientTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'help-outline';

          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Search') iconName = focused ? 'search' : 'search-outline';
          else if (route.name === 'Cases') iconName = focused ? 'briefcase' : 'briefcase-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Home" component={PostCaseScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ title: 'Find Lawyer' }} />
      <Tab.Screen name="Cases" component={ActiveCasesScreen} options={{ title: 'My Cases', headerShown: true }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile', headerShown: true }} />
    </Tab.Navigator>
  );
};

export const ClientNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ClientTabs" component={ClientTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Proposals" component={ProposalsScreen} options={{ title: 'Case Proposals' }} />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});