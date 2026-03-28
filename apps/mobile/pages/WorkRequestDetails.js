import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import MobileScaffold from "../components/MobileScaffold";
import { getWorkRequestById } from "../util/workRequest";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchDetails() {
      setLoading(true);

      try {
        const response = await getWorkRequestById(id);
        const requestDetails = response?.data ?? response ?? null;

        if (!cancelled) {
          setDetailData(requestDetails);
        }
      } catch (error) {
        console.error("Error fetching details:", error);
        if (!cancelled) {
          setDetailData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchDetails();

    return () => {
      cancelled = true;
    };
  }, [id]);

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
      subtitle={detailData ? `${detailData.account || "Unknown account"} • ${detailData.referenceNumber}` : "Review the complete field request and supporting context."}
    >
      {loading ? <ActivityIndicator size="large" color={COLORS.moss} style={styles.loader} /> : null}

      {!loading && !detailData ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>No details available</Text>
          <Text style={styles.stateText}>This request could not be loaded from the backend.</Text>
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
            <Text style={styles.heroHeading}>{detailData.account || "Unknown account"}</Text>
            <Text style={styles.heroMeta}>
              {detailData.location || "No location"} • Due {formatDate(detailData.dueDate)}
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
            <Text style={styles.notesText}>{detailData.notes || "No notes provided."}</Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Photo</Text>
            <View style={styles.photoCard}>
              {detailData.picturePath ? (
                <Image
                  source={{ uri: `${process.env.EXPO_PUBLIC_API_BASE_URL}/${detailData.picturePath}` }}
                  style={styles.photo}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.stateText}>No photo uploaded for this request.</Text>
              )}
            </View>
          </View>

          <Pressable onPress={() => navigation.goBack()} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Back to queue</Text>
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
    fontSize: 11,
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
    fontSize: 11,
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
});
