import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  MaterialCommunityIcons,
  Feather,
  MaterialIcons,
} from '@expo/vector-icons';
import { COLORS, RADII } from '../theme';

export default function NavBar() {
  const navigation = useNavigation();
  const route = useRoute();

  const tabs = [
    {
      label: 'Today',
      route: 'Dashboard',
      icon: (color) => <MaterialCommunityIcons name="view-dashboard-outline" size={18} color={color} />,
    },
    {
      label: 'Requests',
      route: 'WorkRequestView',
      icon: (color) => <MaterialIcons name="assignment" size={18} color={color} />,
    },
    {
      label: 'Schedule',
      route: 'WeeklySchedule',
      icon: (color) => <MaterialCommunityIcons name="calendar-multiselect" size={18} color={color} />,
    },
    {
      label: 'Menu',
      route: 'HomePage',
      icon: (color) => <Feather name="menu" size={20} color={color} />,
    },
  ];

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const active = route.name === tab.route;
        const color = active ? COLORS.textPrimary : COLORS.textOnBrand;

        return (
          <Pressable
            key={tab.route}
            onPress={() => navigation.navigate(tab.route)}
            style={[styles.tabItem, active && styles.tabItemActive]}
          >
            {tab.icon(color)}
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    height: 64,
    backgroundColor: COLORS.forestDeep,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(247, 248, 243, 0.15)',
    paddingHorizontal: 10,
    elevation: 12,
  },
  tabItem: {
    minWidth: 68,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: RADII.md,
  },
  tabItemActive: {
    backgroundColor: COLORS.parchment,
  },
  tabText: {
    color: COLORS.textOnBrand,
    fontSize: 11,
    marginTop: 3,
    fontWeight: '600',
  },
  tabTextActive: {
    color: COLORS.textPrimary,
  },
});
