import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
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
} from 'react-native';

const BG = require('../assets/bg.jpg');
const LOGO = require('../assets/logo.png');

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigation = useNavigation();

  async function onSendReset() {
    if (!email.trim()) {
      Alert.alert('Missing email', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      /*
      ForgetPassword Functionality
      */
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to send reset link');

      Alert.alert('Check your inbox', 'We sent you a password reset link.');
    } catch (err) {
      Alert.alert('Error', err?.message || 'Unable to process the request.');
    } finally {
      setLoading(false);
    }
  }

  function onReturnToLogin() {
    navigation.goBack();
  }

  const webPointer = Platform.OS === 'web' ? { cursor: 'pointer' } : undefined;
  const webTextCursor = Platform.OS === 'web' ? { cursor: 'text' } : undefined;

  return (
    <SafeAreaView style={styles.safe}>
      <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
        {/* green tint overlay */}
        <View style={styles.tint} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >
          {/* Logo card */}
            <View style={styles.logoCard}>
                <Image source={LOGO} style={styles.logoImage} resizeMode="cover" />
            </View>

          {/* Form card */}
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
                style={[styles.input, webTextCursor]}
                accessibilityLabel="Email"
              />
            </View>

            {/* Send Reset Link */}
            <Pressable
              onPress={onSendReset}
              disabled={loading}
              android_ripple={{ color: '#44591e' }}
              style={({ pressed }) => [
                styles.primaryBtn,
                loading && { opacity: 0.7 },
                pressed && { transform: [{ scale: 0.995 }] },
                webPointer,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Send Reset Link"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryText}>Send Reset Link</Text>
              )}
            </Pressable>

            {/* Return to Log in */}
            <Pressable
              onPress={onReturnToLogin}
              android_ripple={{ color: '#d5d5d5' }}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && { transform: [{ scale: 0.995 }] },
                webPointer,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Return to Log in"
            >
              <Text style={styles.secondaryText}>Return to Log in</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
}

const GREEN = '#556f26';     // primary button green
const CARD_BG = '#f2f2f2';   // form card
const BORDER = '#c8c8c8';    // input border

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#2f4f2f' },
  bg: { flex: 1, justifyContent: 'flex-start' },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(88,110,50,0.35)',
  },
  container: { flex: 1, alignItems: 'center', paddingHorizontal: 18 },

  /* Logo card */
  logoWrap: { marginTop: 40, width: 260, height: 320 },
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

  /* Form card */
  formCard: {
    width: '94%',
    marginTop: 20,
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
  label: { fontSize: 18, fontWeight: '700', color: '#5b6e30' },

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
  input: { fontSize: 16, color: '#333' },

  primaryBtn: {
    marginTop: 14,
    height: 44,
    borderRadius: 10,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  secondaryBtn: {
    marginTop: 12,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#ddd',
    borderWidth: 1,
    borderColor: '#bdbdbd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: '#4b6424', fontSize: 17, fontWeight: '800' },
});