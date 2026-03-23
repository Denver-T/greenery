import React, { useEffect, useState } from 'react';
import {
  ImageBackground,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NavBar from '../components/NavBar';
import { apiFetch } from '../util/api';

const BG = require('../assets/bg.jpg');
const RADIUS = 12;

const COLORS = {
  green: '#6f8641',
  greenDark: '#5e7833',
  blockGreen: '#6f8641',
  textOnGreen: '#ffffff',
  cardFill: '#ffffff',
  cardBorder: '#d9e1c8',
  tint: 'rgba(125, 145, 98, 0.25)',
  mutedText: '#e9efd9',
  titleGreen: '#5a7320',
  gray100: '#f3f4f6',
  gray500: '#6b7280',
  todayBg: '#6f8641',
  selectedBg: '#5e7833',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function EventCalendar() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const today = new Date();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/schedule');
      const arr = Array.isArray(data) ? data : [];
      setEvents(arr);
    } catch (err) {
      setError('Failed to load events');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Get days in month
  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

  // Get events for a specific date
  const getEventsForDate = (day) => {
    return events.filter((e) => {
      const d = new Date(e.start_time);
      return (
        d.getDate() === day &&
        d.getMonth() === currentMonth &&
        d.getFullYear() === currentYear
      );
    });
  };

  // Check if date has events
  const hasEvents = (day) => getEventsForDate(day).length > 0;

  // Format time
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Navigate months
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(null);
  };

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  // Build calendar grid
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

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
            <Text style={styles.menuBlockText}>Event Calendar</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Calendar Card */}
          <View style={styles.calendarCard}>
            {/* Month Navigation */}
            <View style={styles.monthNav}>
              <Pressable onPress={prevMonth} style={styles.navBtn}>
                <Ionicons name="chevron-back" size={22} color={COLORS.green} />
              </Pressable>
              <Text style={styles.monthTitle}>
                {MONTHS[currentMonth]} {currentYear}
              </Text>
              <Pressable onPress={nextMonth} style={styles.navBtn}>
                <Ionicons name="chevron-forward" size={22} color={COLORS.green} />
              </Pressable>
            </View>

            {/* Day Headers */}
            <View style={styles.dayHeaders}>
              {DAYS.map((d) => (
                <Text key={d} style={styles.dayHeader}>{d}</Text>
              ))}
            </View>

            {/* Calendar Grid */}
            {loading ? (
              <ActivityIndicator size="large" color={COLORS.green} style={{ marginVertical: 20 }} />
            ) : (
              <View style={styles.grid}>
                {calendarDays.map((day, index) => {
                  const isToday =
                    day === today.getDate() &&
                    currentMonth === today.getMonth() &&
                    currentYear === today.getFullYear();
                  const isSelected = day === selectedDate;
                  const hasDot = day && hasEvents(day);

                  return (
                    <Pressable
                      key={index}
                      style={[
                        styles.dayCell,
                        isToday && styles.todayCell,
                        isSelected && styles.selectedCell,
                      ]}
                      onPress={() => day && setSelectedDate(day)}
                      disabled={!day}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          isToday && styles.todayText,
                          isSelected && styles.selectedText,
                          !day && styles.emptyDay,
                        ]}
                      >
                        {day || ''}
                      </Text>
                      {hasDot && (
                        <View
                          style={[
                            styles.eventDot,
                            isToday || isSelected ? styles.eventDotWhite : null,
                          ]}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {/* Selected Date Events */}
          {selectedDate && (
            <View style={styles.eventsSection}>
              <Text style={styles.eventsSectionTitle}>
                {MONTHS[currentMonth]} {selectedDate}, {currentYear}
              </Text>

              {selectedEvents.length === 0 ? (
                <View style={styles.noEventsBox}>
                  <Ionicons name="calendar-outline" size={28} color={COLORS.greenDark} />
                  <Text style={styles.noEventsText}>No events on this day</Text>
                </View>
              ) : (
                selectedEvents.map((event) => (
                  <View key={event.id} style={styles.eventCard}>
                    <View style={styles.eventTimeBar} />
                    <View style={styles.eventContent}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <View style={styles.eventTimeRow}>
                        <Ionicons name="time-outline" size={13} color={COLORS.gray500} />
                        <Text style={styles.eventTime}>
                          {formatTime(event.start_time)} — {formatTime(event.end_time)}
                        </Text>
                      </View>
                      {event.employee_name && (
                        <View style={styles.eventTimeRow}>
                          <Ionicons name="person-outline" size={13} color={COLORS.gray500} />
                          <Text style={styles.eventTime}>{event.employee_name}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* All Upcoming Events */}
          {!selectedDate && !loading && events.length > 0 && (
            <View style={styles.eventsSection}>
              <Text style={styles.eventsSectionTitle}>Upcoming Events</Text>
              {events.slice(0, 5).map((event) => (
                <View key={event.id} style={styles.eventCard}>
                  <View style={styles.eventTimeBar} />
                  <View style={styles.eventContent}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <View style={styles.eventTimeRow}>
                      <Ionicons name="calendar-outline" size={13} color={COLORS.gray500} />
                      <Text style={styles.eventTime}>
                        {new Date(event.start_time).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </Text>
                    </View>
                    <View style={styles.eventTimeRow}>
                      <Ionicons name="time-outline" size={13} color={COLORS.gray500} />
                      <Text style={styles.eventTime}>
                        {formatTime(event.start_time)} — {formatTime(event.end_time)}
                      </Text>
                    </View>
                    {event.employee_name && (
                      <View style={styles.eventTimeRow}>
                        <Ionicons name="person-outline" size={13} color={COLORS.gray500} />
                        <Text style={styles.eventTime}>{event.employee_name}</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Empty State */}
          {!loading && !error && events.length === 0 && !selectedDate && (
            <View style={styles.noEventsBox}>
              <Ionicons name="calendar-outline" size={40} color={COLORS.greenDark} />
              <Text style={styles.noEventsText}>No events scheduled</Text>
            </View>
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
    height: 56, borderRadius: 10, backgroundColor: COLORS.blockGreen,
    alignItems: 'center', justifyContent: 'center', elevation: 6,
  },
  menuBlockText: { color: COLORS.textOnGreen, fontSize: 22, fontWeight: '800', letterSpacing: 0.5 },

  scrollContent: { paddingHorizontal: 12, paddingTop: 4 },

  // Calendar Card
  calendarCard: {
    backgroundColor: COLORS.cardFill,
    borderRadius: RADIUS,
    padding: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 12,
  },

  // Month Nav
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navBtn: { padding: 6 },
  monthTitle: { fontSize: 17, fontWeight: '800', color: COLORS.titleGreen },

  // Day Headers
  dayHeaders: { flexDirection: 'row', marginBottom: 6 },
  dayHeader: {
    flex: 1, textAlign: 'center', fontSize: 11,
    fontWeight: '700', color: COLORS.gray500,
  },

  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.28%', aspectRatio: 1,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 20,
  },
  todayCell: { backgroundColor: COLORS.todayBg },
  selectedCell: { backgroundColor: COLORS.selectedBg },
  dayText: { fontSize: 13, fontWeight: '600', color: '#333' },
  todayText: { color: '#fff', fontWeight: '800' },
  selectedText: { color: '#fff', fontWeight: '800' },
  emptyDay: { color: 'transparent' },
  eventDot: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: COLORS.green, marginTop: 2,
  },
  eventDotWhite: { backgroundColor: '#fff' },

  // Events Section
  eventsSection: { marginBottom: 12 },
  eventsSectionTitle: {
    fontSize: 15, fontWeight: '800',
    color: COLORS.titleGreen, marginBottom: 8,
  },

  // Event Card
  eventCard: {
    backgroundColor: COLORS.cardFill,
    borderRadius: RADIUS,
    flexDirection: 'row',
    marginBottom: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
  },
  eventTimeBar: { width: 5, backgroundColor: COLORS.green },
  eventContent: { flex: 1, padding: 12 },
  eventTitle: { fontSize: 14, fontWeight: '700', color: '#222', marginBottom: 4 },
  eventTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  eventTime: { fontSize: 12, color: COLORS.gray500 },

  // No Events
  noEventsBox: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  noEventsText: { fontSize: 14, color: COLORS.greenDark, fontWeight: '600' },

  tabBar: { backgroundColor: COLORS.green },
});