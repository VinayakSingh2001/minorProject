const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");

const protect = asyncHandler(async (req, res, next) => {
  try {
    //as we login a user by sending  a cookie, so lets get that cookie(as cookie is saved as token)
    const token = req.cookies.token;
    if (!token) {
      res.status(401);
      throw new Error("Not Authorized, please Login.");
    }
    //if there is a token, then verify the token
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    //get user id from token (as we created the token with 'id')
    const user = await User.findById(verified.id).select("-password");

    if (!user) {
      res.status(404);
      throw new Error("user not found");
    }

    //if the user is suspented, then do not let him perform
    if (user.role === "suspended") {
      res.status(400);
      throw new Error("User is suspended, please contact support.");
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401);
    throw new Error("Not Authorized, please Login.");
  }
});

const adminOnly = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(401);
    throw new Error("Not Authorized as an Admin");
  }
});

const authorOnly = asyncHandler(async (req, res, next) => {
  if (req.user.role === "author" || req.user.role === "admin") {
    next();
  } else {
    res.status(401);
    throw new Error("Not Authorized as an author");
  }
});

const verifiedOnly = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.isVerified) {
    next();
  } else {
    res.status(401);
    throw new Error("Not Authorized, account not verified");
  }
});

module.exports = { protect, verifiedOnly, adminOnly, authorOnly };
