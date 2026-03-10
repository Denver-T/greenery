import React from 'react';
import {
  ImageBackground,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
  FontAwesome5,
  Feather,
} from '@expo/vector-icons';
import NavBar from '../components/NavBar'; 

const BG = require('../assets/bg.jpg');
const RADIUS = 12;
const COLORS = {
  green: '#6f8641',      
  greenDark: '#5e7833',
  blockGreen: '#6f8641',
  black: '#000000',
  textOnGreen: '#ffffff',
  cardFill: '#f8f8f8',
  cardBorder: '#d9e1c8',
  tint: 'rgba(125, 145, 98, 0.25)',
  tabIcon: '#fff',
  mutedText: '#e9efd9',
};

export default function WeeklySchedule() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor={COLORS.green} barStyle="light-content" />

      <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
        <View style={styles.tint} />

        {/* Top App Bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarSide}>
            <Ionicons name="person-outline" size={22} color={COLORS.textOnGreen} />
          </View>
          <View style={styles.topBarCenter}>
            <Text style={styles.topTitle}>Greenery Team App</Text>
            <Text style={styles.topSubtitle}>Mobile View</Text>
          </View>
          <View style={[styles.topBarSide, { alignItems: 'flex-end' }]}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.textOnGreen} />
          </View>
        </View>

          <View style={styles.menuBlockWrap}>
            <View style={styles.menuBlock}>
              <Text style={styles.menuBlockText}>Weekly Schedule</Text>
            </View>
          </View>        

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ height: 90 }} />
        </ScrollView>

        {/* Bottom Nav Bar */}
        <View style={styles.tabBar}>
          <NavBar />
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}



const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.green },
  bg: { flex: 1 },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.tint,
  },

  /* Top bar */
  topBar: {
    height: 52,
    backgroundColor: COLORS.green,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    elevation: 6, // Android shadow
    paddingTop: 10
  },
  topBarSide: { width: 32 },
  topBarCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topTitle: {
    color: COLORS.textOnGreen,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  topSubtitle: {
    color: COLORS.mutedText,
    fontSize: 11,
    marginTop: -2,
  },

  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  menuBlockWrap: {
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 6,
  },
  menuBlock: {
    height: 56,
    borderRadius: 10,
    backgroundColor: COLORS.blockGreen,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  menuBlockText: {
    color: COLORS.textOnGreen,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});