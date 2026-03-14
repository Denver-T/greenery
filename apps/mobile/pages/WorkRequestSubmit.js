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

const FORM_FIELDS = [
  {
    key: 'req_num',
    label: 'REQ#',
    type: "text",
    placeholder: "Enter request number",
    keyboardType: 'default',
    required: true
  },
  {
    key: 'account_name',
    label: 'Account Name',
    type: "text",
    placeholder: "Enter account name",
    keyboardType: 'default',
    required: true
  },
  {
    key: 'address',
    label: 'Address',
    type: "text",
    placeholder: "Enter address",
    keyboardType: 'default',
    required: true
  },
  {
    key: 'work_type',
    label: 'Work Needed',
    type: "text",
    placeholder: "Enter work type",
    keyboardType: 'default',
    required: true
  },
  {
    key: 'plant_work',
    label: 'Plant Work',
    type: "text",
    placeholder: "Enter plant(s) that need work",
    keyboardType: 'default',
    required: true
  },
  {
    key: 'plant_location',
    label: 'Plant Location',
    type: "text",
    placeholder: "Enter location of plant",
    keyboardType: 'default',
    required: true
  },
  {
    key: 'plant_needed ',
    label: 'Plant Needed',
    type: "text",
    placeholder: "Enter any plant(s) needed",
    keyboardType: 'default',
    required: true
  },
  {
    key: 'acc_contact',
    label: 'Account Contact',
    type: "text",
    placeholder: "Enter account contact",
    keyboardType: 'default',
    required: true
  },
];


export default function WorkRequestSubmit() {
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
              <Text style={styles.menuBlockText}>Work Request Submission Form</Text>
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