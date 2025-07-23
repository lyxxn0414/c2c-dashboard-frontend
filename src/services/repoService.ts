import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import {
  RepoType,
  ApiRepoResponse,
  ApiRepoData,
  RelatedTask,
  ApiTaskErrorResponse,
  ApiTaskErrorData,
} from "../types/repo.types";

export class RepoService {
  private static instance: RepoService;
  private client: AxiosInstance;
  private apiBaseUrl =
    "https://c2c-test-dashboard-d8feccd5dgbmd7a2.eastus-01.azurewebsites.net";

  private constructor() {
    // Configure axios client similar to externalJobService
    this.client = axios.create({
      baseURL: this.apiBaseUrl,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "C2C-Dashboard/1.0",
      },
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config: any) => {
        console.log(`[RepoService] Making request to: ${config.url}`);
        if (config.data) {
          console.log(
            `[RepoService] Request Body:`,
            JSON.stringify(config.data, null, 2)
          );
        }
        return config;
      },
      (error: any) => {
        console.error("[RepoService] Request error:", error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response: any) => {
        console.log(`[RepoService] Response status: ${response.status}`);
        return response;
      },
      (error: any) => {
        console.log("=== RepoService API Error Debug ===");
        console.error(`Error Status: ${error.response?.status}`);
        console.error(`Error URL: ${error.config?.url}`);
        console.error(`Error Message: ${error.message}`);
        if (error.response?.data) {
          console.error(
            `Error Response:`,
            JSON.stringify(error.response.data, null, 2)
          );
        }
        console.log("===================================");
        return Promise.reject(error);
      }
    );
  }

