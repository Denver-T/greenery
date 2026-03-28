import React from 'react';
import {
  ImageBackground,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NavBar from '../components/NavBar';
import { COLORS, RADII } from '../theme';

const BG = require('../assets/bg.jpg');

//Replace with real data
const TASK_SETS = [
  {
    id: 1,
    title: 'Task Set #1',
    forms: [1738, 1328, 7543],
  },
  {
    id: 2,
    title: 'Task Set #2',
    forms: [3333, 4444, 5555],
  },
  {
    id: 3,
    title: 'Task Set #3',
    forms: [6666, 7777, 8888],
  },
];

function TaskSetCard({ item, onViewMore }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="information-circle-outline" size={28} color={COLORS.textPrimary} style={styles.infoIcon} />
        <Text style={styles.cardTitle}>{item.title}</Text>
      </View>
      <View style={styles.cardForms}>
        {item.forms.map((form, index) => (
          <Text key={index} style={styles.formText}>REQ Form: {form}</Text>
        ))}
      </View>
      <Pressable
        style={({ pressed }) => [styles.viewMoreBtn, pressed && styles.viewMoreBtnPressed]}
        onPress={() => onViewMore?.(item)}
      >
        <Text style={styles.viewMoreText}>View More</Text>
      </Pressable>
    </View>
  );
}

export default function TaskSetList() {
  const handleViewMore = (item) => {
    // Navigate to task set detail screen
    console.log('View More pressed for:', item.title);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor={COLORS.forest} barStyle="light-content" />

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

        {/* Header Block */}
        <View style={styles.menuBlockWrap}>
          <View style={styles.menuBlock}>
            <Text style={styles.menuBlockText}>List of Task Sets</Text>
          </View>
        </View>

        {/* Task Set Cards */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {TASK_SETS.map((item) => (
            <TaskSetCard key={item.id} item={item} onViewMore={handleViewMore} />
          ))}
          <View style={{ height: 20 }} />
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
  safe: { flex: 1, backgroundColor: COLORS.forest },
  bg: { flex: 1 },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.tint,
  },

  topBar: {
    height: 58,
    backgroundColor: COLORS.forest,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 248, 243, 0.12)',
    elevation: 6,
  },
  topBarSide: { width: 32 },
  topBarCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topTitle: {
    color: COLORS.textOnBrand,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  topSubtitle: {
    color: COLORS.sageMist,
    fontSize: 11,
    marginTop: -2,
  },

  menuBlockWrap: {
    marginTop: 8,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  menuBlock: {
    minHeight: 60,
    borderRadius: RADII.lg,
    backgroundColor: 'rgba(255, 252, 246, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(247, 248, 243, 0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  menuBlockText: {
    color: COLORS.textOnBrand,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
    flex: 1,
    textAlign: 'center',
  },

  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 3,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoIcon: {
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cardForms: {
    marginLeft: 38,
    marginBottom: 14,
  },
  formText: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  viewMoreBtn: {
    alignSelf: 'flex-start',
    marginLeft: 38,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.parchment,
    paddingVertical: 7,
    paddingHorizontal: 20,
  },
  viewMoreBtnPressed: {
    backgroundColor: COLORS.surfaceMuted,
  },
  viewMoreText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },

  tabBar: {
    backgroundColor: COLORS.forestDeep,
  },
});
