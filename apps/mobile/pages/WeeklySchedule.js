import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import MobileScaffold from "../components/MobileScaffold";
import { apiFetch } from "../util/api";
import { COLORS, RADII, SPACING } from "../theme";

function sameWeek(date, today) {
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  start.setDate(today.getDate() - today.getDay());

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return date >= start && date < end;
}

function formatDateTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid time";
  }

  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function WeeklySchedule() {
  const [events, setEvents] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showMineOnly, setShowMineOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchSchedule() {
      try {
        setLoading(true);
        setError("");

        const [me, schedule] = await Promise.all([
          apiFetch("/auth/me"),
          apiFetch("/schedule"),
        ]);

        if (!cancelled) {
          setCurrentUser(me);
          setEvents(Array.isArray(schedule) ? schedule : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Failed to load schedule.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchSchedule();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleEvents = useMemo(() => {
    const today = new Date();
    const myName = String(currentUser?.name || "").trim().toLowerCase();

    return events
      .filter((event) => sameWeek(new Date(event.start_time), today))
      .filter((event) => {
        if (!showMineOnly) {
          return true;
        }

        return String(event.employee_name || "").trim().toLowerCase() === myName;
      })
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  }, [currentUser, events, showMineOnly]);

  return (
    <MobileScaffold
      eyebrow="Schedule"
      title="Weekly plan"
      subtitle="Scan your week and open the items that need attention."
    >
      <View style={styles.toggleRow}>
        <Pressable
          onPress={() => setShowMineOnly(true)}
          style={[styles.toggleChip, showMineOnly && styles.toggleChipActive]}
        >
          <Text style={[styles.toggleText, showMineOnly && styles.toggleTextActive]}>My schedule</Text>
        </Pressable>
        <Pressable
          onPress={() => setShowMineOnly(false)}
          style={[styles.toggleChip, !showMineOnly && styles.toggleChipActive]}
        >
          <Text style={[styles.toggleText, !showMineOnly && styles.toggleTextActive]}>All events</Text>
        </Pressable>
      </View>

      {loading ? <ActivityIndicator size="large" color={COLORS.moss} style={styles.loader} /> : null}

      {!loading && error ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>Could not load the schedule</Text>
          <Text style={styles.stateText}>{error}</Text>
        </View>
      ) : null}

      {!loading && !error && visibleEvents.length === 0 ? (
        <View style={styles.stateCard}>
          <MaterialCommunityIcons name="calendar-blank-outline" size={34} color={COLORS.textMuted} />
          <Text style={styles.stateTitle}>Nothing scheduled this week</Text>
          <Text style={styles.stateText}>Assignments will appear here once they are scheduled.</Text>
        </View>
      ) : null}

      {!loading && !error ? (
        <View style={styles.list}>
          {visibleEvents.map((event) => (
            <View key={event.id} style={styles.eventCard}>
              <View style={styles.eventIcon}>
                <MaterialCommunityIcons name="calendar-clock-outline" size={18} color={COLORS.forestDeep} />
              </View>
              <View style={styles.eventCopy}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventMeta}>{formatDateTime(event.start_time)}</Text>
                <Text style={styles.eventMeta}>
                  Ends {formatDateTime(event.end_time)}{event.employee_name ? ` • ${event.employee_name}` : ""}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </MobileScaffold>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  toggleChip: {
    borderRadius: RADII.pill,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  toggleChipActive: {
    backgroundColor: COLORS.forestDeep,
    borderColor: COLORS.forestDeep,
  },
  toggleText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  toggleTextActive: {
    color: COLORS.textOnBrand,
  },
  loader: {
    marginTop: 40,
  },
  stateCard: {
    marginTop: SPACING.md,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    alignItems: "center",
  },
  stateTitle: {
    marginTop: 10,
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  stateText: {
    marginTop: 6,
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  list: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  eventCard: {
    flexDirection: "row",
    gap: SPACING.md,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  eventIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.parchment,
    alignItems: "center",
    justifyContent: "center",
  },
  eventCopy: {
    flex: 1,
  },
  eventTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: "800",
  },
  eventMeta: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});
