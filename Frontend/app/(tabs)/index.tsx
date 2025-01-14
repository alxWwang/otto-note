import { StyleSheet } from 'react-native';

import EditScreenInfo from '@/components/EditScreenInfo';
import { Text, View } from '@/components/Themed';
import FolderItem from '@/components/Homepage/FolderItem';
import FolderCard from '@/components/Homepage/FolderCard';
import FileItem from '@/components/Homepage/FileItem';

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

const fs: Array<File|Folder>  = [{'type': 'File', 'name': '363-1', 'id': '312'}, {'type': 'File', 'name': '363-2', 'id': '313'}, {'type': 'Folder', 'name': 'folder2', 'id': '123124', 'content': [{'type': 'File', 'name': '363-3', 'id': '312'}, {'type': 'File', 'name': '363-4', 'id': '313'}]}]
const pathEx: string[] = [];
export default function Homepage() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Main Start Page</Text>
      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      <EditScreenInfo path="app/(tabs)/index.tsx" />
      <FolderCard jsonStructure = {fs} path = {pathEx}></FolderCard>
      <FileItem fileName={'item'}></FileItem>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
});
