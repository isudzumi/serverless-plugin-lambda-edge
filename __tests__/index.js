const UpdateLambdaFunctionAssociationPlugin = require('../src/index.js')

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

const lambdaListVersionsByFunction = (functionName) => ({
  NextMarker: null,
  Versions: [
    {
      FunctionName: functionName,
      FunctionArn: `arn:aws:lambda:us-east-1:000:function:${functionName}:$LATEST`,
      Version: '$LATEST',
    },
    {
      FunctionName: 'promotion-lp-lambda-edge-redirection',
      FunctionArn: `arn:aws:lambda:us-east-1:000:function:${functionName}:1`,
      Version: '1',
    },
    {
      FunctionName: 'promotion-lp-lambda-edge-redirection',
      FunctionArn: `arn:aws:lambda:us-east-1:000:function:${functionName}:2`,
      Version: '2',
    },
    {
      FunctionName: 'promotion-lp-lambda-edge-redirection',
      FunctionArn: `arn:aws:lambda:us-east-1:000:function:${functionName}:3`,
      Version: '3',
    }
  ]
});

const isLambdaListVersionsByFunction = (service, method, params, options) => {
  return service.toLowerCase() === 'lambda' &&
    method === 'listVersionsByFunction' &&
    'FunctionName' in params
}

class StubProvider {
  request(service, method, params, options) {
    if (isLambdaListVersionsByFunction(service, method, params, options)) {
      return lambdaListVersionsByFunction(params.FunctionName)
    }
  }
}

class StubServerless {
  constructor() {
    this.service = new StubService()
  }

  getProvider(_) {
    return new StubProvider()
  }
}

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

  test('getUpdatedLambdaAssociationConfigs', async () => {

    const lambdaAssociationConfigItem = await plugin.getUpdatedLambdaAssociationConfigItems()
    expect(lambdaAssociationConfigItem).toMatchObject([
      {
        EventType: 'viewer-request',
        LambdaFunctionARN: 'arn:aws:lambda:us-east-1:000:function:function-name-1:3',
        IncludeBody: false
      },
      {
        EventType: 'origin-request',
        LambdaFunctionARN: 'arn:aws:lambda:us-east-1:000:function:function-name-2:3',
        IncludeBody: false
      }
    ])
  })
})
