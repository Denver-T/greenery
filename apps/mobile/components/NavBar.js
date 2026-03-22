// pages/NavBar.js
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  MaterialCommunityIcons,
  FontAwesome5,
  Feather,
} from '@expo/vector-icons';

const COLORS = {
  green: '#6f8641',
  textOnGreen: '#ffffff',
};

export default function NavBar() {
  const navigation = useNavigation();

  return (
    <View style={styles.tabBar}>
      <Pressable
        onPress={() => navigation.navigate('Dashboard')}
        style={styles.tabItem}
      >
        <MaterialCommunityIcons name="view-dashboard-outline" size={18} color="#fff" />
        <Text style={styles.tabText}>Dashboard</Text>
      </Pressable>

      <Pressable
        onPress={() => navigation.navigate('TaskSetList')}
        style={styles.tabItem}
      >
        <FontAwesome5 name="wpforms" size={16} color="#fff" />
        <Text style={styles.tabText}>Forms</Text>
      </Pressable>

      <Pressable
        onPress={() => navigation.navigate('WeeklySchedule')}
        style={styles.tabItem}
      >
        <MaterialCommunityIcons name="calendar-multiselect" size={18} color="#fff" />
        <Text style={styles.tabText}>Schedule</Text>
      </Pressable>

      <Pressable
        onPress={() => navigation.navigate('HomePage')}
        style={styles.tabItem}
      >
        <Feather name="menu" size={20} color="#fff" />
        <Text style={styles.tabText}>Menu</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    height: 56,
    backgroundColor: COLORS.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.25)',
    elevation: 12, // Android shadow
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  tabText: {
    color: COLORS.textOnGreen,
    fontSize: 11,
    marginTop: 2,
  },
});