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
  // 移除文件大小限制，允许任意大小文件上传
  limits: {
    // 注意：移除大小限制可能导致服务器内存问题，建议配置Node.js内存限制或使用流式处理
    // fieldSize: 无限制
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
    console.log("Creating new repository...");    // Validate required fields
    const { repoType, appPattern, repoUrl, languages, grouping} = req.body;
    
    if (!repoType || !appPattern || !repoUrl || !languages || !grouping) {
      return res.status(400).json({ 
        error: "Missing required fields: repoType, appPattern, repoUrl, languages, grouping" 
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
    }    // Validate app pattern
    const validAppPatterns = ['1+0', '1+1', '1+N', 'N+0', 'N+1', 'N+N', 'unknown'];
    if (!validAppPatterns.includes(appPattern)) {
      return res.status(400).json({ error: "Invalid app pattern" });
    }

    // Validate repository URL
    try {
      new URL(repoUrl);
    } catch (error) {
      return res.status(400).json({ error: "Invalid repository URL format" });
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
    }    // Create repository data
    const newRepoData = {
      repoType,
      appPattern,
      repoUrl,
      languages: parsedLanguages,
      grouping,
      filePath: req.file.path,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      uploadDate: new Date().toISOString()
    };    
    console.log("Repository data:", newRepoData);

    // Upload repository to external API instead of just creating locally
    const result = await repoService.uploadRepository({
      repoURL: repoUrl,
      languages: parsedLanguages,
      repoType,
      appPattern,
      grouping,
      filePath: req.file.path,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      uploadDate: new Date().toISOString()
    }, req.file);
    
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

// POST /api/repos/upload - Upload repository (matching PowerShell script format)
router.post("/upload", upload.single('files'), async (req: Request, res: Response) => {
  try {
    console.log("Uploading repository...");
    console.log("Request body:", req.body);
    console.log("Request file:", req.file);

    // Extract fields that match PowerShell script
    const { repoURL, languages, repoType, appPattern, grouping } = req.body;
    
    if (!repoURL || !languages || !repoType || !appPattern || !grouping) {
      return res.status(400).json({ 
        error: "Missing required fields: repoURL, languages, repoType, appPattern, grouping" 
      });
    }

    // Validate file upload
    if (!req.file) {
      return res.status(400).json({ error: "Repository file is required" });
    }

    // Parse languages - expecting comma-separated string like "C#,.NET"
    const parsedLanguages = languages.split(',').map((lang: string) => lang.trim());

    // Create repository data matching the expected backend format
    const uploadData = {
      repoURL,
      languages: parsedLanguages,
      repoType,
      appPattern,
      grouping,
      filePath: req.file.path,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      uploadDate: new Date().toISOString()
    };

    console.log("Upload data:", uploadData);

    // Forward the request to the external API using the service
    const result = await repoService.uploadRepository(uploadData, req.file);
    
    res.status(201).json({
      message: "Repository uploaded successfully",
      result: result
    });

  } catch (error) {
    console.error("Error uploading repository:", error);
    
    // Clean up uploaded file if there was an error
    if (req.file) {
      const fs = require('fs');
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error("Error cleaning up uploaded file:", unlinkError);
      }
    }
    
    res.status(500).json({ error: "Failed to upload repository" });
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
