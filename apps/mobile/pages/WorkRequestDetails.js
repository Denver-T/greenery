import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import NavBar from "../components/NavBar";
import { getWorkRequestById } from "../util/workRequest";
import { COLORS, RADII } from "../theme";

const BG = require("../assets/bg.jpg");

function DetailItem({ label, value }) {
  return (
    <View style={styles.detailCard}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || "-"}</Text>
    </View>
  );
}

export default function WorkRequestDetails({ route, navigation }) {
  const id = route.params;
  const [detailData, setDetailData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDetails() {
      setIsLoading(true);
      try {
        const response = await getWorkRequestById(id);
        const requestDetails = response?.data ?? response ?? null;
        setDetailData(requestDetails);
      } catch (error) {
        console.error("Error fetching details:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDetails();
  }, [id]);

  const summaryItems = useMemo(() => {
    if (!detailData) {
      return [];
    }

    return [
      { label: "Reference", value: detailData.referenceNumber },
      { label: "Submitted By", value: detailData.techName },
      { label: "Account", value: detailData.account },
      { label: "Location", value: detailData.location },
      { label: "Action", value: detailData.actionRequired },
      { label: "Plants", value: detailData.numberOfPlants },
      { label: "Lighting", value: detailData.lighting },
      { label: "Method", value: detailData.method },
      { label: "Plant Wanted", value: detailData.plantWanted },
      { label: "Plant Replaced", value: detailData.plantReplaced },
      { label: "Plant Size", value: detailData.plantSize },
      { label: "Plant Height", value: detailData.plantHeight },
      { label: "Planter Type / Size", value: detailData.planterTypeSize },
      { label: "Planter Colour", value: detailData.planterColour },
      { label: "Staging Material", value: detailData.stagingMaterial },
      { label: "Account Contact", value: detailData.accountContact },
      { label: "Account Address", value: detailData.accountAddress },
    ];
  }, [detailData]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor={COLORS.forest} barStyle="light-content" />

      <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
        <View style={styles.tint} />

        <View style={styles.topBar}>
          <View style={styles.topBarSide}>
            <Ionicons name="person-outline" size={22} color={COLORS.textOnBrand} />
          </View>
          <View style={styles.topBarCenter}>
            <Text style={styles.topTitle}>Greenery Team App</Text>
            <Text style={styles.topSubtitle}>Mobile View</Text>
          </View>
          <View style={[styles.topBarSide, { alignItems: "flex-end" }]}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.textOnBrand} />
          </View>
        </View>

        <View style={styles.menuBlockWrap}>
          <View style={styles.menuBlock}>
            <Text style={styles.menuBlockText}>Work Request Details</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <ActivityIndicator size="large" color={COLORS.moss} style={styles.loading} />
          ) : !detailData ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No details available</Text>
              <Text style={styles.emptyText}>This request could not be loaded from the backend.</Text>
            </View>
          ) : (
            <>
              <View style={styles.heroCard}>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>REQ #{detailData.referenceNumber || detailData.id}</Text>
                </View>
                <Text style={styles.heroTitle}>{detailData.actionRequired || "Work Request"}</Text>
                <Text style={styles.heroSubtitle}>
                  Submitted by {detailData.techName || "Unknown technician"} for {detailData.account || "Unknown account"}
                </Text>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Request Summary</Text>
                <Text style={styles.sectionSubtitle}>
                  The most important job, account, and plant information in one place.
                </Text>
                <View style={styles.detailGrid}>
                  {summaryItems.map((item) => (
                    <DetailItem key={item.label} label={item.label} value={item.value} />
                  ))}
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Notes</Text>
                <View style={styles.notesCard}>
                  <Text style={styles.notesText}>{detailData.notes || "No notes provided."}</Text>
                </View>
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
                    <Text style={styles.emptyText}>No photo uploaded for this request.</Text>
                  )}
                </View>
              </View>

              <View style={styles.actionRow}>
                <Pressable onPress={() => navigation.goBack()} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </Pressable>
              </View>
            </>
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
  safe: { flex: 1, backgroundColor: COLORS.forest },
  bg: { flex: 1 },
  tint: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.tint },
  topBar: {
    height: 58,
    backgroundColor: COLORS.forest,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(247, 248, 243, 0.12)",
    elevation: 6,
  },
  topBarSide: { width: 32 },
  topBarCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  topTitle: { color: COLORS.textOnBrand, fontSize: 17, fontWeight: "800", letterSpacing: 0.3 },
  topSubtitle: { color: COLORS.sageMist, fontSize: 11, marginTop: -2 },
  menuBlockWrap: { marginTop: 8, marginBottom: 10, paddingHorizontal: 10 },
  menuBlock: {
    minHeight: 60,
    borderRadius: RADII.lg,
    backgroundColor: "rgba(255, 252, 246, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(247, 248, 243, 0.14)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  menuBlockText: { color: COLORS.textOnBrand, fontSize: 24, fontWeight: "800", letterSpacing: 0.4 },
  scrollContent: { paddingHorizontal: 12, paddingTop: 4 },
  loading: { marginTop: 48 },
  heroCard: {
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  heroBadge: {
    alignSelf: "flex-start",
    borderRadius: RADII.pill,
    backgroundColor: COLORS.parchment,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  heroBadgeText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  heroTitle: {
    marginTop: 14,
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textMuted,
  },
  sectionCard: {
    marginTop: 12,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: COLORS.textPrimary },
  sectionSubtitle: { marginTop: 4, fontSize: 13, lineHeight: 20, color: COLORS.textMuted },
  detailGrid: { marginTop: 14, gap: 10 },
  detailCard: {
    borderRadius: RADII.md,
    backgroundColor: COLORS.parchment,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: COLORS.textMuted,
  },
  detailValue: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  notesCard: {
    marginTop: 12,
    borderRadius: RADII.md,
    backgroundColor: COLORS.parchment,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  notesText: { fontSize: 14, lineHeight: 22, color: COLORS.textPrimary },
  photoCard: {
    marginTop: 12,
    minHeight: 180,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.parchment,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  photo: { width: "100%", height: 240, borderRadius: RADII.md },
  actionRow: { alignItems: "center", marginTop: 16 },
  closeButton: {
    minWidth: 180,
    borderRadius: RADII.md,
    backgroundColor: COLORS.forest,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  closeButtonText: { color: COLORS.textOnBrand, fontWeight: "700", fontSize: 16 },
  emptyState: {
    marginTop: 32,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    alignItems: "center",
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: COLORS.textPrimary },
  emptyText: { marginTop: 6, fontSize: 14, color: COLORS.textMuted, textAlign: "center", lineHeight: 21 },
  tabBar: { backgroundColor: COLORS.forestDeep },
});