  /**
   * Make a request with retry logic
   */
  private async requestWithRetry<T>(
    config: AxiosRequestConfig,
    attempts: number = 3
  ): Promise<T> {
    try {
      const response = await this.client.request<T>(config);
      return response.data;
    } catch (error: any) {
      if (attempts > 1 && this.shouldRetry(error)) {
        console.log(
          `[RepoService] Retrying request, ${attempts - 1} attempts left`
        );
        await this.delay(1000 * (3 - attempts + 1)); // Progressive delay
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
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public static getInstance(): RepoService {
    if (!RepoService.instance) {
      RepoService.instance = new RepoService();
    }
    return RepoService.instance;
  }

  async getRepositories(): Promise<any[]> {
    try {
      console.log("Fetching repositories from API...");
      const response = await fetch(`${this.apiBaseUrl}/kusto/getRepoList`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const apiResponse = (await response.json()) as ApiRepoResponse;
      console.log("API response:", apiResponse);

      // Transform API data to frontend format
      const repositories = apiResponse.data.map((apiRepo) =>
        this.transformApiRepoToRepository(apiRepo)
      );

      console.log("Transformed repositories:", repositories);
      return repositories;
    } catch (error) {
      console.error("Error fetching repositories from API:", error);

      // Fallback to mock data if API fails
      console.log("Falling back to mock data");
      return [];
    }
  }

  private transformApiRepoToRepository(apiRepo: ApiRepoData): any {
    return {
      repoName: apiRepo.RepoName,
      languages: this.parseLanguages(apiRepo.Language),
      repoType: apiRepo.RepoType,
      appPattern: apiRepo.AppPattern,
      successRate: this.parseSuccessRate(apiRepo.SuccessRate),
      repoURL: apiRepo.RepoURL,
      totalTasks: apiRepo.TotalTasks || 0,
      successfulTasks: apiRepo.SuccessTasks || 0,
      repoGroup: apiRepo.RepoGroup || "default",
    };
  }

  private parseLanguages(languageString: string): string[] {
    if (!languageString) return [];

    // Handle various language string formats
    return languageString
      .split(/[,]/) // Split by comma, semicolon, or slash
      .map((lang) => lang.trim())
      .filter((lang) => lang.length > 0)
      .map((lang) => {
        return lang;
      });
  }

  private inferRepoType(repoName: string, language: string): RepoType {
    const name = repoName.toLowerCase();
    const lang = language.toLowerCase();

    // Check for common patterns in repo names
    if (
      name.includes("api") ||
      name.includes("service") ||
      name.includes("backend")
    ) {
      return RepoType.Service;
    }

    if (
      name.includes("lib") ||
      name.includes("package") ||
      name.includes("utils") ||
      name.includes("shared")
    ) {
      return RepoType.Library;
    }

    if (
      name.includes("tool") ||
      name.includes("cli") ||
      name.includes("build") ||
      name.includes("script")
    ) {
      return RepoType.Tool;
    }

    // Default to Application for most cases
    return RepoType.Application;
  }

  private parseSuccessRate(successRateString: string): number {
    if (!successRateString || successRateString === "") return 0;

    // Remove % sign and convert to number
    const numericValue = parseFloat(successRateString.replace("%", ""));
    return isNaN(numericValue) ? 0 : numericValue / 100; // Convert to decimal (0-1)
  }

  private generateRepoId(repoName: string): string {
    // Generate a consistent ID based on repo name
    let hash = 0;
    for (let i = 0; i < repoName.length; i++) {
      const char = repoName.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString().substring(0, 6);
  }

  async getRepositoryDetails(repoName: string): Promise<any | null> {
    try {
      console.log("Fetching repository details for:", repoName);

      // Try to fetch specific repository details using the dedicated API endpoint
      const response = await fetch(`${this.apiBaseUrl}/kusto/getRepoList`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          RepoName: repoName,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const apiResponse = (await response.json()) as ApiRepoResponse;
      console.log("Repository details API response:", apiResponse);

      if (apiResponse.data && apiResponse.data.length > 0) {
        // Use the first result from the API
        const apiRepo = apiResponse.data[0];
        const repo = this.transformApiRepoToRepository(apiRepo);

        // Return only the basic repository information from API
        return repo;
      }

      // Fallback: try to get from the full list if POST request didn't return data
      console.log("No data from POST request, falling back to full list...");
      const repos = await this.getRepositories();
      const repo = repos.find((r) => r.repoName === repoName);

      if (repo) {
        // Return only the basic repository information
        return repo;
      }

      return null;
    } catch (error) {
      console.error("Error fetching repository details:", error);

      // Final fallback: try to get from the full list
      try {
        console.log("API error, falling back to full list...");
        const repos = await this.getRepositories();
        const repo = repos.find((r) => r.repoName === repoName);

        if (repo) {
          return repo;
        }
      } catch (fallbackError) {
        console.error("Fallback error:", fallbackError);
      }

      return null;
    }
  }
  async getRelatedTasks(repoName: string): Promise<RelatedTask[]> {
    try {
      console.log("From repoService: Fetching related tasks for:", repoName);

      // Call the getRepoErrorList API endpoint using axios with retry logic
      const response = await this.requestWithRetry<ApiTaskErrorResponse>({
        method: "GET",
        url: "/kusto/getRepoErrorList",
        data: {
          RepoName: repoName,
        },
      });

      console.log("Related tasks API response:", response);

      if (response.data) {
        // Transform API data to frontend format
        const tasks = response.data.map((apiTask) =>
          this.transformApiTaskToRelatedTask(apiTask, repoName)
        );
        console.log("Transformed related tasks:", tasks);
        return tasks;
      }
      return [];
    } catch (error) {
      console.error("Error in getRelatedTasks:", error);
      throw error; // Re-throw to see the actual error
    }
  }
  /**
   * Create a new repository
   * @param repoData - Repository data including file information
   * @returns Promise<Repository> - Created repository object
   */ async createRepository(repoData: {
    repoType: string;
    appPattern: string;
    repoUrl: string;
    languages: string[];
    grouping: string;
    filePath: string;
    fileName: string;
    fileSize: number;
    uploadDate: string;
  }): Promise<any> {
    try {
      console.log("Creating new repository:", repoData);

      // Create a repository object that matches our Repository interface
      const newRepository = {
        languages: repoData.languages,
        repoType: repoData.repoType,
        appPattern: repoData.appPattern,
        repoURL: repoData.repoUrl,
        grouping: repoData.grouping,
      };

      console.log("Repository created successfully:", newRepository);
      return newRepository;
    } catch (error) {
      console.error("Error creating repository:", error);
      throw new Error(
        "Failed to create repository: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  }

  /**
   * Upload repository to external API
   */
  async uploadRepository(
    uploadData: any,
    file: Express.Multer.File
  ): Promise<any> {
    try {
      console.log("Uploading repository to external API...");

      // Create FormData for multipart request
      const FormData = require("form-data");
      const fs = require("fs");

      const formData = new FormData();

      // Add form fields
      formData.append("repoURL", uploadData.repoURL);
      formData.append("languages", uploadData.languages.join(","));
      formData.append("repoType", uploadData.repoType);
      formData.append("appPattern", uploadData.appPattern);
      formData.append("grouping", uploadData.grouping);

      // Add file
      formData.append("files", fs.createReadStream(file.path), {
        filename: file.originalname,
        contentType: "application/zip",
      }); // Make request to external API
      const response = await this.client.post(
        "/storage-blob/upload-repo",
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            "Content-Type": "multipart/form-data",
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      console.log("Upload response:", response.data);

      // Validate the response from external API
      if (response.status >= 200 && response.status < 300) {
        // Check if the response indicates success
        const responseData = response.data;
        if (
          typeof responseData === "string" &&
          responseData.toLowerCase().includes("success")
        ) {
          return { success: true, message: responseData, data: responseData };
        } else if (responseData && responseData.success !== false) {
          // If no explicit failure indication, assume success for 2xx responses
          return {
            success: true,
            message: "Repository uploaded successfully",
            data: responseData,
          };
        } else {
          throw new Error(
            `Upload failed: ${
              responseData?.message || "Unknown error from external API"
            }`
          );
        }
      } else {
        throw new Error(`Upload failed with status: ${response.status}`);
      }
    } catch (error: any) {
      console.error("Error uploading repository:", error);
      if (error.response) {
        console.error("Error response data:", error.response.data);
        throw new Error(
          `Upload failed: ${
            error.response.data?.message || error.response.status
          }`
        );
      }
      throw error;
    }
  }

  /**
   * Transform API task error data to RelatedTask format
   * @param apiTask - Raw task data from API
   * @param repoName - Repository name
   * @returns RelatedTask - Transformed task object
   */
  private transformApiTaskToRelatedTask(
    apiTask: ApiTaskErrorData,
    repoName: string
  ): RelatedTask {
    // Parse created date to a more readable format
    const createdDate = new Date(apiTask.CreatedDate);
    const formattedDate =
      createdDate.getFullYear() +
      "-" +
      String(createdDate.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(createdDate.getDate()).padStart(2, "0") +
      " " +
      String(createdDate.getHours()).padStart(2, "0") +
      ":" +
      String(createdDate.getMinutes()).padStart(2, "0");

    // Determine deploy result based on IsSuccessful and error information
    let deployResult: string;
    if (apiTask.IsSuccessful) {
      deployResult = "Success";
    } else {
      deployResult = "Failed";
    }

    // Extract language from task type or use a default
    let language = "Unknown";
    if (apiTask.TaskType.toLowerCase().includes("terraform")) {
      language = "HCL";
    } else if (apiTask.TaskType.toLowerCase().includes("bicep")) {
      language = "Bicep";
    } else if (apiTask.TaskType.toLowerCase().includes("kubernetes")) {
      language = "YAML";
    } else {
      language = "TypeScript"; // Default for most tasks
    }

    return {
      taskId: apiTask.TaskID,
      repoName: repoName,
      creationTime: formattedDate,
      copilotModel: apiTask.CopilotModel,
      language: language,
      deployResult: deployResult,
      taskType:
        apiTask.TaskType + "/" + (apiTask.UseTerraform ? "terraform" : "bicep"), // Use task type and terraform flag
      iterations: apiTask.Iterations, // API doesn't provide this, use default
      createdBy: "system", // API doesn't provide this, use default
      // Include additional fields from the API
      jobId: apiTask.JobID,
      useTerraform: apiTask.UseTerraform,
      errorCategory: apiTask.ErrorCategory,
      errorDescription: apiTask.ErrorDescription,
      errorDetail: apiTask.ErrorDetail,
      isSuccessful: apiTask.IsSuccessful,
    };
  }

  private getMockTasksData(repoName: string): RelatedTask[] {
    const mockTasks: RelatedTask[] = [
      {
        taskId: `task-${this.generateRepoId(repoName)}-1`,
        repoName: repoName,
        creationTime: "2025-07-06 14:30",
        copilotModel: "GPT-4.1",
        language: "TypeScript",
        deployResult: "Success",
        taskType: "bicep",
        iterations: 3,
        createdBy: "developer1",
      },
      {
        taskId: `task-${this.generateRepoId(repoName)}-2`,
        repoName: repoName,
        creationTime: "2025-07-05 10:15",
        copilotModel: "Claude-3.5",
        language: "JavaScript",
        deployResult: "Failed",
        taskType: "terraform",
        iterations: 7,
        createdBy: "developer2",
      },
      {
        taskId: `task-${this.generateRepoId(repoName)}-3`,
        repoName: repoName,
        creationTime: "2025-07-04 16:45",
        copilotModel: "GPT-4.0",
        language: "TypeScript",
        deployResult: "Success",
        taskType: "mcp/non-mcp",
        iterations: 5,
        createdBy: "developer1",
      },
      {
        taskId: `task-${this.generateRepoId(repoName)}-4`,
        repoName: repoName,
        creationTime: "2025-07-03 09:20",
        copilotModel: "Claude-3.7",
        language: "JavaScript",
        deployResult: "Pending",
        taskType: "bicep",
        iterations: 12,
        createdBy: "developer3",
      },
    ];

    return mockTasks;
  }
}
