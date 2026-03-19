import React, { useState, useEffect } from "react";
import {
  ImageBackground,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import NavBar from "../components/NavBar";
import { getWorkRequestById } from "../util/workRequest";

const BG = require("../assets/bg.jpg");
const RADIUS = 12;
const COLORS = {
  green: "#6f8641",
  greenDark: "#5e7833",
  blockGreen: "#6f8641",
  black: "#000000",
  white: "#ffffff",
  cardFill: "#f8f8f8",
  cardBorder: "#d9e1c8",
  tint: "rgba(125, 145, 98, 0.25)",
  tabIcon: "#fff",
  mutedText: "#e9efd9",
  red: "#96050d",
};

export default function WorkRequestDetails({ route, navigation }) {
  const id = route.params;
  function onClose() {
    navigation.goBack();
  }

  const [detailData, setDetailData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);

      try {
        const data = await getWorkRequestById(id);
        console.log(data);
        setDetailData(data);
      } catch (error) {
        console.error("Error fetching details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor={COLORS.green} barStyle="light-content" />

      <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
        <View style={styles.tint} />

        {/* Top App Bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarSide}>
            <Ionicons name="person-outline" size={22} color={COLORS.white} />
          </View>
          <View style={styles.topBarCenter}>
            <Text style={styles.topTitle}>Greenery Team App</Text>
            <Text style={styles.topSubtitle}>Mobile View</Text>
          </View>
          <View style={[styles.topBarSide, { alignItems: "flex-end" }]}>
            <Ionicons
              name="notifications-outline"
              size={22}
              color={COLORS.white}
            />
          </View>
        </View>

        <ScrollView>
          <View style={styles.menuBlockWrap}>
            <View style={styles.menuBlock}>
              <Text style={styles.menuBlockText}>Work Request Details</Text>
            </View>
          </View>
          {isLoading ? (
            <Text>Loading details...</Text>
          ) : (
            <View style={styles.formBlockWrap}>
              <View style={styles.formBlock}>
                <Text
                  style={[
                    styles.fieldLabelText,
                    { marginBottom: 10 },
                    { color: COLORS.black },
                  ]}
                >
                  REQ#{detailData.req} - Submitted by {detailData.techName}
                </Text>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>REQ#</Text>
                  </View>
                  <View style={styles.fieldInfo}>
                    <Text style={styles.fieldInfoText}>
                      {detailData.referenceNumber}
                    </Text>
                  </View>
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Submitted By</Text>
                  </View>
                  <View style={styles.fieldInfo}>
                    <Text style={styles.fieldInfoText}>
                      {detailData.techName}
                    </Text>
                  </View>
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Account Name</Text>
                  </View>
                  <View style={styles.fieldInfo}>
                    <Text style={styles.fieldInfoText}>
                      {detailData.accountName}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Account Contact</Text>
                  </View>
                  <View style={styles.fieldInfo}>
                    <Text style={styles.fieldInfoText}>
                      {detailData.accountContact}
                    </Text>
                  </View>
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Address</Text>
                  </View>
                  <View style={styles.fieldInfo}>
                    <Text style={styles.fieldInfoText}>
                      {detailData.address}
                    </Text>
                  </View>
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Type of Work</Text>
                  </View>
                  <View style={styles.fieldInfo}>
                    <Text style={styles.fieldInfoText}>
                      {detailData.workType}
                    </Text>
                  </View>
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Number of Plants</Text>
                  </View>
                  <View style={styles.fieldInfo}>
                    <Text style={styles.fieldInfoText}>
                      {detailData.numPlants}
                    </Text>
                  </View>
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Plant Wanted</Text>
                  </View>
                  <View style={styles.fieldInfo}>
                    <Text style={styles.fieldInfoText}>
                      {detailData.plantWanted}
                    </Text>
                  </View>
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Plant Getting Replaced</Text>
                  </View>
                  <View style={styles.fieldInfo}>
                    <Text style={styles.fieldInfoText}>
                      {detailData.plantGettingReplaced}
                    </Text>
                  </View>
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Plant Size</Text>
                  </View>
                  <View style={styles.fieldInfo}>
                    <Text style={styles.fieldInfoText}>
                      {detailData.plantSize}
                    </Text>
                  </View>
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Plant Height</Text>
                  </View>
                  <View style={styles.fieldInfo}>
                    <Text style={styles.fieldInfoText}>
                      {detailData.plantHeight}
                    </Text>
                  </View>
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Planter Type/Size</Text>
                  </View>
                  <View style={styles.fieldInfo}>
                    <Text style={styles.fieldInfoText}>
                      {detailData.planterTypeSize}
                    </Text>
                  </View>
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Planter Colour</Text>
                  </View>
                  <View style={styles.fieldInfo}>
                    <Text style={styles.fieldInfoText}>
                      {detailData.planterColour}
                    </Text>
                  </View>
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Staging Material Type/Colour</Text>
                  </View>
                  <View style={styles.fieldInfo}>
                    <Text style={styles.fieldInfoText}>
                      {detailData.stagingMaterialTypeColour}
                    </Text>
                  </View>
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Lighting</Text>
                  </View>
                  <View style={styles.fieldInfo}>
                    <Text style={styles.fieldInfoText}>
                      {detailData.lighting}
                    </Text>
                  </View>
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Method</Text>
                  </View>
                  <View style={styles.fieldInfo}>
                    <Text style={styles.fieldInfoText}>
                      {detailData.method}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Plant Location</Text>
                  </View>
                  <View style={styles.fieldInfo}>
                    <Text style={styles.fieldInfoText}>
                      {detailData.plantLocation}
                    </Text>
                  </View>
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Notes</Text>
                  </View>
                  <View style={styles.fieldInfo}>
                    <Text style={styles.fieldInfoText}>
                      {detailData.notes}
                    </Text>
                  </View>
                </View>

                <Pressable onPress={onClose} style={styles.submitButton}>
                  <Text
                    style={{
                      color: COLORS.white,
                      fontWeight: "700",
                      fontSize: 16,
                    }}
                  >
                    Close
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.tint,
  },
  /* Top bar */
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
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  topSubtitle: {
    color: COLORS.mutedText,
    fontSize: 11,
    marginTop: -2,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  menuBlockWrap: {
    marginTop: 15,
    marginBottom: 8,
    paddingHorizontal: 6,
  },
  menuBlock: {
    height: 56,
    borderRadius: 10,
    backgroundColor: COLORS.blockGreen,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
  menuBlockText: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  formBlockWrap: {
    alignItems: "center",
    marginTop: 10,
  },
  formBlock: {
    height: 700,
    backgroundColor: COLORS.white,
    width: 370,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  submitButton: {
    borderRadius: 10,
    backgroundColor: COLORS.red,
    width: 200,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    height: 44,
  },
  fieldRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingHorizontal: 12,
    marginBottom: 15,
  },
  fieldLabel: {
    color: "#2e2e2e",
    fontWeight: "600",
  },
  fieldLabelBox: {
    width: 120,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    backgroundColor: COLORS.blockGreen,
    paddingHorizontal: 10,
    justifyContent: "center",
    marginRight: 8,
  },
  fieldLabelText: {
    color: COLORS.white,
    fontWeight: "600",
    textAlign: "center",
  },
  fieldInfo: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    color: COLORS.black,
    marginLeft: 5,
  },
  fieldInfoText: {
    paddingTop: 10,
    color: COLORS.black,
    fontWeight: "500",
  },
});
