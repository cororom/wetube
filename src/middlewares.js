import multer from "multer";

export const localsMiddleware = (req, res, next) => {
  res.locals.loggedIn = Boolean(req.session.loggedIn);
  res.locals.siteName = "Wetube";
  res.locals.loggedInUser = req.session.user || {};
  next();
};

export const protectorMiddleware = (req, res, next) => {
  if (req.session.loggedIn) {
    next();
  } else {
    return res.redirect("/login");
  }
};

export const publicOnlyMiddleware = (req, res, next) => {
  if (!req.session.loggedIn) {
    return next();
  } else {
    return res.redirect("/");
  }
};

export const normalLoginOnlyMiddleware = (req, res, next) => {
  const {
    session: {
      user: { socialOnly },
    },
  } = req;
  if (socialOnly) {
    return res.redirect("/");
  }
  next();
};

export const videoUploadMiddleware = (req, res, next) => {
  res.header("Cross-Origin-Embedder-Policy", "require-corp");
  res.header("Cross-Origin-Opener-Policy", "same-origin");
  next();
};

export const avatarUpload = multer({ dest: "uploads/avatars/", limits: { fileSize: 3000000 } });

export const videoUpload = multer({ dest: "uploads/videos/", limits: { fileSize: 10000000 } });
