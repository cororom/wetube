import express from "express";
import {
  registerView,
  postComment,
  deleteComment,
  getLikeSingle,
  postLike,
  getWatchLaterSingle,
  postWatchLater,
  postHistory,
  getHashtagVideo,
  postSubscribe,
} from "../controllers/videoController";
import { authMiddleware } from "../middlewares";

const apiRouter = express.Router();

apiRouter.route("/videos/:id([0-9a-f]{24})/view").post(registerView);
apiRouter.route("/videos/:id([0-9a-f]{24})/comment").all(authMiddleware).post(postComment);
apiRouter.route("/videos/:videoId([0-9a-f]{24})/comment/:commentId([0-9a-f]{24})/delete").all(authMiddleware).delete(deleteComment);
apiRouter.route("/videos/:id([0-9a-f]{24})/like").all(authMiddleware).post(postLike);
apiRouter.route("/videos/:id([0-9a-f]{24})/check-like").post(getLikeSingle);
apiRouter.route("/videos/:id([0-9a-f]{24})/later").all(authMiddleware).post(postWatchLater);
apiRouter.route("/videos/:id([0-9a-f]{24})/check-later").all(authMiddleware).post(getWatchLaterSingle);
apiRouter.route("/videos/:id([0-9a-f]{24})/history").all(authMiddleware).post(postHistory);
apiRouter.route("/videos/:id([0-9a-f]{24})/subscribe").all(authMiddleware).post(postSubscribe);
apiRouter.route("/videos/:hashtag/list").post(getHashtagVideo);

export default apiRouter;
