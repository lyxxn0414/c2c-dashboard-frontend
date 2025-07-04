import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import jobRoutes from './routes/jobRoutes';
import configRoutes from './routes/configRoutes';
import { errorHandler } from './middleware/errorHandler';

class App {
  public app: Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '8080');
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security middleware
    if (process.env.HELMET_ENABLED === 'true') {
      this.app.use(helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
          },
        },
      }));
    }

    // Compression middleware
    if (process.env.COMPRESSION_ENABLED === 'true') {
      this.app.use(compression());
    }

    // CORS configuration
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    }));

    // Logging middleware
    if (process.env.NODE_ENV !== 'test') {
      this.app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
    }

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Static files
    this.app.use(express.static(path.join(__dirname, '../public')));
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
      });
    });

    // API routes
    this.app.use('/api/jobs', jobRoutes);
    this.app.use('/api/config', configRoutes);

    // Specific route for job details
    this.app.get('/job-detail/*', (req: Request, res: Response) => {
      console.log(`Serving index.html for job detail route: ${req.path}`);
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });

    // Main route - serve the dashboard
    this.app.get('/', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });

    // SPA routes - serve the main HTML for all other non-API, non-static file routes
    this.app.get('*', (req: Request, res: Response, next: NextFunction) => {
      // Skip API routes
      if (req.path.startsWith('/api/')) {
        return next();
      }
      
      // Skip static files (they have file extensions)
      if (req.path.includes('.') && !req.path.includes('jobID=')) {
        return next();
      }
      
      // Serve the main HTML page for all other routes (SPA routing)
      console.log(`Serving index.html for route: ${req.path}`);
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });

    // 404 handler for API routes and static files that weren't found
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString(),
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public listen(): void {
    this.app.listen(this.port, () => {
      console.log(`🚀 C2C Dashboard Frontend running on port ${this.port}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📊 Health check: http://localhost:${this.port}/health`);
    });
  }
}

// Create and start the application
const app = new App();
app.listen();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;
