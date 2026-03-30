import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import MobileScaffold from "../components/MobileScaffold";
import { validateWorkRequest } from "../util/validator";
import { createWorkRequest } from "../util/workRequest";
import { COLORS, RADII, SPACING } from "../theme";

function buildReferenceNumber() {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const timePart = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  return `REQ-${datePart}-${timePart}`;
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
        numberOfLines={multiline ? 4 : 1}
        accessibilityLabel={label}
      />
    </View>
  );
}

export default function WorkRequestSubmit() {
  const navigation = useNavigation();

  const [referenceNumber] = useState(buildReferenceNumber());
  const [techName, setTechName] = useState("");
  const [account, setAccount] = useState("");
  const [accContact, setAccContact] = useState("");
  const [address, setAddress] = useState("");
  const [actionRequired, setActionRequired] = useState("");
  const [numPlants, setNumPlants] = useState("");
  const [plantWanted, setPlantWanted] = useState("");
  const [plantGettingReplaced, setPlantGettingReplaced] = useState("");
  const [plantSize, setPlantSize] = useState("");
  const [plantHeight, setPlantHeight] = useState("");
  const [planterTypeSize, setPlanterTypeSize] = useState("");
  const [planterColour, setPlanterColour] = useState("");
  const [stagingMaterialTypeColor, setStagingMaterialTypeColor] = useState("");
  const [lighting, setLighting] = useState("");
  const [method, setMethod] = useState("");
  const [plantLocation, setPlantLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [photoUri, setPhotoUri] = useState(null);
  const [targetDate, setTargetDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const requestDateLabel = useMemo(
    () =>
      targetDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    [targetDate]
  );

  const item = {
    referenceNumber,
    requestDate: targetDate.toISOString().split("T")[0],
    techName,
    account,
    accountContact: accContact,
    accountAddress: address,
    actionRequired,
    numberOfPlants: numPlants,
    plantWanted,
    plantReplaced: plantGettingReplaced,
    plantSize,
    plantHeight,
    planterTypeSize,
    planterColour,
    stagingMaterial: stagingMaterialTypeColor,
    lighting,
    method,
    location: plantLocation,
    notes,
    picture: photoUri,
  };

  function validateForm() {
    const validateRes = validateWorkRequest(item);

    if (!validateRes.result) {
      Alert.alert("Missing details", validateRes.message || "Please complete the required fields.");
      return false;
    }

    return true;
  }

  async function handleSubmit() {
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();

      Object.keys(item).forEach((key) => {
        if (key !== "picture" && item[key] !== undefined && item[key] !== null && item[key] !== "") {
          formData.append(key, item[key]);
        }
      });

      if (photoUri) {
        formData.append("picture", photoUri);
      }

      const response = await createWorkRequest(formData);

      if (response?.ok) {
        Alert.alert("Request submitted", "The new work request has been saved.", [
          {
            text: "Back to dashboard",
            onPress: () => navigation.navigate("Dashboard"),
          },
        ]);
      } else {
        Alert.alert("Request saved", "The request was submitted.");
      }
    } catch (error) {
      Alert.alert("Submit failed", error?.message || "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePhotoUpload() {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert("Permission required", "Allow photo access to attach an image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotoUri({
        uri: result.assets[0].uri,
        name: result.assets[0].fileName || "request-photo.jpg",
        type: result.assets[0].mimeType || "image/jpeg",
      });
    }
  }

  return (
    <MobileScaffold
      eyebrow="New request"
      title="Log field work"
      subtitle="Capture the details needed to hand off the request clearly."
    >
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Request basics</Text>

          <View style={styles.referenceCard}>
            <Text style={styles.referenceLabel}>Generated reference</Text>
            <Text style={styles.referenceValue}>{referenceNumber}</Text>
          </View>

          <Pressable style={styles.dateButton} onPress={() => setShowDatePicker(true)} accessibilityRole="button" accessibilityLabel={`Request date: ${requestDateLabel}`}>
            <Text style={styles.dateLabel}>Request date</Text>
            <Text style={styles.dateValue}>{requestDateLabel}</Text>
          </Pressable>

          {showDatePicker ? (
            <DateTimePicker
              value={targetDate}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                if (event.type === "dismissed") {
                  setShowDatePicker(false);
                  return;
                }

                setTargetDate(selectedDate || targetDate);

                if (Platform.OS === "android") {
                  setShowDatePicker(false);
                }
              }}
            />
          ) : null}

          <Field label="Technician name" value={techName} onChangeText={setTechName} placeholder="Who is creating this request?" />
          <Field label="Account" value={account} onChangeText={setAccount} placeholder="Customer or site account" />
          <Field label="Account contact" value={accContact} onChangeText={setAccContact} placeholder="Main contact name" />
          <Field label="Account address" value={address} onChangeText={setAddress} placeholder="Site address" />
          <Field label="Action required" value={actionRequired} onChangeText={setActionRequired} placeholder="What needs to happen?" />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Plant details</Text>
          <Field label="Number of plants" value={numPlants} onChangeText={setNumPlants} placeholder="0" />
          <Field label="Plant wanted" value={plantWanted} onChangeText={setPlantWanted} placeholder="Requested plant" />
          <Field label="Plant replaced" value={plantGettingReplaced} onChangeText={setPlantGettingReplaced} placeholder="Plant being removed" />
          <Field label="Plant size" value={plantSize} onChangeText={setPlantSize} placeholder="Pot or plant size" />
          <Field label="Plant height" value={plantHeight} onChangeText={setPlantHeight} placeholder="Approximate height" />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Placement and install context</Text>
          <Field label="Planter type / size" value={planterTypeSize} onChangeText={setPlanterTypeSize} placeholder="Type or dimensions" />
          <Field label="Planter colour" value={planterColour} onChangeText={setPlanterColour} placeholder="Colour or finish" />
          <Field label="Staging material" value={stagingMaterialTypeColor} onChangeText={setStagingMaterialTypeColor} placeholder="Material and colour" />
          <Field label="Lighting" value={lighting} onChangeText={setLighting} placeholder="Lighting conditions" />
          <Field label="Method" value={method} onChangeText={setMethod} placeholder="Install or service method" />
          <Field label="Location" value={plantLocation} onChangeText={setPlantLocation} placeholder="Where in the site?" />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Notes and photo</Text>
          <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Extra detail for the next technician or manager" multiline />

          <Pressable style={styles.photoButton} onPress={handlePhotoUpload} accessibilityRole="button" accessibilityLabel={photoUri ? "Replace photo" : "Attach photo"}>
            <MaterialCommunityIcons name="camera-plus-outline" size={18} color={COLORS.forestDeep} />
            <Text style={styles.photoButtonText}>{photoUri ? "Replace photo" : "Attach photo"}</Text>
          </Pressable>

          {photoUri ? <Image source={{ uri: photoUri.uri }} style={styles.previewImage} resizeMode="cover" /> : null}
        </View>

        <View style={styles.actionRow}>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Cancel">
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={handleSubmit} disabled={submitting} accessibilityRole="button" accessibilityLabel={submitting ? "Submitting request" : "Submit request"}>
            <Text style={styles.primaryButtonText}>{submitting ? "Submitting..." : "Submit request"}</Text>
          </Pressable>
        </View>
    </MobileScaffold>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "800",
  },
  referenceCard: {
    marginTop: SPACING.md,
    borderRadius: RADII.md,
    backgroundColor: COLORS.parchment,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  referenceLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  referenceValue: {
    marginTop: 6,
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: "800",
  },
  dateButton: {
    marginTop: SPACING.md,
    borderRadius: RADII.md,
    backgroundColor: COLORS.parchment,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  dateLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  dateValue: {
    marginTop: 6,
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  fieldWrap: {
    marginTop: SPACING.md,
  },
  fieldLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
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
    minHeight: 110,
    textAlignVertical: "top",
  },
  photoButton: {
    marginTop: SPACING.md,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.parchment,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  photoButtonText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  previewImage: {
    marginTop: SPACING.md,
    width: "100%",
    height: 220,
    borderRadius: RADII.md,
  },
  actionRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  primaryButton: {
    flex: 1,
    borderRadius: RADII.md,
    backgroundColor: COLORS.moss,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: COLORS.textOnBrand,
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryButton: {
    flex: 1,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
});
