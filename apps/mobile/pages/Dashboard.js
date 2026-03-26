import React, { useState } from 'react';
import {
  ImageBackground,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NavBar from '../components/NavBar';
 
const BG = require('../assets/bg.jpg');
 
const COLORS = {
  green: '#6f8641',
  greenDark: '#5e7833',
  blockGreen: '#6f8641',
  textOnGreen: '#ffffff',
  cardFill: '#ffffff',
  cardBorder: '#e5e7eb',
  tint: 'rgba(125, 145, 98, 0.25)',
  mutedText: '#e9efd9',
  emerald: '#16a34a',
  emeraldLight: '#dcfce7',
  rose: '#e11d48',
  roseLight: '#ffe4e6',
  gray100: '#f3f4f6',
  gray500: '#6b7280',
  gray700: '#374151',
  gray900: '#111827',
  todayBg: '#6f8641',
  selectedBg: '#5e7833',
};
 
// ─── MOCK DATA (same as web dashboard) ────────────────────
const mock = {
  kpis: [
    { label: 'Weekly Jobs',  value: '143',     delta: '+12%', positive: true },
    { label: 'Plants In',    value: '178',     delta: '+8%',  positive: true },
    { label: 'Revenue',      value: '$18,460', delta: '-3%',  positive: false },
    { label: 'Avg. Ticket',  value: '$129',    delta: '+5%',  positive: true },
  ],
  weeklyCommonJobsShare: 67,
  commonJobsBreakdown: [
    { label: 'Plant Replacements', value: 96 },
    { label: 'Soil Top-ups',       value: 30 },
    { label: 'Bloom',              value: 15 },
  ],
  plantsIn: [
    { label: 'Orchids',     value: 54 },
    { label: 'Fiddle Leaf', value: 42 },
    { label: 'Fern',        value: 36 },
    { label: 'Croton',      value: 20 },
    { label: 'Bloom',       value: 12 },
  ],
  plantRevenue: [
    { label: 'Orchids',     value: 6600 },
    { label: 'Moss',        value: 5840 },
    { label: 'Fern',        value: 3436 },
    { label: 'Fiddle Leaf', value: 2970 },
    { label: 'Croton',      value: 1180 },
  ],
};
 
// ─── KPI Tile ─────────────────────────────────────────────
function KpiCard({ label, value, delta, positive }) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <View style={styles.kpiRow}>
        <Text style={styles.kpiValue}>{value}</Text>
        {delta != null && (
          <View style={[styles.kpiBadge, positive ? styles.kpiBadgeGreen : styles.kpiBadgeRed]}>
            <Text style={[styles.kpiBadgeText, positive ? styles.kpiBadgeTextGreen : styles.kpiBadgeTextRed]}>
              {positive ? '▲' : '▼'} {delta}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
 
// ─── Horizontal Bar List ──────────────────────────────────
function HBarList({ title, items, suffix = '' }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ marginTop: 12 }}>
        {items.map((item, i) => {
          const pct = Math.round((item.value / max) * 100);
          return (
            <View key={i} style={styles.barRow}>
              <Text style={styles.barLabel} numberOfLines={1}>{item.label}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.barValue}>{item.value}{suffix}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
 
// ─── Ring Stat ────────────────────────────────────────────
function RingStat({ title, percent, caption }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View style={[styles.section, styles.ringSection]}>
      <View style={styles.ringWrap}>
        <View style={[styles.ringOuter, {
          borderColor: COLORS.gray100,
        }]}>
          <View style={[styles.ringFill, {
            borderColor: COLORS.emerald,
            borderTopColor: clamped > 25 ? COLORS.emerald : COLORS.gray100,
            borderRightColor: clamped > 50 ? COLORS.emerald : COLORS.gray100,
            borderBottomColor: clamped > 75 ? COLORS.emerald : COLORS.gray100,
          }]} />
          <View style={styles.ringInner}>
            <Text style={styles.ringPercent}>{clamped}%</Text>
          </View>
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {caption && <Text style={styles.ringCaption}>{caption}</Text>}
      </View>
    </View>
  );
}
 
// ─── Screen ───────────────────────────────────────────────
export default function Dashboard() {
  const [data] = useState(mock);
  const [loading] = useState(false);
 
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
 
        {/* Header Block */}
        <View style={styles.menuBlockWrap}>
          <View style={styles.menuBlock}>
            <Text style={styles.menuBlockText}>Dashboard Analytics</Text>
          </View>
        </View>
 
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.green} style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* KPI Grid */}
              <View style={styles.kpiGrid}>
                {data.kpis.map((k) => (
                  <KpiCard key={k.label} {...k} />
                ))}
              </View>
 
              {/* Ring + Breakdown */}
              <RingStat
                title="Weekly Common Jobs"
                percent={data.weeklyCommonJobsShare}
                caption={`${100 - data.weeklyCommonJobsShare}% other work`}
              />
              <HBarList title="Breakdown" items={data.commonJobsBreakdown} />
              <HBarList title="Plants In" items={data.plantsIn} />
              <HBarList title="Plant Revenue" items={data.plantRevenue} suffix="$" />
            </>
          )}
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
  tint: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.tint },
 
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
  topTitle: { color: COLORS.textOnGreen, fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  topSubtitle: { color: COLORS.mutedText, fontSize: 11, marginTop: -2 },
 
  menuBlockWrap: { marginTop: 8, marginBottom: 8, paddingHorizontal: 6 },
  menuBlock: {
    height: 56,
    borderRadius: 10,
    backgroundColor: COLORS.blockGreen,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  menuBlockText: { color: COLORS.textOnGreen, fontSize: 22, fontWeight: '800', letterSpacing: 0.5 },
 
  scrollContent: { paddingHorizontal: 12, paddingTop: 4 },
 
  // KPI
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  kpiCard: {
    width: '48%',
    backgroundColor: COLORS.cardFill,
    borderRadius: RADIUS,
    padding: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  kpiLabel: { fontSize: 12, color: COLORS.gray500 },
  kpiRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  kpiValue: { fontSize: 22, fontWeight: '700', color: COLORS.gray900 },
  kpiBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 20 },
  kpiBadgeGreen: { backgroundColor: COLORS.emeraldLight },
  kpiBadgeRed: { backgroundColor: COLORS.roseLight },
  kpiBadgeText: { fontSize: 11, fontWeight: '600' },
  kpiBadgeTextGreen: { color: COLORS.emerald },
  kpiBadgeTextRed: { color: COLORS.rose },
 
  // Section
  section: {
    backgroundColor: COLORS.cardFill,
    borderRadius: RADIUS,
    padding: 14,
    marginBottom: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.gray900 },
 
  // Bar
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6 },
  barLabel: { width: 110, fontSize: 12, color: COLORS.gray700 },
  barTrack: { flex: 1, height: 10, backgroundColor: COLORS.gray100, borderRadius: 6 },
  barFill: { height: 10, backgroundColor: COLORS.emerald, borderRadius: 6 },
  barValue: { width: 45, textAlign: 'right', fontSize: 12, color: COLORS.gray900, fontWeight: '600' },
 
  // Ring
  ringSection: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ringWrap: { alignItems: 'center', justifyContent: 'center' },
  ringOuter: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  ringFill: {
    position: 'absolute', width: 80, height: 80,
    borderRadius: 40, borderWidth: 10,
  },
  ringInner: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: COLORS.cardFill,
    alignItems: 'center', justifyContent: 'center',
  },
  ringPercent: { fontSize: 14, fontWeight: '700', color: COLORS.gray900 },
  ringCaption: { fontSize: 12, color: COLORS.gray500, marginTop: 4 },
 
  tabBar: { backgroundColor: COLORS.green },
});