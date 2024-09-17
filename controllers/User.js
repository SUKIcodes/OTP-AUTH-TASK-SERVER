const User = require("../models/User");
const nodemailer = require("nodemailer");
const cloudinary = require("cloudinary");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

let mailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "emailtestingscam@gmail.com",
    pass: "dbpdwpixluuhwuca",
  },
});

const register = async (req, res) => {
  try {
    const { name, email, password, avatar } = req.body;
    let user = await User.findOne({ email });
    if (user) {
      return res
        .status(400)
        .json({ success: false, message: "User already registered" });
    }
    const myCloud = await cloudinary.v2.uploader.upload(avatar, {
      folder: "avatars",
    });
    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(Math.random() * 100000);
    let details = {
      from: "emailtestingscam@gmail.com",
      to: email,
      subject: "TASK APP - KING :: Email Verification OTP",
      text: `Dear ${name}, Please use ${otp} to validate your Email ID. This OTP is valid for 3 minutes.`,
    };
    mailTransporter.sendMail(details);

    user = await User.create({
      name,
      email,
      password: hashedPassword,
      avatar: { public_id: myCloud.public_id, url: myCloud.secure_url },
      otp,
      otp_expiry: new Date(Date.now() + 3 * 60 * 1000),
    });
    const token = await jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
    res
      .status(201)
      .cookie("token", token, { httpOnly: true })
      .json({
        success: true,
        user,
        message: `OTP sent to ${email} for verification`,
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const verify = async (req, res) => {
  try {
    const { otp } = Number(req.body);
    const user = await User.findById(req.user._id);
    if (user.otp === otp || user.otp_expiry > Date.now()) {
      (user.verified = true), (user.otp = null), (user.otp_expiry = null);
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid OTP or OTP expired." });
    }
    await user.save();
    let details = {
      from: "emailtestingscam@gmail.com",
      to: user.email,
      subject: "TASK APP - KING :: Verification done",
      text: `Dear ${user.name}, Verification completed. Continue to Login`,
    };
    mailTransporter.sendMail(details);
    res
      .status(200)
      .json({ success: true, message: "OTP verified continue to login" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Register first to login." });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials." });
    }
    const token = await jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
    res.status(201).cookie("token", token, { httpOnly: true }).json({
      success: true,
      user,
      message: "Logged In",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const logout = async (req, res) => {
  try {
    res
      .status(200)
      .cookie("token", null, { expires: new Date(Date.now()) })
      .json({ success: true, message: "Logged out successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Email." });
    }
    const otp = Math.floor(Math.random() * 1000000);
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpiry = new Date(Date.now() + 3 * 60 * 1000);
    await user.save();
    let details = {
      from: "emailtestingscam@gmail.com",
      to: user.email,
      subject: "TASK APP - KING :: Password Reset OTP",
      text: `Dear ${user.name}, Your otp for account password reset is ${otp}, This OTP is valid for only 3 minutes .`,
    };
    mailTransporter.sendMail(details);
    res.status(200).json({
      success: true,
      message: `OTP sent to ${email} for password reset`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const reset = async (req, res) => {
  try {
    const { otp, newPassword } = req.body;

    const user = await User.findOne({
      resetPasswordOtp: otp,
      resetPasswordOtpExpiry: { $gt: Date.now() },
    });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid OTP or has expired." });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordOtp = null;
    user.resetPasswordOtpExpiry = null;
    await user.save();
    let details = {
      from: "emailtestingscam@gmail.com",
      to: user.email,
      subject: "KING-COMMUNITY :: Account Password Reset",
      text: `Dear ${user.name}, Your account password has been changed successfully.`,
    };
    mailTransporter.sendMail(details);
    res.status(200).json({
      success: true,
      message: `Account Password changed successfully`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const myProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res
      .status(200)
      .json({ success: true, message: `Welcome ${user.name}`, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const addTask = async (req, res) => {
  try {
    const { title, description } = req.body;
    const user = await User.findById(req.user._id);
    user.tasks.push({
      title,
      description,
      completed: false,
      createdAt: new Date(),
    }),
      await user.save();
    res
      .status(200)
      .json({ success: true, message: "Task added successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const removeTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const user = await User.findById(req.user._id);
    user.tasks = user.tasks.filter(
      (task) => task._id.toString() !== taskId.toString()
    );
    await user.save();
    res
      .status(200)
      .json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const user = await User.findById(req.user._id);
    user.task = user.tasks.find(
      (task) => task._id.toString() === taskId.toString()
    );
    user.task.completed = !user.task.completed;
    await user.save();
    res
      .status(200)
      .json({ success: true, message: "Task updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { name, avatar } = req.body;

    if (name) {
      user.name = name;
    }

    if (avatar) {
      await cloudinary.v2.uploader.destroy(user.avatar.public_id);

      const myCloud = await cloudinary.v2.uploader.upload(avatar, {
        folder: "avatars",
      });
      user.avatar.public_id = myCloud.public_id;
      user.avatar.url = myCloud.secure_url;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile Updated",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updatePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Enter all fiels..." });
    }
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid old Password" });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    res.status(200).json({ success: true, message: "Password updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  register,
  verify,
  login,
  logout,
  forgotPassword,
  reset,
  myProfile,
  addTask,
  removeTask,
  updateTask,
  updateProfile,
  updatePassword,
};
