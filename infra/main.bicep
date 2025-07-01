// Parameters
@description('Name of the App Service and App Service Plan')
param appName string = 'c2c-dashboard-${uniqueString(resourceGroup().id)}'

@description('Location for all resources')
param location string = resourceGroup().location

@description('The runtime stack of current web app')
@allowed([
  'NODE|18-lts'
  'NODE|20-lts'
])
param linuxFxVersion string = 'NODE|18-lts'

@description('The pricing tier for the App Service plan')
@allowed([
  'F1'
  'B1'
  'B2'
  'S1'
  'S2'
  'P1v2'
  'P2v2'
])
param sku string = 'B1'

@description('Environment tag for resource organization')
param environmentName string = 'dev'

// Variables
var appServicePlanName = '${appName}-plan'
var webAppName = appName
var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))

// Tags
var tags = {
  'azd-env-name': environmentName
  'azd-service-name': 'web'
  project: 'c2c-dashboard'
  environment: environmentName
}

// App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2024-04-01' = {
  name: '${appServicePlanName}-${resourceToken}'
  location: location
  tags: tags
  sku: {
    name: sku
    tier: sku == 'F1' ? 'Free' : (sku == 'B1' || sku == 'B2') ? 'Basic' : (sku == 'S1' || sku == 'S2') ? 'Standard' : 'PremiumV2'
  }
  kind: 'linux'
  properties: {
    reserved: true
    perSiteScaling: false
    elasticScaleEnabled: false
    maximumElasticWorkerCount: 1
    isSpot: false
    zoneRedundant: false
  }
}

// User Assigned Managed Identity
resource userAssignedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${webAppName}-identity-${resourceToken}'
  location: location
  tags: tags
}

// App Service
resource webApp 'Microsoft.Web/sites@2024-04-01' = {
  name: '${webAppName}-${resourceToken}'
  location: location
  tags: tags
  kind: 'app,linux'
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userAssignedIdentity.id}': {}
    }
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    reserved: true
    clientAffinityEnabled: false
    publicNetworkAccess: 'Enabled'
    siteConfig: {
      linuxFxVersion: linuxFxVersion
      minTlsVersion: '1.2'
      scmMinTlsVersion: '1.2'
      ftpsState: 'FtpsOnly'
      alwaysOn: sku != 'F1' // Always On not available on Free tier
      http20Enabled: true
      webSocketsEnabled: false
      requestTracingEnabled: true
      detailedErrorLoggingEnabled: true
      httpLoggingEnabled: true
      healthCheckPath: '/health'
      autoHealEnabled: true
      autoHealRules: {
        triggers: {
          requests: {
            count: 100
            timeInterval: '00:05:00'
          }
          privateBytesInKB: 0
          statusCodes: [
            {
              status: 500
              subStatus: 0
              win32Status: 0
              count: 10
              timeInterval: '00:05:00'
            }
          ]
        }
        actions: {
          actionType: 'Recycle'
          minProcessExecutionTime: '00:01:00'
        }
      }
      cors: {
        allowedOrigins: ['*']
        supportCredentials: false
      }
      ipSecurityRestrictions: []
      scmIpSecurityRestrictions: []
      appSettings: [
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '18.17.1'
        }
        {
          name: 'NODE_ENV'
          value: 'production'
        }
        {
          name: 'PORT'
          value: '8080'
        }
        {
          name: 'CORS_ORIGIN'
          value: '*'
        }
        {
          name: 'HELMET_ENABLED'
          value: 'true'
        }
        {
          name: 'COMPRESSION_ENABLED'
          value: 'true'
        }
        {
          name: 'LOG_LEVEL'
          value: 'info'
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
      ]
    }
  }
}

// Diagnostic Settings for monitoring
resource diagnosticSettings 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: '${webAppName}-diagnostics'
  scope: webApp
  properties: {
    logs: [
      {
        category: 'AppServiceHTTPLogs'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 7
        }
      }
      {
        category: 'AppServiceConsoleLogs'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 7
        }
      }
      {
        category: 'AppServiceAppLogs'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 7
        }
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 7
        }
      }
    ]
  }
}

// Outputs
@description('The default hostname of the web app')
output webAppUrl string = 'https://${webApp.properties.defaultHostName}'

@description('The name of the web app')
output webAppName string = webApp.name

@description('The resource group name')
output resourceGroupName string = resourceGroup().name

@description('The App Service Plan name')
output appServicePlanName string = appServicePlan.name

@description('The user assigned identity resource ID')
output userAssignedIdentityId string = userAssignedIdentity.id

@description('The user assigned identity client ID')
output userAssignedIdentityClientId string = userAssignedIdentity.properties.clientId
