import Video from "../models/Video";
import User from "../models/User";
import ffmpeg from "fluent-ffmpeg";
import { path as ffmpeg_path } from "@ffmpeg-installer/ffmpeg";
import { path as ffprobe_path } from "@ffprobe-installer/ffprobe";
import FastPreview from "fast-preview";

export const home = async (req, res) => {
  const videos = await Video.find({}).sort({ createdAt: "desc" }).populate("owner");
  return res.render("home", { videos });
};

export const watch = async (req, res) => {
  const { id } = req.params;
  const video = await (await Video.findById(id)).populate("owner");
  if (!video) {
    return res.status(404).render("404", { pageTitle: "Video not found." });
  }
  return res.render("videos/watch", { pageTitle: video.title, video });
};

export const getEdit = async (req, res) => {
  const {
    params: { id },
    session: {
      user: { _id },
    },
  } = req;
  const video = await Video.findById(id);
  if (!video) {
    return res.status(404).render("404", { pageTitle: "Video not found." });
  }
  if (String(video.owner) !== String(_id)) {
    return res.status(403).redirect("/");
  }
  return res.render("videos/edit", { pageTitle: video.title, video });
};

export const postEdit = async (req, res) => {
  const {
    params: { id },
    body: { title, description, hashtags },
    session: {
      user: { _id },
    },
  } = req;
  const video = await Video.findById({ _id: id });
  if (!video) {
    return res.status(404).render("404", { pageTitle: "Video not found." });
  }
  if (String(video.owner) !== String(_id)) {
    return res.status(403).redirect("/");
  }
  await Video.findByIdAndUpdate(id, {
    title,
    description,
    hashtags: Video.formatHashtags(hashtags),
  });
  return res.redirect(`/videos/${id}`);
};

export const getUpload = (req, res) => {
  return res.render("videos/upload", { pageTitle: "Upload Video" });
};

export const postUpload = async (req, res) => {
  const {
    session: {
      user: { _id },
    },
    files: { video, thumb },
    body: { title, description, hashtags },
  } = req;
  const { filename: videoName, path: videoPath } = video[0];
  const uploadDir = videoPath.split("/").slice(0, -1).join("/");
  let thumbUrl;
  if (thumb === undefined) {
    thumbUrl = `${videoPath}_thumb.jpg`;
    ffmpeg(`./${videoPath}`).screenshots({
      count: 1,
      filename: `${videoName}_thumb.jpg`,
      folder: `./${uploadDir}`,
      size: "320x240",
    });
  } else {
    thumbUrl = thumb[0].path;
  }
  FastPreview.setFfmpegPath(ffmpeg_path);
  FastPreview.setFfprobePath(ffprobe_path);
  const preview = new FastPreview(videoPath, {
    clip_count: 4,
    clip_time: 4,
    clip_select_strategy: "max-size", // max-size min-size random
    clip_range: [0.1, 0.9],
    fps_rate: 10, // 'keep' number
    dist_path: `./${uploadDir}`,
    speed_multi: 2,
  });
  preview.exec();
  try {
    const newVideo = await Video.create({
      title,
      description,
      fileUrl: videoPath,
      thumbUrl,
      previewUrl: `${uploadDir}/${preview.filename}.webp`,
      owner: _id,
      hashtags: Video.formatHashtags(hashtags),
    });
    const user = await User.findById(_id);
    user.videos.push(newVideo._id);
    user.save();
    return res.redirect("/");
  } catch (error) {
    return res.status(400).render("videos/upload", { pageTitle: "Upload Video", errorMessage: error._message });
  }
};

export const deleteVideo = async (req, res) => {
  const {
    params: { id },
    session: {
      user: { _id },
    },
  } = req;
  const video = await Video.findById(id).populate("owner");
  const user = video.owner;
  if (!video) {
    return res.status(404).render("404", { pageTitle: "Video not found." });
  }
  if (String(video.owner._id) !== String(_id)) {
    return res.status(403).redirect("/");
  }
  await Video.findByIdAndDelete(id);
  user.videos.splice(user.videos.indexOf(id), 1);
  user.save();
  return res.redirect("/");
};

export const search = async (req, res) => {
  const { keyword } = req.query;
  let videos = [];
  if (keyword) {
    videos = await Video.find({
      title: {
        $regex: new RegExp(`${keyword}$`, "i"),
      },
    }).populate("owner");
  }
  return res.render("search", { pageTitle: "Search", videos });
};

export const registerView = async (req, res) => {
  const { id } = req.params;
  const video = await Video.findById(id);
  if (!video) {
    return res.sendStatus(404);
  }
  video.meta.views = video.meta.views + 1;
  await video.save();
  return res.sendStatus(200);
};
