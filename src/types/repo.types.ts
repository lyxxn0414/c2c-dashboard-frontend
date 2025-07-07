// API response interfaces
export interface ApiRepoData {
    RepoName: string;
    Language: string;
    AppPattern: string;
    SuccessRate: string;
    RepoURL: string;
    TotalTasks: number;
    SuccessTasks: number;
}

export interface ApiRepoResponse {
    name: string;
    data: ApiRepoData[];
}

// Frontend interfaces
export interface Repository {
    repoName: string;
    languages: string[];
    repoType: RepoType;
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
}
