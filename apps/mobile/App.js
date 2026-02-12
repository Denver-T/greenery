//This is the login page, aka what the user first sees when they open the app.


import React, { useState } from 'react';
import {
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';

const BG = require('./assets/bg.jpg');    // leafy background
const LOGO = require('./assets/logo.png'); // poster/logo image

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);

  async function onSignIn() {
    if (!email.trim() || !password) {
      Alert.alert('Missing info', 'Please enter both email and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('http://localhost:4000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data && data.message) || 'Sign in failed');
      Alert.alert('Welcome', `Signed in as ${data.user.email}`);
      // TODO: persist token with expo-secure-store and navigate
    } catch (err) {
      Alert.alert('Error', (err && err.message) || 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  }

  function onForgotPassword() {
    Alert.alert('Forgot password', 'Hook this to your reset flow or deep link.');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
        {/* green tint overlay */}
        <View style={styles.tint} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >
          {/* Top logo card */}
          <View style={styles.logoCard}>
            <Image source={LOGO} style={styles.logoImage} resizeMode="cover" />
          </View>

          {/* Login card */}
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

            <TouchableOpacity
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
            </TouchableOpacity>

            <TouchableOpacity onPress={onForgotPassword} style={styles.forgotWrap}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
}

const GREEN = '#556f26';     // button green
const CARD_BG = '#f2f2f2';   // light card fill
const BORDER = '#c8c8c8';    // input border

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#2f4f2f' },
  bg: { flex: 1, justifyContent: 'flex-start' },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(88, 110, 50, 0.35)',
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  logoCard: {
    marginTop: 48,
    width: 260,
    height: 320,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  formCard: {
    width: '94%',
    marginTop: 22,
    backgroundColor: CARD_BG,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#bdbdbd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5b6e30',
  },
  inputShell: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#e6e6e6',
    paddingHorizontal: 12,
    height: 44,
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    color: '#333',
  },
  signInBtn: {
    marginTop: 16,
    height: 44,
    backgroundColor: GREEN,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  forgotWrap: { marginTop: 12 },
  forgotText: {
    color: '#4b6424',
    textDecorationLine: 'underline',
    fontSize: 16,
  },
});
