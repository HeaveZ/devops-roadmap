require('dotenv').config();
const express = require('express');
const cors = require('cors');
const emailRoutes = require('./routes/email');
const healthRouter = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.use(healthRouter);
app.use('/email', emailRoutes);

app.listen(PORT, () => {
  console.log(`Email sender running on port ${PORT}`);
});
