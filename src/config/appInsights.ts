import * as appInsights from 'applicationinsights'
import 'dotenv/config'

export const setupAppInsights = () => {
  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING

  if (connectionString) {
    appInsights
      .setup(connectionString)
      .setAutoDependencyCorrelation(true)
      .setAutoCollectRequests(true)
      .setAutoCollectPerformance(true, true)
      .setAutoCollectExceptions(true)
      .setAutoCollectDependencies(true)
      .setAutoCollectConsole(true)
      .setSendLiveMetrics(true)
      .start()

    console.log('[server] Azure Application Insights initialized')
  } else {
    console.warn(
      '[server] APPLICATIONINSIGHTS_CONNECTION_STRING not found. Skipping App Insights setup.'
    )
  }
}
