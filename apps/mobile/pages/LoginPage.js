import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { login } from "../util/firebase";
import { COLORS, RADII, SPACING } from "../theme";

const LOGO = require("../assets/logo.png");

export default function LoginPage() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onLogin() {
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await login(email.trim(), password);
      navigation.reset({
        index: 0,
        routes: [{ name: "Main" }],
      });
    } catch (err) {
      const code = err?.code || "";

      if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
        setError("Incorrect email or password.");
      } else if (code === "auth/invalid-email") {
        setError("Enter a valid email address.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait and try again.");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  function onForgotPassword() {
    navigation.navigate("ForgotPassword");
  }

  function onDemoNotice() {
    Alert.alert(
      "Sign in required",
      "Use a valid Firebase account for this project to continue.",
    );
  }

  const webPointer = Platform.OS === "web" ? { cursor: "pointer" } : undefined;
  const webTextCursor = Platform.OS === "web" ? { cursor: "text" } : undefined;
  const cardWidth = Math.min(width - 24, 440);
  const heroWidth = Math.min(width - 24, 440);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.heroWrap, { width: heroWidth }]}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Technician workspace</Text>
            </View>
            <View style={styles.heroCard}>
              <View style={styles.brandRow}>
                <View style={styles.brandMark}>
                  <Image source={LOGO} style={styles.logoImage} resizeMode="cover" />
                </View>
                <View style={styles.brandCopy}>
                  <Text style={styles.brandEyebrow}>Greenery Operations</Text>
                  <Text style={styles.brandTitle}>Sign in for today&apos;s field plan</Text>
                </View>
              </View>
              <Text style={styles.brandSubtitle}>
                Check requests, follow your schedule, and stay synced with the team from one clear mobile workspace.
              </Text>
            </View>
          </View>

          <View style={[styles.formCard, { width: cardWidth }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Secure sign in</Text>
            </View>
            <Text style={styles.heading}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Use your work account to open the technician app and pick up where your day left off.
            </Text>

            <View style={styles.valueRow}>
              <View style={styles.valuePill}>
                <Text style={styles.valuePillText}>Requests</Text>
              </View>
              <View style={styles.valuePill}>
                <Text style={styles.valuePillText}>Schedule</Text>
              </View>
              <View style={styles.valuePill}>
                <Text style={styles.valuePillText}>Updates</Text>
              </View>
            </View>

            <Text style={[styles.label, styles.labelSpacingLarge]}>Email</Text>
            <View style={styles.inputShell}>
              <TextInput
                placeholder="Enter email"
                placeholderTextColor={COLORS.textSoft}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                style={[styles.input, webTextCursor]}
                accessibilityLabel="Email"
              />
            </View>

            <Text style={[styles.label, styles.labelSpacing]}>Password</Text>
            <View style={styles.inputShell}>
              <TextInput
                placeholder="Enter password"
                placeholderTextColor={COLORS.textSoft}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                style={[styles.input, webTextCursor]}
                accessibilityLabel="Password"
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              onPress={onLogin}
              disabled={loading}
              android_ripple={{ color: "#44591e" }}
              style={({ pressed }) => [
                styles.primaryBtn,
                loading && { opacity: 0.7 },
                pressed && { transform: [{ scale: 0.995 }] },
                webPointer,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Sign In"
            >
              {loading ? (
                <ActivityIndicator color={COLORS.textOnBrand} />
              ) : (
                <Text style={styles.primaryText}>Sign In</Text>
              )}
            </Pressable>

            <Pressable
              onPress={onForgotPassword}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && { transform: [{ scale: 0.995 }] },
                webPointer,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Forgot Password"
            >
              <Text style={styles.secondaryText}>Forgot Password</Text>
            </Pressable>

            <Pressable
              onPress={onDemoNotice}
              style={({ pressed }) => [
                styles.linkBtn,
                pressed && { opacity: 0.8 },
                webPointer,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Login help"
            >
              <Text style={styles.linkText}>Need an account?</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.parchment },
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 28,
    paddingBottom: 28,
  },
  heroWrap: {
    alignSelf: "center",
    marginBottom: 14,
  },
  heroBadge: {
    alignSelf: "flex-start",
    marginBottom: 10,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.surfaceHero,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  heroBadgeText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  heroCard: {
    backgroundColor: COLORS.forestDeep,
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.forestDeep,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandMark: {
    width: 72,
    height: 72,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceGlass,
    padding: 8,
    marginRight: 14,
  },
  logoImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  brandCopy: {
    flex: 1,
  },
  brandEyebrow: {
    color: COLORS.textHeroMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  brandTitle: {
    marginTop: 6,
    color: COLORS.textOnBrand,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 32,
  },
  brandSubtitle: {
    marginTop: 14,
    color: COLORS.textHeroLabel,
    fontSize: 14,
    lineHeight: 21,
  },
  formCard: {
    alignSelf: "center",
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomLeftRadius: RADII.lg,
    borderBottomRightRadius: RADII.lg,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 56,
    height: 5,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.border,
    marginBottom: 14,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: RADII.pill,
    backgroundColor: COLORS.parchment,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  heading: {
    marginTop: 14,
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.textPrimary,
    textAlign: "left",
  },
  subtitle: {
    marginTop: 8,
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  valueRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 14,
    gap: 8,
  },
  valuePill: {
    borderRadius: RADII.pill,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  valuePillText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  label: { fontSize: 14, fontWeight: "700", color: COLORS.textMuted, letterSpacing: 0.2 },
  labelSpacing: { marginTop: 12 },
  labelSpacingLarge: { marginTop: SPACING.lg },
  inputShell: {
    marginTop: 8,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.parchment,
    paddingHorizontal: 12,
    height: 48,
    justifyContent: "center",
  },
  input: { fontSize: 16, color: COLORS.textPrimary },
  errorText: {
    marginTop: 12,
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: "600",
    backgroundColor: COLORS.dangerSoft,
    borderRadius: RADII.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryBtn: {
    marginTop: 16,
    height: 52,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.moss,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 4,
  },
  primaryText: { color: COLORS.textOnBrand, fontSize: 17, fontWeight: "800" },
  secondaryBtn: {
    marginTop: 12,
    height: 50,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: COLORS.textPrimary, fontSize: 16, fontWeight: "700" },
  linkBtn: {
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  linkText: {
    color: COLORS.moss,
    fontSize: 14,
    fontWeight: "700",
  },
});
