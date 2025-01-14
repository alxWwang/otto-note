const { handler } = require('./handler'); 
const mockEvent = {
  body: JSON.stringify({
    username: 'testuser',
    password: 'test@1234',
    email: 'testuser@example.com',
  }),
};

const mockContext = {}; 

const mockCallback = (statusCode: number, body: string) => {
    console.log('StatusCode:', statusCode);
    console.log('Response Body:', body);
  };

handler(mockEvent, mockContext, mockCallback);
