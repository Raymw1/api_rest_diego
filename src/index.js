const express = require("express");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

require("./controllers/authController")(app);
require("./controllers/projectController")(app);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Go to http://localhost:${PORT}`);
});
