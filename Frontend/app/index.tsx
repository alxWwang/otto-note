import { Button, StyleSheet } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter()


  let LoginHandler = () =>{
    router.push('/UserInfo/Login')
  }

  let SignUpHandler = () =>{
    router.push('/UserInfo/Signup')
  }
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Main Start Page</Text>
      <Button title="Log in" onPress={()=>(LoginHandler())}/>
      <Button title="Sign up" onPress={()=>(SignUpHandler())}/>
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
  }
});
