const express = require("express");
const app = express();
const path = require("path");
const favicon = require("serve-favicon");

const PORT = 3000;

app.use(favicon(__dirname + "/public/favicon.ico"));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

app.listen(PORT, () => console.log("Listening on port: ", PORT));