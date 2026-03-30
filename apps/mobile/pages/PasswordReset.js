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
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { resetPassword } from "../util/firebase";
import { COLORS, RADII, SPACING } from "../theme";

const LOGO = require("../assets/logo.png");

export default function ForgotPasswordPage() {
  const { width } = useWindowDimensions();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const logoWidth = Math.min(Math.max(width - 120, 180), 220);
  const logoHeight = Math.round(logoWidth * 1.14);
  const cardWidth = Math.min(width - 32, 420);

  async function onSendReset() {
    if (!email.trim()) {
      Alert.alert("Missing email", "Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      await resetPassword(email.trim());
      Alert.alert(
        "Reset email sent",
        "Check your inbox for a password reset link.",
        [{ text: "Back to login", onPress: () => navigation.navigate("Login") }]
      );
    } catch (err) {
      const code = err?.code || "";
      let message = "Something went wrong. Please try again.";

      if (code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      } else if (code === "auth/too-many-requests") {
        message = "Too many attempts. Please try again later.";
      }

      Alert.alert("Reset failed", message);
    } finally {
      setLoading(false);
    }
  }

  const webPointer = Platform.OS === "web" ? { cursor: "pointer" } : undefined;
  const webTextCursor = Platform.OS === "web" ? { cursor: "text" } : undefined;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <View style={[styles.logoCard, { width: logoWidth, height: logoHeight }]}>
          <Image source={LOGO} style={styles.logoImage} resizeMode="cover" />
        </View>

        <View style={[styles.formCard, { width: cardWidth }]}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Password help</Text>
          </View>

          <Text style={styles.heading}>Reset your password</Text>
          <Text style={styles.subtitle}>
            Enter the email attached to your field account. This screen should stay calm, readable, and explicit about what happens next.
          </Text>

          <Text style={styles.label}>Email</Text>
          <View style={styles.inputShell}>
            <TextInput
              placeholder="Enter email"
              placeholderTextColor={COLORS.textSoft}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
              style={[styles.input, webTextCursor]}
              accessibilityLabel="Email"
            />
          </View>

          <Pressable
            onPress={onSendReset}
            disabled={loading}
            style={({ pressed }) => [
              styles.primaryBtn,
              loading && { opacity: 0.7 },
              pressed && { transform: [{ scale: 0.995 }] },
              webPointer,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Send Reset Link"
          >
            {loading ? <ActivityIndicator color={COLORS.textOnBrand} /> : <Text style={styles.primaryText}>Send reset instructions</Text>}
          </Pressable>

          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && { transform: [{ scale: 0.995 }] },
              webPointer,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Back to login"
          >
            <Text style={styles.secondaryText}>Back to login</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.parchment },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  logoCard: {
    marginBottom: 20,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 5,
  },
  logoImage: {
    width: "100%",
    height: "100%",
    borderRadius: 6,
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 5,
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
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  heading: {
    marginTop: 14,
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 8,
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  label: {
    marginTop: SPACING.lg,
    marginBottom: 6,
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: "700",
  },
  inputShell: {
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.parchment,
    paddingHorizontal: 12,
    height: 48,
    justifyContent: "center",
  },
  input: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  primaryBtn: {
    marginTop: SPACING.lg,
    height: 48,
    borderRadius: RADII.md,
    backgroundColor: COLORS.moss,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    color: COLORS.textOnBrand,
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryBtn: {
    marginTop: 12,
    height: 46,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
});
