const express = require("express");
const app = express();
const path = require("path");

app.use(express.static(path.join(__dirname, "client/build")));
app.get("*", function(req, res) {
  res.sendFile(path.join(__dirname, "client", "build", "index.html"));
});

// start server
const port = process.env.PORT || 8080;
app.listen(port, function() {
  console.log("Server listening on port " + port);
});
