import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { Job, JobQueryParams, JobListResponse, CreateJobRequest } from '../types/job.types';
import { externalJobService } from '../services/externalJobService';

const router = Router();

/**
 * GET /api/jobs
 * Retrieve jobs with optional filtering and pagination
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'CreatedTime',
    sortOrder = 'desc',
    filter = '',
    CreatedBy,
    PooID,
    JobID,
    status
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
      status
    });

    res.json(response);
  } catch (error) {
    console.error('Error fetching jobs from external service:', error);
    
    // Fallback to mock data if external service fails
    const mockJobs: Job[] = [
      {
        TestJobID: 'job-1',
        InitiatedBy: 'alias',
        CreatedTime: '2025-06-23 14:57',
        JobDiscription: 'External service unavailable - showing cached data',
        PoolName: 'default-pool',
        TaskNum: 63,
        SuccessTasks: 58,
        SuccessRate: '92%'
      },
      {
        TestJobID: 'job-2',
        InitiatedBy: 'user2',
        CreatedTime: '2025-06-23 15:30',
        JobDiscription: 'Fallback data - External API connection failed',
        PoolName: 'test-pool',
        TaskNum: 45,
        SuccessTasks: 30,
        SuccessRate: '87%'
      }
    ];

    // Apply basic filtering to fallback data
    let filteredJobs = [...mockJobs];
    if (filter) {
      const filterLower = filter.toLowerCase();
      filteredJobs = filteredJobs.filter(job => 
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
      totalPages: Math.ceil(filteredJobs.length / limitNum)
    };

    res.json(fallbackResponse);
  }
}));

/**
 * GET /api/jobs/:id
 * Retrieve a specific job by ID
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const job = await externalJobService.getJobById(id);
    console.log(`Fetched job ${id} from external service:`, job);
    const taskErrors = await externalJobService.getTaskFirstErrorDetailByJobID(id);
    const classifications = ['Model','RepoType','AppPattern','Language'];
    const classifiedResults: { [key: string]: any } = {};
    for (const classification of classifications) {
      classifiedResults[classification] = await externalJobService.getClassifiedResultsByJobID(id, classification);
      console.log(`Fetched classified results for ${classification}:`, classifiedResults[classification]);
    }
    console.log("Fetched task errors:", taskErrors);
    res.json({
      job: job,
      taskErrors: taskErrors,
      classifiedResults: classifiedResults
    });
  } catch (error) {
    console.error(`Error fetching job ${id} from external service:`, error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Job not found',
        message: `Job with ID ${id} does not exist`
      });
    }

    // Return fallback data
    const fallbackJob: Job = {
      TestJobID: id,
      InitiatedBy: 'unknown',
      CreatedTime: new Date().toISOString().slice(0, 16).replace('T', ' '),
      JobDiscription: 'External service unavailable - showing fallback data',
      PoolName: 'fallback-pool',
      TaskNum: 0,
      SuccessTasks: 0,
      SuccessRate: '0%'
    };

    res.json(fallbackJob);
  }
}));

/**
 * POST /api/jobs
 * Create a new job
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const createJobData: CreateJobRequest = req.body;

  if (!createJobData.description) {
    return res.status(400).json({
      error: 'Validation error',
      message: 'Description is required'
    });
  }

  try {
    const newJob = await externalJobService.createJob(createJobData);
    res.status(201).json(newJob);
  } catch (error) {
    console.error('Error creating job in external service:', error);
    
    // Create a fallback response
    const fallbackJob: Job = {
      TestJobID: `job-${Date.now()}`,
      InitiatedBy: 'current-user',
      CreatedTime: new Date().toLocaleString('sv-SE', { timeZone: 'UTC' }).replace('T', ' ').substring(0, 16),
      JobDiscription: createJobData.description + ' (Created locally - external service unavailable)',
      PoolName: 'local-pool',
      TaskNum: 0,
      SuccessTasks: 0,
      SuccessRate: '0%'
    };

    res.status(201).json(fallbackJob);
  }
}));

/**
 * PUT /api/jobs/:id
 * Update a job status or details
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const updatedJob = await externalJobService.updateJob(id, updateData);
    res.json(updatedJob);
  } catch (error) {
    console.error(`Error updating job ${id} in external service:`, error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Job not found',
        message: `Job with ID ${id} does not exist`
      });
    }

    return res.status(500).json({
      error: 'External service error',
      message: 'Unable to update job at this time'
    });
  }
}));

/**
 * DELETE /api/jobs/:id
 * Delete a job
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await externalJobService.deleteJob(id);
    res.json(result);
  } catch (error) {
    console.error(`Error deleting job ${id} from external service:`, error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Job not found',
        message: `Job with ID ${id} does not exist`
      });
    }

    return res.status(500).json({
      error: 'External service error',
      message: 'Unable to delete job at this time'
    });
  }
}));

/**
 * GET /api/jobs/health/external
 * Check external service health
 */
router.get('/health/external', asyncHandler(async (req: Request, res: Response) => {
  try {
    const isHealthy = await externalJobService.testConnection();
    const healthStatus = await externalJobService.getHealthStatus();
    
    res.json({
      external_service: {
        available: isHealthy,
        status: healthStatus,
        base_url: process.env.EXTERNAL_API_BASE_URL,
        last_checked: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(503).json({
      external_service: {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        base_url: process.env.EXTERNAL_API_BASE_URL,
        last_checked: new Date().toISOString()
      }
    });
  }
}));

export default router;
