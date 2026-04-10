import React, { useMemo } from "react";
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Application from "expo-application";
import * as IntentLauncher from "expo-intent-launcher";
import * as Haptics from "expo-haptics";

import MobileScaffold from "../components/MobileScaffold";
import { logout } from "../util/firebase";
import { apiFetch } from "../util/api";
import { useTheme, FONTS, RADII, SPACING } from "../theme";

// Prefer expoConfig.version (truthful in both dev and standalone builds).
// Fall back to nativeApplicationVersion only when expoConfig is unavailable
// (rare — bare workflow or unusual host configurations). In Expo Go,
// nativeApplicationVersion returns Expo Go's version, not the project's,
// which is why it's the fallback rather than the primary source.
const APP_VERSION =
  Constants.expoConfig?.version ?? Application.nativeApplicationVersion ?? "—";

const PRIVACY_POLICY_URL =
  Constants.expoConfig?.extra?.privacyPolicyUrl ?? "https://greenery.app/privacy";
const TERMS_OF_SERVICE_URL =
  Constants.expoConfig?.extra?.termsOfServiceUrl ?? "https://greenery.app/terms";
const SUPPORT_EMAIL =
  Constants.expoConfig?.extra?.supportEmail ?? "support@greenery.app";

const SETTINGS_GROUPS = [
  {
    title: "Account",
    items: [
      {
        key: "delete-account",
        icon: "trash-2",
        label: "Delete my account",
        description: "Permanently remove your account and all associated data.",
        accessibilityHint: "Opens account deletion confirmation",
        feather: true,
        danger: true,
      },
    ],
  },
  {
    title: "Preferences",
    items: [
      {
        key: "notifications",
        icon: "bell",
        label: "Notification settings",
        description: "Manage how the app sends alerts and field updates.",
        accessibilityHint: "Opens device notification settings",
        feather: true,
      },
    ],
  },
  {
    title: "Legal",
    items: [
      {
        key: "privacy",
        icon: "shield",
        label: "Privacy policy",
        description: "How Greenery collects, uses, and protects your data.",
        accessibilityHint: "Opens privacy policy in your browser",
        feather: true,
      },
      {
        key: "terms",
        icon: "file-text",
        label: "Terms of service",
        description: "The rules and conditions for using the Greenery platform.",
        accessibilityHint: "Opens terms of service in your browser",
        feather: true,
      },
    ],
  },
  {
    title: "Support",
    items: [
      {
        key: "help",
        icon: "life-buoy",
        label: "Get help",
        description: "Reach the team if a schedule, request, or login issue blocks your day.",
        accessibilityHint: "Opens your email app to contact support",
        feather: true,
      },
      {
        key: "version",
        icon: "info",
        label: "App version",
        description: `Version ${APP_VERSION}`,
        feather: true,
        displayOnly: true,
      },
    ],
  },
];

