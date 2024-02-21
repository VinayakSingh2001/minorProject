const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { generateToken, hashToken } = require("../utils");
const parser = require("ua-parser-js");
const crypto = require("crypto");
const Token = require("../models/tokenModel");

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

//Send Verification Email
const sendVerificationEmail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found.");
  }

  if (user.isVerified) {
    res.status(400);
    throw new Error("User already verified.");
  }

  //if user is not verified then we create a token and then send that token to the user
  //but first we check the DB if there is any token or not
  //if there exists one then we delete that token

  //Delete token if it exists in DB
  let token = await Token.findOne({ userId: user._id });
  if (token) {
    await token.deleteOne();
  }

  //Create Verrification token and save in DB
  const verificationToken = crypto.randomBytes(32).toString("hex") + user._id;

  //now we have generated a token now we want to save this to the DB
  //and send an email to user
  //Hash Token and save
  const hashedToken = hashToken(verificationToken);
  await new Token({
    userId: user._id,
    vToken: hashedToken,
    createdAt: Date.now(),
    expiresAt: Data.now() + 60 * (60 * 1000), //60 min
  }).save();

  //now lets construct a verification url that we will send to the user
  //we are saving this "hashedToken" in the DB but we will send this "verificationToken" to the user

  //CONSTRUCT A VERIFICTION URL
  const verificationUrl = `${process.env.FRONTEND_URL}/verify/${verificationToken}`;
  //now we need to send the email

  //SEND EMAIL
  const subject = "verify your account - AUTH-F";
  const send_to = user.email;
  const sent_from = process.env.EMAIL_USER;
  const reply_to = "noreply@test.com";
  const template = "verifyEmail";
  const name = user.name;
  const link = verificationUrl;

  try {
    await sendEmail(
      subject,
      send_to,
      sent_from,
      reply_to,
      template,
      name,
      link
    );
    res.status(200).json({ message: "Email Sent" });
  } catch (error) {
    res.status(500);
    throw new Error("Email not sent, please try again");
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

//get User
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
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
    });
  } else {
    res.status(400);
    throw new Error("User not found!.");
  }
});

//update User
const updateUser = asyncHandler(async (req, res) => {
  //the data will come from the frontend
  const user = await User.findById(req.user._id);
  if (user) {
    const { name, email, phone, bio, photo, role, isVerified } = user;

    user.email = email;

    user.name = req.body.name || name;
    user.phone = req.body.phone || phone;
    user.bio = req.body.bio || bio;
    user.photo = req.body.photo || photo;

    const updatedUser = await user.save();

    res.status(200).json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      bio: updatedUser.bio,
      photo: updatedUser.phone,
      role: updatedUser.role,
      isVerified: updatedUser.isVerified,
    });
  } else {
    res.status(404);
    throw new Error("user not found.");
  }
});

//Delete User
const deleteUser = asyncHandler(async (req, res) => {
  //the id of the user that we want to delete will come in the params
  const user = user.findById(req.params.id);

  if (!user) {
    res.status(400);
    throw new Error("User not found.");
  }

  await user.remove();
  res.status(200).json({
    message: "user deleted successfully",
  });
});

//Get Users
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort("-createdAt").select("-password");
  if (!users) {
    res.status(500);
    throw new Error("something went wrong.");
  }

  res.status(200).json(users);
});

//Get login status
const loginStatus = asyncHandler(async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json(false);
  }

  //verify token
  const verified = jwt.verify(token, process.env.JWT_SECRET);

  if (verified) {
    return res.json(true);
  }
  return res.json(false);
});

//upgrade User
const upgradeUser = asyncHandler(async (req, res) => {
  //we need the id of the user to upgrade its role
  const { role, id } = req.body;

  const user = await User.findById(id);

  if (!user) {
    res.status(404);
    throw new Error("User not found.");
  }

  user.role = role;
  await user.save();

  res.status(200).json({
    message: `User role updated to ${role}`,
  });
});

//send automated email
const sendAutomatedEmail = asyncHandler(async (req, res) => {
  const { subject, send_to, reply_to, template, url } = req.body;

  //what if these things are not send from the frontend therefore we check for it
  if (!subject || !send_to || !reply_to || !template) {
    res.status(500);
    throw new Error("Missing email parameter");
  }

  // Get user
  const user = await User.findOne({ email: send_to });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const sent_from = process.env.EMAIL_USER;
  const name = user.name;
  const link = `${process.env.FRONTEND_URL}${url}`;

  try {
    await sendEmail(
      subject,
      send_to,
      sent_from,
      reply_to,
      template,
      name,
      link
    );
    res.status(200).json({ message: "Email Sent" });
  } catch (error) {
    res.status(500);
    throw new Error("Email not sent, please try again");
  }
  //
});

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getUser,
  updateUser,
  deleteUser,
  getUsers,
  loginStatus,
  upgradeUser,
  sendAutomatedEmail,
  sendVerificationEmail,
};
