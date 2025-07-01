import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { Job, JobQueryParams, JobListResponse, CreateJobRequest } from '../types/job.types';

export class ExternalJobService {
    private client: AxiosInstance;
    private baseURL: string;
    private timeout: number;
    private retryAttempts: number;

    constructor() {
        this.baseURL = process.env.EXTERNAL_API_BASE_URL || 'https://your-external-service.azurewebsites.net';
        this.timeout = parseInt(process.env.EXTERNAL_API_TIMEOUT || '30000');
        this.retryAttempts = parseInt(process.env.EXTERNAL_API_RETRY_ATTEMPTS || '3');
        
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'C2C-Dashboard/1.0'
            }
        });

        // Add request interceptor for logging
        this.client.interceptors.request.use(
            (config: any) => {
                console.log(`[ExternalAPI] ${config.method?.toUpperCase()} ${config.url}`);
                return config;
            },
            (error: any) => {
                console.error('[ExternalAPI] Request error:', error);
                return Promise.reject(error);
            }
        );

        // Add response interceptor for error handling
        this.client.interceptors.response.use(
            (response: any) => {
                console.log(`[ExternalAPI] Response ${response.status} from ${response.config.url}`);
                return response;
            },
            (error: any) => {
                console.error('[ExternalAPI] Response error:', error.response?.status, error.message);
                return Promise.reject(error);
            }
        );
    }

    /**
     * Make a request with retry logic
     */
    private async requestWithRetry<T>(config: AxiosRequestConfig, attempts: number = this.retryAttempts): Promise<T> {
        try {
            const response = await this.client.request<T>(config);
            return response.data;
        } catch (error: any) {
            if (attempts > 1 && this.shouldRetry(error)) {
                console.log(`[ExternalAPI] Retrying request, ${attempts - 1} attempts left`);
                await this.delay(1000 * (this.retryAttempts - attempts + 1)); // Progressive delay
                return this.requestWithRetry<T>(config, attempts - 1);
            }
            throw error;
        }
    }

    /**
     * Determine if a request should be retried
     */
    private shouldRetry(error: any): boolean {
        if (!error.response) return true; // Network error
        const status = error.response.status;
        return status >= 500 || status === 408 || status === 429;
    }

    /**
     * Delay function for retry logic
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get jobs from external API
     */
    async getJobs(params: JobQueryParams & { filter?: string }): Promise<JobListResponse> {
        try {
            return await this.requestWithRetry<JobListResponse>({
                method: 'GET',
                url: '/api/jobs',
                params: {
                    page: params.page,
                    limit: params.limit,
                    sortBy: params.sortBy,
                    sortOrder: params.sortOrder,
                    filter: params.filter,
                    createdBy: params.createdBy,
                    status: params.status
                }
            });
        } catch (error) {
            console.error('[ExternalAPI] Failed to fetch jobs:', error);
            throw new Error(`Failed to fetch jobs from external service: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get a specific job by ID
     */
    async getJobById(id: string): Promise<Job> {
        try {
            return await this.requestWithRetry<Job>({
                method: 'GET',
                url: `/api/jobs/${id}`
            });
        } catch (error) {
            console.error(`[ExternalAPI] Failed to fetch job ${id}:`, error);
            if (error instanceof Error && error.message.includes('404')) {
                throw new Error(`Job with ID ${id} not found`);
            }
            throw new Error(`Failed to fetch job from external service: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Create a new job
     */
    async createJob(jobData: CreateJobRequest): Promise<Job> {
        try {
            return await this.requestWithRetry<Job>({
                method: 'POST',
                url: '/api/jobs',
                data: jobData
            });
        } catch (error) {
            console.error('[ExternalAPI] Failed to create job:', error);
            throw new Error(`Failed to create job in external service: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Update a job
     */
    async updateJob(id: string, updateData: Partial<Job>): Promise<Job> {
        try {
            return await this.requestWithRetry<Job>({
                method: 'PUT',
                url: `/api/jobs/${id}`,
                data: updateData
            });
        } catch (error) {
            console.error(`[ExternalAPI] Failed to update job ${id}:`, error);
            if (error instanceof Error && error.message.includes('404')) {
                throw new Error(`Job with ID ${id} not found`);
            }
            throw new Error(`Failed to update job in external service: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Delete a job
     */
    async deleteJob(id: string): Promise<{ message: string; job: Job }> {
        try {
            return await this.requestWithRetry<{ message: string; job: Job }>({
                method: 'DELETE',
                url: `/api/jobs/${id}`
            });
        } catch (error) {
            console.error(`[ExternalAPI] Failed to delete job ${id}:`, error);
            if (error instanceof Error && error.message.includes('404')) {
                throw new Error(`Job with ID ${id} not found`);
            }
            throw new Error(`Failed to delete job in external service: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Test connection to external API
     */
    async testConnection(): Promise<boolean> {
        try {
            await this.requestWithRetry({
                method: 'GET',
                url: '/health',
                timeout: 5000
            });
            return true;
        } catch (error) {
            console.error('[ExternalAPI] Connection test failed:', error);
            return false;
        }
    }

    /**
     * Get API health status
     */
    async getHealthStatus(): Promise<any> {
        try {
            return await this.requestWithRetry({
                method: 'GET',
                url: '/health'
            });
        } catch (error) {
            console.error('[ExternalAPI] Health check failed:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const externalJobService = new ExternalJobService();
