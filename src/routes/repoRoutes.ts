import express, { Request, Response } from "express";
import multer from "multer";
import path from "path";
import { RepoService } from "../services/repoService";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, 'uploads/repos/'); // Make sure this directory exists
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Check file type
    const allowedTypes = ['.zip', '.tar', '.gz', '.rar'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExt) || file.originalname.toLowerCase().endsWith('.tar.gz')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .zip, .tar.gz, .tar, and .rar files are allowed.'));
    }
  }
});

const router = express.Router();
const repoService = RepoService.getInstance();

// GET /api/repos
router.get("/", async (req, res) => {
  try {
    const repos = await repoService.getRepositories();
    res.json(repos);
  } catch (error) {
    console.error("Error fetching repositories:", error);
    res.status(500).json({ error: "Failed to fetch repositories" });
  }
});

// POST /api/repos - Add new repository
router.post("/", upload.single('repoFile'), async (req: Request, res: Response) => {
  try {
    console.log("Creating new repository...");
    
    // Validate required fields
    const { repoName, repoType, languages, grouping, description = '' } = req.body;
    
    if (!repoName || !repoType || !languages || !grouping) {
      return res.status(400).json({ 
        error: "Missing required fields: repoName, repoType, languages, grouping" 
      });
    }

    // Validate file upload
    if (!req.file) {
      return res.status(400).json({ error: "Repository file is required" });
    }

    // Parse languages JSON
    let parsedLanguages: string[];
    try {
      parsedLanguages = JSON.parse(languages);
    } catch (error) {
      return res.status(400).json({ error: "Invalid languages format" });
    }

    // Validate repo type
    const validRepoTypes = ['Defang', 'Hero', 'JavaMigration', 'DotnetMigration', 'RecommendProject'];
    if (!validRepoTypes.includes(repoType)) {
      return res.status(400).json({ error: "Invalid repository type" });
    }

    // Validate grouping
    const validGroupings = ['Minimal', 'Medium', 'Full'];
    if (!validGroupings.includes(grouping)) {
      return res.status(400).json({ error: "Invalid grouping option" });
    }

    // Validate languages
    const validLanguages = ['Go', 'Python', 'TS/JS', 'C#', 'Java'];
    const invalidLanguages = parsedLanguages.filter(lang => !validLanguages.includes(lang));
    if (invalidLanguages.length > 0) {
      return res.status(400).json({ error: `Invalid languages: ${invalidLanguages.join(', ')}` });
    }

    // Create repository data
    const newRepoData = {
      repoName,
      repoType,
      languages: parsedLanguages,
      grouping,
      description,
      filePath: req.file.path,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      uploadDate: new Date().toISOString()
    };

    console.log("Repository data:", newRepoData);

    // Add repository using service
    const result = await repoService.createRepository(newRepoData);
    
    res.status(201).json({
      message: "Repository created successfully",
      repository: result
    });

  } catch (error) {
    console.error("Error creating repository:", error);
    
    // Clean up uploaded file if there was an error
    if (req.file) {
      const fs = require('fs');
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error("Error cleaning up uploaded file:", unlinkError);
      }
    }
    
    res.status(500).json({ error: "Failed to create repository" });
  }
});

// GET /api/repos/:repoName
router.get("/:repoName", async (req, res) => {
  try {
    // Decode the repository name to handle URL encoding (e.g., %2F -> /)
    const repoName = decodeURIComponent(req.params.repoName);
    console.log("Fetching repository details for:", repoName);
    const repo = await repoService.getRepositoryDetails(repoName);
    if (repo) {
      res.json(repo);
    } else {
      res.status(404).json({ error: "Repository not found" });
    }
  } catch (error) {
    console.error("Error fetching repository details:", error);
    res.status(500).json({ error: "Failed to fetch repository details" });
  }
});

// GET /api/repos/:repoName/tasks
router.get("/:repoName/tasks", async (req, res) => {
  try {
    // Decode the repository name to handle URL encoding (e.g., %2F -> /)
    const repoName = decodeURIComponent(req.params.repoName);
    console.log("Fetching related tasks for repository:", repoName);
    const tasks = await repoService.getRelatedTasks(repoName);
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching related tasks:", error);
    res.status(500).json({ error: "Failed to fetch related tasks" });
  }
});

// GET /api/repos/by-encoded-name/:encodedName
router.get("/by-encoded-name/:encodedName", async (req, res) => {
  try {
    // Decode the base64 encoded repository name
    const encodedName = req.params.encodedName;
    // Convert URL-safe base64 back to regular base64
    const base64Name = encodedName.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    const paddedBase64 = base64Name + '='.repeat((4 - base64Name.length % 4) % 4);
    
    const repoName = Buffer.from(paddedBase64, 'base64').toString('utf-8');
    console.log("Fetching repository details for (from base64):", repoName);
    
    const repo = await repoService.getRepositoryDetails(repoName);
    if (repo) {
      res.json(repo);
    } else {
      res.status(404).json({ error: "Repository not found" });
    }
  } catch (error) {
    console.error("Error decoding or fetching repository details:", error);
    res.status(400).json({ error: "Invalid encoded repository name" });
  }
});

export default router;
