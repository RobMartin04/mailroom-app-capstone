/**
 * Authorization Middleware for CRUD Permission Matrix
 *
 * CRUD Matrix:
 * - Students: READ only (their own packages)
 * - Workers: CREATE, READ, UPDATE, DELETE (all resources)
 */

/**
 * Define permissions for each resource and role
 */
const PERMISSIONS = {
  packages: {
    student: ['read_own'],
    worker: ['create', 'read', 'update', 'delete']
  },
  recipients: {
    student: [], // No access to recipients
    worker: ['create', 'read', 'update', 'delete']
  }
};

/**
 * Check if user has required permission
 * @param {string} resource - Resource type ('packages' or 'recipients')
 * @param {string} action - Action type ('create', 'read', 'update', 'delete', 'read_own')
 */
export function requirePermission(resource, action) {
  return (req, res, next) => {
    const user = req.user;

    if (!user || !user.type) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to perform this action'
      });
    }

    const userPermissions = PERMISSIONS[resource]?.[user.type] || [];

    if (!userPermissions.includes(action)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `${user.type}s are not allowed to ${action} ${resource}`,
        required: action,
        userRole: user.type,
        resource: resource
      });
    }

    next();
  };
}

/**
 * Worker-only access (full CRUD)
 * Maintained for backward compatibility
 */
export function requireWorker(req, res, next) {
  if (req.user.type !== 'worker') {
    return res.status(403).json({
      error: 'Worker access required',
      message: 'This action requires mailroom worker privileges'
    });
  }
  next();
}

/**
 * Ensure user can only access their own resources
 * Used for student access to their packages
 */
export function requireOwnership(resourceIdParam = 'id') {
  return (req, res, next) => {
    const user = req.user;

    // Workers can access all resources
    if (user.type === 'worker') {
      return next();
    }

    // For students, we'll validate ownership in the route handler
    // This middleware just marks that ownership check is required
    req.requireOwnership = true;
    next();
  };
}

/**
 * Get user permissions for a resource
 * Useful for frontend to determine what UI elements to show
 */
export function getUserPermissions(userType, resource) {
  return PERMISSIONS[resource]?.[userType] || [];
}

/**
 * Check if user has specific permission
 */
export function hasPermission(userType, resource, action) {
  const permissions = PERMISSIONS[resource]?.[userType] || [];
  return permissions.includes(action);
}

export default {
  requirePermission,
  requireWorker,
  requireOwnership,
  getUserPermissions,
  hasPermission,
  PERMISSIONS
};
