export const verifyRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      const userRole = req.user.role;
      
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to perform this action"
        });
      }
      
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };
};
