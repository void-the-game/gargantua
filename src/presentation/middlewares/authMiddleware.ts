import { Request, Response, NextFunction } from 'express'
import { JwtTokenService } from '@/infrastructure/services/JwtTokenService'
import { jwtSecret } from '@/config/vars'

// Estender o tipo Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
      }
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Authentication token is required',
      })
      return
    }

    const token = authHeader.substring(7)

    if (!jwtSecret) throw new Error('JWT secret is required')

    const jwtService = new JwtTokenService(jwtSecret)
    const decoded = await jwtService.verifyToken(token)

    req.user = {
      id: decoded.userId,
    }

    next()
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    })
    return
  }
}
