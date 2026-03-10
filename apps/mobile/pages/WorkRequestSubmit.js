import React from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
  FontAwesome5,
  Feather,
} from '@expo/vector-icons';
import NavBar from '../components/NavBar'; 

const BG = require('../assets/bg.jpg');
const RADIUS = 12;
const COLORS = {
  green: '#6f8641',      
  greenDark: '#5e7833',
  blockGreen: '#6f8641',
  black: '#000000',
  white: '#ffffff',
  cardFill: '#f8f8f8',
  cardBorder: '#d9e1c8',
  tint: 'rgba(125, 145, 98, 0.25)',
  tabIcon: '#fff',
  mutedText: '#e9efd9',
};



export default function WorkRequestSubmit() {
  const navigation = useNavigation();
  
  const [REQ, setREQ] = React.useState('');
  const [accName, setAccName] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [workType, setWorkType] = React.useState('');
  const [plantWork, setPlantWork] = React.useState('');
  const [plantLocation, setPlantLocation] = React.useState('');
  const [plantNeeded, setPlantNeeded] = React.useState('');
  const [accContact, setAccContact] = React.useState('');
  const[errors, setErrors] = React.useState({});
  
  const validateForm = () => {
    // Validation logic here
    // Set errors using setErrors if validation fails
    // Return true if valid, false if not

  }
  const handleSubmit = () => {
    //Hande Submit Logic here
    // Call validateForm and if valid, submit the form
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
          <View style={[styles.topBarSide, { alignItems: 'flex-end' }]}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.white} />
          </View>
        </View>

        <View style={styles.menuBlockWrap}>
            <View style={styles.menuBlock}>
              <Text style={styles.menuBlockText}>Work Request Submission Form</Text>
            </View>
        </View>

        <View style={styles.formBlockWrap}>
          <View style={styles.formBlock}>
            <Text style={[styles.fieldLabelText, { marginBottom: 10 }, {color: COLORS.black}]}>Please enter the following information:</Text>
            
            <View style={styles.fieldRow}>
              <View style={styles.fieldLabelBox}>
                <Text style={styles.fieldLabelText}>REQ#</Text>
              </View>
              <TextInput
                style={styles.fieldInput}
                placeholder='Enter Request Number'
                onChangeText={setREQ}
                value={REQ}
                keyboardType='numeric'
              />
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.fieldLabelBox}>
                <Text style={styles.fieldLabelText}>Account Name</Text>
              </View>
              <TextInput
                style={styles.fieldInput}
                placeholder='Enter Account Name'
                onChangeText={setAccName}
                value={accName}
              />
            </View>


            <View style={styles.fieldRow}>
              <View style={styles.fieldLabelBox}>
                <Text style={styles.fieldLabelText}>Address</Text>
              </View>
              <TextInput
                style={styles.fieldInput}
                placeholder='Enter Address'
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
                placeholder='Enter Type of Work Needed'
                onChangeText={setWorkType}
                value={workType}
              />
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.fieldLabelBox}>
                <Text style={styles.fieldLabelText}>Plant Work</Text>
              </View>
              <TextInput
                style={styles.fieldInput}
                placeholder='Enter Plant(s) that need work'
                onChangeText={setPlantWork}
                value={plantWork}
              />
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.fieldLabelBox}>
                <Text style={styles.fieldLabelText}>Plant Location</Text>
              </View>
              <TextInput
                style={styles.fieldInput}
                placeholder='Enter Plant Location'
                onChangeText={setPlantLocation}
                value={plantLocation}
              />
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.fieldLabelBox}>
                <Text style={styles.fieldLabelText}>Plant Needed</Text>
              </View>
              <TextInput
                style={styles.fieldInput} 
                placeholder='Enter any Plant(s) Needed'
                onChangeText={setPlantNeeded}
                value={plantNeeded}
              />
            </View>
            
            <View style={styles.fieldRow}>
              <View style={styles.fieldLabelBox}>
                <Text style={styles.fieldLabelText}>Account Contact</Text>
              </View>
              <TextInput
                style={styles.fieldInput}
                placeholder='Enter Account Contact'
                onChangeText={setAccContact}
                value={accContact}
              />
            </View>

            <Pressable onPress={handleSubmit} style={styles.submitButton}>
              <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 16 }}>Submit</Text>
            </Pressable>
          </View>
        </View>        

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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    elevation: 6,
  },
  topBarSide: { width: 32 },
  topBarCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
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
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  menuBlockText: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  formBlockWrap: {
    alignItems: 'center',
    marginTop: 10
  },
  formBlock: {
    height: 700,
    backgroundColor: COLORS.white,
    width: 370,
    alignItems: 'center',
    justifyContent:'center',
    borderRadius: 10,
  },
  submitButton: {
    borderRadius: 10,
    backgroundColor: COLORS.green,
    width: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    height: 44,
  },
  fieldRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',                       
    marginTop: 10,
    paddingHorizontal: 12,
    marginBottom: 15,
  },
  fieldLabel: {               
    color: '#2e2e2e',
    fontWeight: '600',
  },
  fieldLabelBox: {
    width: 130,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    backgroundColor: COLORS.blockGreen,
    paddingHorizontal: 10,
    justifyContent: 'center',
    marginRight: 8,          
  },
  fieldLabelText: {
    color: COLORS.white,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  fieldInput: {
    flex: 1,
    height: 44,               
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    color: COLORS.black,
    marginLeft: 5,           
  },
});