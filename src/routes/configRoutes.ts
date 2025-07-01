import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Store current configuration (in production, this should be in a database)
let currentConfig = {
    externalApiBaseUrl: process.env.EXTERNAL_API_BASE_URL || '',
    timeout: parseInt(process.env.EXTERNAL_API_TIMEOUT || '30000'),
    retryAttempts: parseInt(process.env.EXTERNAL_API_RETRY_ATTEMPTS || '3')
};

/**
 * GET /api/config
 * Get current external API configuration
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    res.json({
        success: true,
        config: {
            externalApiBaseUrl: currentConfig.externalApiBaseUrl,
            timeout: currentConfig.timeout,
            retryAttempts: currentConfig.retryAttempts,
            lastUpdated: new Date().toISOString()
        }
    });
}));

/**
 * POST /api/config
 * Update external API configuration
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const { externalApiBaseUrl, timeout, retryAttempts } = req.body;

    // Validation
    if (!externalApiBaseUrl || typeof externalApiBaseUrl !== 'string') {
        return res.status(400).json({
            success: false,
            error: 'External API base URL is required and must be a string'
        });
    }

    // Validate URL format
    try {
        new URL(externalApiBaseUrl);
    } catch (error) {
        return res.status(400).json({
            success: false,
            error: 'Invalid URL format'
        });
    }

    // Validate timeout
    const timeoutNum = parseInt(timeout);
    if (isNaN(timeoutNum) || timeoutNum < 5000 || timeoutNum > 120000) {
        return res.status(400).json({
            success: false,
            error: 'Timeout must be between 5000 and 120000 ms'
        });
    }

    // Validate retry attempts
    const retryNum = parseInt(retryAttempts);
    if (isNaN(retryNum) || retryNum < 1 || retryNum > 10) {
        return res.status(400).json({
            success: false,
            error: 'Retry attempts must be between 1 and 10'
        });
    }

    // Update configuration
    currentConfig = {
        externalApiBaseUrl: externalApiBaseUrl.trim(),
        timeout: timeoutNum,
        retryAttempts: retryNum
    };

    // Update environment variables for the current process
    process.env.EXTERNAL_API_BASE_URL = currentConfig.externalApiBaseUrl;
    process.env.EXTERNAL_API_TIMEOUT = currentConfig.timeout.toString();
    process.env.EXTERNAL_API_RETRY_ATTEMPTS = currentConfig.retryAttempts.toString();

    console.log('External API configuration updated:', currentConfig);

    res.json({
        success: true,
        message: 'Configuration updated successfully',
        config: {
            externalApiBaseUrl: currentConfig.externalApiBaseUrl,
            timeout: currentConfig.timeout,
            retryAttempts: currentConfig.retryAttempts,
            lastUpdated: new Date().toISOString()
        }
    });
}));

/**
 * POST /api/config/test
 * Test connection to external API with given configuration
 */
router.post('/test', asyncHandler(async (req: Request, res: Response) => {
    const { externalApiBaseUrl, timeout } = req.body;

    if (!externalApiBaseUrl) {
        return res.status(400).json({
            success: false,
            error: 'External API base URL is required'
        });
    }

    try {
        // Import axios here to avoid circular dependencies
        const axios = require('axios');
        
        const testClient = axios.create({
            baseURL: externalApiBaseUrl,
            timeout: timeout || 10000,
            headers: {
                'User-Agent': 'C2C-Dashboard-Test/1.0'
            }
        });

        const startTime = Date.now();
        const response = await testClient.get('/health');
        const endTime = Date.now();

        res.json({
            success: true,
            connection: {
                status: 'connected',
                responseTime: endTime - startTime,
                statusCode: response.status,
                baseUrl: externalApiBaseUrl,
                testedAt: new Date().toISOString()
            }
        });
    } catch (error: any) {
        console.error('Connection test failed:', error);
        
        res.json({
            success: false,
            connection: {
                status: 'failed',
                error: error.message,
                code: error.code,
                baseUrl: externalApiBaseUrl,
                testedAt: new Date().toISOString()
            }
        });
    }
}));

export default router;
