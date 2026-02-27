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

const COLORS = {
  green: '#6f8641',      
  greenDark: '#5e7833',
  blockGreen: '#6f8641',
  black: '#000000',
  textOnGreen: '#ffffff',
  cardFill: '#f8f8f8',
  cardBorder: '#d9e1c8',
  arrowBg: '#6f8641',
  tint: 'rgba(125, 145, 98, 0.25)',
  tabIcon: '#fff',
  mutedText: '#e9efd9',
};

const MENU_ITEMS = [
  {
    key: 'work_request_submit',
    label: 'Submit a Work Request',
    leftIcon: (props) => <MaterialIcons name="edit" {...props} />,
    route: 'WorkRequestSubmit',
  },
  {
    key: 'work_requests_view',
    label: 'View Work Requests',
    leftIcon: (props) => <MaterialIcons name="insert-drive-file" {...props} />,
    route: 'WorkRequestView',
  },
  {
    key: 'dashboard_analytics',
    label: 'Dashboard Analytics',
    leftIcon: (props) => <MaterialIcons name="pie-chart" {...props} />,
    route: 'Dashboard',
  },
  {
    key: 'calendar',
    label: 'Event Calendar',
    leftIcon: (props) => <MaterialIcons name="calendar-today" {...props} />,
    route: 'EventCalendar',
  },
  {
    key: 'tasks',
    label: 'Task Sets',
    leftIcon: (props) => <MaterialCommunityIcons name="clipboard-text-outline" {...props} />,
    route: 'TaskSets',
  },
  {
    key: 'pto',
    label: 'Book Time Off',
    leftIcon: (props) => <MaterialCommunityIcons name="clock-outline" {...props} />,
    route: 'PTO',
  },
  {
    key: 'schedule',
    label: 'Weekly Schedule',
    leftIcon: (props) => <MaterialCommunityIcons name="calendar-week" {...props} />,
    route: 'WeeklySchedule',
  },
];

export default function HomePage() {
  const navigation = useNavigation();

  function onMenu() {
    navigation.navigate('HomePage')
  }

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
              <Text style={styles.menuBlockText}>Main Menu</Text>
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

  /* Main Menu chip */
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

  /* Blocks */
  blockWrap: {
    marginTop: 10,
  },
  blockBar: {
    height: 18,
    marginHorizontal: 4,
    backgroundColor: COLORS.green,
    borderTopLeftRadius: RADIUS,
    borderTopRightRadius: RADIUS,
    elevation: 2,
  },
  blockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardFill,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderBottomLeftRadius: RADIUS,
    borderBottomRightRadius: RADIUS,
    paddingVertical: 14,
    paddingHorizontal: 12,
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
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
    textAlign: 'center',
  },
  blockArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.arrowBg,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },

  /* Bottom tab bar (static) */
  tabBar: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    height: 56,
    backgroundColor: COLORS.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.25)',
    elevation: 12,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  tabText: {
    color: COLORS.textOnGreen,
    fontSize: 11,
    marginTop: 2,
  },
});