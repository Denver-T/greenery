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

const GREEN = "#556f26";
const CARD_BG = "#f2f2f2";
const BORDER = "#c8c8c8";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#2f4f2f" },
  bg: { flex: 1, justifyContent: "flex-start" },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(88,110,50,0.35)",
  },
  container: { flex: 1, alignItems: "center", paddingHorizontal: 18 },
  logoCard: {
    marginTop: 48,
    width: 260,
    height: 320,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
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
    backgroundColor: CARD_BG,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#bdbdbd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  heading: {
    fontSize: 24,
    fontWeight: "800",
    color: "#5b6e30",
    marginBottom: 12,
    textAlign: "center",
  },
  label: { fontSize: 18, fontWeight: "700", color: "#5b6e30" },
  labelSpacing: { marginTop: 12 },
  inputShell: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#e6e6e6",
    paddingHorizontal: 12,
    height: 44,
    justifyContent: "center",
  },
  input: { fontSize: 16, color: "#333" },
  errorText: {
    marginTop: 12,
    color: "#b42318",
    fontSize: 14,
    fontWeight: "600",
  },
  primaryBtn: {
    marginTop: 14,
    height: 44,
    borderRadius: 10,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  secondaryBtn: {
    marginTop: 12,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#ddd",
    borderWidth: 1,
    borderColor: "#bdbdbd",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: "#4b6424", fontSize: 17, fontWeight: "800" },
  linkBtn: {
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  linkText: {
    color: "#4b6424",
    fontSize: 14,
    fontWeight: "700",
  },
});
