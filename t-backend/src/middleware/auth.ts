import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt';
import { User } from '../models/User';
import { AuthRequest } from '../types';

/**
 * Auth middleware - reads the access token from the httpOnly cookie,
 * verifies it, and attaches the user to the request.
 */
export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies?.access_token;

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.userId).select('-password').lean();

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Assign with _id cast to string for the IUser interface
    req.user = {
      ...user,
      _id: user._id.toString(),
    };
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
}
