import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import MobileScaffold from "../components/MobileScaffold";
import { apiFetch } from "../util/api";
import { updateTaskStatus } from "../util/workRequest";
import { COLORS, RADII, SPACING } from "../theme";

function sameDay(dateA, dateB) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function formatDateTime(value) {
  if (!value) {
    return "No time scheduled";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No time scheduled";
  }

  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Dashboard() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState({
    me: null,
    reqs: [],
    tasks: [],
    schedule: [],
  });

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const [me, reqs, tasks, schedule] = await Promise.all([
        apiFetch("/auth/me"),
        apiFetch("/reqs"),
        apiFetch("/auth/my-tasks"),
        apiFetch("/schedule"),
      ]);

      setPayload({
        me,
        reqs: Array.isArray(reqs) ? reqs : [],
        tasks: Array.isArray(tasks) ? tasks : [],
        schedule: Array.isArray(schedule) ? schedule : [],
      });
    } catch (err) {
      setError(err?.message || "Failed to load technician overview.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkComplete(taskId) {
    try {
      await updateTaskStatus(taskId, "completed");
      await loadDashboard();
    } catch (err) {
      Alert.alert("Update failed", err?.message || "Could not mark task as complete.");
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const summary = useMemo(() => {
    const today = new Date();
    const myName = String(payload.me?.name || "").trim().toLowerCase();

    const mySchedule = payload.schedule
      .filter((event) => String(event.employee_name || "").trim().toLowerCase() === myName)
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    const todaysStops = mySchedule.filter((event) => sameDay(new Date(event.start_time), today));
    const mySubmittedReqs = payload.reqs.filter(
      (req) => String(req.techName || "").trim().toLowerCase() === myName
    );
    const activeReqs = mySubmittedReqs.filter(
      (req) => !["completed", "cancelled"].includes(String(req.status || "").toLowerCase())
    );
    const dueSoonTasks = payload.tasks.filter((task) => {
      if (!task.dueDate && !task.due_date) {
        return false;
      }

      const due = new Date(task.dueDate || task.due_date);
      const diff = due.getTime() - today.getTime();
      return diff >= 0 && diff <= 1000 * 60 * 60 * 24 * 2;
    });

    const activeTasks = payload.tasks.filter(
      (t) => t.status !== "completed" && t.status !== "cancelled"
    );

    return {
      nextStop: todaysStops[0] || mySchedule[0] || null,
      todaysStops,
      activeReqs,
      mySubmittedReqs,
      dueSoonTasks,
      activeTasks,
    };
  }, [payload]);

  return (
    <MobileScaffold
      eyebrow="Today"
      title={`Ready for the field${payload.me?.name ? `, ${payload.me.name.split(" ")[0]}` : ""}`}
      subtitle="See what needs attention next and move straight into the field workflow."
    >
      {loading ? <ActivityIndicator size="large" color={COLORS.moss} style={styles.loader} /> : null}

      {!loading && error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Unable to load your day</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {!loading && !error ? (
        <>
          <View style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <Text style={styles.heroEyebrow}>Next stop</Text>
              <View style={styles.statusChip}>
                <Text style={styles.statusChipText}>
                  {summary.todaysStops.length} scheduled today
                </Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>
              {summary.nextStop?.title || "No stop scheduled yet"}
            </Text>
            <Text style={styles.heroSubtitle}>
              {summary.nextStop
                ? `${summary.nextStop.employee_name || "Assigned"} • ${formatDateTime(summary.nextStop.start_time)}`
                : "Use your schedule and request queue to plan your next stop."}
            </Text>
          </View>

          <View style={styles.kpiRow}>
            <KpiCard
              icon={<MaterialCommunityIcons name="calendar-check-outline" size={18} color={COLORS.forestDeep} />}
              label="Stops today"
              value={String(summary.todaysStops.length)}
            />
            <KpiCard
              icon={<MaterialIcons name="assignment-late" size={18} color={COLORS.forestDeep} />}
              label="Active requests"
              value={String(summary.activeReqs.length)}
            />
            <KpiCard
              icon={<MaterialCommunityIcons name="timer-sand" size={18} color={COLORS.forestDeep} />}
              label="Due soon"
              value={String(summary.dueSoonTasks.length)}
            />
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>My assignments</Text>
            {summary.activeTasks.length === 0 ? (
              <Text style={styles.emptyText}>No tasks assigned to you right now.</Text>
            ) : (
              <View style={styles.stack}>
                {summary.activeTasks.slice(0, 5).map((task) => (
                  <View key={task.id} style={styles.assignmentCard}>
                    <View style={styles.assignmentCopy}>
                      <Text style={styles.planTitle}>{task.title}</Text>
                      <Text style={styles.planMeta}>
                        {task.account || "Internal"}{task.dueDate ? ` • Due ${formatDate(task.dueDate)}` : ""}
                      </Text>
                    </View>
                    <Pressable
                      style={styles.completeButton}
                      onPress={() => handleMarkComplete(task.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Mark ${task.title} as complete`}
                    >
                      <MaterialCommunityIcons name="check-circle-outline" size={22} color={COLORS.moss} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.sectionCard}>
            <SectionHeader
              title="Today’s plan"
              actionLabel="Open schedule"
              onPress={() => navigation.navigate("WeeklySchedule")}
            />
            {summary.todaysStops.length === 0 ? (
              <Text style={styles.emptyText}>No events are assigned to you for today.</Text>
            ) : (
              <View style={styles.stack}>
                {summary.todaysStops.slice(0, 3).map((event) => (
                  <View key={event.id} style={styles.planItem}>
                    <View style={styles.planDot} />
                    <View style={styles.planCopy}>
                      <Text style={styles.planTitle}>{event.title}</Text>
                      <Text style={styles.planMeta}>{formatDateTime(event.start_time)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.sectionCard}>
            <SectionHeader title="Requests you created" />
            {summary.activeReqs.length === 0 ? (
              <Text style={styles.emptyText}>You have no active submitted requests right now.</Text>
            ) : (
              <View style={styles.stack}>
                {summary.activeReqs.slice(0, 3).map((req) => (
                  <Pressable
                    key={req.id}
                    onPress={() => navigation.navigate("WorkRequestDetails", { id: req.id })}
                    style={styles.requestCard}
                    accessibilityRole="button"
                    accessibilityLabel={`View request ${req.referenceNumber}`}
                  >
                    <Text style={styles.requestRef}>{req.referenceNumber}</Text>
                    <Text style={styles.requestTitle}>{req.actionRequired}</Text>
                    <Text style={styles.requestMeta}>
                      {req.account || "Unknown account"} • {String(req.status || "unassigned").replace("_", " ")}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={styles.actionStrip}>
            <Pressable style={styles.primaryButton} onPress={() => navigation.navigate("WorkRequestSubmit")} accessibilityRole="button" accessibilityLabel="Create new request">
              <Text style={styles.primaryButtonText}>Create request</Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </MobileScaffold>
  );
}

function SectionHeader({ title, actionLabel, onPress }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel ? (
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={actionLabel}>
          <Text style={styles.sectionLink}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function KpiCard({ icon, label, value }) {
  return (
    <View style={styles.kpiCard}>
      <View style={styles.kpiIcon}>{icon}</View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: 40,
  },
  errorCard: {
    borderRadius: RADII.lg,
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    padding: SPACING.lg,
  },
  errorTitle: {
    color: COLORS.danger,
    fontSize: 18,
    fontWeight: "800",
  },
  errorText: {
    marginTop: 6,
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 21,
  },
  heroCard: {
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: SPACING.sm,
  },
  heroEyebrow: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  statusChip: {
    borderRadius: RADII.pill,
    backgroundColor: COLORS.parchment,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusChipText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  heroTitle: {
    marginTop: 16,
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: "800",
  },
  heroSubtitle: {
    marginTop: 8,
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  kpiRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  kpiCard: {
    flex: 1,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  kpiIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.parchment,
  },
  kpiValue: {
    marginTop: 10,
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: "800",
  },
  kpiLabel: {
    marginTop: 2,
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  sectionCard: {
    marginTop: SPACING.md,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 19,
    fontWeight: "800",
  },
  sectionLink: {
    color: COLORS.moss,
    fontSize: 13,
    fontWeight: "700",
  },
  stack: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  planItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    paddingVertical: 2,
  },
  planDot: {
    marginTop: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accent,
  },
  planCopy: {
    flex: 1,
  },
  planTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  planMeta: {
    marginTop: 2,
    color: COLORS.textMuted,
    fontSize: 13,
  },
  requestCard: {
    borderRadius: RADII.md,
    backgroundColor: COLORS.parchment,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  requestRef: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  requestTitle: {
    marginTop: 6,
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  requestMeta: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: 13,
  },
  emptyText: {
    marginTop: SPACING.md,
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  assignmentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    borderRadius: RADII.md,
    backgroundColor: COLORS.parchment,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  assignmentCopy: {
    flex: 1,
  },
  completeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  actionStrip: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  primaryButton: {
    flex: 1,
    borderRadius: RADII.md,
    backgroundColor: COLORS.moss,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: COLORS.textOnBrand,
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    flex: 1,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
});
