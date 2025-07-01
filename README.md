# C2C Dashboard Frontend

A modern job management dashboard built with Node.js, TypeScript, and Express, designed for deployment on Azure App Service.

## Features

- **Job Management**: View, create, edit, and delete jobs
- **Real-time Dashboard**: Interactive table with sorting, filtering, and pagination
- **Responsive Design**: Modern UI with Bootstrap 5
- **TypeScript**: Full TypeScript support for better development experience
- **Azure Ready**: Optimized for Azure App Service deployment
- **Security**: Built-in security features with Helmet.js
- **Performance**: Compression and caching enabled

## Architecture

The application follows a clean architecture pattern with:

- **Frontend**: Bootstrap 5 + Vanilla JavaScript
- **Backend**: Node.js + Express + TypeScript
- **Infrastructure**: Azure App Service with Bicep templates
- **Deployment**: Azure Developer CLI (azd) ready

## Prerequisites

- Node.js 18.x or later
- npm 9.x or later
- Azure CLI (for deployment)
- Azure Developer CLI (azd) - optional but recommended

## Local Development

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd c2c-dashboard-frontend
   npm install
   ```

2. **Environment Configuration**:
   Copy `.env` and adjust settings as needed:
   ```bash
   cp .env .env.local
   ```

3. **Development**:
   ```bash
   # Start development server with hot reload
   npm run dev
   
   # Build for production
   npm run build
   
   # Start production server
   npm start
   ```

4. **Access the application**:
   Open http://localhost:8080 in your browser

## Project Structure

```
c2c-dashboard-frontend/
├── src/                          # TypeScript source code
│   ├── app.ts                   # Main application entry point
│   ├── routes/                  # API routes
│   │   └── jobRoutes.ts        # Job management endpoints
│   ├── middleware/              # Express middlewares
│   │   └── errorHandler.ts     # Error handling middleware
│   └── types/                   # TypeScript type definitions
│       └── job.types.ts        # Job-related types
├── public/                      # Static frontend files
│   ├── index.html              # Main HTML file
│   ├── css/                    # Stylesheets
│   │   └── dashboard.css       # Dashboard styles
│   └── js/                     # Frontend JavaScript
│       └── dashboard.js        # Dashboard functionality
├── infra/                      # Azure infrastructure (Bicep)
│   ├── main.bicep              # Main infrastructure template
│   └── main.parameters.json    # Infrastructure parameters
├── dist/                       # Compiled JavaScript (generated)
└── package.json               # Project dependencies and scripts
```

## API Endpoints

### Jobs API

- `GET /api/jobs` - List jobs with pagination and filtering
- `GET /api/jobs/:id` - Get specific job details
- `POST /api/jobs` - Create a new job
- `PUT /api/jobs/:id` - Update job details
- `DELETE /api/jobs/:id` - Delete a job

### System Endpoints

- `GET /health` - Health check endpoint
- `GET /` - Main dashboard page

## Azure Deployment

### Using Azure Developer CLI (Recommended)

1. **Initialize azd**:
   ```bash
   azd init
   ```

2. **Deploy to Azure**:
   ```bash
   azd up
   ```

This will:
- Create Azure resources (App Service, App Service Plan)
- Deploy the application
- Configure environment variables
- Set up monitoring

### Accessing Your Deployed Application

After successful deployment:

1. **Get your app URL** from the deployment output or Azure Portal
2. **Access the dashboard**: `https://your-app-name.azurewebsites.net/`
3. **Test API endpoints**: `https://your-app-name.azurewebsites.net/api/jobs`
4. **Check health**: `https://your-app-name.azurewebsites.net/health`

> 💡 **Tip**: First access may take 1-2 minutes as the app starts up. Subsequent visits will be faster.

For detailed access instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md#-如何访问前端页面).

### Manual Deployment

1. **Create Azure resources**:
   ```bash
   az group create --name rg-c2c-dashboard --location eastus
   az deployment group create \
     --resource-group rg-c2c-dashboard \
     --template-file infra/main.bicep \
     --parameters infra/main.parameters.json
   ```

2. **Deploy application**:
   ```bash
   # Build the application
   npm run build
   
   # Deploy to App Service
   az webapp deployment source config-zip \
     --resource-group rg-c2c-dashboard \
     --name <your-app-name> \
     --src <path-to-zip-file>
   ```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `8080` |
| `CORS_ORIGIN` | CORS allowed origins | `*` |
| `HELMET_ENABLED` | Enable security headers | `true` |
| `COMPRESSION_ENABLED` | Enable response compression | `true` |
| `LOG_LEVEL` | Logging level | `info` |

### Azure App Service Settings

The application is configured with optimal settings for Azure App Service:

- **Always On**: Enabled (except for Free tier)
- **HTTP/2**: Enabled
- **HTTPS Only**: Enforced
- **Minimum TLS Version**: 1.2
- **Auto Heal**: Configured with request-based triggers
- **Health Check**: `/health` endpoint

## Security Features

- **HTTPS Only**: All traffic redirected to HTTPS
- **Security Headers**: Helmet.js for security headers
- **CORS Protection**: Configurable cross-origin policies
- **Input Validation**: Request validation and sanitization
- **Error Handling**: Secure error messages without sensitive data

## Performance Optimizations

- **Compression**: Gzip compression for responses
- **Caching**: Static file caching
- **Connection Pooling**: Efficient database connections
- **Auto Heal**: Automatic recovery from failures
- **CDN Ready**: Static assets can be served via CDN

## Monitoring and Logging

- **Application Insights**: Integrated monitoring (Azure)
- **Diagnostic Settings**: Comprehensive logging
- **Health Checks**: Built-in health monitoring
- **Error Tracking**: Centralized error logging

## Development

### Available Scripts

- `npm run dev` - Start development server with nodemon
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start production server
- `npm run clean` - Clean build directory
- `npm run lint` - Run ESLint
- `npm test` - Run tests (when available)

### Code Quality

- **TypeScript**: Full type safety
- **ESLint**: Code linting and formatting
- **Error Handling**: Comprehensive error handling
- **Logging**: Structured logging with different levels

## Troubleshooting

### Common Issues

1. **Build Failures**:
   - Ensure Node.js 18+ is installed
   - Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`

2. **Deployment Issues**:
   - Check Azure CLI authentication: `az account show`
   - Verify resource group and app service names
   - Review deployment logs in Azure Portal

3. **Runtime Errors**:
   - Check application logs in Azure Portal
   - Verify environment variables are set correctly
   - Ensure all dependencies are installed

### Debugging

Enable detailed logging by setting:
```bash
export LOG_LEVEL=debug
export NODE_ENV=development
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make changes and test thoroughly
4. Commit changes: `git commit -am 'Add new feature'`
5. Push to branch: `git push origin feature/new-feature`
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review Azure App Service documentation
3. Create an issue in the repository
4. Contact the development team

## Roadmap

- [ ] Add user authentication
- [ ] Implement real database integration
- [ ] Add unit and integration tests
- [ ] Set up CI/CD pipeline
- [ ] Add Docker support
- [ ] Implement WebSocket for real-time updates
- [ ] Add data export functionality
- [ ] Enhance monitoring and alerting
