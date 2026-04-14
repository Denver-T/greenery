import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import MobileScaffold from "../components/MobileScaffold";
import { apiFetch } from "../util/api";
import {
  getWorkRequestById,
  updateWorkRequestStatus,
} from "../util/workRequest";
import { COLORS, RADII, SPACING } from "../theme";

function formatDate(value) {
  if (!value) {
    return "Not scheduled";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not scheduled";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function WorkRequestDetails({ route, navigation }) {
  // Some older entry points passed the raw id directly; newer ones pass a params object.
  const id = route?.params?.id ?? route?.params;
  const [detailData, setDetailData] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [mutationError, setMutationError] = useState("");

  const mountedRef = useRef(true);
  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  // Staleness token. Every fetchDetails call claims a unique Symbol and
  // stores it in latestRequestRef. After the await resolves, the call only
  // writes state if it's still the latest claimant. Covers both races:
  //   (a) rapid id change → new initial load supersedes the old one
  //   (b) mutation silent refetch mid-navigation → discarded if the user
  //       moved on before the refetch resolved
  // This replaces the original `let cancelled = false` effect-closure pattern
  // because the silent refetch from handleStatusChange also needs to
  // participate in cancellation — a per-effect flag wouldn't cover it.
  const latestRequestRef = useRef(null);

  // fetchDetails — reusable both for the initial load and for silent
  // post-mutation refetches. Uses Promise.allSettled so a transient /auth/me
  // failure never masks a successful work-request fetch (and vice versa).
  //
  // `silent` semantics (see .agents/plans/mobile-friday-slice.md Step 3):
  //   silent:false → setLoading(true); leave detailData/me alone until resolve
  //   silent:true  → no state changes up front; preserve existing view if
  //                  either fetch fails (the caller owns error surfacing).
  const fetchDetails = useCallback(
    async ({ silent = false } = {}) => {
      const requestToken = Symbol("workRequestDetailsFetch");
      latestRequestRef.current = requestToken;

      if (!silent) {
        setLoading(true);
      }

      const [detailsResult, meResult] = await Promise.allSettled([
        getWorkRequestById(id),
        apiFetch("/auth/me"),
      ]);

      // Two-part staleness check:
      //  1. Component still mounted? (handled by mountedRef)
      //  2. This fetch is still the latest claimant? (handled by token)
      // If either fails, suppress ALL state writes including loading=false —
      // a superseding fetch owns the loading state now.
      if (
        !mountedRef.current ||
        latestRequestRef.current !== requestToken
      ) {
        return;
      }

      // Work request: primary data surface.
      if (detailsResult.status === "fulfilled") {
        const nextDetail =
          detailsResult.value?.data ?? detailsResult.value ?? null;
        setDetailData(nextDetail);
      } else if (!silent) {
        console.error("Error fetching details:", detailsResult.reason);
        setDetailData(null);
      }
      // silent + failed: leave detailData alone. handleStatusChange owns the
      // mutationError surface for this path.

      // Me: secondary. On failure, log and preserve existing `me`.
      // Initial load starts with me=null so the action strip hides — correct
      // degraded behavior (tech can SEE the request, just can't act on it).
      if (meResult.status === "fulfilled") {
        setMe(meResult.value ?? null);
      } else {
        console.warn("Error fetching /auth/me:", meResult.reason);
      }

      if (!silent) {
        setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Single source of truth for ownership + status gates. Both
  // handleStatusChange below AND the render-time button visibility read
  // these — do NOT re-derive in the handler or the two copies will drift.
  // mysql2 returns integers and JSON.parse preserves them, so in practice
  // both sides should already be numbers. Coerce defensively to eliminate
  // any "stray stringification" failure class — cheap to add, impossible
  // to debug after the fact.
  const myId = me?.id != null ? Number(me.id) : null;
  const assignedId =
    detailData?.assignedTo != null ? Number(detailData.assignedTo) : null;
  const isAssignedToMe =
    myId != null &&
    assignedId != null &&
    !Number.isNaN(myId) &&
    !Number.isNaN(assignedId) &&
    assignedId === myId;
  const canStartWork = isAssignedToMe && detailData?.status === "assigned";
  const canMarkComplete =
    isAssignedToMe &&
    (detailData?.status === "assigned" || detailData?.status === "in_progress");

  async function handleStatusChange(nextStatus) {
    // Client-side ownership gate. Server-side enforcement is tracked in
    // .agents/plans/mobile-post-launch-sprint.md Chunk 9.
    if (!isAssignedToMe) {
      return;
    }
    setMutating(true);
    setMutationError("");
    try {
      await updateWorkRequestStatus(id, nextStatus);
      await fetchDetails({ silent: true });
    } catch (err) {
      setMutationError(
        err?.message || "Status update failed. Please try again.",
      );
    } finally {
      if (mountedRef.current) {
        setMutating(false);
      }
    }
  }

  const detailRows = useMemo(() => {
    if (!detailData) {
      return [];
    }

    return [
      ["Reference", detailData.referenceNumber],
      ["Account", detailData.account],
      ["Submitted by", detailData.techName],
      ["Requested date", formatDate(detailData.requestDate)],
      ["Due date", formatDate(detailData.dueDate)],
      ["Location", detailData.location],
      ["Action", detailData.actionRequired],
      ["Plants", detailData.numberOfPlants],
      ["Lighting", detailData.lighting],
      ["Method", detailData.method],
      ["Plant wanted", detailData.plantWanted],
      ["Plant replaced", detailData.plantReplaced],
      ["Planter type", detailData.planterTypeSize],
      ["Planter colour", detailData.planterColour],
      ["Staging material", detailData.stagingMaterial],
      ["Contact", detailData.accountContact],
      ["Address", detailData.accountAddress],
    ];
  }, [detailData]);

  return (
    <MobileScaffold
      eyebrow="Request detail"
      title={detailData?.actionRequired || "Work request"}
      subtitle={
        detailData
          ? `${detailData.account || "Unknown account"} • ${detailData.referenceNumber}`
          : "Review the complete field request and supporting context."
      }
    >
      {loading ? (
        <ActivityIndicator
          size="large"
          color={COLORS.moss}
          style={styles.loader}
        />
      ) : null}

      {!loading && !detailData ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>No details available</Text>
          <Text style={styles.stateText}>
            This request could not be loaded from the backend.
          </Text>
        </View>
      ) : null}

      {!loading && detailData ? (
        <>
          <View style={styles.heroCard}>
            <View style={styles.heroStatus}>
              <Text style={styles.heroStatusText}>
                {String(detailData.status || "unassigned").replace("_", " ")}
              </Text>
            </View>
            <Text style={styles.heroHeading}>
              {detailData.account || "Unknown account"}
            </Text>
            <Text style={styles.heroMeta}>
              {detailData.location || "No location"} • Due{" "}
              {formatDate(detailData.dueDate)}
            </Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Field summary</Text>
            <View style={styles.detailGrid}>
              {detailRows.map(([label, value]) => (
                <View key={label} style={styles.detailCard}>
                  <Text style={styles.detailLabel}>{label}</Text>
                  <Text style={styles.detailValue}>{value || "-"}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>
              {detailData.notes || "No notes provided."}
            </Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Photo</Text>
            <View style={styles.photoCard}>
              {detailData.picturePath ? (
                <Image
                  source={{
                    uri: `${process.env.EXPO_PUBLIC_API_BASE_URL}/${detailData.picturePath}`,
                  }}
                  style={styles.photo}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.stateText}>
                  No photo uploaded for this request.
                </Text>
              )}
            </View>
          </View>

          {canStartWork || canMarkComplete ? (
            <View style={styles.actionStrip}>
              {canStartWork ? (
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => handleStatusChange("in_progress")}
                  disabled={mutating}
                  accessibilityRole="button"
                  accessibilityLabel="Start work on this request"
                  accessibilityState={{ disabled: mutating }}
                >
                  {mutating ? (
                    <ActivityIndicator
                      size="small"
                      color={COLORS.textPrimary}
                    />
                  ) : (
                    <Text style={styles.secondaryButtonText}>Start work</Text>
                  )}
                </Pressable>
              ) : null}
              {canMarkComplete ? (
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => handleStatusChange("completed")}
                  disabled={mutating}
                  accessibilityRole="button"
                  accessibilityLabel="Mark this request as complete"
                  accessibilityState={{ disabled: mutating }}
                >
                  {mutating ? (
                    <ActivityIndicator
                      size="small"
                      color={COLORS.textOnBrand}
                    />
                  ) : (
                    <Text style={styles.primaryButtonText}>Mark complete</Text>
                  )}
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {mutationError ? (
            <Text
              style={styles.mutationError}
              accessibilityLiveRegion="polite"
              accessibilityRole="alert"
            >
              {mutationError}
            </Text>
          ) : null}

          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.closeButtonText}>Back</Text>
          </Pressable>
        </>
      ) : null}
    </MobileScaffold>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: 40,
  },
  stateCard: {
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    alignItems: "center",
  },
  stateTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  stateText: {
    marginTop: 8,
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  heroCard: {
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  heroStatus: {
    alignSelf: "flex-start",
    borderRadius: RADII.pill,
    backgroundColor: COLORS.parchment,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  heroStatusText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  heroHeading: {
    marginTop: 14,
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: "800",
  },
  heroMeta: {
    marginTop: 8,
    color: COLORS.textMuted,
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
    fontSize: 18,
    fontWeight: "800",
  },
  detailGrid: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  detailCard: {
    borderRadius: RADII.md,
    backgroundColor: COLORS.parchment,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  detailValue: {
    marginTop: 4,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  notesText: {
    marginTop: 10,
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 22,
  },
  photoCard: {
    marginTop: 12,
    minHeight: 200,
    borderRadius: RADII.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.parchment,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  photo: {
    width: "100%",
    height: 240,
    borderRadius: RADII.md,
  },
  closeButton: {
    marginTop: SPACING.md,
    borderRadius: RADII.md,
    backgroundColor: COLORS.forestDeep,
    paddingVertical: 14,
    alignItems: "center",
  },
  closeButtonText: {
    color: COLORS.textOnBrand,
    fontSize: 15,
    fontWeight: "700",
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
    paddingVertical: SPACING.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
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
    paddingVertical: SPACING.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  secondaryButtonText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  mutationError: {
    marginTop: SPACING.sm,
    color: COLORS.danger,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
});
