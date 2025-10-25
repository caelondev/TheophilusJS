/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 */

const express = require("express");
const rateLimit = require("express-rate-limit");
const path = require("path");
const config = require("../config.json");
const TotalWebPings = require("./models/TotalWebPings.js");
const formatTime = require("./utils/formatTime.js");

const app = express();
const PORT = 5000;

app.use(express.static(path.join(__dirname, "public")));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

let currentSessionPings = 0

app.get("/ping", async(_, res)=>{
  const totalWebPings = await TotalWebPings.findOne()
  totalWebPings.count++
  currentSessionPings++
  await totalWebPings.save()

  res.status(200).send({
    msg: "Pong!",
    uptime: formatTime(process.uptime()),
    totalWebPings: totalWebPings.count,
    currentSessionPings
  })
})

app.get("/invite", (req, res) => {
  res.redirect(config.discordInviteLink);
});
app.listen(PORT, () => console.log(`Dashboard running on port ${PORT}`));
