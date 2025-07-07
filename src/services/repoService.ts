import { Repository, RepoType, ApiRepoResponse, ApiRepoData, RelatedTask } from '../types/repo.types';

export class RepoService {
    private static instance: RepoService;
    private apiBaseUrl = 'https://c2c-test-dashboard-d8feccd5dgbmd7a2.eastus-01.azurewebsites.net';
    
    private constructor() {}

    public static getInstance(): RepoService {
        if (!RepoService.instance) {
            RepoService.instance = new RepoService();
        }
        return RepoService.instance;
    }

    async getRepositories(): Promise<Repository[]> {
        try {
            console.log('Fetching repositories from API...');
            const response = await fetch(`${this.apiBaseUrl}/kusto/getRepoList`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const apiResponse = await response.json() as ApiRepoResponse;
            console.log('API response:', apiResponse);
            
            // Transform API data to frontend format
            const repositories = apiResponse.data.map(apiRepo => this.transformApiRepoToRepository(apiRepo));
            
            console.log('Transformed repositories:', repositories);
            return repositories;
            
        } catch (error) {
            console.error('Error fetching repositories from API:', error);
            
            // Fallback to mock data if API fails
            console.log('Falling back to mock data');
            return this.getMockRepositories();
        }
    }



    private transformApiRepoToRepository(apiRepo: ApiRepoData): Repository {
        return {
            repoName: apiRepo.RepoName,
            languages: this.parseLanguages(apiRepo.Language),
            repoType: this.inferRepoType(apiRepo.RepoName, apiRepo.Language),
            appPattern: apiRepo.AppPattern,
            successRate: this.parseSuccessRate(apiRepo.SuccessRate),
            repoURL: apiRepo.RepoURL,
            totalTasks: apiRepo.TotalTasks,
            successfulTasks: apiRepo.SuccessTasks
        };
    }

    private parseLanguages(languageString: string): string[] {
        if (!languageString) return [];
        
        // Handle various language string formats
        return languageString
            .split(/[,;\/]/) // Split by comma, semicolon, or slash
            .map(lang => lang.trim())
            .filter(lang => lang.length > 0)
            .map(lang => {
                // Normalize common language names
                const normalized = lang.toLowerCase();
                if (normalized.includes('ts') || normalized.includes('typescript')) return 'TypeScript';
                if (normalized.includes('js') || normalized.includes('javascript')) return 'JavaScript';
                if (normalized.includes('java') && !normalized.includes('script')) return 'Java';
                if (normalized.includes('python') || normalized.includes('py')) return 'Python';
                if (normalized.includes('c#') || normalized.includes('csharp')) return 'C#';
                if (normalized.includes('dotnet') || normalized.includes('.net')) return '.NET';
                if (normalized.includes('go')) return 'Go';
                if (normalized.includes('rust')) return 'Rust';
                if (normalized.includes('php')) return 'PHP';
                if (normalized.includes('ruby')) return 'Ruby';
                if (normalized.includes('shell') || normalized.includes('bash')) return 'Shell';
                if (normalized.includes('docker')) return 'Docker';
                if (normalized.includes('yaml') || normalized.includes('yml')) return 'YAML';
                if (normalized.includes('json')) return 'JSON';
                
                // Return original if no match found
                return lang.charAt(0).toUpperCase() + lang.slice(1).toLowerCase();
            });
    }

    private inferRepoType(repoName: string, language: string): RepoType {
        const name = repoName.toLowerCase();
        const lang = language.toLowerCase();
        
        // Check for common patterns in repo names
        if (name.includes('api') || name.includes('service') || name.includes('backend')) {
            return RepoType.Service;
        }
        
        if (name.includes('lib') || name.includes('package') || name.includes('utils') || name.includes('shared')) {
            return RepoType.Library;
        }
        
        if (name.includes('tool') || name.includes('cli') || name.includes('build') || name.includes('script')) {
            return RepoType.Tool;
        }
        
        // Default to Application for most cases
        return RepoType.Application;
    }

    private parseSuccessRate(successRateString: string): number {
        if (!successRateString || successRateString === '') return 0;
        
        // Remove % sign and convert to number
        const numericValue = parseFloat(successRateString.replace('%', ''));
        return isNaN(numericValue) ? 0 : numericValue / 100; // Convert to decimal (0-1)
    }

    private getMockRepositories(): Repository[] {
        // Fallback mock data
        return [
            {
                repoName: 'frontend-app',
                languages: ['TypeScript', 'JavaScript', 'CSS'],
                repoType: RepoType.Application,
                appPattern: 'React SPA',
                successRate: 0.95,
                repoURL: 'https://github.com/example/frontend-app'
            },
            {
                repoName: 'api-service',
                languages: ['C#', 'SQL'],
                repoType: RepoType.Service,
                appPattern: 'REST API',
                successRate: 0.88,
                repoURL: 'https://github.com/example/api-service'
            },
            {
                repoName: 'shared-utils',
                languages: ['TypeScript'],
                repoType: RepoType.Library,
                appPattern: 'NPM Package',
                successRate: 0.92,
                repoURL: 'https://github.com/example/shared-utils'
            },
            {
                repoName: 'build-tools',
                languages: ['Python', 'Shell'],
                repoType: RepoType.Tool,
                appPattern: 'CLI',
                successRate: 0.85,
                repoURL: 'https://github.com/example/build-tools'
            }
        ];
    }

    private generateRepoId(repoName: string): string {
        // Generate a consistent ID based on repo name
        let hash = 0;
        for (let i = 0; i < repoName.length; i++) {
            const char = repoName.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString().substring(0, 6);
    }

    async getRepositoryDetails(repoName: string): Promise<Repository | null> {
        try {
            console.log('Fetching repository details for:', repoName);
            
            // Try to fetch specific repository details using the dedicated API endpoint
            const response = await fetch(`${this.apiBaseUrl}/kusto/getRepoList`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    RepoName: repoName
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const apiResponse = await response.json() as ApiRepoResponse;
            console.log('Repository details API response:', apiResponse);
            
            if (apiResponse.data && apiResponse.data.length > 0) {
                // Use the first result from the API
                const apiRepo = apiResponse.data[0];
                const repo = this.transformApiRepoToRepository(apiRepo);
                
                // Return only the basic repository information from API
                return repo;
            }
            
            // Fallback: try to get from the full list if POST request didn't return data
            console.log('No data from POST request, falling back to full list...');
            const repos = await this.getRepositories();
            const repo = repos.find(r => r.repoName === repoName);
            
            if (repo) {
                // Return only the basic repository information
                return repo;
            }
            
            return null;
        } catch (error) {
            console.error('Error fetching repository details:', error);
            
            // Final fallback: try to get from the full list
            try {
                console.log('API error, falling back to full list...');
                const repos = await this.getRepositories();
                const repo = repos.find(r => r.repoName === repoName);
                
                if (repo) {
                    return repo;
                }
            } catch (fallbackError) {
                console.error('Fallback error:', fallbackError);
            }
            
            return null;
        }
    }

    async getRelatedTasks(repoName: string): Promise<RelatedTask[]> {
        try {
            console.log('Fetching related tasks for:', repoName);
            
            // For now, return mock data
            // In a real implementation, you would call an API endpoint
            return this.getMockTasksData(repoName);
            
        } catch (error) {
            console.error('Error fetching related tasks:', error);
            return this.getMockTasksData(repoName);
        }
    }



    private inferComputeResource(repo: Repository): string {
        const name = repo.repoName.toLowerCase();
        const languages = repo.languages.map(l => l.toLowerCase());
        
        if (languages.includes('javascript') || languages.includes('typescript') || languages.includes('react')) {
            return 'App Service';
        }
        if (languages.includes('python') || languages.includes('java')) {
            return 'Container Apps';
        }
        if (name.includes('function') || name.includes('lambda')) {
            return 'Azure Functions';
        }
        
        return 'App Service';
    }

    private inferBindingResource(repo: Repository): string {
        const bindingResources = [];
        
        // Common patterns
        if (repo.repoName.toLowerCase().includes('cache') || repo.languages.includes('Redis')) {
            bindingResources.push('Redis');
        }
        if (repo.repoName.toLowerCase().includes('db') || repo.repoName.toLowerCase().includes('data')) {
            bindingResources.push('CosmosDB');
        }
        
        // Default bindings
        bindingResources.push('KeyVault');
        
        // Add storage for certain types
        if (repo.languages.includes('JavaScript') || repo.languages.includes('TypeScript')) {
            bindingResources.push('Storage');
        }
        
        return bindingResources.slice(0, 2).join(', '); // Limit to 2 resources
    }

    private getMockTasksData(repoName: string): RelatedTask[] {
        const mockTasks: RelatedTask[] = [
            {
                taskId: `task-${this.generateRepoId(repoName)}-1`,
                repoName: repoName,
                creationTime: '2025-07-06 14:30',
                copilotModel: 'GPT-4.1',
                language: 'TypeScript',
                deployResult: 'Success',
                taskType: 'bicep',
                iterations: 3,
                createdBy: 'developer1'
            },
            {
                taskId: `task-${this.generateRepoId(repoName)}-2`,
                repoName: repoName,
                creationTime: '2025-07-05 10:15',
                copilotModel: 'Claude-3.5',
                language: 'JavaScript',
                deployResult: 'Failed',
                taskType: 'terraform',
                iterations: 7,
                createdBy: 'developer2'
            },
            {
                taskId: `task-${this.generateRepoId(repoName)}-3`,
                repoName: repoName,
                creationTime: '2025-07-04 16:45',
                copilotModel: 'GPT-4.0',
                language: 'TypeScript',
                deployResult: 'Success',
                taskType: 'mcp/non-mcp',
                iterations: 5,
                createdBy: 'developer1'
            },
            {
                taskId: `task-${this.generateRepoId(repoName)}-4`,
                repoName: repoName,
                creationTime: '2025-07-03 09:20',
                copilotModel: 'Claude-3.7',
                language: 'JavaScript',
                deployResult: 'Pending',
                taskType: 'bicep',
                iterations: 12,
                createdBy: 'developer3'
            }
        ];

        return mockTasks;
    }
}
