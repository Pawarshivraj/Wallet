const express = require("express");
const app = express();
app.use(express.json());
require("dotenv").config();
const dbconfig = require("./config/dbConfig");
const userRoute = require("./routes/userRoute");
const transactionsRoute = require("./routes/transactionsRoute");
const requestsRoute = require("./routes/requestsRoute");
app.use("/api/users", userRoute);
app.use("/api/transactions", transactionsRoute);
app.use("/api/requests", requestsRoute);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`server running on ${PORT}`);
});
