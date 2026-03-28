import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import MobileScaffold from "../components/MobileScaffold";
import { apiFetch } from "../util/api";
import { COLORS, RADII, SPACING } from "../theme";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function EventCalendar() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    let cancelled = false;

    async function fetchEvents() {
      try {
        setLoading(true);
        setError("");
        const response = await apiFetch("/schedule");

        if (!cancelled) {
          setEvents(Array.isArray(response) ? response : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Failed to load events.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchEvents();

    return () => {
      cancelled = true;
    };
  }, []);

  const today = new Date();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < firstDay; i += 1) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i += 1) {
      days.push(i);
    }
    return days;
  }, [daysInMonth, firstDay]);

  function getEventsForDate(day) {
    return events.filter((event) => {
      const date = new Date(event.start_time);
      return (
        date.getDate() === day &&
        date.getMonth() === currentMonth &&
        date.getFullYear() === currentYear
      );
    });
  }

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <MobileScaffold
      eyebrow="Calendar"
      title="Monthly view"
      subtitle="Use the month view for a quick schedule check."
    >
      <View style={styles.calendarCard}>
        <View style={styles.monthNav}>
          <Pressable onPress={() => {
            if (currentMonth === 0) {
              setCurrentMonth(11);
              setCurrentYear((value) => value - 1);
            } else {
              setCurrentMonth((value) => value - 1);
            }
            setSelectedDate(null);
          }} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color={COLORS.forestDeep} />
          </Pressable>

          <Text style={styles.monthTitle}>{MONTHS[currentMonth]} {currentYear}</Text>

          <Pressable onPress={() => {
            if (currentMonth === 11) {
              setCurrentMonth(0);
              setCurrentYear((value) => value + 1);
            } else {
              setCurrentMonth((value) => value + 1);
            }
            setSelectedDate(null);
          }} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color={COLORS.forestDeep} />
          </Pressable>
        </View>

        <View style={styles.dayHeaderRow}>
          {DAYS.map((day) => (
            <Text key={day} style={styles.dayHeader}>{day}</Text>
          ))}
        </View>

        {loading ? <ActivityIndicator size="large" color={COLORS.moss} style={styles.loader} /> : null}

        {!loading ? (
          <View style={styles.grid}>
            {calendarDays.map((day, index) => {
              const isToday =
                day === today.getDate() &&
                currentMonth === today.getMonth() &&
                currentYear === today.getFullYear();
              const isSelected = day === selectedDate;
              const hasEvents = day ? getEventsForDate(day).length > 0 : false;

              return (
                <Pressable
                  key={`${day || "blank"}-${index}`}
                  disabled={!day}
                  onPress={() => day && setSelectedDate(day)}
                  style={[
                    styles.dayCell,
                    isToday && styles.todayCell,
                    isSelected && styles.selectedCell,
                    !day && styles.blankCell,
                  ]}
                >
                  <Text style={[
                    styles.dayText,
                    (isToday || isSelected) && styles.dayTextInverse,
                  ]}>
                    {day || ""}
                  </Text>
                  {hasEvents ? <View style={[styles.eventDot, (isToday || isSelected) && styles.eventDotInverse]} /> : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      {error ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>Could not load calendar data</Text>
          <Text style={styles.stateText}>{error}</Text>
        </View>
      ) : null}

      {selectedDate ? (
        <View style={styles.selectedCard}>
          <Text style={styles.selectedTitle}>{MONTHS[currentMonth]} {selectedDate}, {currentYear}</Text>
          {selectedEvents.length === 0 ? (
            <Text style={styles.stateText}>No events on this day.</Text>
          ) : (
            <View style={styles.selectedList}>
              {selectedEvents.map((event) => (
                <View key={event.id} style={styles.selectedItem}>
                  <Text style={styles.selectedItemTitle}>{event.title}</Text>
                  <Text style={styles.selectedItemMeta}>
                    {new Date(event.start_time).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {" "}to{" "}
                    {new Date(event.end_time).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : null}
    </MobileScaffold>
  );
}

const styles = StyleSheet.create({
  calendarCard: {
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.parchment,
  },
  monthTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  dayHeaderRow: {
    flexDirection: "row",
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  dayHeader: {
    flex: 1,
    textAlign: "center",
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  loader: {
    marginVertical: 24,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  dayCell: {
    width: "13.4%",
    aspectRatio: 1,
    borderRadius: RADII.md,
    backgroundColor: COLORS.parchment,
    alignItems: "center",
    justifyContent: "center",
  },
  blankCell: {
    backgroundColor: "transparent",
  },
  todayCell: {
    backgroundColor: COLORS.moss,
  },
  selectedCell: {
    backgroundColor: COLORS.forestDeep,
  },
  dayText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  dayTextInverse: {
    color: COLORS.textOnBrand,
  },
  eventDot: {
    marginTop: 3,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
  },
  eventDotInverse: {
    backgroundColor: COLORS.textOnBrand,
  },
  stateCard: {
    marginTop: SPACING.md,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  stateTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  stateText: {
    marginTop: 6,
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  selectedCard: {
    marginTop: SPACING.md,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  selectedTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  selectedList: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  selectedItem: {
    borderRadius: RADII.md,
    backgroundColor: COLORS.parchment,
    padding: SPACING.md,
  },
  selectedItemTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  selectedItemMeta: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: 13,
  },
});
