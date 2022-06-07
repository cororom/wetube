import express from "express";
import {
  watch,
  getEdit,
  postEdit,
  getUpload,
  postUpload,
  deleteVideo,
  getHashtag,
  getLibrary,
  getHistory,
  getWatchLater,
  getLike,
  getSubscribe,
} from "../controllers/videoController";
import { protectorMiddleware, videoUploadMiddleware, videoUpload } from "../middlewares";

const videoRouter = express.Router();

videoRouter.get("/:id([0-9a-f]{24})", watch);
videoRouter.route("/:id([0-9a-f]{24})/edit").all(protectorMiddleware).get(getEdit).post(postEdit);
videoRouter.route("/:id([0-9a-f]{24})/delete").all(protectorMiddleware).get(deleteVideo);
videoRouter
  .route("/upload")
  .all(protectorMiddleware)
  .get(getUpload)
  .post(
    videoUploadMiddleware,
    videoUpload.fields([
      { name: "video", maxCount: 1 },
      { name: "thumb", maxCount: 1 },
    ]),
    postUpload
  );
videoRouter.route("/hashtag/:keyword").get(getHashtag);
videoRouter.route("/library").all(protectorMiddleware).get(getLibrary);
videoRouter.route("/history").all(protectorMiddleware).get(getHistory);
videoRouter.route("/playlist/liked").all(protectorMiddleware).get(getLike);
videoRouter.route("/playlist/later").all(protectorMiddleware).get(getWatchLater);
videoRouter.route("/subscriptions").all(protectorMiddleware).get(getSubscribe);

export default videoRouter;
