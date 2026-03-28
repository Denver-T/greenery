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
import { COLORS, RADII } from '../theme';

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
    } catch (_err) {
        //Error handling
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.forest },
  bg: { flex: 1, justifyContent: 'flex-start' },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.tint,
  },
  container: { flex: 1, alignItems: 'center', paddingHorizontal: 18 },

  /* Logo card */
  logoWrap: { marginTop: 40, width: 260, height: 320 },
  logoCard: {
    marginTop: 42,
    width: 250,
    height: 300,
    backgroundColor: 'rgba(255, 252, 246, 0.94)',
    borderRadius: RADII.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(247, 248, 243, 0.4)',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
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
  label: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 0.2 },

  inputShell: {
    marginTop: 8,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.parchment,
    paddingHorizontal: 12,
    height: 48,
    justifyContent: 'center',
  },
  input: { fontSize: 16, color: COLORS.textPrimary },

  primaryBtn: {
    marginTop: 14,
    height: 48,
    borderRadius: RADII.md,
    backgroundColor: COLORS.moss,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  secondaryBtn: {
    marginTop: 12,
    height: 46,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700' },
});
