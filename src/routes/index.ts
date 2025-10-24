import { Router } from 'express';
import authRoutes from './authRoutes';
import walletRoutes from './walletRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/wallet', walletRoutes);

export default router;

