import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { Job, JobQueryParams, JobListResponse, CreateJobRequest } from '../types/job.types';

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
            let requestBody: { [key: string]: any } = {};
            if (params.CreatedBy) requestBody.CreatedBy = params.CreatedBy;
            if (params.PooID) requestBody.PooID = params.PooID;
            if (params.JobID) requestBody.JobID = params.JobID;

            const url = `/kusto/getJobList`;

            const response = await this.requestWithRetry<{name: string, data: Job[]} | Job[]>({
                method: 'GET',
                url: url,
                data: requestBody
            });

            let jobs: Job[] = [];
            if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
                jobs = response.data;
            } else if (Array.isArray(response)) {
                jobs = response;
            }
            
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
    async getJobsCompatible(params: JobQueryParams & { filter?: string }): Promise<{ jobs: Job[]; total: number; page: number; limit: number; totalPages: number }> {
        const response = await this.getJobs(params);
        return {
            ...response,
            jobs: response.jobs
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

    async getTaskFirstErrorDetailByJobID(id: string): Promise<any> {
        try {
            const requestBody = {
                JobID: id
            };

            const response = await this.requestWithRetry<any>({
                method: 'GET',
                url: '/kusto/getTaskFirstErrorDetailByJobID',
                data: requestBody
            });
            
            return response;
            
        } catch (error) {
            console.error(`[ExternalAPI] Failed to fetch job ${id}:`, error);
            if (error instanceof Error && error.message.includes('404')) {
                throw new Error(`Job with ID ${id} not found`);
            }
            throw new Error(`Failed to fetch job from external service: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async getClassifiedResultsByJobID(id: string, classification: string): Promise<any> {
        try {
            const requestBody = {
                TestJobID: id,
                Classification: classification
            };

            const response = await this.requestWithRetry<any>({
                method: 'GET',
                url: '/kusto/getResultsClassifiedBy',
                data: requestBody
            });

            return response;

        } catch (error) {
            console.error(`[ExternalAPI] Failed to fetch classified results for job ${id}:`, error);
            if (error instanceof Error && error.message.includes('404')) {
                throw new Error(`Job with ID ${id} not found`);
            }
            throw new Error(`Failed to fetch classified results from external service: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async getTaskDetail(taskId: string): Promise<any> {
        try {
            console.log(`[ExternalAPI] Fetching task detail for task: ${taskId}`);
            
            const requestBody = {
                TaskID: taskId
            };

            // Fetch task data and copilot steps concurrently
            const [taskData, copilotSteps] = await Promise.all([
                this.requestWithRetry<any>({
                    method: 'GET',
                    url: '/kusto/getTaskDetailsByTaskID',
                    data: requestBody
                }),
                this.requestWithRetry<any>({
                    method: 'GET',
                    url: '/kusto/getCopilotStepsByTaskID',
                    data: requestBody
                })
            ]);

            // Parse and transform the response data
            return this.parseTaskDetailResponse(taskData, copilotSteps, taskId);

        } catch (error) {
            console.error(`[ExternalAPI] Failed to fetch task ${taskId}:`, error);
            if (error instanceof Error && error.message.includes('404')) {
                throw new Error(`Task with ID ${taskId} not found`);
            }
            throw new Error(`Failed to fetch task from external service: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Parse and transform task detail response to match the expected format
     */
    private parseTaskDetailResponse(taskData: any, copilotSteps: any, taskId: string): any {
        try {
            // Extract TaskDetails
            const taskDetails = taskData?.TaskDetails || {};
            const taskErrors = taskData?.TaskErrors?.data || [];
            const aiIntegrations = taskData?.AIIntegrations?.data || [];
            const copilotStepsData = copilotSteps?.data || [];

            // Format creation time
            const formatDate = (dateString: string) => {
                try {
                    const date = new Date(dateString);
                    return date.toISOString().slice(0, 16).replace('T', ' ');
                } catch {
                    return dateString;
                }
            };

            // Count tool calls from TaskDetails
            const toolCalls = {
                recommend: taskDetails.RecommendToolCount?.toString() || '0',
                predeploy: taskDetails.PredeployToolCount?.toString() || '0',
                deploy: taskDetails.DeployToolCount?.toString() || '0',
                region: taskDetails.RegionToolCount?.toString() || '0',
                quota: taskDetails.QuotaToolCount?.toString() || '0',
                getLogs: '0' // Not present in the provided data structure
            };

            // Transform AI Integration data
            const aiIntegration: { [key: string]: number } = {};
            aiIntegrations.forEach((ai: any) => {
                if (ai.IntegrationType && ai.callingNum) {
                    aiIntegration[ai.IntegrationType] = ai.callingNum;
                }
            });

            // Transform deploy failure details from task errors
            const deployFailureDetails = taskErrors.map((error: any) => ({
                iterationNum: error.Iteration || 0,
                time: formatDate(error.Timestamp || ''),
                errorCategory: error.ErrorCategory || 'Unknown',
                errorDescription: error.ErrorDescription || 'No description',
                errorDetail: error.ErrorDetail || 'No details'
            }));

            // Transform copilot responses from copilot steps
            const copilotResponses = copilotStepsData.map((step: any) => ({
                time: formatDate(step.StartTime || step.Timestamp || ''),
                iteration: step.Iteration || 0,
                stepType: step.StepType || 'Unknown',
                inputCommand: step.Details || 'No input command',
                toolCall: step.StepType || 'Unknown',
                copilotResponse: step.CopilotRecentResponse || 'No response'
            }));

            // Create description from available fields
            const descriptionParts = [
                taskDetails.CopilotModel && `CopilotModel: ${taskDetails.CopilotModel}`,
                taskDetails.TaskType && `TaskType: ${taskDetails.TaskType}`,
                taskDetails.IsSuccessful !== undefined && `Deploy Result: ${taskDetails.IsSuccessful ? 'Success' : 'Failed'}`,
                taskDetails.Iterations && `Iterations: ${taskDetails.Iterations}`,
                taskDetails.VSCodeVersion && `VSCodeVersion: ${taskDetails.VSCodeVersion}`,
                taskDetails.ExtensionVersions && `ExtensionVersion: ${taskDetails.ExtensionVersions}`,
                taskDetails.InitialPrompt && `InitialPrompt: ${taskDetails.InitialPrompt.substring(0, 100)}...`
            ].filter(Boolean);

            return {
                taskId: taskDetails.TaskID || taskId,
                jobId: taskDetails.TestJobID || 'unknown-job',
                repoName: taskDetails.RepoName || 'unknown/repo',
                name: `Task-${taskDetails.TaskID?.split('-').pop() || 'unknown'}`,
                creationTime: formatDate(taskDetails.CreatedDate || taskDetails.Timestamp || ''),
                description: descriptionParts.join(', ') || 'No description available',
                
                // Tool call counts
                toolCalls,
                
                // AI Integration counts
                aiIntegration,
                
                // Deploy failure details
                deployFailureDetails,
                
                // Copilot responses per iteration
                copilotResponses,

                // Additional raw data for debugging
                rawData: {
                    taskDetails,
                    taskErrors: taskErrors.length,
                    aiIntegrations: aiIntegrations.length,
                    copilotSteps: copilotStepsData.length
                }
            };

        } catch (parseError) {
            console.error('[ExternalAPI] Error parsing task detail response:', parseError);
            
            // Return fallback structure if parsing fails
            return {
                taskId: taskId,
                jobId: 'parse-error',
                repoName: 'unknown/repo',
                name: 'Parse Error',
                creationTime: new Date().toISOString().slice(0, 16).replace('T', ' '),
                description: 'Failed to parse task details from external service',
                toolCalls: {
                    recommend: '0',
                    predeploy: '0',
                    deploy: '0',
                    region: '0',
                    quota: '0',
                    getLogs: '0'
                },
                aiIntegration: {},
                deployFailureDetails: [],
                copilotResponses: [],
                parseError: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
            };
        }
    }

    /**
     * Get task list by Job ID
     * @param jobId - The job ID to get tasks for
     * @returns Promise<TaskListResponse> - List of tasks for the job
     */
    async getTaskListByJobID(jobId: string): Promise<any> {
        try {
            console.log(`[ExternalAPI] Fetching task list for job: ${jobId}`);
            
            const requestBody = {
                TestJobID: jobId
            };

            const response = await this.requestWithRetry<any>({
                method: 'GET',
                url: '/kusto/getTaskListByJobID',
                data: requestBody
            });

            console.log(`[ExternalAPI] Successfully fetched ${response?.data?.length || 0} tasks for job ${jobId}`);
            return response;

        } catch (error) {
            console.error(`[ExternalAPI] Failed to fetch task list for job ${jobId}:`, error);
            if (error instanceof Error && error.message.includes('404')) {
                throw new Error(`Job with ID ${jobId} not found`);
            }
            throw new Error(`Failed to fetch task list from external service: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get task errors for recent period
     * @param period - Number of days to look back for errors
     * @returns Promise<TaskErrorsResponse> - List of task errors in the specified period
     */
    async getTaskErrorsLastPeriod(period: number): Promise<any> {
        try {
            console.log(`[ExternalAPI] Fetching task errors for last ${period} days`);
            
            const requestBody = {
                Period: period
            };

            const response = await this.requestWithRetry<any>({
                method: 'GET',
                url: '/kusto/getTaskFirstErrorLastPeriod',
                data: requestBody
            });

            console.log(`[ExternalAPI] Successfully fetched ${response?.data?.length || 0} task errors for last ${period} days`);
            return response;

        } catch (error) {
            console.error(`[ExternalAPI] Failed to fetch task errors for last ${period} days:`, error);
            throw new Error(`Failed to fetch task errors from external service: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

// Export singleton instance
export const externalJobService = new ExternalJobService();
