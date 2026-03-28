import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import NavBar from "../components/NavBar";
import { apiFetch } from "../util/api";
import { COLORS } from "../theme";

const BG = require("../assets/bg.jpg");
const RADIUS = 12;

const STATUS_COLORS = {
  pending: { bg: "#fef9c3", text: "#854d0e" },
  approved: { bg: "#dcfce7", text: "#166534" },
  denied: { bg: "#fee2e2", text: "#991b1b" },
};

function normalizePtoListResponse(response) {
  if (Array.isArray(response)) {
    return { items: response, error: "" };
  }

  if (Array.isArray(response?.data)) {
    return { items: response.data, error: "" };
  }

  const message =
    response?.error ||
    response?.message ||
    (response?.code ? `PTO service unavailable (${response.code})` : "PTO service unavailable.");

  return { items: [], error: message };
}

export default function PTO() {
  const [ptoList, setPtoList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [serviceError, setServiceError] = useState("");

  const [employeeName, setEmployeeName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    fetchPTO();
  }, []);

  const fetchPTO = async () => {
    try {
      setLoading(true);
      const response = await apiFetch("/pto");
      const { items, error } = normalizePtoListResponse(response);
      setPtoList(items);
      setServiceError(error);
    } catch (err) {
      console.error(err);
      setPtoList([]);
      setServiceError("PTO service unavailable.");
    } finally {
      setLoading(false);
    }
  };

  const submitPTO = async () => {
    if (!employeeName || !startDate || !endDate) {
      Alert.alert("Missing Fields", "Please fill in Name, Start Date and End Date");
      return;
    }

    try {
      setSubmitting(true);
      const response = await apiFetch("/pto", {
        method: "POST",
        body: {
          employee_name: employeeName,
          start_date: startDate,
          end_date: endDate,
          reason,
        },
      });

      if (response?.error || response?.code) {
        throw new Error(response?.error || response?.message || "Failed to submit PTO request");
      }

      Alert.alert("Success", "PTO request submitted.");
      setEmployeeName("");
      setStartDate("");
      setEndDate("");
      setReason("");
      setShowForm(false);
      fetchPTO();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", err?.message || "Failed to submit PTO request");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) {
      return "";
    }

    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor={COLORS.green} barStyle="light-content" />

      <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
        <View style={styles.tint} />

        <View style={styles.topBar}>
          <View style={styles.topBarSide}>
            <Ionicons name="person-outline" size={22} color={COLORS.textOnGreen} />
          </View>
          <View style={styles.topBarCenter}>
            <Text style={styles.topTitle}>Greenery Team App</Text>
            <Text style={styles.topSubtitle}>Mobile View</Text>
          </View>
          <View style={[styles.topBarSide, { alignItems: "flex-end" }]}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.textOnGreen} />
          </View>
        </View>

        {/* Header Block */}
        <View style={styles.menuBlockWrap}>
          <View style={styles.menuBlock}>
            <Text style={styles.menuBlockText}>Book Time Off</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            style={[styles.newRequestBtn, !!serviceError && styles.disabledBtn]}
            onPress={() => setShowForm(!showForm)}
            disabled={!!serviceError}
          >
            <Ionicons
              name={showForm ? "close-circle-outline" : "add-circle-outline"}
              size={20}
              color="#fff"
            />
            <Text style={styles.newRequestText}>
              {showForm ? "Cancel" : "New PTO Request"}
            </Text>
          </Pressable>

          {serviceError ? (
            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>PTO backend not ready</Text>
              <Text style={styles.noticeText}>
                {serviceError}
              </Text>
            </View>
          ) : null}

          {showForm && !serviceError ? (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Submit PTO Request</Text>

              <Text style={styles.label}>Your Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                value={employeeName}
                onChangeText={setEmployeeName}
              />

              <Text style={styles.label}>Start Date * (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 2026-04-01"
                value={startDate}
                onChangeText={setStartDate}
              />

              <Text style={styles.label}>End Date * (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 2026-04-03"
                value={endDate}
                onChangeText={setEndDate}
              />

              <Text style={styles.label}>Reason (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter reason..."
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={3}
              />

              <Pressable
                style={styles.submitBtn}
                onPress={submitPTO}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>Submit Request</Text>
                )}
              </Pressable>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>My PTO Requests</Text>

          {loading ? (
            <ActivityIndicator size="large" color={COLORS.green} style={{ marginTop: 20 }} />
          ) : null}

          {!loading && !serviceError && ptoList.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="calendar-outline" size={40} color={COLORS.greenDark} />
              <Text style={styles.emptyText}>No PTO requests found</Text>
            </View>
          ) : null}

          {!loading &&
            !serviceError &&
            ptoList.map((pto) => {
              const statusStyle = STATUS_COLORS[pto.status] || STATUS_COLORS.pending;

              return (
                <View key={pto.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderPill}>
                      <Text style={styles.cardHeaderText}>PTO Request</Text>
                    </View>
                    <View style={{ flex: 1 }} />
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.statusText, { color: statusStyle.text }]}>
                        {pto.status?.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardRow}>
                    <Ionicons name="person-outline" size={14} color={COLORS.greenDark} />
                    <Text style={styles.cardRowText}>{pto.employee_name}</Text>
                  </View>

                  <View style={styles.cardRow}>
                    <Ionicons name="calendar-outline" size={14} color={COLORS.greenDark} />
                    <Text style={styles.cardRowText}>
                      {formatDate(pto.start_date)} to {formatDate(pto.end_date)}
                    </Text>
                  </View>

                  {pto.reason ? (
                    <View style={styles.cardRow}>
                      <Ionicons name="chatbubble-outline" size={14} color={COLORS.greenDark} />
                      <Text style={styles.cardRowText}>{pto.reason}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}

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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    elevation: 6,
  },
  topBarSide: { width: 32 },
  topBarCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  topTitle: {
    color: COLORS.textOnGreen,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  menuBlockWrap: { marginTop: 8, marginBottom: 8, paddingHorizontal: 6 },
  menuBlock: {
    height: 56,
    borderRadius: 10,
    backgroundColor: COLORS.blockGreen,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
  menuBlockText: {
    color: COLORS.textOnGreen,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  scrollContent: { paddingHorizontal: 12, paddingTop: 8 },
  newRequestBtn: {
    backgroundColor: COLORS.green,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: RADIUS,
    marginBottom: 12,
    elevation: 3,
  },
  disabledBtn: {
    opacity: 0.55,
  },
  newRequestText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  noticeCard: {
    backgroundColor: "#fff7ed",
    borderColor: "#fdba74",
    borderWidth: 1,
    borderRadius: RADIUS,
    padding: 14,
    marginBottom: 12,
  },
  noticeTitle: {
    color: "#9a3412",
    fontWeight: "800",
    marginBottom: 4,
  },
  noticeText: {
    color: "#9a3412",
    fontSize: 13,
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: COLORS.cardFill,
    borderRadius: RADIUS,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  formTitle: { fontSize: 16, fontWeight: "800", color: COLORS.titleGreen, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "600", color: COLORS.gray500, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginBottom: 12,
    backgroundColor: "#fafafa",
  },
  textArea: { height: 80, textAlignVertical: "top" },
  submitBtn: {
    backgroundColor: COLORS.green,
    padding: 14,
    borderRadius: RADIUS,
    alignItems: "center",
    marginTop: 4,
  },
  submitText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.titleGreen,
    marginBottom: 8,
  },
  card: {
    backgroundColor: COLORS.cardFill,
    borderRadius: RADIUS,
    padding: 12,
    marginBottom: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  cardHeaderPill: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 12,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
  },
  cardHeaderText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: { fontSize: 11, fontWeight: "700" },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  cardRowText: { fontSize: 13, color: "#444", flex: 1 },
  emptyBox: { alignItems: "center", paddingVertical: 30, gap: 8 },
  emptyText: { fontSize: 14, color: COLORS.greenDark, fontWeight: "600" },
  tabBar: { backgroundColor: COLORS.green },
});
