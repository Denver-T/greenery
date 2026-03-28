import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { login } from "../util/firebase";
import { COLORS, RADII } from "../theme";

const BG = require("../assets/bg.jpg");
const LOGO = require("../assets/logo.png");

export default function LoginPage() {
  const navigation = useNavigation();
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
        routes: [{ name: "HomePage" }],
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

  return (
    <SafeAreaView style={styles.safe}>
      <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
        <View style={styles.tint} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.container}
        >
          <View style={styles.logoCard}>
            <Image source={LOGO} style={styles.logoImage} resizeMode="cover" />
          </View>

          <View style={styles.formCard}>
            <Text style={styles.heading}>Greenery Login</Text>

            <Text style={styles.label}>Email</Text>
            <View style={styles.inputShell}>
              <TextInput
                placeholder="Enter email"
                placeholderTextColor="#b9b9b9"
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
                placeholderTextColor="#b9b9b9"
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
                <ActivityIndicator color="#fff" />
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
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.forest },
  bg: { flex: 1, justifyContent: "flex-start" },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.tint,
  },
  container: { flex: 1, alignItems: "center", paddingHorizontal: 20 },
  logoCard: {
    marginTop: 42,
    width: 250,
    height: 300,
    backgroundColor: "rgba(255, 252, 246, 0.94)",
    borderRadius: RADII.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(247, 248, 243, 0.4)",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  logoImage: {
    width: "100%",
    height: "100%",
    borderRadius: 6,
  },
  formCard: {
    width: "94%",
    marginTop: 20,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 6,
  },
  heading: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: "left",
  },
  label: { fontSize: 14, fontWeight: "700", color: COLORS.textMuted, letterSpacing: 0.2 },
  labelSpacing: { marginTop: 12 },
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
    height: 48,
    borderRadius: RADII.md,
    backgroundColor: COLORS.moss,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 4,
  },
  primaryText: { color: "#fff", fontSize: 17, fontWeight: "800" },
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
