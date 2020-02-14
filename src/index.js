const AWS = require('aws-sdk')
const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION } = process.env
const { getAsyncLatestFunction } = require('./get-async-latest-function')

class UpdateLambdaFunctionAssociationPlugin {
  constructor(serverless, options) {
    this.serverless = serverless
    this.provider = serverless.getProvider('aws')
    this.hooks = {
      'after:deploy:deploy': this.updateLambdaFunctionAssociations.bind(this)
    }
    this.custom = this.serverless.service.custom
    this.functions = this.serverless.service.functions
    this.cloudFront = null

    if (!this.custom.cloudFrontId) {
      throw Error("'custom.cloudFrontId' is requied. You must specify it.")
    }
    if (!Object.values(this.functions).every((func) => func.hasOwnProperty('eventType'))) {
      throw Error("'functions.eventType' is requied. You must specify it.")
    }
  }

  updateLambdaFunctionAssociations() {
    this.initCloudFrontAPI()

    Promise.all([
      this.getAsyncCloudFrontConfig(),
      this.getAsyncUpdatedLambdaAssociationConfig()
    ]).then(async ([cloudFrontConfig, lambdaAssociationConfig]) => {
      this.serverless.cli.log('LambdaEdge: Get specified CloudFront distribution config')

      cloudFrontConfig['Id'] = this.custom.cloudFrontId
      cloudFrontConfig['IfMatch'] = cloudFrontConfig['ETag']
      cloudFrontConfig['DistributionConfig']['DefaultCacheBehavior']['LambdaFunctionAssociations'] = lambdaAssociationConfig

      // "updateDistribution" param doesn't need ETag
      delete cloudFrontConfig['ETag']

      await this.updateCloudFrontConfig(cloudFrontConfig)

      this.serverless.cli.log('LambdaEdge: Successfully update lambda function association on CloudFront')
    })
  }

  initCloudFrontAPI() {
    this.cloudFront = new AWS.CloudFront({
      apiVersion: '2019-03-26',
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
      region: AWS_DEFAULT_REGION
    })
  }

  getAsyncCloudFrontConfig() {
    if (!this.cloudFront) {
      throw Error("CloudFront API hasn't still initialized")
    }
    return this.cloudFront.getDistributionConfig({ Id: this.custom.cloudFrontId }).promise()
  }

  getAsyncUpdatedLambdaAssociationConfig() {
    return this.getAsyncUpdatedLambdaAssociationConfigItems()
      .then((items) => ({
        Quantity: items.length,
        Items: items
      }))
  }

  getAsyncUpdatedLambdaAssociationConfigItems() {
    return Promise.all(Object.values(this.functions).map(async ({ name, eventType }) => {
      const latestFunction = await getAsyncLatestFunction(name)
      return {
        EventType: eventType,
        LambdaFunctionARN: latestFunction['FunctionArn'],
        IncludeBody: false
      }
    }))
  }

  updateCloudFrontConfig(cloudFrontConfig) {
    if (!this.cloudFront) {
      throw Error("CloudFront API hasn't still initialized")
    }
    this.cloudFront.updateDistribution(cloudFrontConfig).promise()
  }
}

module.exports = UpdateLambdaFunctionAssociationPlugin
