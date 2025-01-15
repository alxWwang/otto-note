import React from 'react';
import { StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Text, View } from '../Themed';
import MaterialIcons from '@expo/vector-icons/build/MaterialIcons';
import { useRouter } from 'expo-router';
import { State } from 'expo-router/build/fork/getPathFromState';

const {width} = Dimensions.get("window")


interface pathStateProps{
  folderName: string
  pathState: string[]
  setPathState: React.Dispatch<React.SetStateAction<string[]>>
}
export default function FolderItem({ folderName, pathState, setPathState }: pathStateProps) {
  const router = useRouter();

  const handlePress = (fileName: string) => {
    console.log("the folder "+ fileName + " is pressed!");
    // Update pathState immutably
    const updatedPath = [...pathState, fileName];
    setPathState(updatedPath);
  }
  return (
    <TouchableOpacity style={styles.card} onPress={()=> handlePress(folderName)}>
      <View style={styles.iconAndText}>
        <View style={styles.textBox}>
          <Text style={styles.title}>{folderName}</Text>
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#4DB6AC" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#E0F7FA",
    borderRadius: 12,
    padding: 16,
    margin: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2, // For Android shadow
    zIndex: 100
  },
  textBox:{
    backgroundColor: "#E0F7FA",
    width: width*0.6
  },
  iconAndText: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4DB6AC",
  },
  subtitle: {
    fontSize: 14,
    color: "#B2DFDB",
  },
});
