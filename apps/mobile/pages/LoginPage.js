// pages/LoginScreen.js

import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  View,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";

import { login, auth } from "../util/firebase";

const BG = require("../assets/bg.jpg");
const LOGO = require("../assets/logo.png");

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);

  const navigation = useNavigation();

  async function onSignIn() {
  const trimmedEmail = email.trim().toLowerCase();

  if (!trimmedEmail || !password) {
    Alert.alert("Missing info", "Please enter both email and password.");
    return;
  }

  setLoading(true);

  try {
    console.log("1. Starting Firebase login");

    const user = await login(trimmedEmail, password);
    console.log("2. Firebase login success:", user?.email);

    const token = await user.getIdToken(true);
    console.log("3. Got token:", !!token);
    console.log("API URL:", process.env.EXPO_PUBLIC_API_BASE_URL);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_BASE_URL}/auth/me`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);
    console.log("4. /auth/me response status:", response.status);

    const result = await response.json();
    console.log("5. /auth/me response body:", result);

    if (!response.ok) {
      throw new Error(result?.message || "Unable to verify account with API");
    }

    navigation.navigate("HomePage");
  } catch (err) {
    console.error("Login flow error:", err);
    Alert.alert("Error", err?.message || "Unable to sign in");
  } finally {
    setLoading(false);
  }


    setLoading(true);

    try {
      const user = await login(trimmedEmail, password);

      const token = await user.getIdToken(true);
      console.log("Token exists:", !!token);
      console.log("Token preview:", token?.slice(0, 20));

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_BASE_URL}/auth/me`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || "Unable to verify account with API");
      }

      console.log("Firebase user:", auth.currentUser?.email);
      console.log("Backend account:", result?.data);

      navigation.navigate("HomePage");
    } catch (err) {
      Alert.alert("Error", err?.message || "Unable to sign in");
    } finally {
      setLoading(false);
    }
  }

  function onForgotPassword() {
    navigation.navigate("ForgotPassword");
  }

  function goToHomePage() {
    navigation.navigate("HomePage");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
        <View style={styles.tint} />

          <KeyboardAvoidingView
            behavior={Platform.OS === "android" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            style={[styles.container, { marginTop: 60 }]}
          >
            <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: "center"}} keyboardShouldPersistTaps="handled">
              <View style={styles.logoCard}>
                <Image source={LOGO} style={styles.logoImage} resizeMode="cover" />
              </View>

              <View style={styles.formCard}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputShell}>
                  <TextInput
                    placeholder="Enter Email:"
                    placeholderTextColor="#b9b9b9"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    value={email}
                    onChangeText={setEmail}
                    style={styles.input}
                    accessibilityLabel="Email"
                  />
                </View>

                <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
                <View style={styles.inputShell}>
                  <TextInput
                    placeholder="Enter Password:"
                    placeholderTextColor="#b9b9b9"
                    secureTextEntry={secure}
                    textContentType="password"
                    value={password}
                    onChangeText={setPassword}
                    style={styles.input}
                    accessibilityLabel="Password"
                  />
                </View>

                <Pressable
                  style={[styles.signInBtn, loading && { opacity: 0.7 }]}
                  disabled={loading}
                  onPress={onSignIn}
                  accessibilityRole="button"
                  accessibilityLabel="Sign In"
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.signInText}>Sign In</Text>
                  )}
                </Pressable>

                <Pressable onPress={onForgotPassword} style={styles.forgotWrap}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </Pressable>
              </View>

              <View>
                <Pressable onPress={ToHomePage}>
                  <Text>To Home Screen</Text>
                </Pressable>
              </View>
            </ScrollView>
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
  bg: { flex: 1, justifyContent: "flex-start", height: "110%", marginTop: -60 },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(88, 110, 50, 0.35)",
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
  },
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
    marginTop: 22,
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
  label: {
    fontSize: 18,
    fontWeight: "700",
    color: "#5b6e30",
  },
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
  input: {
    fontSize: 16,
    color: "#333",
  },
  signInBtn: {
    marginTop: 16,
    height: 44,
    backgroundColor: GREEN,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  signInText: { color: "#fff", fontWeight: "800", fontSize: 18 },
  forgotWrap: { marginTop: 12 },
  forgotText: {
    color: "#4b6424",
    textDecorationLine: "underline",
    fontSize: 16,
  },
});
