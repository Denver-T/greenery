import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import MobileScaffold from "../components/MobileScaffold";
import { apiFetch } from "../util/api";
import { getAllWorkRequest } from "../util/workRequest";
import { COLORS, RADII, SPACING } from "../theme";

const FILTERS = ["All", "Mine", "Open", "Completed"];

const STATUS_COLORS = {
  unassigned: { bg: "#f7e7bf", text: "#8c6418" },
  assigned: { bg: "#ddecf0", text: "#2d5f6b" },
  in_progress: { bg: "#f3e0c7", text: "#8a5a1f" },
  completed: { bg: "#ddf1e4", text: "#1d6540" },
  cancelled: { bg: "#f4deda", text: "#9d433b" },
};

function formatDate(value) {
  if (!value) {
    return "No due date";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No due date";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function WorkRequestView() {
  const navigation = useNavigation();
  const [requests, setRequests] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const [me, reqs] = await Promise.all([
          apiFetch("/auth/me"),
          getAllWorkRequest(),
        ]);

        if (!cancelled) {
          const reqsArray = Array.isArray(reqs) ? reqs : reqs?.data || reqs?.reqs || [];
          setCurrentUser(me);
          setRequests(reqsArray);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Failed to load work requests.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRequests = useMemo(() => {
    const myName = String(currentUser?.name || "").trim().toLowerCase();

    return requests.filter((request) => {
      const status = String(request.status || "").toLowerCase();
      const isMine = String(request.techName || "").trim().toLowerCase() === myName;

      if (selectedFilter === "Mine") {
        return isMine;
      }

      if (selectedFilter === "Open") {
        return !["completed", "cancelled"].includes(status);
      }

      if (selectedFilter === "Completed") {
        return status === "completed";
      }

      return true;
    });
  }, [currentUser, requests, selectedFilter]);

  return (
    <MobileScaffold
      eyebrow="Request queue"
      title="Field requests"
      subtitle="Check active requests and open the details you need."
    >
      <View style={styles.summaryRow}>
        <SummaryCard label="All requests" value={String(requests.length)} />
        <SummaryCard
          label="Open"
          value={String(
            requests.filter((request) => !["completed", "cancelled"].includes(String(request.status || "").toLowerCase())).length
          )}
        />
        <SummaryCard label="Visible" value={String(filteredRequests.length)} />
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((filter) => {
          const active = filter === selectedFilter;

          return (
            <Pressable
              key={filter}
              onPress={() => setSelectedFilter(filter)}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{filter}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? <ActivityIndicator size="large" color={COLORS.moss} style={styles.loader} /> : null}

      {!loading && error ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>Could not load requests</Text>
          <Text style={styles.stateText}>{error}</Text>
        </View>
      ) : null}

      {!loading && !error && filteredRequests.length === 0 ? (
        <View style={styles.stateCard}>
          <MaterialCommunityIcons name="clipboard-search-outline" size={34} color={COLORS.textMuted} />
          <Text style={styles.stateTitle}>Nothing in this view</Text>
          <Text style={styles.stateText}>Try another filter or create a new request from the field toolkit.</Text>
        </View>
      ) : null}

      {!loading && !error ? (
        <View style={styles.requestList}>
          {filteredRequests.map((request) => {
            const statusKey = String(request.status || "unassigned").toLowerCase();
            const badge = STATUS_COLORS[statusKey] || STATUS_COLORS.unassigned;

            return (
              <Pressable
                key={request.id}
                onPress={() => navigation.navigate("WorkRequestDetails", { id: request.id })}
                style={styles.requestCard}
              >
                <View style={styles.requestHeader}>
                  <View style={styles.requestHeaderCopy}>
                    <Text style={styles.requestRef}>{request.referenceNumber}</Text>
                    <Text style={styles.requestTitle}>{request.actionRequired || "Work request"}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.statusText, { color: badge.text }]}>
                      {statusKey.replace("_", " ")}
                    </Text>
                  </View>
                </View>

                <Text style={styles.requestAccount}>{request.account || "Unknown account"}</Text>

                <View style={styles.metaRow}>
                  <MetaPill label={`Submitted by ${request.techName || "Unknown"}`} />
                  <MetaPill label={`Due ${formatDate(request.dueDate)}`} />
                </View>

                <View style={styles.locationRow}>
                  <MaterialCommunityIcons name="map-marker-outline" size={16} color={COLORS.textMuted} />
                  <Text style={styles.locationText}>{request.location || "No location added yet"}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </MobileScaffold>
  );
}

function SummaryCard({ label, value }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function MetaPill({ label }) {
  return (
    <View style={styles.metaPill}>
      <Text style={styles.metaPillText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  summaryCard: {
    flex: 1,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  summaryValue: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: "800",
  },
  summaryLabel: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  filterChip: {
    borderRadius: RADII.pill,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterChipActive: {
    backgroundColor: COLORS.forestDeep,
    borderColor: COLORS.forestDeep,
  },
  filterText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  filterTextActive: {
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
  requestList: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  requestCard: {
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  requestHeader: {
    flexDirection: "row",
    gap: SPACING.sm,
    alignItems: "flex-start",
  },
  requestHeaderCopy: {
    flex: 1,
  },
  requestRef: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  requestTitle: {
    marginTop: 6,
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
  },
  statusBadge: {
    borderRadius: RADII.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  requestAccount: {
    marginTop: 8,
    color: COLORS.moss,
    fontSize: 15,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  metaPill: {
    borderRadius: RADII.pill,
    backgroundColor: COLORS.parchment,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  metaPillText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: "600",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
  },
  locationText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});
