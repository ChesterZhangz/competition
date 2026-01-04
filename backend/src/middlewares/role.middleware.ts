import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/user.model';

// Role hierarchy: super_admin > admin > teacher > student > guest
const roleHierarchy: Record<UserRole, number> = {
  super_admin: 100,
  admin: 80,
  teacher: 60,
  student: 40,
  guest: 20,
};

/**
 * Middleware to check if user has one of the required roles
 */
export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role as UserRole;

    if (!userRole) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      });
    }

    next();
  };
}

/**
 * Middleware to check if user has at least the minimum role level
 */
export function requireMinRole(minRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role as UserRole;

    if (!userRole) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    const userLevel = roleHierarchy[userRole] || 0;
    const minLevel = roleHierarchy[minRole] || 0;

    if (userLevel < minLevel) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      });
    }

    next();
  };
}

/**
 * Middleware to check if user is an admin (super_admin or admin)
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userRole = req.user?.role as UserRole;

  if (!userRole) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }

  if (userRole !== 'super_admin' && userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required',
      },
    });
  }

  next();
}

/**
 * Middleware to check if user can create problem banks (teacher or above)
 */
export function requireTeacher(req: Request, res: Response, next: NextFunction) {
  const userRole = req.user?.role as UserRole;

  if (!userRole) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }

  if (roleHierarchy[userRole] < roleHierarchy.teacher) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Teacher access required',
      },
    });
  }

  next();
}
