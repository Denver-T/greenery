const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/health");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const userRoutes = require("./api/users/route");
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('../config/swagger');


const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/health", healthRoutes);

// User
app.use("/users", userRoutes);

// Documents
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// 404 handler
app.use(notFound);
app.use(errorHandler);

module.exports = app;