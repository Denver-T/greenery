import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import MobileScaffold from "../components/MobileScaffold";
import { apiFetch } from "../util/api";
import { COLORS, RADII, SPACING } from "../theme";

const STATUS_COLORS = {
  pending: { bg: "#f7e7bf", text: "#8c6418" },
  approved: { bg: "#ddf1e4", text: "#1d6540" },
  denied: { bg: "#f4deda", text: "#9d433b" },
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

function formatDate(dateStr) {
  if (!dateStr) {
    return "";
  }

  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Field({ label, value, onChangeText, placeholder, multiline = false }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textSoft}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  );
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

  async function fetchPTO() {
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
  }

  async function submitPTO() {
    if (!employeeName || !startDate || !endDate) {
      Alert.alert("Missing fields", "Please fill in your name, start date, and end date.");
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

      Alert.alert("Submitted", "Your PTO request has been sent.");
      setEmployeeName("");
      setStartDate("");
      setEndDate("");
      setReason("");
      setShowForm(false);
      fetchPTO();
    } catch (err) {
      Alert.alert("Submission failed", err?.message || "Failed to submit PTO request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MobileScaffold
      eyebrow="Time away"
      title="Time off"
      subtitle="Review and submit PTO requests."
    >
      <Pressable
        style={[styles.primaryAction, !!serviceError && styles.disabledAction]}
        onPress={() => setShowForm((value) => !value)}
        disabled={!!serviceError}
      >
        <MaterialCommunityIcons
          name={showForm ? "close-circle-outline" : "calendar-plus"}
          size={18}
          color={COLORS.textOnBrand}
        />
        <Text style={styles.primaryActionText}>{showForm ? "Cancel request" : "New PTO request"}</Text>
      </Pressable>

      {serviceError ? (
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>PTO backend not ready</Text>
          <Text style={styles.noticeText}>{serviceError}</Text>
        </View>
      ) : null}

      {showForm && !serviceError ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Request time off</Text>
          <Field label="Your name" value={employeeName} onChangeText={setEmployeeName} placeholder="Technician name" />
          <Field label="Start date" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
          <Field label="End date" value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" />
          <Field label="Reason" value={reason} onChangeText={setReason} placeholder="Optional context" multiline />

          <Pressable style={styles.submitButton} onPress={submitPTO} disabled={submitting}>
            {submitting ? <ActivityIndicator color={COLORS.textOnBrand} /> : <Text style={styles.submitButtonText}>Submit request</Text>}
          </Pressable>
        </View>
      ) : null}

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>My PTO requests</Text>

        {loading ? <ActivityIndicator size="large" color={COLORS.moss} style={styles.loader} /> : null}

        {!loading && !serviceError && ptoList.length === 0 ? (
          <Text style={styles.emptyText}>No PTO requests found.</Text>
        ) : null}

        {!loading && !serviceError ? (
          <View style={styles.stack}>
            {ptoList.map((pto) => {
              const statusStyle = STATUS_COLORS[pto.status] || STATUS_COLORS.pending;

              return (
                <View key={pto.id} style={styles.requestCard}>
                  <View style={styles.requestHeader}>
                    <Text style={styles.requestName}>{pto.employee_name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.statusText, { color: statusStyle.text }]}>{pto.status?.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.requestMeta}>
                    {formatDate(pto.start_date)} to {formatDate(pto.end_date)}
                  </Text>
                  {pto.reason ? <Text style={styles.requestReason}>{pto.reason}</Text> : null}
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
    </MobileScaffold>
  );
}

const styles = StyleSheet.create({
  primaryAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: RADII.md,
    backgroundColor: COLORS.moss,
    paddingVertical: 14,
  },
  disabledAction: {
    opacity: 0.6,
  },
  primaryActionText: {
    color: COLORS.textOnBrand,
    fontSize: 15,
    fontWeight: "700",
  },
  noticeCard: {
    marginTop: SPACING.md,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.warningSoft,
    borderWidth: 1,
    borderColor: "rgba(168, 119, 30, 0.18)",
    padding: SPACING.lg,
  },
  noticeTitle: {
    color: COLORS.warning,
    fontSize: 17,
    fontWeight: "800",
  },
  noticeText: {
    marginTop: 6,
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 21,
  },
  sectionCard: {
    marginTop: SPACING.md,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 19,
    fontWeight: "800",
  },
  fieldWrap: {
    marginTop: SPACING.md,
  },
  fieldLabel: {
    marginBottom: 6,
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    borderRadius: RADII.md,
    backgroundColor: COLORS.parchment,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 13,
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  inputMultiline: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  submitButton: {
    marginTop: SPACING.md,
    borderRadius: RADII.md,
    backgroundColor: COLORS.forestDeep,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitButtonText: {
    color: COLORS.textOnBrand,
    fontSize: 15,
    fontWeight: "800",
  },
  loader: {
    marginTop: 20,
  },
  emptyText: {
    marginTop: SPACING.md,
    color: COLORS.textMuted,
    fontSize: 14,
  },
  stack: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  requestCard: {
    borderRadius: RADII.md,
    backgroundColor: COLORS.parchment,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  requestHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  requestName: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  requestMeta: {
    marginTop: 8,
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  requestReason: {
    marginTop: 8,
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  statusBadge: {
    borderRadius: RADII.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
});
