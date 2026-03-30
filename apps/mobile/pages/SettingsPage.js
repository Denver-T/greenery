import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

import MobileScaffold from "../components/MobileScaffold";
import { logout } from "../util/firebase";
import { COLORS, RADII, SPACING } from "../theme";

const SETTINGS_GROUPS = [
  {
    title: "Workspace",
    items: [
      {
        icon: "bell-outline",
        label: "Notifications",
        description: "Review alert behavior and keep field updates predictable.",
        comingSoon: true,
      },
      {
        icon: "shield-check-outline",
        label: "Privacy & security",
        description: "See how the technician workspace handles account access.",
        comingSoon: true,
      },
    ],
  },
  {
    title: "Support",
    items: [
      {
        icon: "lifebuoy",
        label: "Get help",
        description: "Reach the team if a schedule, request, or login issue blocks your day.",
        feather: true,
        comingSoon: true,
      },
      {
        icon: "file-text",
        label: "App guidelines",
        description: "Review the expected mobile workflow and field logging standards.",
        feather: true,
        comingSoon: true,
      },
    ],
  },
];

export default function SettingsPage() {
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

  function handlePlaceholder(label) {
    Alert.alert("Coming soon", `${label} will be available in a future update.`);
  }

  return (
    <MobileScaffold
      eyebrow="Settings"
      title="Control your workspace"
      subtitle="Account, support, and device settings in one place."
    >
      <View style={styles.accountCard}>
        <Text style={styles.accountEyebrow}>Technician profile</Text>
        <Text style={styles.accountTitle}>Mobile workspace preferences</Text>
        <Text style={styles.accountText}>
          Use this screen for account, support, and app settings.
        </Text>
      </View>

      {SETTINGS_GROUPS.map((group) => (
        <View key={group.title} style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{group.title}</Text>
          <View style={styles.itemList}>
            {group.items.map((item) => (
              <Pressable
                key={item.label}
                onPress={() => handlePlaceholder(item.label)}
                style={styles.itemRow}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <View style={styles.itemIconWrap}>
                  {item.feather ? (
                    <Feather name={item.icon} size={18} color={COLORS.forestDeep} />
                  ) : (
                    <MaterialCommunityIcons name={item.icon} size={20} color={COLORS.forestDeep} />
                  )}
                </View>
                <View style={styles.itemCopy}>
                  <Text style={styles.itemLabel}>{item.label}</Text>
                  <Text style={styles.itemDescription}>{item.description}</Text>
                </View>
                {item.comingSoon ? (
                  <Text style={styles.comingSoonBadge}>Soon</Text>
                ) : (
                  <Feather name="chevron-right" size={18} color={COLORS.moss} />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      <Pressable onPress={handleLogout} style={styles.logoutButton} accessibilityRole="button" accessibilityLabel="Sign out">
        <Feather name="log-out" size={18} color={COLORS.textOnBrand} />
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </MobileScaffold>
  );
}

const styles = StyleSheet.create({
  accountCard: {
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
  accountEyebrow: {
    color: COLORS.moss,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  accountTitle: {
    marginTop: 10,
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: "800",
  },
  accountText: {
    marginTop: 8,
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  sectionCard: {
    marginTop: SPACING.md,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  itemList: {
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    borderRadius: RADII.md,
    backgroundColor: COLORS.parchment,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  itemIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemCopy: {
    flex: 1,
  },
  itemLabel: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  itemDescription: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  comingSoonBadge: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "700",
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADII.sm,
    overflow: "hidden",
  },
  logoutButton: {
    marginTop: SPACING.md,
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
