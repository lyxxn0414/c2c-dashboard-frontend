import { Repository, RepoType } from '../types/repo.types';

export class RepoService {
    private static instance: RepoService;
    
    private constructor() {}

    public static getInstance(): RepoService {
        if (!RepoService.instance) {
            RepoService.instance = new RepoService();
        }
        return RepoService.instance;
    }

    async getRepositories(): Promise<Repository[]> {
        // TODO: Replace with actual API call
        // This is mock data for testing
        return [
            {
                repoName: 'frontend-app',
                languages: ['TypeScript', 'JavaScript', 'CSS'],
                repoType: RepoType.Application,
                appPattern: 'React SPA',
                successRate: 0.95
            },
            {
                repoName: 'api-service',
                languages: ['C#', 'SQL'],
                repoType: RepoType.Service,
                appPattern: 'REST API',
                successRate: 0.88
            },
            {
                repoName: 'shared-utils',
                languages: ['TypeScript'],
                repoType: RepoType.Library,
                appPattern: 'NPM Package',
                successRate: 0.92
            },
            {
                repoName: 'build-tools',
                languages: ['Python', 'Shell'],
                repoType: RepoType.Tool,
                appPattern: 'CLI',
                successRate: 0.85
            }
        ];
    }
}
