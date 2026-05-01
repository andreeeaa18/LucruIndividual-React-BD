const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Should I Know This API",
      version: "1.0.0",
      description: "REST API for posts, users, likes and comments",
    },
    servers: [{ url: `http://localhost:${process.env.PORT || 5000}` }],
    components: {
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string" },
            email: { type: "string" },
            name: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Comment: {
          type: "object",
          properties: {
            id: { type: "string" },
            postId: { type: "string" },
            userId: { $ref: "#/components/schemas/User" },
            parentId: {
              type: "string",
              nullable: true,
              description: "ID of parent comment for replies",
            },
            content: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Post: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            image: { type: "string" },
            authorId: { $ref: "#/components/schemas/User" },
            likeCount: { type: "integer" },
            commentCount: { type: "integer" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.js"],
  // comments.js is already matched by the glob above
};

module.exports = swaggerJsdoc(options);
