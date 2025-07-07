export interface Repository {
    repoName: string;
    languages: string[];
    repoType: RepoType;
    appPattern: string;
    successRate: number;
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
