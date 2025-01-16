"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const error_1 = require("../lib/toolkit/error");
describe('toolkit error', () => {
    let toolkitError = new error_1.ToolkitError('Test toolkit error');
    let authError = new error_1.AuthenticationError('Test authentication error');
    test('types are correctly assigned', async () => {
        expect(toolkitError.type).toBe('toolkit');
        expect(authError.type).toBe('authentication');
    });
    test('isToolkitError and isAuthenticationError functions work', () => {
        expect(error_1.ToolkitError.isToolkitError(toolkitError)).toBe(true);
        expect(error_1.ToolkitError.isToolkitError(authError)).toBe(true);
        expect(error_1.ToolkitError.isAuthenticationError(toolkitError)).toBe(false);
        expect(error_1.ToolkitError.isAuthenticationError(authError)).toBe(true);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbGtpdC1lcnJvci50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidG9vbGtpdC1lcnJvci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsZ0RBQXlFO0FBRXpFLFFBQVEsQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO0lBQzdCLElBQUksWUFBWSxHQUFHLElBQUksb0JBQVksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBQzFELElBQUksU0FBUyxHQUFHLElBQUksMkJBQW1CLENBQUMsMkJBQTJCLENBQUMsQ0FBQztJQUNyRSxJQUFJLENBQUMsOEJBQThCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDOUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDMUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUNoRCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx5REFBeUQsRUFBRSxHQUFHLEVBQUU7UUFDbkUsTUFBTSxDQUFDLG9CQUFZLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdELE1BQU0sQ0FBQyxvQkFBWSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxRCxNQUFNLENBQUMsb0JBQVksQ0FBQyxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNyRSxNQUFNLENBQUMsb0JBQVksQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNuRSxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXV0aGVudGljYXRpb25FcnJvciwgVG9vbGtpdEVycm9yIH0gZnJvbSAnLi4vbGliL3Rvb2xraXQvZXJyb3InO1xuXG5kZXNjcmliZSgndG9vbGtpdCBlcnJvcicsICgpID0+IHtcbiAgbGV0IHRvb2xraXRFcnJvciA9IG5ldyBUb29sa2l0RXJyb3IoJ1Rlc3QgdG9vbGtpdCBlcnJvcicpO1xuICBsZXQgYXV0aEVycm9yID0gbmV3IEF1dGhlbnRpY2F0aW9uRXJyb3IoJ1Rlc3QgYXV0aGVudGljYXRpb24gZXJyb3InKTtcbiAgdGVzdCgndHlwZXMgYXJlIGNvcnJlY3RseSBhc3NpZ25lZCcsIGFzeW5jICgpID0+IHtcbiAgICBleHBlY3QodG9vbGtpdEVycm9yLnR5cGUpLnRvQmUoJ3Rvb2xraXQnKTtcbiAgICBleHBlY3QoYXV0aEVycm9yLnR5cGUpLnRvQmUoJ2F1dGhlbnRpY2F0aW9uJyk7XG4gIH0pO1xuXG4gIHRlc3QoJ2lzVG9vbGtpdEVycm9yIGFuZCBpc0F1dGhlbnRpY2F0aW9uRXJyb3IgZnVuY3Rpb25zIHdvcmsnLCAoKSA9PiB7XG4gICAgZXhwZWN0KFRvb2xraXRFcnJvci5pc1Rvb2xraXRFcnJvcih0b29sa2l0RXJyb3IpKS50b0JlKHRydWUpO1xuICAgIGV4cGVjdChUb29sa2l0RXJyb3IuaXNUb29sa2l0RXJyb3IoYXV0aEVycm9yKSkudG9CZSh0cnVlKTtcbiAgICBleHBlY3QoVG9vbGtpdEVycm9yLmlzQXV0aGVudGljYXRpb25FcnJvcih0b29sa2l0RXJyb3IpKS50b0JlKGZhbHNlKTtcbiAgICBleHBlY3QoVG9vbGtpdEVycm9yLmlzQXV0aGVudGljYXRpb25FcnJvcihhdXRoRXJyb3IpKS50b0JlKHRydWUpO1xuICB9KTtcbn0pO1xuIl19