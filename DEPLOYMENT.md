# 简单部署指南

## 快速部署到 Azure App Service

### 前提条件
1. 安装 [Azure CLI](https://docs.microsoft.com/cli/azure/install-azure-cli)
2. 安装 Node.js 18.x 或更高版本

### 部署步骤

#### 方法一：使用 PowerShell 脚本（推荐）

1. **登录 Azure**：
   ```powershell
   az login
   ```

2. **运行部署脚本**：
   ```powershell
   .\deploy.ps1
   ```

这个脚本会自动：
- 创建资源组
- 创建 App Service Plan
- 创建 Web App
- 配置应用设置
- 构建并部署应用

#### 方法二：手动步骤

1. **登录 Azure**：
   ```bash
   az login
   ```

2. **设置变量**：
   ```bash
   # Windows PowerShell
   $resourceGroup = "rg-c2c-dashboard"
   $location = "East US"
   $planName = "plan-c2c-dashboard"
   $appName = "c2c-dashboard-$(Get-Random -Minimum 1000 -Maximum 9999)"
   ```

3. **创建资源组**：
   ```bash
   az group create --name $resourceGroup --location $location
   ```

4. **创建 App Service Plan**：
   ```bash
   az appservice plan create --name $planName --resource-group $resourceGroup --sku B1 --is-linux
   ```

5. **创建 Web App**：
   ```bash
   az webapp create --name $appName --resource-group $resourceGroup --plan $planName --runtime "NODE:18-lts"
   ```

6. **配置应用设置**：
   ```bash
   az webapp config appsettings set --name $appName --resource-group $resourceGroup --settings NODE_ENV=production PORT=8080 WEBSITE_NODE_DEFAULT_VERSION=18.17.1 SCM_DO_BUILD_DURING_DEPLOYMENT=true
   ```

7. **构建应用**：
   ```bash
   npm run build
   ```

8. **部署代码**：
   ```bash
   # 创建 ZIP 文件包含: dist/, public/, package.json, .env
   # 然后部署
   az webapp deployment source config-zip --name $appName --resource-group $resourceGroup --src deployment.zip
   ```

### 验证部署

部署完成后，访问 `https://你的应用名称.azurewebsites.net` 来验证应用是否正常运行。

## 🌐 如何访问前端页面

### 1. 获取应用 URL

**方法一：从部署脚本输出获取**
部署脚本执行完成后，会显示应用的 URL：
```
部署完成！
应用 URL: https://c2c-dashboard-1234.azurewebsites.net
```

**方法二：使用 Azure CLI 查询**
```powershell
# 查看应用的默认主机名
az webapp show --name <your-app-name> --resource-group rg-c2c-dashboard --query "defaultHostName" --output tsv
```

**方法三：在 Azure Portal 中查看**
1. 登录 [Azure Portal](https://portal.azure.com)
2. 导航到你的资源组 `rg-c2c-dashboard`
3. 点击你的 App Service 应用
4. 在概述页面中找到 "URL" 字段

### 2. 访问应用页面

使用获取到的 URL，在浏览器中访问以下页面：

#### 主要页面和功能

- **🏠 主页面** (Job View 仪表板): 
  ```
  https://你的应用名称.azurewebsites.net/
  ```
  - 查看所有作业列表
  - 创建新作业
  - 编辑现有作业
  - 删除作业
  - 搜索和筛选作业

- **📊 健康检查页面**:
  ```
  https://你的应用名称.azurewebsites.net/health
  ```
  - 检查应用运行状态
  - 返回 JSON 格式的健康信息

#### API 端点测试

可以使用浏览器或 API 测试工具访问：

- **获取所有作业**:
  ```
  GET https://你的应用名称.azurewebsites.net/api/jobs
  ```

- **获取特定作业**:
  ```
  GET https://你的应用名称.azurewebsites.net/api/jobs/1
  ```

### 3. 验证功能

访问主页后，您应该能看到：

1. **页面标题**: "Job View Dashboard"
2. **操作按钮**: "Create New Job" 按钮
3. **作业表格**: 包含以下列：
   - Job ID
   - Job Name
   - Status
   - Priority
   - Created Date
   - Actions (Edit/Delete)

4. **交互功能**:
   - 点击 "Create New Job" 创建新作业
   - 使用搜索框筛选作业
   - 点击表格头部进行排序
   - 使用编辑/删除按钮管理作业

### 4. 常见访问问题

**问题 1**: 页面显示 "Service Unavailable"
```powershell
# 检查应用状态
az webapp show --name <your-app-name> --resource-group rg-c2c-dashboard --query "state"

# 重启应用
az webapp restart --name <your-app-name> --resource-group rg-c2c-dashboard
```

**问题 2**: 页面加载缓慢
- 首次访问可能需要 1-2 分钟来启动应用
- 后续访问会更快（除非应用进入休眠状态）

**问题 3**: API 端点返回错误
```powershell
# 查看应用日志
az webapp log tail --name <your-app-name> --resource-group rg-c2c-dashboard
```

### 应用功能

- **首页**: 显示 Job View 仪表板
- **API 端点**: `/api/jobs` 用于作业管理  
- **健康检查**: `/health` 端点用于监控

### 故障排除

1. **检查应用日志**：
   ```bash
   az webapp log tail --name $appName --resource-group $resourceGroup
   ```

2. **查看配置**：
   ```bash
   az webapp config show --name $appName --resource-group $resourceGroup
   ```

3. **重启应用**：
   ```bash
   az webapp restart --name $appName --resource-group $resourceGroup
   ```

### 清理资源

如需删除所有创建的资源：
```bash
az group delete --name $resourceGroup --yes
```
