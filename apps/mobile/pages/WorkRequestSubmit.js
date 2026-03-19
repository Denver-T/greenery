import React from "react";
import {
  ImageBackground,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  Platform,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import NavBar from "../components/NavBar";

const BG = require("../assets/bg.jpg");
const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const COLORS = {
  green: "#6f8641",
  greenDark: "#5e7833",
  blockGreen: "#6f8641",
  black: "#000000",
  white: "#ffffff",
  cardFill: "#f8f8f8",
  cardBorder: "#d9e1c8",
  tint: "rgba(125, 145, 98, 0.25)",
  mutedText: "#e9efd9",
};

export default function WorkRequestSubmit() {
  const navigation = useNavigation();

  const [REQ, setREQ] = React.useState("");
  const [techName, setTechName] = React.useState("");
  const [accName, setAccName] = React.useState("");
  const [accContact, setAccContact] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [workType, setWorkType] = React.useState("");
  const [numPlants, setNumPlants] = React.useState("");
  const [plantWanted, setPlantWanted] = React.useState("");
  const [plantGettingReplaced, setPlantGettingReplaced] = React.useState("");
  const [plantSize, setPlantSize] = React.useState("");
  const [plantHeight, setPlantHeight] = React.useState("");
  const [planterTypeSize, setPlanterTypeSize] = React.useState("");
  const [planterColour, setPlanterColour] = React.useState("");
  const [stagingMaterialTypeColor, setStagingMaterialTypeColor] = React.useState("");
  const [lighting, setLighting] = React.useState("");
  const [method, setMethod] = React.useState("");
  const [plantLocation, setPlantLocation] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [photo, setPhoto] = React.useState(null);

const validateForm = (item) => {
  // Validation logic here
  // Set errors using setErrors if validation fails
  // Return true if valid, false if not
  const validateRes = validateWorkRequest(item);
  if (!validateRes.result) {
    console.log(validateRes.message);
    return false;
  } else {
    return true;
  }
};
  
const handleSubmit = () => {
  //Hande Submit Logic here
  // Call validateForm and if valid, submit the form
  const item = {
    req: REQ,
    techName: techName,
    accountName: accName,
    accountContact: accContact,
    address: address,
    workType: workType,
    numPlants: numPlants,
    plantWanted: plantWanted,
    plantGettingReplaced: plantGettingReplaced,
    plantSize: plantSize,
    plantHeight: plantHeight,
    planterTypeSize: planterTypeSize,
    planterColour: planterColour,
    stagingMaterialTypeColor: stagingMaterialTypeColor,
    lighting: lighting,
    method: method,
    plantLocation: plantLocation,    
    };
  if (validateForm(item)) {
    addReq(item);
    navigation.navigate("WorkRequestView");
  }
};

  function handlePhotoUpload() {
    // Implement photo upload functionality here, e.g., using ImagePicker from Expo
  }
    

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
            <Ionicons name="notifications-outline" size={22} color={COLORS.white} />
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <View style={styles.menuBlockWrap}>
          <View style={styles.menuBlock}>
            <Text style={styles.menuBlockText}>Work Request Submission Form</Text>
          </View>
        </View>

        <KeyboardAvoidingView>
          <View style={styles.formBlockWrap}>
            <View style={styles.formBlock}>
              <ScrollView
                nestedScrollEnabled
                contentContainerStyle={styles.formContent}
                showsVerticalScrollIndicator={true}
              >
                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Reference Number</Text>
                  </View>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Enter Reference Number"
                    onChangeText={setREQ}
                    value={REQ}
                    keyboardType="numeric"
                  />
                </View>

                {/* Add date picker back here later cale -Cale */}

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Tech Name</Text>
                  </View>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Enter Technician Name"
                    onChangeText={setTechName}
                    value={techName}
                  />
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Account Name</Text>
                  </View>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Enter Account Name"
                    onChangeText={setAccName}
                    value={accName}
                  />
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Account Contact</Text>
                  </View>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Enter Account Contact"
                    onChangeText={setAccContact}
                    value={accContact}
                  />
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Address</Text>
                  </View>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Enter Address"
                    onChangeText={setAddress}
                    value={address}
                  />
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Type of Work</Text>
                  </View>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Enter Type of Work Needed"
                    onChangeText={setWorkType}
                    value={workType}
                  />
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Number of Plants</Text>
                  </View>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Enter Number of Plants"
                    onChangeText={setNumPlants}
                    value={numPlants}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Plant Wanted</Text>
                  </View>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Enter Plant Wanted"
                    onChangeText={setPlantWanted}
                    value={plantWanted}
                  />
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Plant Getting Replaced</Text>
                  </View>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Enter Plant to Replace"
                    onChangeText={setPlantGettingReplaced}
                    value={plantGettingReplaced}
                  />
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Plant Size</Text>
                  </View>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Enter Plant Size"
                    onChangeText={setPlantSize}
                    value={plantSize}
                  />
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Plant Height</Text>
                  </View>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Enter Plant Height"
                    onChangeText={setPlantHeight}
                    value={plantHeight}
                  />
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Planter Type/Size</Text>
                  </View>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Enter Planter Type/Size"
                    onChangeText={setPlanterTypeSize}
                    value={planterTypeSize}
                  />
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Planter Colour</Text>
                  </View>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Enter Planter Colour"
                    onChangeText={setPlanterColour}
                    value={planterColour}
                  />
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Staging Material Type/Colour</Text>
                  </View>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Enter SM Type & Colour"
                    onChangeText={setStagingMaterialTypeColor}
                    value={stagingMaterialTypeColor}
                  />
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Lighting</Text>
                  </View>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Enter Lighting"
                    onChangeText={setLighting}
                    value={lighting}
                  />
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Method</Text>
                  </View>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Enter Method"
                    onChangeText={setMethod}
                    value={method}
                  />
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Plant Location</Text>
                  </View>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Enter Plant Location"
                    onChangeText={setPlantLocation}
                    value={plantLocation}
                  />
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Notes</Text>
                  </View>
                  <TextInput
                    style={[styles.fieldInput, { height: 80, paddingTop: 30 }]}
                    placeholder="Enter Any Additional Notes"
                    onChangeText={setNotes}
                    value={notes}
                    multiline
                  />
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelBox}>
                    <Text style={styles.fieldLabelText}>Photo Upload</Text>
                  </View>
                  <Pressable
                    style={[styles.fieldInput, { alignItems: "center", justifyContent: "center" , padding: 10}]}
                    onPress={() => {
                      // Handle photo upload action here
                    }}
                  >
                    <Ionicons name="camera-outline" size={24} color= "#127fe6" />
                    <Text style={{ color: "#127fe6", marginLeft: 8 }}>Upload Photo</Text>
                  </Pressable>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Pressable onPress={() => {}} style={styles.submitButton}>
                    <Text style={{ color: COLORS.white, fontWeight: "700", fontSize: 16 }}>
                      Submit REQ
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
        

        
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
  topBarCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  topTitle: { color: COLORS.white, fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },
  topSubtitle: { color: COLORS.mutedText, fontSize: 11, marginTop: -2 },

  menuBlockWrap: { marginTop: 15, marginBottom: 8, paddingHorizontal: 6 },
  menuBlock: {
    height: 56,
    borderRadius: 10,
    backgroundColor: COLORS.blockGreen,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
  menuBlockText: { color: COLORS.white, fontSize: 22, fontWeight: "800", letterSpacing: 0.5 },

  avoider: { flex: 0 },

  formBlockWrap: {
    alignItems: "center",
    paddingHorizontal: 12,
  },

  formBlock: {
    width: 370,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 0,
    maxHeight: SCREEN_HEIGHT * 0.65,
    overflow: "hidden", 
  },

  formContent: {
    paddingVertical: 14,
  },

  submitButton: {
    borderRadius: 10,
    backgroundColor: COLORS.green,
    width: 200,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    height: 44,
  },

  fieldRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  fieldLabelBox: {
    width: 140,
    minHeight: 44,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    backgroundColor: COLORS.blockGreen,
    paddingHorizontal: 10,
    justifyContent: "center",
    marginRight: 8,
  },
  fieldLabelText: { color: COLORS.white, fontWeight: "600", textAlign: "center" },

  fieldInput: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    color: COLORS.black,
    marginLeft: 5,
    backgroundColor: COLORS.cardFill,
  },

  tabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.green,
    paddingTop: 6,
    paddingBottom: Platform.select({ ios: 8, android: 6 }),
    elevation: 12,
  },
});
``