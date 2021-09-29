const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const authConfig = require("../../config/auth.json");
const authMiddleware = require("../middlewares/auth");

router.use(authMiddleware);

router.get("/", async (req, res) => {
  return res.send("Ok");
});

module.exports = (app) => app.use("/projects", router);
