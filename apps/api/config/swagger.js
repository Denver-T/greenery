const swaggerJsdoc = require("swagger-jsdoc");
const path = require("path");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Greenery API",
      version: "1.0.0",
      description: "API documentation for the Greenery project",
    },
    servers: [
      {
        url: "http://localhost:3001",
      },
    ],
  },
  apis: [path.join(__dirname, "../src/routes/*.js")],
};

const specs = swaggerJsdoc(options);

module.exports = specs;
