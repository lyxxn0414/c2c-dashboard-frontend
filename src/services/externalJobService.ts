import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { Job, JobQueryParams, JobListResponse, CreateJobRequest, JobCompatible } from '../types/job.types';

export class ExternalJobService {
    private client: AxiosInstance;
    private baseURL: string;
    private timeout: number;
    private retryAttempts: number;

    constructor() {
        this.baseURL = process.env.EXTERNAL_API_BASE_URL || 'https://c2c-test-dashboard-d8feccd5dgbmd7a2.eastus-01.azurewebsites.net';
        this.timeout = parseInt(process.env.EXTERNAL_API_TIMEOUT || '30000');
        this.retryAttempts = parseInt(process.env.EXTERNAL_API_RETRY_ATTEMPTS || '3');
        
        // 确保 baseURL 不以斜杠结尾
        if (this.baseURL.endsWith('/')) {
            this.baseURL = this.baseURL.slice(0, -1);
        }
        
        console.log('=== External API Service Config ===');
        console.log(`Base URL: ${this.baseURL}`);
        console.log(`Timeout: ${this.timeout}ms`);
        console.log(`Retry Attempts: ${this.retryAttempts}`);
        console.log('===================================');
        
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
                console.log('=== API Request Debug ===');
                console.log(`Method: ${config.method?.toUpperCase()}`);
                console.log(`URL: ${config.baseURL}${config.url}`);
                console.log(`Headers:`, config.headers);
                if (config.data) {
                    console.log(`Request Body:`, JSON.stringify(config.data, null, 2));
                }
                if (config.params) {
                    console.log(`Query Params:`, config.params);
                }
                console.log('========================');
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
                console.log('=== API Response Debug ===');
                console.log(`Status: ${response.status}`);
                console.log(`URL: ${response.config.url}`);
                console.log(`Response Headers:`, response.headers);
                console.log(`Response Data:`, JSON.stringify(response.data, null, 2));
                console.log('=========================');
                return response;
            },
            (error: any) => {
                console.log('=== API Error Debug ===');
                console.error(`Error Status: ${error.response?.status}`);
                console.error(`Error URL: ${error.config?.url}`);
                console.error(`Error Message: ${error.message}`);
                if (error.response?.data) {
                    console.error(`Error Response:`, JSON.stringify(error.response.data, null, 2));
                }
                console.log('======================');
                return Promise.reject(error);
            }
        );
    }

    /**
     * Map backend job data to frontend compatible format
     */
    private mapJobToCompatible(job: Job): JobCompatible {
        return {
            id: job.TestJobID,
            createdBy: job.InitiatedBy,
            creationTime: job.CreatedTime,
            description: job.JobDiscription,
            taskNum: job.TaskNum || 0,
            finishedTaskNum: job.SuccessTasks || 0,
            successRate: job.SuccessRate || '0%',
            status: job.status || 'completed' as any
        };
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
            // 构建查询参数
            const queryParams = new URLSearchParams();
            if (params.CreatedBy) queryParams.append('CreatedBy', params.CreatedBy);
            if (params.PooID) queryParams.append('PooID', params.PooID);
            if (params.JobID) queryParams.append('JobID', params.JobID);

            const queryString = queryParams.toString();
            const url = `/kusto/getJobList${queryString ? `?${queryString}` : ''}`;

            console.log('=== Preparing API Call ===');
            console.log(`Method: GET`);
            console.log(`Endpoint: ${this.baseURL}${url}`);
            console.log(`Headers: Content-Type: application/json`);
            console.log('=== Expected Format ===');
            console.log(`GET ${this.baseURL}${url}`);
            console.log('Content-Type: application/json');
            console.log('=======================');

            const response = await this.requestWithRetry<{name: string, data: Job[]} | Job[]>({
                method: 'GET',
                url: url
            });

            // 处理不同的响应格式
            let jobs: Job[] = [];
            if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
                // API返回的是包装格式 {name: "PrimaryResult", data: [...]}
                jobs = response.data;
            } else if (Array.isArray(response)) {
                // 直接返回数组
                jobs = response;
            }
            
            // 模拟分页（后端没有返回分页信息）
            const page = params.page || 1;
            const limit = params.limit || 10;
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedJobs = jobs.slice(startIndex, endIndex);

            return {
                jobs: paginatedJobs,
                total: jobs.length,
                page: page,
                limit: limit,
                totalPages: Math.ceil(jobs.length / limit)
            };
        } catch (error) {
            console.error('[ExternalAPI] Failed to fetch jobs:', error);
            throw new Error(`Failed to fetch jobs from external service: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get jobs in compatible format for existing frontend code
     */
    async getJobsCompatible(params: JobQueryParams & { filter?: string }): Promise<{ jobs: JobCompatible[]; total: number; page: number; limit: number; totalPages: number }> {
        const response = await this.getJobs(params);
        return {
            ...response,
            jobs: response.jobs.map(job => this.mapJobToCompatible(job))
        };
    }

    /**
     * Get a specific job by ID
     */
    async getJobById(id: string): Promise<Job> {
        try {
            const requestBody = {
                TestJobID: id
            };

            console.log('=== Preparing Job Details API Call ===');
            console.log(`Method: GET`);
            console.log(`Endpoint: ${this.baseURL}/kusto/getJobDetailsByID`);
            console.log(`Headers: Content-Type: application/json`);
            console.log(`Request Body:`, JSON.stringify(requestBody, null, 2));
            console.log('=== Expected Format ===');
            console.log('GET https://c2c-test-dashboard-d8feccd5dgbmd7a2.eastus-01.azurewebsites.net/kusto/getJobDetailsByID');
            console.log('Content-Type: application/json');
            console.log('');
            console.log(JSON.stringify(requestBody, null, 2));
            console.log('=====================================');

            const response = await this.requestWithRetry<Job | {name: string, data: Job[]}>({
                method: 'GET',
                url: '/kusto/getJobDetailsByID',
                data: requestBody
            });
            
            // 处理可能的不同响应格式
            if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
                // 如果返回的是包装格式，取第一个元素
                return response.data[0];
            }
            
            return response as Job;
        } catch (error) {
            console.error(`[ExternalAPI] Failed to fetch job ${id}:`, error);
            if (error instanceof Error && error.message.includes('404')) {
                throw new Error(`Job with ID ${id} not found`);
            }
            throw new Error(`Failed to fetch job from external service: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get a specific job by ID in compatible format
     */
    async getJobByIdCompatible(id: string): Promise<JobCompatible> {
        const job = await this.getJobById(id);
        return this.mapJobToCompatible(job);
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
