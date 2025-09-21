import { Router, Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import {
  Job,
  JobQueryParams,
  JobListResponse,
  CreateJobRequest,
  Task,
  TaskListResponse,
  TaskError,
  TaskErrorsResponse,
} from "../types/job.types";
import { externalJobService } from "../services/externalJobService";
import axios from "axios";

const router = Router();

/**
 * GET /api/jobs
 * Retrieve jobs with optional filtering and pagination
 */
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 10,
      sortBy = "CreatedTime",
      sortOrder = "desc",
      filter = "",
      CreatedBy,
      PooID,
      JobID,
      status,
    } = req.query as unknown as JobQueryParams & { filter: string };

    try {
      // Call external service with compatible format
      const response = await externalJobService.getJobsCompatible({
        page: Number(page),
        limit: Number(limit),
        sortBy,
        sortOrder,
        filter,
        CreatedBy,
        PooID,
        JobID,
        status,
      });

      res.json(response);
    } catch (error) {
      console.error("Error fetching jobs from external service:", error);

      // Fallback to mock data if external service fails
      const mockJobs: Job[] = [
        {
          TestJobID: "job-1",
          InitiatedBy: "alias",
          CreatedTime: "2025-06-23 14:57",
          JobDiscription: "External service unavailable - showing cached data",
          PoolName: "default-pool",
          TaskNum: 63,
          SuccessTasks: 58,
          SuccessRate: "92%",
        },
        {
          TestJobID: "job-2",
          InitiatedBy: "user2",
          CreatedTime: "2025-06-23 15:30",
          JobDiscription: "Fallback data - External API connection failed",
          PoolName: "test-pool",
          TaskNum: 45,
          SuccessTasks: 30,
          SuccessRate: "87%",
        },
      ];

      // Apply basic filtering to fallback data
      let filteredJobs = [...mockJobs];
      if (filter) {
        const filterLower = filter.toLowerCase();
        filteredJobs = filteredJobs.filter(
          (job) =>
            job.TestJobID.toLowerCase().includes(filterLower) ||
            job.InitiatedBy.toLowerCase().includes(filterLower) ||
            job.JobDiscription.toLowerCase().includes(filterLower)
        );
      }

      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.max(1, Math.min(100, Number(limit)));
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

      const fallbackResponse: JobListResponse = {
        jobs: paginatedJobs,
        total: filteredJobs.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(filteredJobs.length / limitNum),
      };

      res.json(fallbackResponse);
    }
  })
);

/**
 * GET /api/jobs/:id
 * Retrieve a specific job by ID
 */
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const job = await externalJobService.getJobById(id);
      console.log(`Fetched job ${id} from external service:`, job);
      const taskErrors =
        await externalJobService.getTaskFirstErrorDetailByJobID(id);
      console.log("Fetched task errors:", taskErrors);
      res.json({
        job: job,
        taskErrors: taskErrors,
      });
    } catch (error) {
      console.error(`Error fetching job ${id} from external service:`, error);

      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({
          error: "Job not found",
          message: `Job with ID ${id} does not exist`,
        });
      }

      // Return fallback data
      const fallbackJob: Job = {
        TestJobID: id,
        InitiatedBy: "unknown",
        CreatedTime: new Date().toISOString().slice(0, 16).replace("T", " "),
        JobDiscription: "External service unavailable - showing fallback data",
        PoolName: "fallback-pool",
        TaskNum: 0,
        SuccessTasks: 0,
        SuccessRate: "0%",
      };

      res.json(fallbackJob);
    }
  })
);

/**
 * GET /api/jobs/health/external
 * Check external service health
 */
router.get(
  "/health/external",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const isHealthy = await externalJobService.testConnection();
      const healthStatus = await externalJobService.getHealthStatus();

      res.json({
        external_service: {
          available: isHealthy,
          status: healthStatus,
          base_url: process.env.EXTERNAL_API_BASE_URL,
          last_checked: new Date().toISOString(),
        },
      });
    } catch (error) {
      res.status(503).json({
        external_service: {
          available: false,
          error: error instanceof Error ? error.message : "Unknown error",
          base_url: process.env.EXTERNAL_API_BASE_URL,
          last_checked: new Date().toISOString(),
        },
      });
    }
  })
);

/**
 * GET /api/jobs/tasks/:taskId
 * Retrieve specific task details
 */
