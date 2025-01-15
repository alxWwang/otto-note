import React, { useEffect, useState } from 'react';
import { StyleSheet, Dimensions, TouchableOpacity } from 'react-native';

import { View } from '../Themed';
import FolderItem from './FolderItem';
import { MaterialIcons } from '@expo/vector-icons';
import FileItem from './FileItem';

const {width} = Dimensions.get("window")

interface Folder {
  type: string;
  name: string;
  id: string;
  content: Array<File|Folder>; 
}

interface File {
  type: string;
  name: string;
  id: string;
}

function isFolder(item: File | Folder): item is Folder {
  return item.type === "Folder";
}

export default function FolderCard({ jsonStructure, path }: { jsonStructure: Array<File|Folder>; path: string[]}) {
  const [pathState, setPathState] = useState<string[]>(path);
  const [jsonState, setJsonState] = useState<Array<File|Folder>>(jsonStructure);
  const jsFileSystem:  Array<File|Folder> = jsonStructure;

  useEffect(() => {
    console.log("Path change initiated:", pathState);
    goToPath(pathState, jsFileSystem);
  }, [pathState]); // Correct dependency
  
  
  const goToPath = (_path: string[], _filesystem: Array<File | Folder>) => {
    console.log("Navigating to path:", _path);
    if (!_path || _path.length === 0) {
      console.log("Resetting JSON state to: ", _filesystem);
      setJsonState(_filesystem);
      return;
    }
    for (const item of _filesystem) {
      if (isFolder(item) && item.name === _path[0]) {
        console.log("Matched folder:", item.name);
        goToPath(_path.slice(1), item.content || []);
        return;
      }
    }
    console.warn("Path segment not found:", _path[0]);
  };

  const handleBack = () => {
    if (pathState.length > 0) {
      setPathState(prevState => prevState.slice(0, -1));
    }
  };

  const BackButton = () =>(
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={handleBack} 
        disabled={pathState.length === 0} // Disable if no parent folder exists
      >
        <MaterialIcons name="chevron-left" size={24} color="#4DB6AC" />
      </TouchableOpacity>
  )
  


  return (
    <View style={styles.container}>
      <BackButton/>
      {jsonState.map( item=> {
          if( item.type === 'Folder'){
            return <FolderItem 
              key={item.id}
              folderName={item.name} 
              pathState={pathState} 
              setPathState={setPathState}/>
          }
          else {
            return <FileItem
            key = {item.id}
            fileName={item.name}
            />
          }
        }
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: width* 0.9,
    borderRadius: '22px',
    backgroundColor: '#f9f9f9',
    padding: 16,
  },
  backButton: {
    padding: 10,
    backgroundColor: '#fffff',
    borderRadius: 5,
    marginBottom: 10
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
  },
  disabledText: {
    color: '#A9A9A9', // Gray text when disabled
  }
});
