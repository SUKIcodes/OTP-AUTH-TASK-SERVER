const express = require("express");
const {
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
} = require("../controllers/User");
const isAuthenticated = require("../middleware/auth");
const router = express.Router();

router.post("/register", register);
router.post("/verify", isAuthenticated, verify);
router.post("/login", login);
router.get("/logout", logout);
router.post("/forgotpassword", forgotPassword);
router.post("/reset", reset);
router.get("/me", isAuthenticated, myProfile);
router.post("/newtask", isAuthenticated, addTask);
router.delete("/task/:taskId", isAuthenticated, removeTask);
router.get("/task/:taskId", isAuthenticated, updateTask);
router.put("/updateprofile", isAuthenticated, updateProfile);
router.put("/updatepassword", isAuthenticated, updatePassword);

module.exports = router;
