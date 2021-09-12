class UpdateLambdaFunctionAssociationPlugin {
  constructor(serverless, options) {
    this.serverless = serverless
    this.provider = serverless.getProvider('aws')
    this.hooks = {
      'after:deploy:deploy': this.updateLambdaFunctionAssociations.bind(this)
    }
    this.custom = this.serverless.service.custom
    this.functions = this.serverless.service.functions

    if (!this.custom.cloudFrontId) {
      throw new this.serverless.classes.Error("LambdaEdge: 'custom.cloudFrontId' is required. You must specify it.")
    }
    if (!Object.values(this.functions).every((func) => func.hasOwnProperty('eventType'))) {
      throw new this.serverless.classes.Error("LambdaEdge: 'functions.eventType' is required. You must specify it.")
    }
  }

  updateLambdaFunctionAssociations() {
    Promise.all([
      this.getCloudFrontConfig(),
      this.getUpdatedLambdaAssociationConfig()
    ]).then(async ([cloudFrontConfig, lambdaAssociationConfig]) => {
      this.serverless.cli.log('LambdaEdge: Get specified CloudFront distribution config')

      cloudFrontConfig['Id'] = this.custom.cloudFrontId
      cloudFrontConfig['IfMatch'] = cloudFrontConfig['ETag']
      cloudFrontConfig['DistributionConfig']['DefaultCacheBehavior']['LambdaFunctionAssociations'] = lambdaAssociationConfig

      // "CloudFront.updateDistribution" method's param doesn't need ETag
      delete cloudFrontConfig['ETag']

      await this.updateCloudFrontConfig(cloudFrontConfig)

      this.serverless.cli.log('LambdaEdge: Successfully update lambda function association on CloudFront')
    })
  }

  async getCloudFrontConfig() {
    return await this.provider.request('CloudFront', 'getDistributionConfig', { Id: this.custom.cloudFrontId })
  }

  async updateCloudFrontConfig(cloudFrontConfig) {
    if (!cloudFrontConfig) {
      throw new this.serverless.classes.Error('LambdaEdge: Missing CloudFront config')
    }
    return await this.provider.request('CloudFront', 'updateDistribution', cloudFrontConfig)
  }

  async getUpdatedLambdaAssociationConfig() {
    return await this.getUpdatedLambdaAssociationConfigItems()
      .then((items) => ({
        Quantity: items.length,
        Items: items
      }))
  }

  async getLatestFunction(functionName) {
    const functions = await this.provider.request('Lambda', 'listVersionsByFunction', {
      FunctionName: functionName
    })
    const initialData = {Version: '0'}
    const latestFunction = functions['Versions'].reduce((prev, current) => {
      const prevVersion = parseInt(prev['Version'])
      const currentVersion = parseInt(current['Version'])
      if (Number.isNaN(currentVersion)) {
        return prev
      }
      if (prevVersion > currentVersion) {
        return prev
      }
      return current
    }, initialData)
    if (latestFunction['Version'] === initialData['Version']) {
      throw new this.serverless.classes.Error("LambdaEdge: Couldn't get latest lambda function")
    }
    return latestFunction
  }

  async getUpdatedLambdaAssociationConfigItems() {
    return await Promise.all(Object.values(this.functions).map(async ({ name, eventType }) => {
      const latestFunction = await this.getLatestFunction(name)
      return {
        EventType: eventType,
        LambdaFunctionARN: latestFunction['FunctionArn'],
        IncludeBody: false
      }
    }))
  }
}

module.exports = UpdateLambdaFunctionAssociationPlugin
