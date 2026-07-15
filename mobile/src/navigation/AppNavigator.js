import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/tokens';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import PhoneLoginScreen from '../screens/PhoneLoginScreen';
import ResumeListScreen from '../screens/ResumeListScreen';
import ResumeEditorScreen from '../screens/ResumeEditorScreen';
import PreviewScreen from '../screens/PreviewScreen';
import InterviewPrepScreen from '../screens/InterviewPrepScreen';
import JobMatchScreen from '../screens/JobMatchScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.textPrimary,
  headerShadowVisible: false,
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        ...screenOptions,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen name="Resumes" component={ResumeListScreen} options={{ headerShown: false, tabBarLabel: 'Resumes' }} />
      <Tab.Screen name="InterviewPrep" component={InterviewPrepScreen} options={{ title: 'Interview Prep', tabBarLabel: 'Interview' }} />
      <Tab.Screen name="JobMatch" component={JobMatchScreen} options={{ title: 'Get Interview Calls', tabBarLabel: 'Job Match' }} />
      <Tab.Screen name="Subscription" component={SubscriptionScreen} options={{ headerShown: false, tabBarLabel: 'Premium' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={screenOptions}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="Editor" component={ResumeEditorScreen} options={{ title: 'Edit Resume' }} />
            <Stack.Screen name="Preview" component={PreviewScreen} options={{ title: 'Preview' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
            <Stack.Screen name="PhoneLogin" component={PhoneLoginScreen} options={{ headerShown: false }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
