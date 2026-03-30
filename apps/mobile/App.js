import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './pages/LoginPage';
import ForgotPasswordScreen from './pages/PasswordReset';
import WorkRequestSubmit from './pages/WorkRequestSubmit';
import Dashboard from './pages/Dashboard';
import SettingsPage from './pages/SettingsPage';
import WeeklySchedule from './pages/WeeklySchedule';
import WorkRequestDetails from './pages/WorkRequestDetails';

const Stack = createNativeStackNavigator();


export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'none',
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="Dashboard" component={Dashboard} />
        <Stack.Screen name="WorkRequestSubmit" component={WorkRequestSubmit} />
        <Stack.Screen name="Settings" component={SettingsPage} />
        <Stack.Screen name="WeeklySchedule" component={WeeklySchedule} />
        <Stack.Screen name="WorkRequestDetails" component={WorkRequestDetails} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
