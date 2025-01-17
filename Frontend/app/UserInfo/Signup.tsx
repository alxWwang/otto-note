import {Button, StyleSheet, TextInput} from 'react-native';

import { Text, View } from '@/components/Themed';
import { useRouter } from 'expo-router';
import {useEffect, useState} from "react";

interface ErrorState {
  emailError: string;
  passwordError: string;
  usernameError: string;
}

interface InputState {
  email: string;
  password: string;
  username: string;
}

export default function Login() {
  const router = useRouter()
  const initialFormValues:InputState = {
    email: '',
    password: '',
    username: '',
  }
  const initialErrorValue:ErrorState={
    emailError: '',
    passwordError: '',
    usernameError: '',
  }


  const [formData, setFormData] = useState(initialFormValues);
  const [errors, setErrors] = useState(initialErrorValue);
  const [badUsername, setBadUsername] = useState(false);

  useEffect(() => {
    validate(formData, badUsername)

  },[formData, badUsername])

  const handleChange = (key: string, value: string) => {
    if (key === 'username'){
      setBadUsername(false)
    }
    setFormData((prevData) => ({
      ...prevData,
      [key]: value,
    }));
  };

  const validate = (formData: InputState, badUsername: boolean) => {
    let newErrors: ErrorState = initialErrorValue
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email))
      newErrors.emailError = 'Valid email is required';
    if (formData.password.length < 6)
      newErrors.passwordError = 'Password must be at least 6 characters';
    if (badUsername){
      newErrors.usernameError = 'This username cant be used';
    }
    setErrors(errorMessage(newErrors));
    return newErrors;
  };

  const errorMessage = (errors: ErrorState) => {
    if (errors.emailError != "" ||
        errors.passwordError != "") {
      console.log("form errors", errors);
      return errors
    }
    return initialErrorValue;
  }

  const handleSubmit = (e:any) => {
    if(errorMessage(errors) == initialErrorValue){
      // Perform form submission (e.g., API call)
      const api = {
        UserID: "73",
        status: "badUsername",
        //status: "200"
      }
      if(api.status == "200"){
        router.replace({
          pathname: '/User/Homepage/[UserID]',
          params: {UserID: api.UserID}
        })
      }else if(api.status == "badUsername") {
        setBadUsername(true);
      }
    }
  };



  return (
      <View style={styles.container}>
        <View style={styles.container}>
          <Text style={styles.title}>Signup</Text>

          {/* Email Field */}
          <View style={styles.inputContainer}>
            <Text>Email:</Text>
            <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(value) => handleChange('email', value)}
                keyboardType="email-address"
                placeholder="Enter your email"
            />
            {errors.emailError ? (
                <Text style={styles.error}>{errors.emailError}</Text>
            ) : null}
          </View>


          {/* Username Field */}
          <View style={styles.inputContainer}>
            <Text>Username:</Text>
            <TextInput
                style={styles.input}
                value={formData.username}
                onChangeText={(value) => handleChange('username', value)}
                keyboardType="email-address"
                placeholder="Enter your Username"
            />
            {errors.usernameError ? (
                <Text style={styles.error}>{errors.usernameError}</Text>
            ) : null}
          </View>

          {/* Password Field */}
          {/* Email Field */}
          <View style={styles.inputContainer}>
            <Text>Password:</Text>
            <TextInput
                style={styles.input}
                value={formData.password}
                onChangeText={(value) => handleChange('password', value)}
                keyboardType={'visible-password'}
                placeholder="Enter your password"
            />
            {errors.passwordError ? (
                <Text style={styles.error}>{errors.passwordError}</Text>
            ) : null}
          </View>



          {/* Submit Button */}
          <Button title="Submit" onPress={handleSubmit} />
        </View>

      </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  error: {
    color: 'red',
    marginTop: 5,
  },
});
