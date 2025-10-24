import { Request, Response, NextFunction } from 'express';
import { authController } from '../controllers/authController';
import { authService } from '../services/authService';

// Mock authService
jest.mock('../services/authService', () => ({
  authService: {
    register: jest.fn(),
    login: jest.fn(),
    getUserById: jest.fn(),
  },
}));

describe('AuthController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      body: {},
      ip: '127.0.0.1',
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('register', () => {
    const registerData = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      full_name: 'Test User',
      phone_number: '+2348012345678',
    };

    const mockResult = {
      user: {
        id: 'user-123',
        email: registerData.email,
        full_name: registerData.full_name,
        phone_number: registerData.phone_number,
        is_verified: false,
        created_at: new Date(),
      },
      token: 'jwt-token',
    };

    it('should successfully register a user', async () => {
      mockRequest.body = registerData;
      (authService.register as jest.Mock).mockResolvedValueOnce(mockResult);

      await authController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(authService.register).toHaveBeenCalledWith(registerData, '127.0.0.1');
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User registered successfully',
        data: mockResult,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error on registration failure', async () => {
      const error = new Error('Registration failed');
      mockRequest.body = registerData;
      (authService.register as jest.Mock).mockRejectedValueOnce(error);

      await authController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'SecurePass123!',
    };

    const mockResult = {
      user: {
        id: 'user-123',
        email: loginData.email,
        full_name: 'Test User',
        phone_number: '+2348012345678',
        is_verified: false,
        created_at: new Date(),
      },
      token: 'jwt-token',
    };

    it('should successfully login a user', async () => {
      mockRequest.body = loginData;
      (authService.login as jest.Mock).mockResolvedValueOnce(mockResult);

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(authService.login).toHaveBeenCalledWith(loginData, '127.0.0.1');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful',
        data: mockResult,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error on login failure', async () => {
      const error = new Error('Login failed');
      mockRequest.body = loginData;
      (authService.login as jest.Mock).mockRejectedValueOnce(error);

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      full_name: 'Test User',
      phone_number: '+2348012345678',
      is_verified: false,
      created_at: new Date(),
    };

    it('should return user profile when authenticated', async () => {
      mockRequest.user = { userId: 'user-123', email: 'test@example.com' };
      (authService.getUserById as jest.Mock).mockResolvedValueOnce(mockUser);

      await authController.getProfile(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(authService.getUserById).toHaveBeenCalledWith('user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile retrieved successfully',
        data: mockUser,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await authController.getProfile(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(authService.getUserById).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 404 when user is not found', async () => {
      mockRequest.user = { userId: 'user-123', email: 'test@example.com' };
      (authService.getUserById as jest.Mock).mockResolvedValueOnce(null);

      await authController.getProfile(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(authService.getUserById).toHaveBeenCalledWith('user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error on service failure', async () => {
      const error = new Error('Service error');
      mockRequest.user = { userId: 'user-123', email: 'test@example.com' };
      (authService.getUserById as jest.Mock).mockRejectedValueOnce(error);

      await authController.getProfile(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});

