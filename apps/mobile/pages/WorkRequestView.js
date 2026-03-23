import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import NavBar from "../components/NavBar";
import { getAllWorkRequest } from "../util/workRequest";

const BG = require("../assets/bg.jpg");

const COLORS = {
  green: "#6f8641",
  greenDark: "#5e7833",
  blockGreen: "#6f8641",
  black: "#000000",
  textOnGreen: "#ffffff",
  cardFill: "#ffffff",
  cardBorder: "#d9e1c8",
  tint: "rgba(125,145,98,0.25)",
  mutedText: "#e9efd9",
};

const STATUS_COLORS = {
  unassigned: { bg: "#fef9c3", text: "#854d0e" },
  assigned: { bg: "#dbeafe", text: "#1e40af" },
  in_progress: { bg: "#fef3c7", text: "#92400e" },
  completed: { bg: "#dcfce7", text: "#166534" },
  cancelled: { bg: "#fee2e2", text: "#991b1b" },
};

export default function WorkRequestView() {
  const navigation = useNavigation();
  const [reqs, setReqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function openRequest(id) {
    navigation.navigate("WorkRequestDetails", id);
  }

  async function fetchWorkRequestList() {
    try {
      setLoading(true);
      setError(null);
      const res = await getAllWorkRequest();
      const reqsArray = Array.isArray(res) ? res : res?.data || res?.reqs || [];
      setReqs(reqsArray);
    } catch (err) {
      setError("Failed to load work requests");
      console.log(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWorkRequestList();
  }, []);

  function getStatusStyle(status) {
    return STATUS_COLORS[status] || { bg: "#f3f4f6", text: "#374151" };
  }

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

        <View style={styles.menuBlockWrap}>
          <View style={styles.menuBlock}>
            <Text style={styles.menuBlockText}>Work Requests</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.green} style={{ marginTop: 40 }} />
          ) : null}

          {!loading && error ? (
            <View style={styles.emptyBox}>
              <Ionicons name="alert-circle-outline" size={40} color="#cc0000" />
              <Text style={styles.emptyText}>{error}</Text>
              <Pressable style={styles.retryBtn} onPress={fetchWorkRequestList}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : null}

          {!loading && !error && reqs.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="document-outline" size={40} color={COLORS.greenDark} />
              <Text style={styles.emptyText}>No work requests found</Text>
            </View>
          ) : null}

          {!loading && !error && reqs.map((req) => {
            const statusStyle = getStatusStyle(req.status);

            return (
              <View key={req.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderPill}>
                    <Text style={styles.cardHeaderText}>Work Request</Text>
                  </View>

                  <View style={{ flex: 1 }} />

                  <View style={styles.cardHeaderPill}>
                    <Text style={styles.cardHeaderText}>#{req.referenceNumber}</Text>
                  </View>
                </View>

                {req.account ? (
                  <View style={styles.accountRow}>
                    <Ionicons name="business-outline" size={14} color={COLORS.greenDark} />
                    <Text style={styles.accountText}>{req.account}</Text>
                  </View>
                ) : null}

                <View style={styles.cardBody}>
                  <View style={styles.inlineRow}>
                    <Text style={styles.submittedLabel}>Submitted By:</Text>
                    <Text style={styles.submittedName}>{req.techName || "N/A"}</Text>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>
                      {req.status?.replace("_", " ").toUpperCase() || "UNKNOWN"}
                    </Text>
                  </View>

                  <Pressable
                    style={styles.arrowButton}
                    onPress={() => openRequest(req.id)}
                  >
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  </Pressable>
                </View>

                {req.dueDate ? (
                  <View style={styles.dueDateRow}>
                    <Ionicons name="calendar-outline" size={13} color={COLORS.greenDark} />
                    <Text style={styles.dueDateText}>
                      Due: {new Date(req.dueDate).toLocaleDateString()}
                    </Text>
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
  topBarCenter: { flex: 1, alignItems: "center" },
  topTitle: {
    color: COLORS.textOnGreen,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  topSubtitle: {
    color: COLORS.mutedText,
    fontSize: 11,
    marginTop: -2,
  },
  menuBlockWrap: {
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 6,
  },
  menuBlock: {
    height: 56,
    backgroundColor: COLORS.blockGreen,
    borderRadius: 10,
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
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  emptyBox: {
    alignItems: "center",
    marginTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.greenDark,
    fontWeight: "600",
  },
  retryBtn: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  retryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  card: {
    backgroundColor: COLORS.cardFill,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 12,
    elevation: 3,
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
  cardHeaderText: {
    color: COLORS.textOnGreen,
    fontSize: 12,
    fontWeight: "800",
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
    marginLeft: 4,
  },
  accountText: {
    fontSize: 13,
    color: COLORS.greenDark,
    fontWeight: "600",
  },
  cardBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inlineRow: {
    flex: 1,
    flexDirection: "column",
  },
  submittedLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
    marginLeft: 5,
  },
  submittedName: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.black,
    marginLeft: 5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  arrowButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
  },
  dueDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    marginLeft: 4,
  },
  dueDateText: {
    fontSize: 12,
    color: "#666",
  },
  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
});
