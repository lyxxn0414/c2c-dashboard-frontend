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

export default router;
