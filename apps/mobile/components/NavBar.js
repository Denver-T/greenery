import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  MaterialCommunityIcons,
  Feather,
} from '@expo/vector-icons';
import { COLORS, RADII } from '../theme';

export default function NavBar() {
  const navigation = useNavigation();
  const route = useRoute();

  const tabs = [
    {
      label: 'Today',
      route: 'Dashboard',
      icon: (color) => <MaterialCommunityIcons name="clipboard-check-outline" size={18} color={color} />,
    },
    {
      label: 'Schedule',
      route: 'WeeklySchedule',
      icon: (color) => <MaterialCommunityIcons name="calendar-multiselect" size={18} color={color} />,
    },
    {
      label: 'New Request',
      route: 'WorkRequestSubmit',
      icon: (color) => <Feather name="plus-circle" size={18} color={color} />,
    },
    {
      label: 'Settings',
      route: 'Settings',
      icon: (color) => <Feather name="settings" size={18} color={color} />,
    },
  ];

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const active = route.name === tab.route;
        const color = active ? COLORS.textOnBrand : COLORS.textMuted;

        return (
          <Pressable
            key={tab.route}
            onPress={() => navigation.navigate(tab.route)}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: active }}
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
    width: '100%',
    minHeight: 68,
    backgroundColor: COLORS.surfaceGlass,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 26,
    paddingHorizontal: 8,
    paddingVertical: 5,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
  tabItem: {
    minWidth: 68,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: RADII.md,
  },
  tabItemActive: {
    backgroundColor: COLORS.forestDeep,
    borderWidth: 1,
    borderColor: COLORS.forestDeep,
  },
  tabText: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 3,
    fontWeight: '700',
  },
  tabTextActive: {
    color: COLORS.textOnBrand,
    fontWeight: '800',
  },
});
