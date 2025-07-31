// Job related types
export interface Job {
  TestJobID: string; // 后端返回的主键
  InitiatedBy: string; // 创建者
  CreatedTime: string; // 创建时间
  JobDiscription: string; // 工作描述
  PoolName: string; // 池名称
  TaskNum: number; // 任务总数
  SuccessTasks: number; // 成功任务数
  FailedTasks?: number; // 失败任务数
  SuccessRate: string; // 成功率

  // 详情页面额外字段
  UseMCP?: number;
  UseTerraform?: number;
  AvgSuccessIteration?: number;
  AvgInfraChanges?: number;
  RecommendCalls?: number;
  PredeployCalls?: number;
  DeployCalls?: number;
  RegionCalls?: number;
  QuotaCalls?: number;
  AIIntegration?: number;

  // 分类统计数据
  ModelClassification?: ClassificationStats[];
  LanguageClassification?: ClassificationStats[];
  ResourceTypeClassification?: ClassificationStats[];
  RepoClassification?: ClassificationStats[];
}

export interface ClassificationStats {
  name: string;
  taskNum: number;
  successRate: string;
  avgSuccessIterations: number;
}

export enum JobStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export interface JobFilter {
  CreatedBy?: string; // 后端使用的字段名
  PooID?: string; // 后端使用的字段名
  JobID?: string; // 后端使用的字段名
  status?: JobStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface JobQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  CreatedBy?: string; // 后端使用的字段名
  PooID?: string; // 后端使用的字段名
  JobID?: string; // 后端使用的字段名
  status?: JobStatus;
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
  priority?: "low" | "medium" | "high";
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

// Task related types
export interface Task {
  Timestamp: string;
  TaskID: string;
  TestJobID: string;
  RepoName: string;
  VSCodeVersion: string;
  ExtensionVersions: string;
  TaskType: string;
  InitialPrompt: string;
  CopilotModel: string;
  CommandLine: string;
  IsSuccessful: boolean;
  UseTerraform: boolean;
  FileEditsNum: number;
  CreatedDate: string;
  RecommendToolCount: number;
  Iterations: number;
  QuotaToolCount: number;
  RegionToolCount: number;
  PredeployToolCount: number;
  DeployToolCount: number;
  AIIntegration: number;
  IsThrottled: boolean;
  UseBicepSchemasTool: boolean;
  UseAzureAgentBestPractices: boolean;
  Iteration: number;
}

export interface TaskListResponse {
  name: string;
  data: Task[];
}

// Task Error types for recent period errors
export interface TaskError {
  TaskID: string;
  TestJobID: string;
  CreatedDate: string;
  TaskType: string;
  UseTerraform: boolean;
  ErrorCategory: string;
  ErrorDescription: string;
  ErrorDetail: string;
}

export interface TaskErrorsResponse {
  name: string;
  data: TaskError[];
}

export interface GetTaskErrorsRequest {
  Period: number; // Number of days to look back
}
