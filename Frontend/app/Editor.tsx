import { StyleSheet } from 'react-native';

import EditScreenInfo from '@/components/EditScreenInfo';
import { Text, View } from '@/components/Themed';
import FolderItem from '@/components/Homepage/FolderItem';
import { useLocalSearchParams } from 'expo-router/build/hooks';

interface FileProps {
  fileName:string,
  content:string,
  id:string
}

export default function Editor() {

  const { fileName } = useLocalSearchParams();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{fileName}</Text>
      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      <EditScreenInfo path="app/(tabs)/yes.tsx" />
      
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
