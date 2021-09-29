const express = require("express");
const User = require("../models/user");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authConfig = require("../../config/auth.json");
const crypto = require("crypto");
const mailer = require("../../modules/mailer");

function generateToken(params = {}) {
  return jwt.sign(params, authConfig.secret, {
    expiresIn: 86400,
  });
}

router.post("/register", async (req, res) => {
  const { email } = req.body;
  try {
    if (await User.findOne({ email }))
      return res.status(400).send({ error: "User already exists!" });
    const user = await User.create(req.body);
    user.password = undefined;
    return res.send({ user, token: generateToken({ id: user.id }) });
  } catch (error) {
    return res.status(400).send({ error: "Registration failed!" });
  }
});

router.post("/authenticate", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(400).send({ error: "User not found!" });
    if (!(await bcrypt.compare(password, user.password)))
      return res.status(400).send({ error: "Invalid password!" });
    user.password = undefined;

    // ===== GENERATE TOKEN (JWT) =====

    res.send({ user, token: generateToken({ id: user.id }) });
  } catch (error) {
    return res.status(400).send({ error: "Authentication failed!" });
  }
});

router.post("/forgot_password", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).send({ error: "User not found!" });

    const token = crypto.randomBytes(20).toString("hex");
    const now = new Date();
    now.setHours(now.getHours() + 1);

    await User.findByIdAndUpdate(user.id, {
      $set: {
        passwordResetToken: token,
        passwordResetExpires: now,
      },
    });

    mailer.sendMail(
      {
        to: email,
        from: "rayan@rayan.com.br",
        html: `<p>Você esqueceu sua senha? Não tem problema, utilize esse token: ${token}</p>`,
      },
      (err) => {
        if (err)
          return res
            .status(400)
            .send({ error: "Could not send forgot password email!" });
        return res.send();
      }
    );
  } catch (error) {
    console.error(error);
    return res
      .status(400)
      .send({ error: "Error on forgot password, try again!" });
  }
});

router.post("/reset_password", async (req, res) => {
  const { email, token, password } = req.body;
  try {
    const user = await User.findOne({ email }).select(
      "+passwordResetToken passwordResetExpires"
    );
    if (!user) return res.status(400).send({ error: "User not found!" });

    if (token !== user.passwordResetToken)
      return res.status(400).send({ error: "Invalid token!" });
    if (new Date() > user.passwordResetExpires)
      return res
        .status(400)
        .send({ error: "Expired token, generate a new one!" });

    user.password = password;
    await user.save();
    return res.send();
  } catch (error) {
    return res
      .status(400)
      .send({ error: "Could not reset password, try again!" });
  }
});

module.exports = (app) => app.use("/auth", router);
