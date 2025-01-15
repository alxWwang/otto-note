import { APIGatewayProxyHandler } from 'aws-lambda';
import * as mysql from 'mysql2/promise';

// This is the request body, but in the shape of an interface
interface UserInput {
  username: string;
  password: string;
  email: string;
}

const inappropriateWords = ['fuck', 'shit']; // Add more inappropriate words


// validate the password
const validatePassword = (password: string): boolean => {
  const specialCharacterRegex = /[!@#$%^&*(),.?":{}|<>]/;
  return password.length >= 8 && specialCharacterRegex.test(password);
};

//validate the email
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// AWS API Gateway
export const handler: APIGatewayProxyHandler = async (event: { body: any; }) => {
  try {
    const body: UserInput = JSON.parse(event.body || '{}'); //request body (an object [username : "", password: "", email : ""])

    const { username, password, email } = body;

    if (!username || !password || !email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'All fields are required' }), // If the user didn't fill out one of the categories
      };
    }

    if (!validatePassword(password)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Password must be at least 8 characters long and include one special character' }), //if the user didn't meet password requirements
      };
    }

    if (!validateEmail(email)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid email format' }), //if the user didn't meet email format
      };
    }

    const connection = await mysql.createConnection({ //Connect to aws rds
      host: process.env.RDS_ENDPOINT,
      user: process.env.RDS_USERNAME,
      password: process.env.RDS_PASSWORD,
      database: process.env.RDS_DATABASE_NAME,
    });

    const [rows] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);
    
    if (Array.isArray(rows) && rows.length > 0) { // Check if the email is already taken
      await connection.end();
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email is already taken' }),
      };
    }

    const query = `INSERT INTO users (username, password, email) VALUES (?, ?, ?)`; //insert the new info to the database

    await connection.execute(query, [username, password, email]);
    await connection.end();

    return {
      statusCode: 201,
      body: JSON.stringify({ message: 'User signed up successfully' }), // successful sign up
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }), //I hope this never occurs
    };
  }
};
