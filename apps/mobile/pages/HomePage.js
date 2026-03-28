import React from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  Feather,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";

import MobileScaffold from "../components/MobileScaffold";
import { logout } from "../util/firebase";
import { COLORS, RADII, SPACING } from "../theme";

const PRIMARY_ACTIONS = [
  {
    label: "Today overview",
    description: "See today’s workload, upcoming stops, and request activity.",
    route: "Dashboard",
    icon: (color) => <MaterialCommunityIcons name="clipboard-check-outline" size={20} color={color} />,
  },
  {
    label: "Request queue",
    description: "Open requests, review status, and jump into field details.",
    route: "WorkRequestView",
    icon: (color) => <MaterialIcons name="assignment" size={20} color={color} />,
  },
  {
    label: "Create request",
    description: "Log a new site request with photos and placement notes.",
    route: "WorkRequestSubmit",
    icon: (color) => <Feather name="plus-circle" size={20} color={color} />,
  },
];

const SECONDARY_ACTIONS = [
  {
    label: "Weekly schedule",
    route: "WeeklySchedule",
    icon: (color) => <MaterialCommunityIcons name="calendar-week" size={18} color={color} />,
  },
  {
    label: "Calendar view",
    route: "EventCalendar",
    icon: (color) => <MaterialIcons name="calendar-today" size={18} color={color} />,
  },
  {
    label: "Task sets",
    route: "TaskSetList",
    icon: (color) => <MaterialCommunityIcons name="clipboard-text-outline" size={18} color={color} />,
  },
  {
    label: "Time off",
    route: "PTO",
    icon: (color) => <MaterialCommunityIcons name="clock-outline" size={18} color={color} />,
  },
  {
    label: "Settings",
    route: "Settings",
    icon: (color) => <Feather name="settings" size={18} color={color} />,
  },
];

export default function HomePage() {
  const navigation = useNavigation();

  async function handleLogout() {
    try {
      await logout();
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch {
      Alert.alert("Logout failed", "Please try again.");
    }
  }

  return (
    <MobileScaffold
      eyebrow="Technician toolkit"
      title="Field menu"
      subtitle="Keep the most common field actions one tap away."
    >
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Primary actions</Text>

        <View style={styles.actionList}>
          {PRIMARY_ACTIONS.map((item) => (
            <Pressable
              key={item.route}
              onPress={() => navigation.navigate(item.route)}
              style={styles.primaryAction}
            >
              <View style={styles.primaryIconWrap}>{item.icon(COLORS.forestDeep)}</View>
              <View style={styles.primaryCopy}>
                <Text style={styles.primaryLabel}>{item.label}</Text>
                <Text style={styles.primaryDescription}>{item.description}</Text>
              </View>
              <Feather name="arrow-right" size={18} color={COLORS.moss} />
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.gridSection}>
        <Text style={styles.sectionTitle}>Supporting tools</Text>

        <View style={styles.toolGrid}>
          {SECONDARY_ACTIONS.map((item) => (
            <Pressable
              key={item.route}
              onPress={() => navigation.navigate(item.route)}
              style={styles.toolCard}
            >
              <View style={styles.toolIcon}>{item.icon(COLORS.moss)}</View>
              <Text style={styles.toolLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable onPress={handleLogout} style={styles.logoutButton}>
        <Feather name="log-out" size={18} color={COLORS.textOnBrand} />
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </MobileScaffold>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "800",
  },
  actionList: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  primaryAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    borderRadius: RADII.md,
    backgroundColor: COLORS.parchment,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  primaryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  primaryCopy: {
    flex: 1,
  },
  primaryLabel: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  primaryDescription: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  gridSection: {
    marginTop: SPACING.md,
  },
  toolGrid: {
    marginTop: SPACING.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  toolCard: {
    flexGrow: 1,
    flexBasis: "48%",
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    minHeight: 104,
    justifyContent: "space-between",
  },
  toolIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.parchment,
  },
  toolLabel: {
    marginTop: SPACING.lg,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
    textTransform: "capitalize",
  },
  logoutButton: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
    borderRadius: RADII.md,
    backgroundColor: COLORS.forestDeep,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  logoutText: {
    color: COLORS.textOnBrand,
    fontSize: 15,
    fontWeight: "700",
  },
});
