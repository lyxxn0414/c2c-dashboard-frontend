// API response interfaces
export interface ApiRepoData {
    RepoName: string;
    Language: string;
    AppPattern: string;
    SuccessRate: string;
    RepoURL: string;
    TotalTasks: number;
    SuccessTasks: number;
    RepoType: string;
}

export interface ApiRepoResponse {
    name: string;
    data: ApiRepoData[];
}

// New API interfaces for task/error list
export interface ApiTaskErrorData {
    TaskID: string;
    JobID: string;
    CopilotModel: string;
    TaskType: string;
    UseTerraform: boolean;
    ErrorCategory: string;
    ErrorDescription: string;
    ErrorDetail: string;
    CreatedDate: string;
    IsSuccessful: boolean;
    Iterations: number;
}

export interface ApiTaskErrorResponse {
    name: string;
    data: ApiTaskErrorData[];
}

// Frontend interfaces
export interface Repository {
    repoName: string;
    languages: string[];
    repoType: string;
    appPattern: string;
    successRate: number;
    repoURL?: string;
    repoId?: string;
    computeResource?: string;
    bindingResource?: string;
    totalTasks?: number;
    successfulTasks?: number;
}

export enum RepoType {
    Application = 'Application',
    Library = 'Library',
    Service = 'Service',
    Tool = 'Tool'
}

export interface RepoFilters {
    repoName?: string;
    repoType?: RepoType;
    language?: string;
}

// Task-related interfaces
export interface RelatedTask {
    taskId: string;
    repoName: string;
    creationTime: string;
    copilotModel: string;
    language: string;
    deployResult: string;
    taskType: string;
    iterations: number;
    createdBy: string;
    // New fields from the API
    jobId?: string;
    useTerraform?: boolean;
    errorCategory?: string;
    errorDescription?: string;
    errorDetail?: string;
    isSuccessful?: boolean;
}