router.get(
  "/tasks/:taskId",
  asyncHandler(async (req: Request, res: Response) => {
    const { taskId } = req.params;
    const { jobId, repoName } = req.query;

    try {
      // Try to get task details from external service
      const taskResponse = await externalJobService.getTaskDetail(taskId);

      if (taskResponse) {
        res.json(taskResponse);
        return;
      }
    } catch (error) {
      console.error(
        "Error fetching task details from external service:",
        error
      );
    }

    // Fallback to mock data based on the attachment image
    const mockTaskDetail = {
      taskId: taskId,
      jobId: jobId || "job-sample",
      repoName: repoName || "azure-samples/contoso-chat",
      name: "Task-sample",
      creationTime: "2025-06-23 14:57",
      description:
        "CopilotModel, Language, Deploy Result, Iterations, TaskType, VSCodeVersion, ExtensionVersion, InitialPrompt, testlog",

      // Tool call counts
      toolCalls: {
        recommend: "xx",
        predeploy: "xx",
        deploy: "xx",
        region: "xx",
        quota: "xx",
        getLogs: "xx",
      },

      // AI Integration counts
      aiIntegration: {
        fillMainParametersJSONWithOpenAI: 2,
        generateUserInputWithOpenAI: 5,
        judgeAzdUpSuccessWithOpenAI: 5,
      },

      // Deploy failure details
      deployFailureDetails: [
        {
          iterationNum: 5,
          time: "2025-06-23 14:57",
          errorCategory: "Malformed bicep",
          errorDescription: "Invalid configuration",
          errorDetail:
            "Disabling public network access is not supported for the SKU Standard",
        },
        {
          iterationNum: 10,
          time: "2025-06-23 15:02",
          errorCategory: "Authentication",
          errorDescription: "Access denied",
          errorDetail: "Insufficient permissions to create resource group",
        },
        {
          iterationNum: 14,
          time: "2025-06-23 15:05",
          errorCategory: "Resource conflict",
          errorDescription: "Resource already exists",
          errorDetail: "Storage account name already taken",
        },
      ],

      // Copilot responses per iteration
      copilotResponses: [
        {
          time: "2025-06-23 14:57",
          inputCommand:
            "ops I have already logged into AZ CLI and authenticated. I need your tool to deploy this app to Azure with AZD Let me start by scanning the project structure to understand the services and their dependencies.",
          toolCall: "invalid configuration",
          copilotResponse:
            "I'll help you deploy this app to Azure with AZD Let me start by scanning the project structure to understand the services and their dependencies. *Read compose.yml, lines 1 to 42*, *Read README.md, lines 1 to 50*, *Read package.json, lines 1 to 30*, *Read Dockerfile, lines 1 to 15*, *Read route.ts, lines 1 to 27*, Now let me analyze the project and call the Azure service recommendation tool.",
        },
      ],
    };

    res.json(mockTaskDetail);
  })
);

/**
 * GET /api/jobs/:jobId/tasks
 * Get all tasks for a specific job by Job ID
 */
router.get(
  "/:jobId/tasks",
  asyncHandler(async (req: Request, res: Response) => {
    const { jobId } = req.params;

    try {
      console.log(`Fetching task list for job: ${jobId}`);

      // Call external service to get task list
      const taskListResponse = await externalJobService.getTaskListByJobID(
        jobId
      );

      if (taskListResponse && taskListResponse.data) {
        console.log(
          `Successfully fetched ${taskListResponse.data.length} tasks for job ${jobId}`
        );
        res.json(taskListResponse);
        return;
      }

      // If no data returned, return empty response
      res.json({
        name: "PrimaryResult",
        data: [],
      });
    } catch (error) {
      console.error(`Error fetching task list for job ${jobId}:`, error);

      // Return mock fallback data based on the provided example
      const fallbackResponse = {
        name: "PrimaryResult",
        data: [
          {
            TaskID: "yueli6-defangsamplesdja-424da5c8",
            Languages: ["Python"],
            CopilotModel: "GPT-4.1",
            RepoType: "Defang",
            AppPattern: "1+0",
            UseTerraform: false,
            IsSuccessful: false,
          },
          {
            TaskID: "yueli6-defangsamplesmet-fe2cd766",
            Languages: ["TS/JS"],
            CopilotModel: "GPT-4.1",
            RepoType: "Defang",
            AppPattern: "1+0",
            UseTerraform: false,
            IsSuccessful: true,
          },
        ],
      };

      res.json(fallbackResponse);
    }
  })
);

/**
 * POST /api/jobs/errors/recent
 * Get task errors for recent days
 */
