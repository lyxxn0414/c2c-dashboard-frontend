import express from 'express';
import { RepoService } from '../services/repoService';

const router = express.Router();
const repoService = RepoService.getInstance();

// GET /api/repos
router.get('/', async (req, res) => {
    try {
        const repos = await repoService.getRepositories();
        res.json(repos);
    } catch (error) {
        console.error('Error fetching repositories:', error);
        res.status(500).json({ error: 'Failed to fetch repositories' });
    }
});

// GET /api/repos/:repoName
router.get('/:repoName', async (req, res) => {
    try {
        console.log('Fetching repository details for:', req.params.repoName);
        const { repoName } = req.params;
        const repo = await repoService.getRepositoryDetails(repoName);
        if (repo) {
            res.json(repo);
        } else {
            res.status(404).json({ error: 'Repository not found' });
        }
    } catch (error) {
        console.error('Error fetching repository details:', error);
        res.status(500).json({ error: 'Failed to fetch repository details' });
    }
});

// GET /api/repos/:repoName/tasks
router.get('/:repoName/tasks', async (req, res) => {
    try {
        console.log('Fetching related tasks for repository:', req.params.repoName);
        const { repoName } = req.params;
        const tasks = await repoService.getRelatedTasks(repoName);
        res.json(tasks);
    } catch (error) {
        console.error('Error fetching related tasks:', error);
        res.status(500).json({ error: 'Failed to fetch related tasks' });
    }
});

export default router;
