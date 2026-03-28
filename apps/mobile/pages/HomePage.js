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
  Feather,
} from '@expo/vector-icons';
import NavBar from '../components/NavBar'; 
import { COLORS, RADII } from '../theme';

const BG = require('../assets/bg.jpg');

const MENU_ITEMS = [
  {
    key: 'dashboard_analytics',
    label: 'Today Overview',
    leftIcon: (props) => <MaterialIcons name="pie-chart" {...props} />,
    route: 'Dashboard',
  },
  {
    key: 'work_requests_view',
    label: 'Request Queue',
    leftIcon: (props) => <MaterialIcons name="insert-drive-file" {...props} />,
    route: 'WorkRequestView',
  },
  {
    key: 'work_request_submit',
    label: 'Create New Request',
    leftIcon: (props) => <MaterialIcons name="edit" {...props} />,
    route: 'WorkRequestSubmit',
  },
  {
    key: 'schedule',
    label: 'Weekly Schedule',
    leftIcon: (props) => <MaterialCommunityIcons name="calendar-week" {...props} />,
    route: 'WeeklySchedule',
  },
  {
    key: 'calendar',
    label: 'Event Calendar',
    leftIcon: (props) => <MaterialIcons name="calendar-today" {...props} />,
    route: 'EventCalendar',
  },
  {
    key: 'pto',
    label: 'Time Off',
    leftIcon: (props) => <MaterialCommunityIcons name="clock-outline" {...props} />,
    route: 'PTO',
  },
  {
    key: 'tasks',
    label: 'Task Sets',
    leftIcon: (props) => <MaterialCommunityIcons name="clipboard-text-outline" {...props} />,
    route: 'TaskSetList',
  },
];

export default function HomePage() {
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

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Menu Block */}
          <View style={styles.menuBlockWrap}>
            <View style={styles.menuBlock}>
              <Text style={styles.menuBlockText}>Field Operations</Text>
            </View>
          </View>

          {/* List of blocks */}
          {MENU_ITEMS.map((item) => (
            <View key={item.key} style={styles.blockWrap}>
              <View style={styles.blockBar} />
              <Pressable
                onPress={() => navigation.navigate(item.route)}
                android_ripple={{ color: '#dfe8c9' }}
                style={({ pressed }) => [
                  styles.blockCard,
                  pressed && Platform.OS === 'android' ? { elevation: 2 } : null,
                ]}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <View style={styles.blockLeft}>
                  <View style={styles.iconInner}>
                    {item.leftIcon({ size: 20, color: COLORS.greenDark })}
                  </View>
                </View>

                <View style={styles.blockLabelWrap}>
                  <Text style={styles.blockLabel}>{item.label}</Text>
                </View>

                <View style={styles.blockArrow}>
                  <Feather name="arrow-right" size={20} color="#fff" />
                </View>
              </Pressable>
            </View>
          ))}

          <View style={{ height: 90 }} />
        </ScrollView>

        <View style={styles.tabBar}>
          <NavBar />
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const RADIUS = 12;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.forest },
  bg: { flex: 1 },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.tint,
  },

  /* Top bar */
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
    color: COLORS.textOnGreen,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  topSubtitle: {
    color: COLORS.sageMist,
    fontSize: 11,
    marginTop: -2,
  },

  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
  },

  /* Main Menu chip */
  menuBlockWrap: {
    marginTop: 8,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  menuBlock: {
    borderRadius: RADII.lg,
    backgroundColor: 'rgba(255, 252, 246, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(247, 248, 243, 0.14)',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  menuBlockText: {
    color: COLORS.textOnBrand,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  /* Blocks */
  blockWrap: {
    marginTop: 12,
  },
  blockBar: {
    height: 8,
    marginHorizontal: 10,
    backgroundColor: COLORS.accent,
    borderTopLeftRadius: RADIUS,
    borderTopRightRadius: RADIUS,
    opacity: 0.9,
  },
  blockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: RADII.lg,
    borderBottomRightRadius: RADII.lg,
    paddingVertical: 16,
    paddingHorizontal: 14,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  blockLeft: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.parchment,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  blockLabelWrap: {
    flex: 1,
    paddingHorizontal: 8,
  },
  blockLabel: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'left',
    color: COLORS.textPrimary,
  },
  blockArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.moss,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  tabBar: { backgroundColor: COLORS.forestDeep },
});
