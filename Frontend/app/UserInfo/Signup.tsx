import { Button, Pressable, StyleSheet } from 'react-native';

import EditScreenInfo from '@/components/EditScreenInfo';
import { Text, View } from '@/components/Themed';
import FolderItem from '@/components/Homepage/FolderItem';
import { useLocalSearchParams, useSearchParams } from 'expo-router/build/hooks';
import { useRouter } from 'expo-router';

interface FileProps {
  fileName:string,
  content:string,
  id:string
}

export default function Signup() {
  const router = useRouter()

  return (
    <View style={styles.container}>
      <Button
        title='Signup'
        onPress={()=>{
          router.push({
            pathname: '/User/Homepage/[UserID]',
            params: {UserID: "69"}
          })
        }}
      />
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
