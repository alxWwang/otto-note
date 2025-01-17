import React from 'react';
import { StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Text, View } from '../Themed';
import MaterialIcons from '@expo/vector-icons/build/MaterialIcons';
import { useRouter } from 'expo-router';

const {width} = Dimensions.get("window")

interface FileProps {
  fileName:string,
  content:string,
  id:string
}


export default function FileItem({fileName, id}: { fileName: string, id: string }) {
  const router = useRouter();

  const handlePress = (fileName: string, id: string) => {
    console.log("the folder "+ fileName + " is pressed!");

    //Connect to Websocket

    //run API GetFile API (fileID) -> Content
    let res: FileProps = {
      fileName: fileName,
      content: "Sample",
      id: id
    }
    openEditor(res)
  }

  const openEditor = (file: FileProps) =>{
    router.push({
      pathname: '/User/Editor/[id]',
      params: {id: file.id, fileName: file.fileName, content: file.content },
    });
  }


  return (
    <TouchableOpacity style={styles.card} onPress={()=> handlePress(fileName, id)}>
      <View style={styles.iconAndText}>
        <View style={styles.textBox}>
          <Text style={styles.title}>{fileName}</Text>
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
    backgroundColor: "#ffffff",
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
    backgroundColor: "#ffffff",
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
});
