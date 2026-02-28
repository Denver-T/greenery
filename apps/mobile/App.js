import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './pages/LoginPage';
import ForgotPasswordScreen from './pages/PasswordReset';
import HomePage  from './pages/HomePage';
import WorkRequestSubmit from './pages/WorkRequestSubmit';
import WorkRequestView from './pages/WorkRequestView';
import Dashboard from './pages/Dashboard';
import EventCalendar from './pages/EventCalendar';
import TaskSets from './pages/TaskSets';
import PTO from './pages/PTO';
import WeeklySchedule from './pages/WeeklySchedule';

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
        <Stack.Screen name="HomePage" component={HomePage} />
        <Stack.Screen name="WorkRequestSubmit" component={WorkRequestSubmit} />
        <Stack.Screen name="WorkRequestView" component={WorkRequestView} />
        <Stack.Screen name="Dashboard" component={Dashboard} />
        <Stack.Screen name="EventCalendar" component={EventCalendar} />
        <Stack.Screen name="TaskSets" component={TaskSets} />
        <Stack.Screen name="PTO" component={PTO} />
        <Stack.Screen name="WeeklySchedule" component={WeeklySchedule} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
