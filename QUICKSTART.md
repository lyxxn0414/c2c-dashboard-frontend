# 🚀 C2C Dashboard 快速部署指南

## 概述
这是一个基于 Node.js + TypeScript 的 Job Management Dashboard，专为 Azure App Service 优化。

## ⚡ 快速开始

### 1. 准备工作
确保您已安装：
- [Azure CLI](https://docs.microsoft.com/cli/azure/install-azure-cli)
- Node.js 18.x+

### 2. 登录 Azure
```powershell
az login
```

### 3. 一键部署
```powershell
.\deploy.ps1
```

**就这么简单！** 脚本会自动：
- ✅ 创建 Azure 资源组
- ✅ 创建 App Service Plan (B1 SKU)
- ✅ 创建 Web App (Node.js 18)
- ✅ 配置环境变量
- ✅ 构建并部署应用
- ✅ 启用 HTTPS

### 4. 访问应用
部署完成后，脚本会显示应用 URL，类似：
```
https://c2c-dashboard-1234.azurewebsites.net
```

## 📱 应用功能

### 主要特性
- **Job 管理**: 查看、创建、编辑、删除作业
- **实时筛选**: 按创建者、状态等筛选
- **分页显示**: 高效处理大量数据
- **响应式设计**: 支持桌面和移动设备

### API 端点
- `GET /` - 主界面
- `GET /api/jobs` - 获取作业列表
- `POST /api/jobs` - 创建新作业
- `GET /health` - 健康检查

## 🛠️ 本地开发

### 安装依赖
```bash
npm install
```

### 本地运行
```bash
# 开发模式（热重载）
npm run dev

# 生产模式
npm run build
npm start
```

访问: http://localhost:8080

## 🔧 自定义配置

### 修改应用设置
在 Azure Portal 中找到您的 App Service > 配置 > 应用程序设置：

| 设置名 | 说明 | 默认值 |
|--------|------|--------|
| `NODE_ENV` | 环境模式 | `production` |
| `PORT` | 端口号 | `8080` |
| `CORS_ORIGIN` | CORS 源 | `*` |
| `LOG_LEVEL` | 日志级别 | `info` |

### 修改 SKU
编辑 `deploy.ps1` 中的 `$sku` 变量：
- `F1` - 免费层
- `B1` - 基本层 (推荐)
- `S1` - 标准层
- `P1v2` - 高级层

## 📊 监控和日志

### 查看应用日志
```bash
az webapp log tail --name 您的应用名 --resource-group rg-c2c-dashboard
```

### 重启应用
```bash
az webapp restart --name 您的应用名 --resource-group rg-c2c-dashboard
```

## 🧹 清理资源

删除所有创建的 Azure 资源：
```bash
az group delete --name rg-c2c-dashboard --yes
```

## 🆘 故障排除

### 常见问题

1. **部署失败**
   - 检查 Azure CLI 是否已登录
   - 确认订阅权限

2. **应用无法启动**
   - 检查应用日志
   - 验证 Node.js 版本

3. **API 不工作**
   - 确认健康检查端点：`/health`
   - 检查 CORS 设置

### 获取帮助
查看完整文档：[DEPLOYMENT.md](./DEPLOYMENT.md)

---

🎉 **恭喜！您的 C2C Dashboard 已成功部署到 Azure！**
