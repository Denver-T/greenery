import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

import NavBar from "./NavBar";
import { COLORS, RADII, SPACING } from "../theme";

const PRIMARY_ROUTES = new Set([
  "Dashboard",
  "WeeklySchedule",
  "WorkRequestSubmit",
  "Settings",
]);

export default function MobileScaffold({
  eyebrow,
  title,
  subtitle,
  children,
  rightSlot = null,
  scroll = true,
  contentContainerStyle,
  showBackButton,
}) {
  const navigation = useNavigation();
  const route = useRoute();
  const isPrimaryRoute = PRIMARY_ROUTES.has(route.name);
  const shouldShowBackButton =
    typeof showBackButton === "boolean"
      ? showBackButton
      // Main destinations should feel tab-rooted, while drill-in screens expose an explicit way back.
      : navigation.canGoBack() && !isPrimaryRoute;

  const content = (
    <View style={[styles.contentInner, contentContainerStyle]}>
      <View style={styles.heroWrap}>
        {eyebrow ? (
          <View style={styles.eyebrowChip}>
            <Text style={styles.eyebrowText}>{eyebrow}</Text>
          </View>
        ) : null}
        <Text style={styles.heroTitle}>{title}</Text>
        {subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
      </View>

      <View style={styles.bodyStack}>{children}</View>
      <View style={styles.bottomSpacer} />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor={COLORS.parchment} barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.layout}
      >
        <View style={styles.topBarWrap}>
          <View style={styles.topBar}>
            <View style={styles.topBarSide}>
              {shouldShowBackButton ? (
                <Pressable
                  onPress={() => navigation.goBack()}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                  style={styles.backButton}
                >
                  <Ionicons name="chevron-back" size={18} color={COLORS.textPrimary} />
                </Pressable>
              ) : (
                <View style={styles.brandIcon}>
                  <Ionicons name="leaf-outline" size={18} color={COLORS.moss} />
                </View>
              )}
            </View>

            <View style={styles.topBarCenter}>
              <Text style={styles.topTitle}>Greenery Field Ops</Text>
            </View>

            <View style={[styles.topBarSide, styles.topBarRight]}>
              {rightSlot ||
                (route.name !== "Settings" ? (
                  <Pressable
                    onPress={() => navigation.navigate("Settings")}
                    accessibilityRole="button"
                    accessibilityLabel="Open settings"
                    style={styles.actionButton}
                  >
                    <Ionicons name="settings-outline" size={18} color={COLORS.textPrimary} />
                  </Pressable>
                ) : (
                  <View style={styles.topBarSpacer} />
                ))}
            </View>
          </View>
        </View>

        <View style={styles.contentArea}>
          {scroll ? (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* The shell owns the hero/header rhythm so individual screens only render their content blocks. */}
              {content}
            </ScrollView>
          ) : (
            <View style={styles.nonScrollContent}>{content}</View>
          )}
        </View>

        <View style={styles.navWrap}>
          <NavBar />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.parchment,
  },
  layout: {
    flex: 1,
    backgroundColor: COLORS.parchment,
  },
  topBarWrap: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xs,
  },
  topBar: {
    minHeight: 54,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  topBarSide: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarRight: {
    alignItems: "flex-end",
  },
  topTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.parchment,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.parchment,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  topBarSpacer: {
    width: 34,
    height: 34,
  },
  brandIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.parchment,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  contentArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xs,
  },
  nonScrollContent: {
    flex: 1,
  },
  contentInner: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: SPACING.md,
  },
  heroWrap: {
    borderRadius: 26,
    backgroundColor: COLORS.forestDeep,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md + 2,
    marginTop: SPACING.xs,
  },
  eyebrowChip: {
    alignSelf: "flex-start",
    borderRadius: RADII.pill,
    backgroundColor: COLORS.parchment,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  eyebrowText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroTitle: {
    marginTop: 12,
    color: COLORS.textOnBrand,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
  },
  heroSubtitle: {
    marginTop: 8,
    color: "rgba(247, 248, 243, 0.82)",
    fontSize: 14,
    lineHeight: 20,
  },
  bodyStack: {
    marginTop: SPACING.md,
    gap: SPACING.md,
  },
  bottomSpacer: {
    height: SPACING.sm,
  },
  navWrap: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.sm,
    backgroundColor: "transparent",
  },
});
