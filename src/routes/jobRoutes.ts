import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { Job, JobStatus, JobQueryParams, JobListResponse, CreateJobRequest } from '../types/job.types';
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
    sortBy = 'creationTime',
    sortOrder = 'desc',
    filter = '',
    createdBy,
    status,
    poolId
  } = req.query as unknown as JobQueryParams & { filter: string };

  try {
    // Call external service
    const response = await externalJobService.getJobs({
      page: Number(page),
      limit: Number(limit),
      sortBy,
      sortOrder,
      filter,
      createdBy,
      status,
      poolId
    });

    res.json(response);
  } catch (error) {
    console.error('Error fetching jobs from external service:', error);
    
    // Fallback to mock data if external service fails
    const mockJobs: Job[] = [
      {
        id: 'job-1',
        createdBy: 'alias',
        creationTime: '2025-06-23 14:57',
        description: 'External service unavailable - showing cached data',
        taskNum: 63,
        finishedTaskNum: 63,
        successRate: '92% ( 58/63 )',
        status: JobStatus.COMPLETED
      },
      {
        id: 'job-2', 
        createdBy: 'user2',
        creationTime: '2025-06-23 15:30',
        description: 'Fallback data - External API connection failed',
        taskNum: 45,
        finishedTaskNum: 30,
        successRate: '87% ( 26/30 )',
        status: JobStatus.RUNNING
      }
    ];

    // Apply basic filtering to fallback data
    let filteredJobs = [...mockJobs];
    if (filter) {
      const filterLower = filter.toLowerCase();
      filteredJobs = filteredJobs.filter(job => 
        job.id.toLowerCase().includes(filterLower) ||
        job.createdBy.toLowerCase().includes(filterLower) ||
        job.description.toLowerCase().includes(filterLower)
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
    res.json(job);
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
      id: id,
      createdBy: 'unknown',
      creationTime: new Date().toISOString().slice(0, 16).replace('T', ' '),
      description: 'External service unavailable - showing fallback data',
      taskNum: 0,
      finishedTaskNum: 0,
      successRate: '0% ( 0/0 )',
      status: JobStatus.PENDING
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
      id: `job-${Date.now()}`,
      createdBy: 'current-user',
      creationTime: new Date().toLocaleString('sv-SE', { timeZone: 'UTC' }).replace('T', ' ').substring(0, 16),
      description: createJobData.description + ' (Created locally - external service unavailable)',
      taskNum: 0,
      finishedTaskNum: 0,
      successRate: '0% ( 0/0 )',
      status: JobStatus.PENDING
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
