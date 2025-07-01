// Job related types
export interface Job {
  id: string;
  createdBy: string;
  creationTime: string;
  description: string;
  taskNum: number;
  finishedTaskNum: number;
  successRate: string;
  status: JobStatus;
}

export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface JobFilter {
  createdBy?: string;
  poolId?: string;
  jobName?: string;
  status?: JobStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface JobQueryParams {
  page?: number;
  limit?: number;
  sortBy?: keyof Job;
  sortOrder?: 'asc' | 'desc';
  createdBy?: string;
  status?: JobStatus;
  poolId?: string;
  filter?: string;
}

export interface JobListResponse {
  jobs: Job[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateJobRequest {
  description: string;
  poolId?: string;
  priority?: 'low' | 'medium' | 'high';
  taskNum?: number;
  timeout?: number;
}

export interface UpdateJobRequest {
  description?: string;
  status?: JobStatus;
  taskNum?: number;
  finishedTaskNum?: number;
  successRate?: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  timestamp?: string;
  path?: string;
}
