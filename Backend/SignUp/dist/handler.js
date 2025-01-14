"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const mysql = __importStar(require("mysql2/promise"));
const inappropriateWords = ['fuck', 'shit']; // Add more inappropriate words
// validate the password
const validatePassword = (password) => {
    const specialCharacterRegex = /[!@#$%^&*(),.?":{}|<>]/;
    return password.length >= 8 && specialCharacterRegex.test(password);
};
//validate the email
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
// AWS API Gateway
const handler = async (event) => {
    try {
        const body = JSON.parse(event.body || '{}'); //request body (an object [username : "", password: "", email : ""])
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
        const connection = await mysql.createConnection({
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
    }
    catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' }), //I hope this never occurs
        };
    }
};
exports.handler = handler;
