import React from "react";
import {
  ImageBackground,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import NavBar from "../components/NavBar";

import { requestList } from "../mock/temp";

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

export default function WorkRequestView() {
  const navigation = useNavigation();

  const openRequest = () => {
    navigation.navigate("WorkRequestDetails");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor={COLORS.green} barStyle="light-content" />

      <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
        <View style={styles.tint} />

        <View style={styles.topBar}>
          <View style={styles.topBarSide}>
            <Ionicons
              name="person-outline"
              size={22}
              color={COLORS.textOnGreen}
            />
          </View>

          <View style={styles.topBarCenter}>
            <Text style={styles.topTitle}>Greenery Team App</Text>
            <Text style={styles.topSubtitle}>Mobile View</Text>
          </View>

          <View style={[styles.topBarSide, { alignItems: "flex-end" }]}>
            <Ionicons
              name="notifications-outline"
              size={22}
              color={COLORS.textOnGreen}
            />
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
          {requestList.map((req) => (
            <View key={req.id} style={styles.card}>
              {/* Row 1: Header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderPill}>
                  <Text style={styles.cardHeaderText}>Work Request</Text>
                </View>

                <View style={{ flex: 1 }} />

                <View style={styles.cardHeaderPill}>
                  <Text style={styles.cardHeaderText}>#{req.id}</Text>
                </View>
              </View>

              {/* Row 2: Submitted By */}
              <View style={styles.cardBody}>
                <View style={styles.inlineRow}>
                  <Text style={styles.submittedLabel}>Submitted By:</Text>
                  <Text style={styles.submittedName}>{req.submittedBy}</Text>
                </View>

                <Pressable
                  style={styles.arrowButton}
                  onPress={() => openRequest(req.id)}
                >
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </Pressable>
              </View>
            </View>
          ))}

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

  cardBody: {
    flexDirection: "row",
    alignItems: "center",
  },

  submittedLabel: {
    fontSize: 15,
    color: "#6a7b56",
    fontWeight: "700",
    marginLeft: 5,
  },
  submittedName: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.greenDark,
    marginTop: 2,
    marginLeft: 5,
  },

  arrowButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "auto",
  },
  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },

  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
});
