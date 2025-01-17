const signupHandler = require('./Singup'); 
const loginHandler = require('./Login');   

// Main Lambda Handler
exports.handler = async (event) => {
    console.log("Received event:", JSON.stringify(event, null, 2));

    const path = event.resource || event.path;
    const method = event.httpMethod;

    if (path === "/signup" && method === "POST") {
        return await signupHandler.handler(event);
    } else if (path === "/login" && method === "GET") {
        return await loginHandler.handler(event);
    } else {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Invalid request" }),
        };
    }
};
