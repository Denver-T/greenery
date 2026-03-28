import React from 'react';
import {
  Alert,
  ImageBackground,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
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
  reqText: '#999999',
  titleGreen: '#5a7320',
};

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
        <Ionicons name="information-circle-outline" size={28} color={COLORS.black} style={styles.infoIcon} />
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
  const navigation = useNavigation();

  const handleViewMore = (item) => {
    // Navigate to task set detail screen
    Alert.alert(item.title, 'REQ Forms: ' + item.forms.join(', '), [{ text: 'Close' }]);
  };

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
          <Pressable
            style={[styles.topBarSide, { alignItems: 'flex-end' }]}
            onPress={() => Alert.alert('Notifications', 'No new notifications at this time.', [{ text: 'OK' }])}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={22} color={COLORS.textOnGreen} />
          </Pressable>
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
    elevation: 6,
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

  /* Header block */
  menuBlockWrap: {
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 6,
  },
  menuBlock: {
    height: 56,
    borderRadius: 10,
    backgroundColor: COLORS.blockGreen,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    elevation: 6,
  },
  backBtn: {
    marginRight: 10,
    padding: 4,
  },
  menuBlockText: {
    color: COLORS.textOnGreen,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
    flex: 1,
    textAlign: 'center',
  },

  /* Scroll */
  scrollContent: {
    paddingHorizontal: 10,
    paddingTop: 4,
  },

  /* Task Set Card */
  card: {
    backgroundColor: COLORS.cardFill,
    borderRadius: RADIUS,
    padding: 16,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
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
    color: COLORS.titleGreen,
  },
  cardForms: {
    marginLeft: 38,
    marginBottom: 14,
  },
  formText: {
    fontSize: 13,
    color: COLORS.reqText,
    lineHeight: 20,
  },
  viewMoreBtn: {
    alignSelf: 'flex-start',
    marginLeft: 38,
    borderWidth: 1,
    borderColor: '#aaaaaa',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 20,
  },
  viewMoreBtnPressed: {
    backgroundColor: '#e8e8e8',
  },
  viewMoreText: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '500',
  },

  /* Bottom tab bar */
  tabBar: {
    backgroundColor: COLORS.green,
  },
});