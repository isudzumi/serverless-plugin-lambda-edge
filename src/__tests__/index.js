const UpdateLambdaFunctionAssociationPlugin = require('../index')

class StubService {
  constructor() {
    this.custom = {
      cloudFrontId: 'XXXX'
    }
    this.functions = {
      functionName1: {
        name: 'function-name-1',
        eventType: 'viewer-request'
      },
      functionName2: {
        name: 'function-name-2',
        eventType: 'origin-request'
      }
    }
  }
}

class StubServerless {
  constructor() {
    this.service = new StubService()
  }

  getProvider(provider) {
    return provider
  }
}

jest.mock('../get-async-latest-function', () => ({
  getAsyncLatestFunction: jest.fn()
    .mockImplementationOnce(() => {
      return Promise.resolve({
        FunctionArn: 'arn:aws:lambda:us-east-1:000:foo'
      })
    })
    .mockImplementationOnce(() => {
      return Promise.resolve({
        FunctionArn: 'arn:aws:lambda:us-east-1:000:bar'
      })
    })
}))

describe('update lambda function association plugin', () => {
  const stubServerless = new StubServerless()
  const plugin = new UpdateLambdaFunctionAssociationPlugin(stubServerless, {})

  it('should contain cloudFrontId', () => {
    expect(plugin.custom).toMatchObject({ cloudFrontId: 'XXXX' })
  })

  it('should contain functions', () => {
    expect(plugin.functions).toMatchObject({
      functionName1: {
        name: 'function-name-1',
        eventType: 'viewer-request'
      },
      functionName2: {
        name: 'function-name-2',
        eventType: 'origin-request'
      }
    })
  })

  test('getAsyncUpdatedLambdaAssociationConfigs', async () => {

    const lambdaAssociationConfigItem = await plugin.getAsyncUpdatedLambdaAssociationConfigItems()
    expect(lambdaAssociationConfigItem).toMatchObject([
      {
        EventType: 'viewer-request',
        LambdaFunctionARN: 'arn:aws:lambda:us-east-1:000:foo',
        IncludeBody: false
      },
      {
        EventType: 'origin-request',
        LambdaFunctionARN: 'arn:aws:lambda:us-east-1:000:bar',
        IncludeBody: false
      }
    ])
  })
})
