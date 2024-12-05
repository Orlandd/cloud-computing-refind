const handlers = require("./handler");

const routes = [
  {
    method: "GET",
    path: "/",
    handler: (request, h) => {
      return "Hello World!";
    },
  },
  {
    method: "GET",
    path: "/auth/google",
    handler: handlers.login,
  },
  {
    method: "GET",
    path: "/auth/google/callback",
    handler: handlers.loginCallback
  },
  {
    method: "POST",
    path: "/auth",
    handler: handlers.loginCallback1
  },
  {
    method: "POST",
    path: "/logout",
    handler: handlers.logout
  },
  {
    method: "GET",
    path: "/trashes",
    handler: handlers.indexTrash,
    options: {
      pre: [
        { method: handlers.accessValidation }
    ]
    }
  },
  {
    method: "GET",
    path: "/crafts/{label}",
    handler: handlers.indexCrafts,
  },
  {
    method: "GET",
    path: "/craft/{id}",
    handler: handlers.indexCraft,
  },
  {
    path: "/predict",
    method: "POST",
    handler: handlers.postPredictHandler,
    options: {
      payload: {
        allow: "multipart/form-data",
        multipart: true,
        maxBytes: 10000000,
      },
    },
  },
  {
    path: "/bookmark",
    method: "POST",
    handler: handlers.bookmark,
  },
  {
    method: 'GET',
    path: '/history/{id}',
    handler: handlers.historyByUserId,
  },
  {
    method: 'POST',
    path: '/getUser',
    handlers: handlers.firebaseLogin
  }
];

module.exports = routes;