router.post(
  "/errors/recent",
  asyncHandler(async (req: Request, res: Response) => {
    const { period = 3 } = req.body;

    try {
      const periodNum = parseInt(period as string, 10);
      if (isNaN(periodNum) || periodNum < 1 || periodNum > 30) {
        return res.status(400).json({
          error:
            "Invalid period. Period must be a number between 1 and 30 days.",
        });
      }

      console.log(`Fetching task errors for last ${periodNum} days`);

      // Call external service
      const response = await externalJobService.getTaskErrorsLastPeriod(
        periodNum
      );

      res.json(response);
    } catch (error) {
      console.error("Error fetching task errors from external service:", error);

      // Fallback to mock data if external service fails
      const mockErrors = [
        {
          TaskID: "mock-task-001",
          TestJobID: "mock-job-001",
          CreatedDate: new Date(
            Date.now() - 1 * 24 * 60 * 60 * 1000
          ).toISOString(),
          TaskType: "Agent Tool",
          UseTerraform: false,
          ErrorCategory: "Docker",
          ErrorDescription: "Module not found in Dockerfile.",
          ErrorDetail:
            "External service unavailable - showing mock error data for testing.",
        },
        {
          TaskID: "mock-task-002",
          TestJobID: "mock-job-002",
          CreatedDate: new Date(
            Date.now() - 2 * 24 * 60 * 60 * 1000
          ).toISOString(),
          TaskType: "Agent Tool",
          UseTerraform: true,
          ErrorCategory: "Infrastructure",
          ErrorDescription: "Terraform validation failed.",
          ErrorDetail:
            "Mock data - External API connection failed. This is fallback data for development.",
        },
        {
          TaskID: "mock-task-003",
          TestJobID: "mock-job-003",
          CreatedDate: new Date(
            Date.now() - 3 * 24 * 60 * 60 * 1000
          ).toISOString(),
          TaskType: "Agent Tool",
          UseTerraform: false,
          ErrorCategory: "Malformed bicep",
          ErrorDescription: "Invalid configuration for container app.",
          ErrorDetail:
            "Mock fallback data - Failed to provision revision for container app. This is test data when external service is unavailable.",
        },
      ];

      const fallbackResponse = {
        name: "PrimaryResult",
        data: mockErrors,
      };

      res.json(fallbackResponse);
    }
  })
);

router.post(
  "/downloadInfra",
  asyncHandler(async (req: Request, res: Response) => {
    const { infraFolderUrl, ymlUrl } = req.body;

    if (!infraFolderUrl || !ymlUrl) {
      return res.status(400).json({ error: "Invalid URLs." });
    }

    try {
      const requestBody = {
        infraFolderUrl,
        ymlUrl
      };

      const baseURL = process.env.EXTERNAL_API_BASE_URL || "https://c2c-test-dashboard-d8feccd5dgbmd7a2.eastus-01.azurewebsites.net";
      
      // Make request directly to external service
      const response = await axios({
        method: 'POST',
        url: `${baseURL}/storage-blob/download-infra`,
        data: requestBody,
        responseType: 'stream',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      // Copy headers from external service response
      const contentType = response.headers['content-type'] || 'application/zip';
      const contentDisposition = response.headers['content-disposition'] || 'attachment; filename="infrastructure-files.zip"';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', contentDisposition);

      // Pipe the response stream directly to our response
      response.data.pipe(res);
      
    } catch (error) {
      console.error("Error downloading infrastructure files:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to download infrastructure files." });
      }
    }
  })
);

router.post(
  "/downloadPlan",
  asyncHandler(async (req: Request, res: Response) => {
    const { planUrl } = req.body;
    
    if (!planUrl) {
      return res.status(400).json({ error: "Plan URL is required." });
    }
    
    try {
      const requestBody = {
        planUrl
      };

      const baseURL = process.env.EXTERNAL_API_BASE_URL || "https://c2c-test-dashboard-d8feccd5dgbmd7a2.eastus-01.azurewebsites.net";
      
      // Make request directly to external service
      const response = await axios({
        method: 'POST',
        url: `${baseURL}/storage-blob/download-plan`,
        data: requestBody,
        responseType: 'stream',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      // Copy headers from external service response
      const contentType = response.headers['content-type'] || 'text/markdown';
      const contentDisposition = response.headers['content-disposition'] || 'attachment; filename="plan.md"';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', contentDisposition);

      // Pipe the response stream directly to our response
      response.data.pipe(res);
      
    } catch (error) {
      console.error("Error downloading plan:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to download plan." });
      }
    }
  })
);

export default router;
