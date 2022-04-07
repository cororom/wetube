import express from "express";
import {
  getEdit,
  postEdit,
  logout,
  see,
  startGithubLogin,
  finishGithubLogin,
  startKakaoLogin,
  finishKakaoLogin,
  getChangePassword,
  postChangePassword,
} from "../controllers/userController";
import { protectorMiddleware, publicOnlyMiddleware, normalLoginOnlyMiddleware, avatarUpload } from "../middlewares";

const usersRouter = express.Router();

usersRouter.get("/logout", protectorMiddleware, logout);
usersRouter.route("/edit").all(protectorMiddleware).get(getEdit).post(avatarUpload.single("avatar"), postEdit);
usersRouter.get("/github/start", startGithubLogin);
usersRouter.get("/github/finish", finishGithubLogin);
usersRouter.get("/kakao/start", publicOnlyMiddleware, startKakaoLogin);
usersRouter.get("/kakao/finish", publicOnlyMiddleware, finishKakaoLogin);
usersRouter.route("/change-password").all(normalLoginOnlyMiddleware).get(getChangePassword).post(postChangePassword);
usersRouter.get("/:id", see);

export default usersRouter;