export default function SettingsPage() {
  const navigation = useNavigation();
  const { COLORS, isDark } = useTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  async function handleLogout() {
    try {
      await logout();
      navigation.getParent().reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch {
      Alert.alert("Logout failed", "Please try again.");
    }
  }

  async function executeDeleteAccount() {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {
      /* haptics are best-effort */
    }

    try {
      // apiFetch throws on non-2xx with the backend's error message string.
      // It does not preserve the structured error code, so we string-match the
      // last-SuperAdmin message rather than checking err.code.
      await apiFetch("/employees/me", { method: "DELETE" });

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        /* haptics best-effort */
      }

      // Dedicated catch so a logout failure doesn't surface a confusing
      // "Logout failed" alert in the deletion context.
      try {
        await logout();
        navigation.getParent().reset({
          index: 0,
          routes: [{ name: "Login" }],
        });
      } catch {
        Alert.alert(
          "Account deleted",
          "Your account has been deleted, but signing out failed. Please close and reopen the app.",
        );
      }
    } catch (err) {
      const message = String(err?.message || "");
      if (message.toLowerCase().includes("last super admin")) {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch {
          /* haptics best-effort */
        }
        Alert.alert(
          "Cannot delete account",
          "You are the last super admin. Promote another administrator before deleting your account.",
        );
        return;
      }
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {
        /* haptics best-effort */
      }
      Alert.alert(
        "Couldn't delete account",
        "Please try again, or contact support if the problem persists.",
      );
    }
  }

  function handleDeleteAccount() {
    Alert.alert(
      "Delete your account?",
      "This will permanently remove your account and all your data. This cannot be undone. You will be signed out immediately.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete my account permanently",
          style: "destructive",
          onPress: executeDeleteAccount,
        },
      ],
    );
  }

  async function handleNotificationSettings() {
    const open = Platform.select({
      ios: async () => {
        const can = await Linking.canOpenURL("app-settings:");
        if (!can) throw new Error("app-settings: not supported");
        await Linking.openURL("app-settings:");
      },
      android: async () => {
        await IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.APP_NOTIFICATION_SETTINGS,
        );
      },
    });

    try {
      await open();
    } catch {
      Alert.alert(
        "Unable to open settings",
        "Please open notification settings manually from your device settings.",
      );
    }
  }

  async function handleOpenURL(url) {
    try {
      const can = await Linking.canOpenURL(url);
      if (!can) throw new Error("URL not openable");
      await Linking.openURL(url);
    } catch {
      Alert.alert("Unable to open link", "Please try again later.");
    }
  }

  async function handleGetHelp() {
    const url = `mailto:${SUPPORT_EMAIL}`;
    try {
      const can = await Linking.canOpenURL(url);
      if (!can) throw new Error("mailto not supported");
      await Linking.openURL(url);
    } catch {
      Alert.alert("No email app found", `Please email us at ${SUPPORT_EMAIL}`, [
        { text: "OK" },
      ]);
    }
  }

  function handleSettingPress(key) {
    switch (key) {
      case "delete-account":
        return handleDeleteAccount();
      case "notifications":
        return handleNotificationSettings();
      case "privacy":
        return handleOpenURL(PRIVACY_POLICY_URL);
      case "terms":
        return handleOpenURL(TERMS_OF_SERVICE_URL);
      case "help":
        return handleGetHelp();
      default:
        return undefined;
    }
  }

  return (
    <MobileScaffold
      eyebrow="Settings"
      title="Control your workspace"
      subtitle="Account, support, and device settings in one place."
      statusBarStyle={isDark ? "light-content" : "dark-content"}
      statusBarBackground={COLORS.parchment}
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
            {group.items.map((item) => {
              const iconColor = item.danger ? COLORS.danger : COLORS.forestDeep;
              const labelStyle = item.danger ? styles.dangerLabel : styles.itemLabel;
              const iconWrapStyle = item.danger
                ? styles.dangerIconWrap
                : styles.itemIconWrap;

              if (item.displayOnly) {
                return (
                  <View
                    key={item.key}
                    style={styles.versionRow}
                    accessible
                    accessibilityRole="none"
                    accessibilityLabel={`${item.label}: ${item.description}`}
                  >
                    <View style={iconWrapStyle}>
                      {item.feather ? (
                        <Feather name={item.icon} size={18} color={iconColor} />
                      ) : (
                        <MaterialCommunityIcons name={item.icon} size={20} color={iconColor} />
                      )}
                    </View>
                    <View style={styles.itemCopy}>
                      <Text style={labelStyle}>{item.label}</Text>
                      <Text style={styles.itemDescription}>{item.description}</Text>
                    </View>
                  </View>
                );
              }

              return (
                <Pressable
                  key={item.key}
                  onPress={() => handleSettingPress(item.key)}
                  style={styles.itemRow}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityHint={item.accessibilityHint}
                >
                  <View style={iconWrapStyle}>
                    {item.feather ? (
                      <Feather name={item.icon} size={18} color={iconColor} />
                    ) : (
                      <MaterialCommunityIcons name={item.icon} size={20} color={iconColor} />
                    )}
                  </View>
                  <View style={styles.itemCopy}>
                    <Text style={labelStyle}>{item.label}</Text>
                    <Text style={styles.itemDescription}>{item.description}</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={COLORS.moss} />
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <Pressable
        onPress={handleLogout}
        style={styles.logoutButton}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        accessibilityHint="Signs you out and returns to the login screen"
      >
        <Feather name="log-out" size={18} color={COLORS.textOnBrand} />
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </MobileScaffold>
  );
}

function createStyles(COLORS) {
  return StyleSheet.create({
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
      fontFamily: FONTS.bold,
      color: COLORS.moss,
      fontSize: 12,
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    accountTitle: {
      fontFamily: FONTS.bold,
      marginTop: 10,
      color: COLORS.textPrimary,
      fontSize: 24,
    },
    accountText: {
      fontFamily: FONTS.regular,
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
      fontFamily: FONTS.bold,
      color: COLORS.textPrimary,
      fontSize: 18,
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
      minHeight: 44,
    },
    versionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.md,
      borderRadius: RADII.md,
      backgroundColor: COLORS.parchment,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: SPACING.md,
      minHeight: 44,
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
    dangerIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.dangerSoft,
      borderWidth: 1,
      borderColor: COLORS.dangerBorder,
    },
    itemCopy: {
      flex: 1,
    },
    itemLabel: {
      fontFamily: FONTS.bold,
      color: COLORS.textPrimary,
      fontSize: 16,
    },
    dangerLabel: {
      fontFamily: FONTS.bold,
      color: COLORS.danger,
      fontSize: 16,
    },
    itemDescription: {
      fontFamily: FONTS.regular,
      marginTop: 4,
      color: COLORS.textMuted,
      fontSize: 13,
      lineHeight: 19,
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
      minHeight: 44,
    },
    logoutText: {
      fontFamily: FONTS.bold,
      color: COLORS.textOnBrand,
      fontSize: 16,
    },
  });
}
