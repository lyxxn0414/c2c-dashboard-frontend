# Azure App Service 部署脚本
# 此脚本将创建 App Service 并部署 C2C Dashboard 应用

# 设置变量 - 请根据需要修改这些值
$resourceGroupName = "rg-c2c-dashboard"
$location = "East US"
$appServicePlanName = "plan-c2c-dashboard"
$webAppName = "c2c-dashboard-$(Get-Random -Minimum 1000 -Maximum 9999)"
$sku = "B1"

Write-Host "开始创建 Azure 资源..." -ForegroundColor Green

# 1. 创建资源组
Write-Host "创建资源组: $resourceGroupName" -ForegroundColor Yellow
az group create --name $resourceGroupName --location $location

# 2. 创建 App Service Plan
Write-Host "创建 App Service Plan: $appServicePlanName" -ForegroundColor Yellow
az appservice plan create `
    --name $appServicePlanName `
    --resource-group $resourceGroupName `
    --sku $sku `
    --is-linux

# 3. 创建 Web App
Write-Host "创建 Web App: $webAppName" -ForegroundColor Yellow
az webapp create `
    --name $webAppName `
    --resource-group $resourceGroupName `
    --plan $appServicePlanName `
    --runtime "NODE:18-lts"

# 4. 配置应用设置
Write-Host "配置应用设置..." -ForegroundColor Yellow
az webapp config appsettings set `
    --name $webAppName `
    --resource-group $resourceGroupName `
    --settings `
        NODE_ENV=production `
        PORT=8080 `
        WEBSITE_NODE_DEFAULT_VERSION=18.17.1 `
        SCM_DO_BUILD_DURING_DEPLOYMENT=true `
        CORS_ORIGIN="*" `
        HELMET_ENABLED=true `
        COMPRESSION_ENABLED=true `
        LOG_LEVEL=info

# 5. 启用 HTTPS Only
Write-Host "启用 HTTPS Only..." -ForegroundColor Yellow
az webapp update `
    --name $webAppName `
    --resource-group $resourceGroupName `
    --https-only true

# 6. 构建应用
Write-Host "构建应用..." -ForegroundColor Yellow
npm run build

# 7. 创建部署包
Write-Host "创建部署包..." -ForegroundColor Yellow
$deploymentPackage = "c2c-dashboard-deployment.zip"

# 如果存在旧的部署包，先删除
if (Test-Path $deploymentPackage) {
    Remove-Item $deploymentPackage
}

# 创建包含必要文件的 ZIP
Compress-Archive -Path @(
    "dist/*",
    "public/*",
    "package.json",
    "web.config",
    ".env"
) -DestinationPath $deploymentPackage -Force

# 8. 部署到 Azure
Write-Host "部署应用到 Azure..." -ForegroundColor Yellow
az webapp deployment source config-zip `
    --name $webAppName `
    --resource-group $resourceGroupName `
    --src $deploymentPackage

# 9. 获取应用 URL
$appUrl = az webapp show --name $webAppName --resource-group $resourceGroupName --query "defaultHostName" --output tsv
$httpsUrl = "https://$appUrl"

Write-Host "`n" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host "部署完成！" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host "应用 URL: $httpsUrl" -ForegroundColor Cyan
Write-Host "资源组: $resourceGroupName" -ForegroundColor Cyan
Write-Host "Web App 名称: $webAppName" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Green

# 清理部署包
Remove-Item $deploymentPackage

Write-Host "`n打开浏览器访问您的应用..." -ForegroundColor Yellow
Start-Process $httpsUrl
