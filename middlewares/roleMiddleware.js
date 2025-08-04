// Middleware to verify user role for protected routes
export const verifyRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      //  Extract user role from req.user (should be set by auth middleware)
      const userRole = req.user.role;
      
      //  Deny access if user's role is not in the allowedRoles array
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to perform this action"
        });
      }
      
      //  User has required role, proceed to next middleware/controller
      next();
    } catch (error) {
      //  Handle unexpected errors (e.g., req.user not set)
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };
};
