const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { generateToken } = require("../utils");
const parser = require("ua-parser-js");

//Register User
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Validation
  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please fill in all the required fields.");
  }

  if (password.length < 6) {
    res.status(400);
    throw new Error("Password must be up to 6 characters.");
  }

  // Check if user exists
  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error("Email already in use.");
  }

  //get userAgent
  //this userAgent fetches information such as -  ua: 'Thunder Client (https://www.thunderclient.com)',
  // browser: { name: undefined, version: undefined, major: undefined },
  // engine: { name: undefined, version: undefined },
  // os: { name: undefined, version: undefined },
  // device: { vendor: undefined, model: undefined, type: undefined },
  // cpu: { architecture: undefined }
  //about the clint
  const ua = parser(req.headers["user-agent"]);
  const userAgent = [ua.ua];

  //   Create new user
  const user = await User.create({
    name,
    email,
    password,
    userAgent,
  });

  // Generate Token
  const token = generateToken(user._id);

  // Send HTTP-only cookie
  res.cookie("token", token, {
    path: "/",
    httpOnly: true,
    expires: new Date(Date.now() + 1000 * 86400), // 1 day
    sameSite: "none",
    secure: true,
  });

  if (user) {
    const { _id, name, email, phone, bio, photo, role, isVerified } = user;

    res.status(201).json({
      _id,
      name,
      email,
      phone,
      bio,
      photo,
      role,
      isVerified,
      token,
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

//Login User
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  //validation
  if (!email || !password) {
    res.status(400);
    throw new Error("Please fill Email and Password.");
  }

  //check if user exists
  const user = await User.findOne({ email });
  if (!user) {
    res.status(400);
    throw new Error("User not found, Please register.");
  }

  //when we were saving the password we hashed it via bcrypt, but bcrypt has a way to compare the passwords
  const passwordIsCorrect = await bcrypt.compare(password, user.password);
  if (!passwordIsCorrect) {
    res.status(400);
    throw new Error("Invalid email or password.");
  }
  //TRIGGER 2 FACTOR AUTH FOR unknown UserAgents
  //now if user exists and password is correct, the next thing we need to check
  //if that user's device is authorized or not
  //we login the user by sending a token(a jsonwebtoken to the user's client or browser)

  //Generate token
  const token = generateToken(user._id);

  if (user && passwordIsCorrect) {
    //as user exists and password is correct, then we login the user ,
    //HOW DO WE LOGIN--> we just sendin the http cookie to the frontend that will contain our token
    // Send HTTP-only cookie
    res.cookie("token", token, {
      path: "/",
      httpOnly: true,
      expires: new Date(Date.now() + 1000 * 86400), // 1 day
      sameSite: "none",
      secure: true,
    });
    //now we also want to send some data about the user to the frontend
    //so we will send it in json
    const { _id, name, email, phone, bio, photo, role, isVerified } = user;

    res.status(200).json({
      _id,
      name,
      email,
      phone,
      bio,
      photo,
      role,
      isVerified,
      token,
    });
  } else {
    res.status(500);
    throw new Error("Something went wrong,Please try again.");
  }
});

//Logout User
const logoutUser = asyncHandler(async (req, res) => {
  //as we login the user via sending a cookie to the frontend and that cookie has an expiration date
  //so if we expire that cookie->then the user is loggedout.
  //we can also delete the cookie but we prefere expiration on cookie
  res.cookie("token", "", {
    path: "/",
    httpOnly: true,
    expires: new Date(0), //expired the cookie
    sameSite: "none",
    secure: true,
  });
  return res.status(200).json({
    message: "Logout Successfull",
  });
});

const getUser = asyncHandler(async (req, res) => {
  res.send("get User");
});

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getUser,
};
