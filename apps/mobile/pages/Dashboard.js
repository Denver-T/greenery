import React, { useEffect, useMemo, useState } from 'react';
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
import { apiFetch } from "../util/api";
import { COLORS } from '../theme';

const BG = require('../assets/bg.jpg');

function countBy(items, selector) {
  const map = new Map();

  items.forEach((item) => {
    const key = selector(item) || "Unknown";
    map.set(key, (map.get(key) || 0) + 1);
  });

  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

function buildDashboardData({ employees, reqs, tasks, schedule }) {
  const activeReqs = reqs.filter(
    (req) => !["completed", "cancelled"].includes(String(req.status || "").toLowerCase())
  );
  const assignedTasks = tasks.filter((task) => task.assignedTo ?? task.assigned_to);
  const completedTasks = tasks.filter(
    (task) => String(task.status || "").toLowerCase() === "completed"
  );

  return {
    kpis: [
      { label: "Employees", value: String(employees.length) },
      { label: "Open REQs", value: String(activeReqs.length) },
      { label: "Assigned Tasks", value: String(assignedTasks.length) },
      { label: "Schedule Events", value: String(schedule.length) },
    ],
    weeklyCommonJobsShare:
      tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0,
    commonJobsBreakdown: countBy(reqs, (req) => req.actionRequired),
    plantsIn: countBy(reqs, (req) => req.account),
    plantRevenue: countBy(schedule, (event) => event.employee_name || "Unassigned"),
  };
}

function KpiCard({ label, value, delta, positive }) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <View style={styles.kpiRow}>
        <Text style={styles.kpiValue}>{value}</Text>
        {delta ? (
          <View style={[styles.kpiBadge, positive ? styles.kpiBadgeGreen : styles.kpiBadgeRed]}>
            <Text style={[styles.kpiBadgeText, positive ? styles.kpiBadgeTextGreen : styles.kpiBadgeTextRed]}>
              {positive ? '▲' : '▼'} {delta}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function HBarList({ title, items, suffix = '' }) {
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.barList}>
        {items.map((item) => {
          const pct = Math.round((item.value / max) * 100);

          return (
            <View key={item.label} style={styles.barRow}>
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

function RingStat({ title, percent, caption }) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <View style={[styles.section, styles.ringSection]}>
      <View style={styles.ringWrap}>
        <View style={styles.ringOuter}>
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

      <View style={styles.ringTextWrap}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {caption ? <Text style={styles.ringCaption}>{caption}</Text> : null}
      </View>
    </View>
  );
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sourceData, setSourceData] = useState({
    employees: [],
    reqs: [],
    tasks: [],
    schedule: [],
  });

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const [employees, reqs, tasks, schedule] = await Promise.all([
          apiFetch("/employees"),
          apiFetch("/reqs"),
          apiFetch("/tasks?scope=assignment"),
          apiFetch("/schedule"),
        ]);

        if (!cancelled) {
          setSourceData({
            employees: Array.isArray(employees) ? employees : [],
            reqs: Array.isArray(reqs) ? reqs : [],
            tasks: Array.isArray(tasks) ? tasks : [],
            schedule: Array.isArray(schedule) ? schedule : [],
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Failed to load dashboard");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const data = useMemo(() => buildDashboardData(sourceData), [sourceData]);

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
            <Text style={styles.menuBlockText}>Dashboard Analytics</Text>
          </View>
        </View>
        
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.green} style={styles.loading} />
          ) : (
            <>
              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.kpiGrid}>
                {data.kpis.map((item) => (
                  <KpiCard key={item.label} {...item} />
                ))}
              </View>

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
        
        {/* Bottom Nav Bar */}
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
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  loading: {
    marginTop: 40,
  },
  errorBox: {
    backgroundColor: "#fee2e2",
    borderColor: "#fecaca",
    borderWidth: 1,
    borderRadius: RADIUS,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: "#991b1b",
    fontWeight: "600",
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: COLORS.cardFill,
    borderRadius: RADIUS,
    padding: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  kpiLabel: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  kpiBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 20,
  },
  kpiBadgeGreen: {
    backgroundColor: COLORS.emeraldLight,
  },
  kpiBadgeRed: {
    backgroundColor: COLORS.roseLight,
  },
  kpiBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  kpiBadgeTextGreen: {
    color: COLORS.emerald,
  },
  kpiBadgeTextRed: {
    color: COLORS.rose,
  },
  section: {
    backgroundColor: COLORS.cardFill,
    borderRadius: RADIUS,
    padding: 14,
    marginBottom: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  barList: {
    marginTop: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  barLabel: {
    width: 110,
    fontSize: 12,
    color: COLORS.greenDark,
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: COLORS.gray100,
    borderRadius: 6,
  },
  barFill: {
    height: 10,
    backgroundColor: COLORS.emerald,
    borderRadius: 6,
  },
  barValue: {
    width: 52,
    textAlign: 'right',
    fontSize: 12,
    color: COLORS.gray900,
    fontWeight: '600',
  },
  ringSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 10,
    borderColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringFill: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 10,
  },
  ringInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.cardFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  ringTextWrap: {
    flex: 1,
  },
  ringCaption: {
    fontSize: 12,
    color: COLORS.gray500,
    marginTop: 4,
  },
  tabBar: {
    backgroundColor: COLORS.green,
  },
});
