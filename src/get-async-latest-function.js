const AWS = require('aws-sdk')
const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = process.env

const lambda = new AWS.Lambda({
  apiVersion: '2015-03-31',
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: 'us-east-1' // Lambda@Edge region is currenly 'us-east-1' only
})

const getAsyncLatestFunction = async (functionName) => {
  const functions = await lambda.listVersionsByFunction({
    FunctionName: functionName
  }).promise()
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
    throw Error("Couldn't get latest lambda function")
  }
  return latestFunction
}

module.exports = {
  getAsyncLatestFunction
}
