import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { COLORS, RADII, FONTS } from '../theme';

const TAB_ICONS = {
  Dashboard: (color) => <MaterialCommunityIcons name="clipboard-check-outline" size={18} color={color} />,
  WeeklySchedule: (color) => <MaterialCommunityIcons name="calendar-multiselect" size={18} color={color} />,
  WorkRequestSubmit: (color) => <Feather name="plus-circle" size={18} color={color} />,
  Settings: (color) => <Feather name="settings" size={18} color={color} />,
};

const TAB_LABELS = {
  Dashboard: 'Today',
  WeeklySchedule: 'Schedule',
  WorkRequestSubmit: 'New Request',
  Settings: 'Settings',
};

export default function TabBar({ state, navigation }) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const active = state.index === index;
          const color = active ? COLORS.textOnBrand : COLORS.textMuted;
          const label = TAB_LABELS[route.name] || route.name;
          const icon = TAB_ICONS[route.name];

          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!active && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: active }}
              style={[styles.tabItem, active && styles.tabItemActive]}
            >
              {icon ? icon(color) : null}
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 6,
    backgroundColor: 'transparent',
  },
  tabBar: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
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
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: RADII.md,
  },
  tabItemActive: {
    backgroundColor: COLORS.forestDeep,
    borderWidth: 1,
    borderColor: COLORS.forestDeep,
  },
  tabText: {
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 3,
  },
  tabTextActive: {
    fontFamily: FONTS.bold,
    color: COLORS.textOnBrand,
  },
});
