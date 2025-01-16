"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cx_api_1 = require("@aws-cdk/cx-api");
const client_cloudformation_1 = require("@aws-sdk/client-cloudformation");
const mock_sdk_1 = require("./mock-sdk");
const cloudformation_1 = require("../../lib/api/util/cloudformation");
const PARAM = 'TheParameter';
const DEFAULT = 'TheDefault';
const OVERRIDE = 'TheOverride';
const USE_OVERRIDE = { ParameterKey: PARAM, ParameterValue: OVERRIDE };
const USE_PREVIOUS = { ParameterKey: PARAM, UsePreviousValue: true };
let cfn;
beforeEach(async () => {
    cfn = new mock_sdk_1.MockSdk().cloudFormation();
});
test('A non-existent stack pretends to have an empty template', async () => {
    // GIVEN
    mock_sdk_1.mockCloudFormationClient.on(client_cloudformation_1.DescribeStacksCommand).resolves({
        Stacks: [],
    });
    // WHEN
    const stack = await cloudformation_1.CloudFormationStack.lookup(cfn, 'Dummy');
    // THEN
    expect(await stack.template()).toEqual({});
});
test("Retrieving a processed template passes 'Processed' to CloudFormation", async () => {
    // GIVEN
    mock_sdk_1.mockCloudFormationClient
        .on(client_cloudformation_1.DescribeStacksCommand)
        .resolves({
        Stacks: [
            {
                StackName: 'Dummy',
                StackStatus: client_cloudformation_1.StackStatus.CREATE_COMPLETE,
                CreationTime: new Date(),
            },
        ],
    })
        .on(client_cloudformation_1.GetTemplateCommand)
        .resolves({
        TemplateBody: '',
    });
    // WHEN
    const retrieveProcessedTemplate = true;
    const cloudFormationStack = await cloudformation_1.CloudFormationStack.lookup(cfn, 'Dummy', retrieveProcessedTemplate);
    await cloudFormationStack.template();
    // THEN
    expect(mock_sdk_1.mockCloudFormationClient).toHaveReceivedCommandWith(client_cloudformation_1.GetTemplateCommand, {
        StackName: 'Dummy',
        TemplateStage: 'Processed',
    });
});
test.each([
    [false, false],
    [false, true],
    [true, false],
    [true, true],
])('given override, always use the override (parameter has a default: %p, parameter previously supplied: %p)', (haveDefault, havePrevious) => {
    expect(makeParams(haveDefault, havePrevious, true)).toEqual({
        apiParameters: [USE_OVERRIDE],
        changed: true,
    });
});
test('no default, no prev, no override => error', () => {
    expect(() => makeParams(false, false, false)).toThrow(/missing a value: TheParameter/);
});
test('no default, yes prev, no override => use previous', () => {
    expect(makeParams(false, true, false)).toEqual({
        apiParameters: [USE_PREVIOUS],
        changed: false,
    });
});
test('default, no prev, no override => empty param set (and obviously changes to be applied)', () => {
    expect(makeParams(true, false, false)).toEqual({
        apiParameters: [],
        changed: true,
    });
});
test('default, prev, no override => use previous', () => {
    expect(makeParams(true, true, false)).toEqual({
        apiParameters: [USE_PREVIOUS],
        changed: false,
    });
});
test('if a parameter is retrieved from SSM, the parameters always count as changed', () => {
    const params = cloudformation_1.TemplateParameters.fromTemplate({
        Parameters: {
            Foo: {
                Type: 'AWS::SSM::Parameter::Name',
                Default: '/Some/Key',
            },
        },
    });
    const oldValues = { Foo: '/Some/Key' };
    // If we don't pass a new value
    expect(params.updateExisting({}, oldValues).hasChanges(oldValues)).toEqual('ssm');
    // If we do pass a new value but it's the same as the old one
    expect(params.updateExisting({ Foo: '/Some/Key' }, oldValues).hasChanges(oldValues)).toEqual('ssm');
});
test('if a parameter is retrieved from SSM, the parameters doesnt count as changed if it has the magic marker', () => {
    const params = cloudformation_1.TemplateParameters.fromTemplate({
        Parameters: {
            Foo: {
                Type: 'AWS::SSM::Parameter::Name',
                Default: '/Some/Key',
                Description: `blabla ${cx_api_1.SSMPARAM_NO_INVALIDATE}`,
            },
        },
    });
    const oldValues = { Foo: '/Some/Key' };
    // If we don't pass a new value
    expect(params.updateExisting({}, oldValues).hasChanges(oldValues)).toEqual(false);
    // If we do pass a new value but it's the same as the old one
    expect(params.updateExisting({ Foo: '/Some/Key' }, oldValues).hasChanges(oldValues)).toEqual(false);
    // If we do pass a new value and it's different
    expect(params.updateExisting({ Foo: '/OTHER/Key' }, oldValues).hasChanges(oldValues)).toEqual(true);
});
test('empty string is a valid update value', () => {
    const params = cloudformation_1.TemplateParameters.fromTemplate({
        Parameters: {
            Foo: { Type: 'String', Default: 'Foo' },
        },
    });
    expect(params.updateExisting({ Foo: '' }, { Foo: 'ThisIsOld' }).apiParameters).toEqual([
        { ParameterKey: 'Foo', ParameterValue: '' },
    ]);
});
test('unknown parameter in overrides, pass it anyway', () => {
    // Not sure if we really want this. It seems like it would be nice
    // to not pass parameters that aren't expected, given that CFN will
    // just error out. But maybe we want to be warned of typos...
    const params = cloudformation_1.TemplateParameters.fromTemplate({
        Parameters: {
            Foo: { Type: 'String', Default: 'Foo' },
        },
    });
    expect(params.updateExisting({ Bar: 'Bar' }, {}).apiParameters).toEqual([
        { ParameterKey: 'Bar', ParameterValue: 'Bar' },
    ]);
});
test('if an unsupplied parameter reverts to its default, it can still be dirty', () => {
    // GIVEN
    const templateParams = cloudformation_1.TemplateParameters.fromTemplate({
        Parameters: {
            Foo: { Type: 'String', Default: 'Foo' },
        },
    });
    // WHEN
    const stackParams = templateParams.supplyAll({});
    // THEN
    expect(stackParams.hasChanges({ Foo: 'NonStandard' })).toEqual(true);
    expect(stackParams.hasChanges({ Foo: 'Foo' })).toEqual(false);
});
function makeParams(defaultValue, hasPrevValue, override) {
    const params = cloudformation_1.TemplateParameters.fromTemplate({
        Parameters: {
            [PARAM]: {
                Type: 'String',
                Default: defaultValue ? DEFAULT : undefined,
            },
        },
    });
    const prevParams = hasPrevValue ? { [PARAM]: 'Foo' } : {};
    const stackParams = params.updateExisting({ [PARAM]: override ? OVERRIDE : undefined }, prevParams);
    return { apiParameters: stackParams.apiParameters, changed: stackParams.hasChanges(prevParams) };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xvdWRmb3JtYXRpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNsb3VkZm9ybWF0aW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSw0Q0FBeUQ7QUFDekQsMEVBQXdHO0FBQ3hHLHlDQUErRDtBQUUvRCxzRUFBNEY7QUFFNUYsTUFBTSxLQUFLLEdBQUcsY0FBYyxDQUFDO0FBQzdCLE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQztBQUM3QixNQUFNLFFBQVEsR0FBRyxhQUFhLENBQUM7QUFFL0IsTUFBTSxZQUFZLEdBQUcsRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUFFLGNBQWMsRUFBRSxRQUFRLEVBQUUsQ0FBQztBQUN2RSxNQUFNLFlBQVksR0FBRyxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLENBQUM7QUFFckUsSUFBSSxHQUEwQixDQUFDO0FBRS9CLFVBQVUsQ0FBQyxLQUFLLElBQUksRUFBRTtJQUNwQixHQUFHLEdBQUcsSUFBSSxrQkFBTyxFQUFFLENBQUMsY0FBYyxFQUFFLENBQUM7QUFDdkMsQ0FBQyxDQUFDLENBQUM7QUFFSCxJQUFJLENBQUMseURBQXlELEVBQUUsS0FBSyxJQUFJLEVBQUU7SUFDekUsUUFBUTtJQUNSLG1DQUF3QixDQUFDLEVBQUUsQ0FBQyw2Q0FBcUIsQ0FBQyxDQUFDLFFBQVEsQ0FBQztRQUMxRCxNQUFNLEVBQUUsRUFBRTtLQUNYLENBQUMsQ0FBQztJQUVILE9BQU87SUFDUCxNQUFNLEtBQUssR0FBRyxNQUFNLG9DQUFtQixDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFFN0QsT0FBTztJQUNQLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUM3QyxDQUFDLENBQUMsQ0FBQztBQUVILElBQUksQ0FBQyxzRUFBc0UsRUFBRSxLQUFLLElBQUksRUFBRTtJQUN0RixRQUFRO0lBQ1IsbUNBQXdCO1NBQ3JCLEVBQUUsQ0FBQyw2Q0FBcUIsQ0FBQztTQUN6QixRQUFRLENBQUM7UUFDUixNQUFNLEVBQUU7WUFDTjtnQkFDRSxTQUFTLEVBQUUsT0FBTztnQkFDbEIsV0FBVyxFQUFFLG1DQUFXLENBQUMsZUFBZTtnQkFDeEMsWUFBWSxFQUFFLElBQUksSUFBSSxFQUFFO2FBQ3pCO1NBQ0Y7S0FDRixDQUFDO1NBQ0QsRUFBRSxDQUFDLDBDQUFrQixDQUFDO1NBQ3RCLFFBQVEsQ0FBQztRQUNSLFlBQVksRUFBRSxFQUFFO0tBQ2pCLENBQUMsQ0FBQztJQUVMLE9BQU87SUFDUCxNQUFNLHlCQUF5QixHQUFHLElBQUksQ0FBQztJQUN2QyxNQUFNLG1CQUFtQixHQUFHLE1BQU0sb0NBQW1CLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUseUJBQXlCLENBQUMsQ0FBQztJQUN0RyxNQUFNLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxDQUFDO0lBRXJDLE9BQU87SUFDUCxNQUFNLENBQUMsbUNBQXdCLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQywwQ0FBa0IsRUFBRTtRQUM3RSxTQUFTLEVBQUUsT0FBTztRQUNsQixhQUFhLEVBQUUsV0FBVztLQUMzQixDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQztBQUVILElBQUksQ0FBQyxJQUFJLENBQUM7SUFDUixDQUFDLEtBQUssRUFBRSxLQUFLLENBQUM7SUFDZCxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUM7SUFDYixDQUFDLElBQUksRUFBRSxLQUFLLENBQUM7SUFDYixDQUFDLElBQUksRUFBRSxJQUFJLENBQUM7Q0FDYixDQUFDLENBQ0EsMEdBQTBHLEVBQzFHLENBQUMsV0FBVyxFQUFFLFlBQVksRUFBRSxFQUFFO0lBQzVCLE1BQU0sQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztRQUMxRCxhQUFhLEVBQUUsQ0FBQyxZQUFZLENBQUM7UUFDN0IsT0FBTyxFQUFFLElBQUk7S0FDZCxDQUFDLENBQUM7QUFDTCxDQUFDLENBQ0YsQ0FBQztBQUVGLElBQUksQ0FBQywyQ0FBMkMsRUFBRSxHQUFHLEVBQUU7SUFDckQsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLCtCQUErQixDQUFDLENBQUM7QUFDekYsQ0FBQyxDQUFDLENBQUM7QUFFSCxJQUFJLENBQUMsbURBQW1ELEVBQUUsR0FBRyxFQUFFO0lBQzdELE1BQU0sQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztRQUM3QyxhQUFhLEVBQUUsQ0FBQyxZQUFZLENBQUM7UUFDN0IsT0FBTyxFQUFFLEtBQUs7S0FDZixDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQztBQUVILElBQUksQ0FBQyx3RkFBd0YsRUFBRSxHQUFHLEVBQUU7SUFDbEcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQzdDLGFBQWEsRUFBRSxFQUFFO1FBQ2pCLE9BQU8sRUFBRSxJQUFJO0tBQ2QsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUM7QUFFSCxJQUFJLENBQUMsNENBQTRDLEVBQUUsR0FBRyxFQUFFO0lBQ3RELE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztRQUM1QyxhQUFhLEVBQUUsQ0FBQyxZQUFZLENBQUM7UUFDN0IsT0FBTyxFQUFFLEtBQUs7S0FDZixDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQztBQUVILElBQUksQ0FBQyw4RUFBOEUsRUFBRSxHQUFHLEVBQUU7SUFDeEYsTUFBTSxNQUFNLEdBQUcsbUNBQWtCLENBQUMsWUFBWSxDQUFDO1FBQzdDLFVBQVUsRUFBRTtZQUNWLEdBQUcsRUFBRTtnQkFDSCxJQUFJLEVBQUUsMkJBQTJCO2dCQUNqQyxPQUFPLEVBQUUsV0FBVzthQUNyQjtTQUNGO0tBQ0YsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxTQUFTLEdBQUcsRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUFFLENBQUM7SUFFdkMsK0JBQStCO0lBQy9CLE1BQU0sQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFFbEYsNkRBQTZEO0lBQzdELE1BQU0sQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLEVBQUUsR0FBRyxFQUFFLFdBQVcsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN0RyxDQUFDLENBQUMsQ0FBQztBQUVILElBQUksQ0FBQyx5R0FBeUcsRUFBRSxHQUFHLEVBQUU7SUFDbkgsTUFBTSxNQUFNLEdBQUcsbUNBQWtCLENBQUMsWUFBWSxDQUFDO1FBQzdDLFVBQVUsRUFBRTtZQUNWLEdBQUcsRUFBRTtnQkFDSCxJQUFJLEVBQUUsMkJBQTJCO2dCQUNqQyxPQUFPLEVBQUUsV0FBVztnQkFDcEIsV0FBVyxFQUFFLFVBQVUsK0JBQXNCLEVBQUU7YUFDaEQ7U0FDRjtLQUNGLENBQUMsQ0FBQztJQUNILE1BQU0sU0FBUyxHQUFHLEVBQUUsR0FBRyxFQUFFLFdBQVcsRUFBRSxDQUFDO0lBRXZDLCtCQUErQjtJQUMvQixNQUFNLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRWxGLDZEQUE2RDtJQUM3RCxNQUFNLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxXQUFXLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFFcEcsK0NBQStDO0lBQy9DLE1BQU0sQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLEVBQUUsR0FBRyxFQUFFLFlBQVksRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN0RyxDQUFDLENBQUMsQ0FBQztBQUVILElBQUksQ0FBQyxzQ0FBc0MsRUFBRSxHQUFHLEVBQUU7SUFDaEQsTUFBTSxNQUFNLEdBQUcsbUNBQWtCLENBQUMsWUFBWSxDQUFDO1FBQzdDLFVBQVUsRUFBRTtZQUNWLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRTtTQUN4QztLQUNGLENBQUMsQ0FBQztJQUVILE1BQU0sQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQ3JGLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsRUFBRSxFQUFFO0tBQzVDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDO0FBRUgsSUFBSSxDQUFDLGdEQUFnRCxFQUFFLEdBQUcsRUFBRTtJQUMxRCxrRUFBa0U7SUFDbEUsbUVBQW1FO0lBQ25FLDZEQUE2RDtJQUM3RCxNQUFNLE1BQU0sR0FBRyxtQ0FBa0IsQ0FBQyxZQUFZLENBQUM7UUFDN0MsVUFBVSxFQUFFO1lBQ1YsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFO1NBQ3hDO0tBQ0YsQ0FBQyxDQUFDO0lBRUgsTUFBTSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQ3RFLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFO0tBQy9DLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDO0FBRUgsSUFBSSxDQUFDLDBFQUEwRSxFQUFFLEdBQUcsRUFBRTtJQUNwRixRQUFRO0lBQ1IsTUFBTSxjQUFjLEdBQUcsbUNBQWtCLENBQUMsWUFBWSxDQUFDO1FBQ3JELFVBQVUsRUFBRTtZQUNWLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRTtTQUN4QztLQUNGLENBQUMsQ0FBQztJQUVILE9BQU87SUFDUCxNQUFNLFdBQVcsR0FBRyxjQUFjLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBRWpELE9BQU87SUFDUCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxhQUFhLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDaEUsQ0FBQyxDQUFDLENBQUM7QUFFSCxTQUFTLFVBQVUsQ0FBQyxZQUFxQixFQUFFLFlBQXFCLEVBQUUsUUFBaUI7SUFDakYsTUFBTSxNQUFNLEdBQUcsbUNBQWtCLENBQUMsWUFBWSxDQUFDO1FBQzdDLFVBQVUsRUFBRTtZQUNWLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ1AsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTO2FBQzVDO1NBQ0Y7S0FDRixDQUFDLENBQUM7SUFDSCxNQUFNLFVBQVUsR0FBMkIsWUFBWSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUNsRixNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFFcEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxXQUFXLENBQUMsYUFBYSxFQUFFLE9BQU8sRUFBRSxXQUFXLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7QUFDbkcsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFNTTVBBUkFNX05PX0lOVkFMSURBVEUgfSBmcm9tICdAYXdzLWNkay9jeC1hcGknO1xuaW1wb3J0IHsgRGVzY3JpYmVTdGFja3NDb21tYW5kLCBHZXRUZW1wbGF0ZUNvbW1hbmQsIFN0YWNrU3RhdHVzIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWNsb3VkZm9ybWF0aW9uJztcbmltcG9ydCB7IE1vY2tTZGssIG1vY2tDbG91ZEZvcm1hdGlvbkNsaWVudCB9IGZyb20gJy4vbW9jay1zZGsnO1xuaW1wb3J0IHR5cGUgeyBJQ2xvdWRGb3JtYXRpb25DbGllbnQgfSBmcm9tICcuLi8uLi9saWInO1xuaW1wb3J0IHsgQ2xvdWRGb3JtYXRpb25TdGFjaywgVGVtcGxhdGVQYXJhbWV0ZXJzIH0gZnJvbSAnLi4vLi4vbGliL2FwaS91dGlsL2Nsb3VkZm9ybWF0aW9uJztcblxuY29uc3QgUEFSQU0gPSAnVGhlUGFyYW1ldGVyJztcbmNvbnN0IERFRkFVTFQgPSAnVGhlRGVmYXVsdCc7XG5jb25zdCBPVkVSUklERSA9ICdUaGVPdmVycmlkZSc7XG5cbmNvbnN0IFVTRV9PVkVSUklERSA9IHsgUGFyYW1ldGVyS2V5OiBQQVJBTSwgUGFyYW1ldGVyVmFsdWU6IE9WRVJSSURFIH07XG5jb25zdCBVU0VfUFJFVklPVVMgPSB7IFBhcmFtZXRlcktleTogUEFSQU0sIFVzZVByZXZpb3VzVmFsdWU6IHRydWUgfTtcblxubGV0IGNmbjogSUNsb3VkRm9ybWF0aW9uQ2xpZW50O1xuXG5iZWZvcmVFYWNoKGFzeW5jICgpID0+IHtcbiAgY2ZuID0gbmV3IE1vY2tTZGsoKS5jbG91ZEZvcm1hdGlvbigpO1xufSk7XG5cbnRlc3QoJ0Egbm9uLWV4aXN0ZW50IHN0YWNrIHByZXRlbmRzIHRvIGhhdmUgYW4gZW1wdHkgdGVtcGxhdGUnLCBhc3luYyAoKSA9PiB7XG4gIC8vIEdJVkVOXG4gIG1vY2tDbG91ZEZvcm1hdGlvbkNsaWVudC5vbihEZXNjcmliZVN0YWNrc0NvbW1hbmQpLnJlc29sdmVzKHtcbiAgICBTdGFja3M6IFtdLFxuICB9KTtcblxuICAvLyBXSEVOXG4gIGNvbnN0IHN0YWNrID0gYXdhaXQgQ2xvdWRGb3JtYXRpb25TdGFjay5sb29rdXAoY2ZuLCAnRHVtbXknKTtcblxuICAvLyBUSEVOXG4gIGV4cGVjdChhd2FpdCBzdGFjay50ZW1wbGF0ZSgpKS50b0VxdWFsKHt9KTtcbn0pO1xuXG50ZXN0KFwiUmV0cmlldmluZyBhIHByb2Nlc3NlZCB0ZW1wbGF0ZSBwYXNzZXMgJ1Byb2Nlc3NlZCcgdG8gQ2xvdWRGb3JtYXRpb25cIiwgYXN5bmMgKCkgPT4ge1xuICAvLyBHSVZFTlxuICBtb2NrQ2xvdWRGb3JtYXRpb25DbGllbnRcbiAgICAub24oRGVzY3JpYmVTdGFja3NDb21tYW5kKVxuICAgIC5yZXNvbHZlcyh7XG4gICAgICBTdGFja3M6IFtcbiAgICAgICAge1xuICAgICAgICAgIFN0YWNrTmFtZTogJ0R1bW15JyxcbiAgICAgICAgICBTdGFja1N0YXR1czogU3RhY2tTdGF0dXMuQ1JFQVRFX0NPTVBMRVRFLFxuICAgICAgICAgIENyZWF0aW9uVGltZTogbmV3IERhdGUoKSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSlcbiAgICAub24oR2V0VGVtcGxhdGVDb21tYW5kKVxuICAgIC5yZXNvbHZlcyh7XG4gICAgICBUZW1wbGF0ZUJvZHk6ICcnLFxuICAgIH0pO1xuXG4gIC8vIFdIRU5cbiAgY29uc3QgcmV0cmlldmVQcm9jZXNzZWRUZW1wbGF0ZSA9IHRydWU7XG4gIGNvbnN0IGNsb3VkRm9ybWF0aW9uU3RhY2sgPSBhd2FpdCBDbG91ZEZvcm1hdGlvblN0YWNrLmxvb2t1cChjZm4sICdEdW1teScsIHJldHJpZXZlUHJvY2Vzc2VkVGVtcGxhdGUpO1xuICBhd2FpdCBjbG91ZEZvcm1hdGlvblN0YWNrLnRlbXBsYXRlKCk7XG5cbiAgLy8gVEhFTlxuICBleHBlY3QobW9ja0Nsb3VkRm9ybWF0aW9uQ2xpZW50KS50b0hhdmVSZWNlaXZlZENvbW1hbmRXaXRoKEdldFRlbXBsYXRlQ29tbWFuZCwge1xuICAgIFN0YWNrTmFtZTogJ0R1bW15JyxcbiAgICBUZW1wbGF0ZVN0YWdlOiAnUHJvY2Vzc2VkJyxcbiAgfSk7XG59KTtcblxudGVzdC5lYWNoKFtcbiAgW2ZhbHNlLCBmYWxzZV0sXG4gIFtmYWxzZSwgdHJ1ZV0sXG4gIFt0cnVlLCBmYWxzZV0sXG4gIFt0cnVlLCB0cnVlXSxcbl0pKFxuICAnZ2l2ZW4gb3ZlcnJpZGUsIGFsd2F5cyB1c2UgdGhlIG92ZXJyaWRlIChwYXJhbWV0ZXIgaGFzIGEgZGVmYXVsdDogJXAsIHBhcmFtZXRlciBwcmV2aW91c2x5IHN1cHBsaWVkOiAlcCknLFxuICAoaGF2ZURlZmF1bHQsIGhhdmVQcmV2aW91cykgPT4ge1xuICAgIGV4cGVjdChtYWtlUGFyYW1zKGhhdmVEZWZhdWx0LCBoYXZlUHJldmlvdXMsIHRydWUpKS50b0VxdWFsKHtcbiAgICAgIGFwaVBhcmFtZXRlcnM6IFtVU0VfT1ZFUlJJREVdLFxuICAgICAgY2hhbmdlZDogdHJ1ZSxcbiAgICB9KTtcbiAgfSxcbik7XG5cbnRlc3QoJ25vIGRlZmF1bHQsIG5vIHByZXYsIG5vIG92ZXJyaWRlID0+IGVycm9yJywgKCkgPT4ge1xuICBleHBlY3QoKCkgPT4gbWFrZVBhcmFtcyhmYWxzZSwgZmFsc2UsIGZhbHNlKSkudG9UaHJvdygvbWlzc2luZyBhIHZhbHVlOiBUaGVQYXJhbWV0ZXIvKTtcbn0pO1xuXG50ZXN0KCdubyBkZWZhdWx0LCB5ZXMgcHJldiwgbm8gb3ZlcnJpZGUgPT4gdXNlIHByZXZpb3VzJywgKCkgPT4ge1xuICBleHBlY3QobWFrZVBhcmFtcyhmYWxzZSwgdHJ1ZSwgZmFsc2UpKS50b0VxdWFsKHtcbiAgICBhcGlQYXJhbWV0ZXJzOiBbVVNFX1BSRVZJT1VTXSxcbiAgICBjaGFuZ2VkOiBmYWxzZSxcbiAgfSk7XG59KTtcblxudGVzdCgnZGVmYXVsdCwgbm8gcHJldiwgbm8gb3ZlcnJpZGUgPT4gZW1wdHkgcGFyYW0gc2V0IChhbmQgb2J2aW91c2x5IGNoYW5nZXMgdG8gYmUgYXBwbGllZCknLCAoKSA9PiB7XG4gIGV4cGVjdChtYWtlUGFyYW1zKHRydWUsIGZhbHNlLCBmYWxzZSkpLnRvRXF1YWwoe1xuICAgIGFwaVBhcmFtZXRlcnM6IFtdLFxuICAgIGNoYW5nZWQ6IHRydWUsXG4gIH0pO1xufSk7XG5cbnRlc3QoJ2RlZmF1bHQsIHByZXYsIG5vIG92ZXJyaWRlID0+IHVzZSBwcmV2aW91cycsICgpID0+IHtcbiAgZXhwZWN0KG1ha2VQYXJhbXModHJ1ZSwgdHJ1ZSwgZmFsc2UpKS50b0VxdWFsKHtcbiAgICBhcGlQYXJhbWV0ZXJzOiBbVVNFX1BSRVZJT1VTXSxcbiAgICBjaGFuZ2VkOiBmYWxzZSxcbiAgfSk7XG59KTtcblxudGVzdCgnaWYgYSBwYXJhbWV0ZXIgaXMgcmV0cmlldmVkIGZyb20gU1NNLCB0aGUgcGFyYW1ldGVycyBhbHdheXMgY291bnQgYXMgY2hhbmdlZCcsICgpID0+IHtcbiAgY29uc3QgcGFyYW1zID0gVGVtcGxhdGVQYXJhbWV0ZXJzLmZyb21UZW1wbGF0ZSh7XG4gICAgUGFyYW1ldGVyczoge1xuICAgICAgRm9vOiB7XG4gICAgICAgIFR5cGU6ICdBV1M6OlNTTTo6UGFyYW1ldGVyOjpOYW1lJyxcbiAgICAgICAgRGVmYXVsdDogJy9Tb21lL0tleScsXG4gICAgICB9LFxuICAgIH0sXG4gIH0pO1xuICBjb25zdCBvbGRWYWx1ZXMgPSB7IEZvbzogJy9Tb21lL0tleScgfTtcblxuICAvLyBJZiB3ZSBkb24ndCBwYXNzIGEgbmV3IHZhbHVlXG4gIGV4cGVjdChwYXJhbXMudXBkYXRlRXhpc3Rpbmcoe30sIG9sZFZhbHVlcykuaGFzQ2hhbmdlcyhvbGRWYWx1ZXMpKS50b0VxdWFsKCdzc20nKTtcblxuICAvLyBJZiB3ZSBkbyBwYXNzIGEgbmV3IHZhbHVlIGJ1dCBpdCdzIHRoZSBzYW1lIGFzIHRoZSBvbGQgb25lXG4gIGV4cGVjdChwYXJhbXMudXBkYXRlRXhpc3RpbmcoeyBGb286ICcvU29tZS9LZXknIH0sIG9sZFZhbHVlcykuaGFzQ2hhbmdlcyhvbGRWYWx1ZXMpKS50b0VxdWFsKCdzc20nKTtcbn0pO1xuXG50ZXN0KCdpZiBhIHBhcmFtZXRlciBpcyByZXRyaWV2ZWQgZnJvbSBTU00sIHRoZSBwYXJhbWV0ZXJzIGRvZXNudCBjb3VudCBhcyBjaGFuZ2VkIGlmIGl0IGhhcyB0aGUgbWFnaWMgbWFya2VyJywgKCkgPT4ge1xuICBjb25zdCBwYXJhbXMgPSBUZW1wbGF0ZVBhcmFtZXRlcnMuZnJvbVRlbXBsYXRlKHtcbiAgICBQYXJhbWV0ZXJzOiB7XG4gICAgICBGb286IHtcbiAgICAgICAgVHlwZTogJ0FXUzo6U1NNOjpQYXJhbWV0ZXI6Ok5hbWUnLFxuICAgICAgICBEZWZhdWx0OiAnL1NvbWUvS2V5JyxcbiAgICAgICAgRGVzY3JpcHRpb246IGBibGFibGEgJHtTU01QQVJBTV9OT19JTlZBTElEQVRFfWAsXG4gICAgICB9LFxuICAgIH0sXG4gIH0pO1xuICBjb25zdCBvbGRWYWx1ZXMgPSB7IEZvbzogJy9Tb21lL0tleScgfTtcblxuICAvLyBJZiB3ZSBkb24ndCBwYXNzIGEgbmV3IHZhbHVlXG4gIGV4cGVjdChwYXJhbXMudXBkYXRlRXhpc3Rpbmcoe30sIG9sZFZhbHVlcykuaGFzQ2hhbmdlcyhvbGRWYWx1ZXMpKS50b0VxdWFsKGZhbHNlKTtcblxuICAvLyBJZiB3ZSBkbyBwYXNzIGEgbmV3IHZhbHVlIGJ1dCBpdCdzIHRoZSBzYW1lIGFzIHRoZSBvbGQgb25lXG4gIGV4cGVjdChwYXJhbXMudXBkYXRlRXhpc3RpbmcoeyBGb286ICcvU29tZS9LZXknIH0sIG9sZFZhbHVlcykuaGFzQ2hhbmdlcyhvbGRWYWx1ZXMpKS50b0VxdWFsKGZhbHNlKTtcblxuICAvLyBJZiB3ZSBkbyBwYXNzIGEgbmV3IHZhbHVlIGFuZCBpdCdzIGRpZmZlcmVudFxuICBleHBlY3QocGFyYW1zLnVwZGF0ZUV4aXN0aW5nKHsgRm9vOiAnL09USEVSL0tleScgfSwgb2xkVmFsdWVzKS5oYXNDaGFuZ2VzKG9sZFZhbHVlcykpLnRvRXF1YWwodHJ1ZSk7XG59KTtcblxudGVzdCgnZW1wdHkgc3RyaW5nIGlzIGEgdmFsaWQgdXBkYXRlIHZhbHVlJywgKCkgPT4ge1xuICBjb25zdCBwYXJhbXMgPSBUZW1wbGF0ZVBhcmFtZXRlcnMuZnJvbVRlbXBsYXRlKHtcbiAgICBQYXJhbWV0ZXJzOiB7XG4gICAgICBGb286IHsgVHlwZTogJ1N0cmluZycsIERlZmF1bHQ6ICdGb28nIH0sXG4gICAgfSxcbiAgfSk7XG5cbiAgZXhwZWN0KHBhcmFtcy51cGRhdGVFeGlzdGluZyh7IEZvbzogJycgfSwgeyBGb286ICdUaGlzSXNPbGQnIH0pLmFwaVBhcmFtZXRlcnMpLnRvRXF1YWwoW1xuICAgIHsgUGFyYW1ldGVyS2V5OiAnRm9vJywgUGFyYW1ldGVyVmFsdWU6ICcnIH0sXG4gIF0pO1xufSk7XG5cbnRlc3QoJ3Vua25vd24gcGFyYW1ldGVyIGluIG92ZXJyaWRlcywgcGFzcyBpdCBhbnl3YXknLCAoKSA9PiB7XG4gIC8vIE5vdCBzdXJlIGlmIHdlIHJlYWxseSB3YW50IHRoaXMuIEl0IHNlZW1zIGxpa2UgaXQgd291bGQgYmUgbmljZVxuICAvLyB0byBub3QgcGFzcyBwYXJhbWV0ZXJzIHRoYXQgYXJlbid0IGV4cGVjdGVkLCBnaXZlbiB0aGF0IENGTiB3aWxsXG4gIC8vIGp1c3QgZXJyb3Igb3V0LiBCdXQgbWF5YmUgd2Ugd2FudCB0byBiZSB3YXJuZWQgb2YgdHlwb3MuLi5cbiAgY29uc3QgcGFyYW1zID0gVGVtcGxhdGVQYXJhbWV0ZXJzLmZyb21UZW1wbGF0ZSh7XG4gICAgUGFyYW1ldGVyczoge1xuICAgICAgRm9vOiB7IFR5cGU6ICdTdHJpbmcnLCBEZWZhdWx0OiAnRm9vJyB9LFxuICAgIH0sXG4gIH0pO1xuXG4gIGV4cGVjdChwYXJhbXMudXBkYXRlRXhpc3RpbmcoeyBCYXI6ICdCYXInIH0sIHt9KS5hcGlQYXJhbWV0ZXJzKS50b0VxdWFsKFtcbiAgICB7IFBhcmFtZXRlcktleTogJ0JhcicsIFBhcmFtZXRlclZhbHVlOiAnQmFyJyB9LFxuICBdKTtcbn0pO1xuXG50ZXN0KCdpZiBhbiB1bnN1cHBsaWVkIHBhcmFtZXRlciByZXZlcnRzIHRvIGl0cyBkZWZhdWx0LCBpdCBjYW4gc3RpbGwgYmUgZGlydHknLCAoKSA9PiB7XG4gIC8vIEdJVkVOXG4gIGNvbnN0IHRlbXBsYXRlUGFyYW1zID0gVGVtcGxhdGVQYXJhbWV0ZXJzLmZyb21UZW1wbGF0ZSh7XG4gICAgUGFyYW1ldGVyczoge1xuICAgICAgRm9vOiB7IFR5cGU6ICdTdHJpbmcnLCBEZWZhdWx0OiAnRm9vJyB9LFxuICAgIH0sXG4gIH0pO1xuXG4gIC8vIFdIRU5cbiAgY29uc3Qgc3RhY2tQYXJhbXMgPSB0ZW1wbGF0ZVBhcmFtcy5zdXBwbHlBbGwoe30pO1xuXG4gIC8vIFRIRU5cbiAgZXhwZWN0KHN0YWNrUGFyYW1zLmhhc0NoYW5nZXMoeyBGb286ICdOb25TdGFuZGFyZCcgfSkpLnRvRXF1YWwodHJ1ZSk7XG4gIGV4cGVjdChzdGFja1BhcmFtcy5oYXNDaGFuZ2VzKHsgRm9vOiAnRm9vJyB9KSkudG9FcXVhbChmYWxzZSk7XG59KTtcblxuZnVuY3Rpb24gbWFrZVBhcmFtcyhkZWZhdWx0VmFsdWU6IGJvb2xlYW4sIGhhc1ByZXZWYWx1ZTogYm9vbGVhbiwgb3ZlcnJpZGU6IGJvb2xlYW4pIHtcbiAgY29uc3QgcGFyYW1zID0gVGVtcGxhdGVQYXJhbWV0ZXJzLmZyb21UZW1wbGF0ZSh7XG4gICAgUGFyYW1ldGVyczoge1xuICAgICAgW1BBUkFNXToge1xuICAgICAgICBUeXBlOiAnU3RyaW5nJyxcbiAgICAgICAgRGVmYXVsdDogZGVmYXVsdFZhbHVlID8gREVGQVVMVCA6IHVuZGVmaW5lZCxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSk7XG4gIGNvbnN0IHByZXZQYXJhbXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSBoYXNQcmV2VmFsdWUgPyB7IFtQQVJBTV06ICdGb28nIH0gOiB7fTtcbiAgY29uc3Qgc3RhY2tQYXJhbXMgPSBwYXJhbXMudXBkYXRlRXhpc3RpbmcoeyBbUEFSQU1dOiBvdmVycmlkZSA/IE9WRVJSSURFIDogdW5kZWZpbmVkIH0sIHByZXZQYXJhbXMpO1xuXG4gIHJldHVybiB7IGFwaVBhcmFtZXRlcnM6IHN0YWNrUGFyYW1zLmFwaVBhcmFtZXRlcnMsIGNoYW5nZWQ6IHN0YWNrUGFyYW1zLmhhc0NoYW5nZXMocHJldlBhcmFtcykgfTtcbn1cbiJdfQ==