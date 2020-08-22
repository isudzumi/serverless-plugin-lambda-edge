# serverless-plugin-lambda-edge

[![npm version](https://badge.fury.io/js/%40isudzumi%2Fserverless-plugin-lambda-edge.svg)](https://badge.fury.io/js/%40isudzumi%2Fserverless-plugin-lambda-edge)
![publish](https://github.com/isudzumi/serverless-plugin-lambda-edge/workflows/publish/badge.svg)

serverless plugin for Lambda@Edge with using aws-sdk instead of CloudFormation.

This makes it possible for users to associate Lambda functions to your currently working Cloudfront.

## Usage

1. Install the plugin
```sh
npm install --save-dev @isudzumi/serverless-plugin-lambda-edge
```

2. Put the plugin name in your `serverless.yml`

```yml
plugins
  - '@isudzumi/serverless-plugin-lambda-edge'
```

3. Configure you Lambda@Edge properties

```yml
functions
  someFunctionAssociatedWithCloudfront
    name: some-handler-
    handler: function.handler
    eventType: viewer-request    # request/response event type (viewer-request, viewer-response, origin-request, origin-response)
    
custom
  - cloudFrontId: XXX    # your Cloudfront Id
```
