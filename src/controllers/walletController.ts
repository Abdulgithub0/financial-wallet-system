import { Request, Response, NextFunction } from 'express';
import { walletService } from '../services/walletService';
import { TransactionRequest, TransferRequest } from '../types';

export class WalletController {
  async getBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const balance = await walletService.getBalance(req.user.userId);

      res.status(200).json({
        success: true,
        message: 'Balance retrieved successfully',
        data: balance,
      });
    } catch (error) {
      next(error);
    }
  }

  async credit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const data: TransactionRequest = req.body;
      const ipAddress = req.ip;

      const transaction = await walletService.credit(
        req.user.userId,
        data.amount,
        data.description,
        data.reference,
        ipAddress
      );

      res.status(201).json({
        success: true,
        message: 'Credit transaction successful',
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  }

  async debit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const data: TransactionRequest = req.body;
      const ipAddress = req.ip;

      const transaction = await walletService.debit(
        req.user.userId,
        data.amount,
        data.description,
        data.reference,
        ipAddress
      );

      res.status(201).json({
        success: true,
        message: 'Debit transaction successful',
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTransactionHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await walletService.getTransactionHistory(req.user.userId, page, limit);

      res.status(200).json({
        success: true,
        message: 'Transaction history retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTransactionByReference(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const { reference } = req.params;

      const transaction = await walletService.getTransactionByReference(reference, req.user.userId);

      if (!transaction) {
        res.status(404).json({
          success: false,
          message: 'Transaction not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Transaction retrieved successfully',
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  }

  async transfer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const data: TransferRequest = req.body;
      const ipAddress = req.ip;

      if (!data.recipient_email && !data.recipient_user_id) {
        res.status(400).json({
          success: false,
          message: 'Either recipient_email or recipient_user_id must be provided',
        });
        return;
      }

      if (!data.amount || data.amount <= 0) {
        res.status(400).json({
          success: false,
          message: 'Valid amount is required',
        });
        return;
      }

      const result = await walletService.transfer(
        req.user.userId,
        data.recipient_email,
        data.recipient_user_id,
        data.amount,
        data.description,
        data.reference,
        ipAddress
      );

      res.status(201).json({
        success: true,
        message: 'Transfer successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const walletController = new WalletController();

