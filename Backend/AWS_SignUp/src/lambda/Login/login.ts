import { APIGatewayProxyHandler } from 'aws-lambda';
import * as mysql from 'mysql2/promise';


//Request Body
interface UserInput {
  password: string;
  email: string;
}


export const handler: APIGatewayProxyHandler = async (event: { body: any }) => {
  try {
    const body : UserInput = JSON.parse(event.body || '{}');

    const { email, password } = body;

    if (!email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email and password are required' }),
      };
    }

    const connection = await mysql.createConnection({
      host: process.env.RDS_ENDPOINT,
      user: process.env.RDS_USERNAME,
      password: process.env.RDS_PASSWORD,
      database: process.env.RDS_DATABASE_NAME,
    });

    const [rows] = await connection.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      await connection.end();
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid email or password' }),
      };
    }

    const user = rows[0] as { password: string };

    if (user.password !== password) {
      await connection.end();
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid email or password' }),
      };
    }

    await connection.end();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Login successful' }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};
