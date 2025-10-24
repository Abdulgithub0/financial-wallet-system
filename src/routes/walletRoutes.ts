import { Router } from 'express';
import { walletController } from '../controllers/walletController';
import { authenticate } from '../middleware/auth';
import { transferRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(authenticate);

router.get('/balance', walletController.getBalance.bind(walletController));
router.post('/credit', walletController.credit.bind(walletController));
router.post('/debit', walletController.debit.bind(walletController));
router.post('/transfer', transferRateLimiter, walletController.transfer.bind(walletController));
router.get('/transactions', walletController.getTransactionHistory.bind(walletController));
router.get('/transactions/:reference', walletController.getTransactionByReference.bind(walletController));

export default router;

