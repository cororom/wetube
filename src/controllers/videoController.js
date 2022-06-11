import mongoose from "mongoose";
import Video from "../models/Video";
import User from "../models/User";
import Comment from "../models/Comment";
import History from "../models/History";
import Like from "../models/Like";
import Later from "../models/Later";
import Subscribe from "../models/Subscribe";
import { directUpload } from "../middlewares";
import ffmpeg from "fluent-ffmpeg";
import { path as ffmpeg_path } from "@ffmpeg-installer/ffmpeg";
import { path as ffprobe_path } from "@ffprobe-installer/ffprobe";
import FastPreview from "fast-preview";
import fs from "fs";
const moment = require("moment");

export const unitFormatter = (number, digits) => {
  const lookup = [
    { value: 1, symbol: "" },
    { value: 1e3, symbol: "k" },
    { value: 1e6, symbol: "M" },
    { value: 1e9, symbol: "G" },
    { value: 1e12, symbol: "T" },
    { value: 1e15, symbol: "P" },
    { value: 1e18, symbol: "E" },
  ];
  const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
  var item = lookup
    .slice()
    .reverse()
    .find(function (item) {
      return number >= item.value;
    });
  return item ? (number / item.value).toFixed(digits).replace(rx, "$1") + item.symbol : "0";
};

export const getDiffTime = (videos) => {
  let uploadedTime = {};
  const hour = 60 * 60;
  videos.forEach((element) => {
    const now = new Date();
    const start = moment(now);
    const uploaded = new Date(element.createdAt);
    const end = moment(uploaded);
    let diff = parseInt(start.diff(end, "seconds"));
    let unit;
    if (diff < hour) {
      diff = diff / 60;
      unit = diff > 1 ? "minutes ago" : "minute ago";
    } else if (diff < hour * 24) {
      diff = diff / hour;
      unit = diff > 1 ? "hours ago" : "hour ago";
    } else if (Math.floor(start.diff(end, "years")) >= 1) {
      diff = Math.floor(start.diff(end, "years"));
      unit = diff > 1 ? "years ago" : "year ago";
    } else if (Math.floor(start.diff(end, "months")) >= 1) {
      diff = Math.floor(start.diff(end, "months"));
      unit = diff > 1 ? "months ago" : "month ago";
    } else {
      diff = diff / (hour * 24);
      unit = diff > 1 ? "days ago" : "day ago";
    }
    const key = !element.video ? element._id : element.video._id;
    uploadedTime[key] = new Object();
    uploadedTime[key].diff = Math.floor(diff);
    uploadedTime[key].unit = unit;
  });
  return uploadedTime;
};

export const home = async (req, res) => {
  const videos = await Video.find({}).sort({ createdAt: "desc" }).populate("owner");
  let hashtags = ["All"];
  let uploadedTime = {};
  if (videos.length > 0) {
    videos.forEach((element) => {
      if (element.hashtags.length > 0) {
        element.hashtags.forEach((hashtag) => {
          const text = hashtag.slice(1);
          if (hashtags.indexOf(text) === -1) {
            hashtags.push(text);
          }
        });
      }
    });
    uploadedTime = getDiffTime(videos);
  }
  return res.render("home", { videos, hashtags, uploadedTime });
};

export const getHashtagVideo = async (req, res) => {
  const {
    params: { hashtag },
  } = req;
  let videos;
  if (hashtag !== "All") {
    videos = await Video.find({ hashtags: { $in: [`#${hashtag}`] } })
      .sort({ createdAt: "desc" })
      .populate("owner");
  } else {
    videos = await Video.find({}).sort({ createdAt: "desc" }).populate("owner");
  }
  let uploadedTime = {};
  if (videos.length > 0) {
    uploadedTime = getDiffTime(videos);
  }
  return res.status(200).json({ videos, uploadedTime });
};

export const watch = async (req, res) => {
  const {
    params: { id },
    session: { loggedIn, user },
  } = req;
  let userData = {};
  let subscribed = false;
  const video = await Video.findById(id)
    .populate({ path: "comments", populate: [{ path: "owner" }] })
    .populate("owner");
  if (!video) {
    return res.status(404).render("404", { pageTitle: "Video not found." });
  }
  if (loggedIn === true) {
    userData = await User.findById(user._id).populate("subscribes");
    if (userData.subscribes.length > 0) {
      userData.subscribes.forEach((element) => {
        if (String(element.channel) === String(video.owner._id)) {
          subscribed = true;
        }
      });
    }
  }
  const randomList = await Video.aggregate([{ $match: { _id: { $nin: [mongoose.Types.ObjectId(id)] } } }, { $sample: { size: 100 } }]);
  const secondary = await User.populate(randomList, { path: "owner" });
  let uploadedTime = {};
  if (secondary.length > 0) {
    uploadedTime = getDiffTime(secondary);
  }
  return res.render("videos/watch", { pageTitle: video.title, video, user: userData, subscribed, secondary, uploadedTime });
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
    req.flash("error", "Not authorized");
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
    req.flash("error", "You are not the owner of the video.");
    return res.status(403).redirect("/");
  }
  await Video.findByIdAndUpdate(id, {
    title,
    description,
    hashtags: Video.formatHashtags(hashtags),
  });
  req.flash("success", "Changes saved.");
  return res.redirect(`/videos/${id}`);
};

export const getUpload = (req, res) => {
  return res.render("videos/upload", { pageTitle: "Upload Video" });
};

export const getVideoInfo = (inputPath) => {
  return new Promise((resolve, reject) => {
    return ffmpeg.ffprobe(inputPath, (error, videoInfo) => {
      if (error) {
        return reject(error);
      }

      const { duration, size } = videoInfo.format;

      return resolve({
        size,
        durationInSeconds: Math.floor(duration),
      });
    });
  });
};

export const getRandomIntegerInRange = (min, max) => {
  const minInt = Math.ceil(min);
  const maxInt = Math.floor(max);

  return Math.floor(Math.random() * (maxInt - minInt + 1) + minInt);
};

const getStartTimeInSeconds = (videoDurationInSeconds, fragmentDurationInSeconds) => {
  // by subtracting the fragment duration we can be sure that the resulting
  // start time + fragment duration will be less than the video duration
  const safeVideoDurationInSeconds = videoDurationInSeconds - fragmentDurationInSeconds;

  // if the fragment duration is longer than the video duration
  if (safeVideoDurationInSeconds <= 0) {
    return 0;
  }

  return getRandomIntegerInRange(0.25 * safeVideoDurationInSeconds, 0.75 * safeVideoDurationInSeconds);
};

const createFragmentPreview = async (inputPath, outputPath, fragmentDurationInSeconds = 4) => {
  return new Promise(async (resolve, reject) => {
    const { durationInSeconds: videoDurationInSeconds } = await getVideoInfo(inputPath);

    const startTimeInSeconds = getStartTimeInSeconds(videoDurationInSeconds, fragmentDurationInSeconds);

    return ffmpeg()
      .input(inputPath)
      .inputOptions([`-ss ${startTimeInSeconds}`])
      .outputOptions([`-t ${fragmentDurationInSeconds}`])
      .noAudio()
      .output(outputPath)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });
};

export const postUpload = async (req, res) => {
  const {
    session: {
      user: { _id },
    },
    files: { video, thumb },
    body: { title, description, hashtags },
  } = req;
  const isHeroku = process.env.NODE_ENV === "production";
  let videoPath, videoName, uploadDir;
  if (isHeroku) {
    videoPath = video[0].location;
    videoName = video[0].key;
    uploadDir = "videos";
  } else {
    videoPath = video[0].path;
    videoName = video[0].filename;
    uploadDir = video[0].destination.slice(0, -1);
  }
  let thumbUrl, uploadTarget;
  let uploadParam = {
    Bucket: "wetube-amazing/images",
    Key: `${videoName}_thumb.jpg`,
    ACL: "public-read",
    ContentType: "image/jpeg",
  };
  if (thumb === undefined) {
    thumbUrl = isHeroku ? `${videoPath.replace("/videos/", "/images/")}_thumb.jpg` : `${videoPath}_thumb.jpg`;
    ffmpeg(isHeroku ? videoPath : `./${videoPath}`)
      .screenshots({
        count: 1,
        filename: `${videoName}_thumb.jpg`,
        folder: "./uploads/videos",
        size: "320x240",
      })
      .on("end", () => {
        if (isHeroku) {
          uploadTarget = process.cwd() + `/uploads/videos/${videoName}_thumb.jpg`;
          uploadParam.Body = fs.createReadStream(uploadTarget);
          directUpload(uploadParam);
        }
      });
  } else {
    thumbUrl = isHeroku ? thumb[0].location : thumb[0].path;
  }
  let preview, previewUrl;
  if (!isHeroku) {
    FastPreview.setFfmpegPath(ffmpeg_path);
    FastPreview.setFfprobePath(ffprobe_path);
    preview = new FastPreview(videoPath, {
      clip_count: 4,
      clip_time: 4,
      clip_select_strategy: "max-size", // max-size min-size random
      clip_range: [0.1, 0.9],
      fps_rate: 10, // 'keep' number
      dist_path: "./uploads/videos",
      speed_multi: 2,
    });
    preview.exec();
    previewUrl = `${uploadDir}/${preview.filename}.webp`;
  } else {
    uploadTarget = process.cwd() + `/uploads/videos/${videoName}.webp`;
    await createFragmentPreview(videoPath, uploadTarget, 4);
    uploadParam.Bucket = "wetube-amazing/videos";
    uploadParam.Key = `${videoName}.webp`;
    uploadParam.Body = fs.createReadStream(uploadTarget);
    uploadParam.ContentType = "image/webp";
    directUpload(uploadParam);
  }
  try {
    const newVideo = await Video.create({
      title,
      description,
      fileUrl: videoPath,
      thumbUrl,
      previewUrl: isHeroku ? `${videoPath}.webp` : previewUrl,
      owner: _id,
      hashtags: Video.formatHashtags(hashtags),
    });
    const user = await User.findById(_id);
    user.videos.push(newVideo._id);
    await user.save();
    return res.redirect("/");
  } catch (error) {
    return res.status(400).render("videos/upload", { pageTitle: "Upload Video", errorMessage: error._message });
  }
};

export const deleteRelation = async (target, type) => {
  const array = target.map((x) => x._id);
  let query = "";
  if (type === "comment") {
    await Comment.deleteMany({ _id: { $in: array } });
    query = { comments: { $in: array } };
  }
  if (type === "like") {
    await Like.deleteMany({ _id: { $in: array } });
    query = { likes: { $in: array } };
  }
  if (type === "history") {
    await History.deleteMany({ _id: { $in: array } });
    query = { histories: { $in: array } };
  }
  if (type === "later") {
    await Later.deleteMany({ _id: { $in: array } });
    query = { laters: { $in: array } };
  }
  const user = await User.find(query);
  user.forEach(async (element) => {
    element.comments.splice(element.comments.indexOf(element._id), 1);
    await element.save();
  });
};

export const deleteVideo = async (req, res) => {
  const {
    params: { id },
    session: {
      user: { _id },
    },
  } = req;
  const video = await Video.findById(id).populate("owner");
  const owner = video.owner;
  const comment = await Comment.find({ video: id });
  const like = await Like.find({ video: id });
  const history = await History.find({ video: id });
  const later = await Later.find({ video: id });
  if (!video) {
    return res.status(404).render("404", { pageTitle: "Video not found." });
  }
  if (String(video.owner._id) !== String(_id)) {
    req.flash("error", "Not authorized");
    return res.status(403).redirect("/");
  }
  await Video.findByIdAndDelete(id);
  owner.videos.splice(owner.videos.indexOf(id), 1);
  await owner.save();
  if (comment.length > 0) {
    await deleteRelation(comment, "comment");
  }
  if (like.length > 0) {
    await deleteRelation(like, "like");
  }
  if (history.length > 0) {
    await deleteRelation(history, "history");
  }
  if (later.length > 0) {
    await deleteRelation(later, "later");
  }
  return res.redirect("/");
};

export const search = async (req, res) => {
  const { keyword } = req.query;
  let videos = [];
  let hashtags = 0;
  if (keyword) {
    if (keyword.startsWith("#")) {
      hashtags = await Video.countDocuments({ hashtags: { $in: [keyword] } });
    }
    videos = await Video.find({
      title: {
        $regex: new RegExp(`${keyword}$`, "i"),
      },
    }).populate("owner");
    videos.forEach((element, index, theArray) => {
      theArray[index] = { video: element };
    });
  }
  return res.render("search", { videos, keyword, hashtags });
};

export const registerView = async (req, res) => {
  const { id } = req.params;
  const video = await Video.findById(id);
  if (!video) {
    return res.sendStatus(404);
  }
  video.meta.views = video.meta.views + 1;
  await video.save();
  return res.status(200).json({ views: video.meta.views });
};

export const postComment = async (req, res) => {
  const {
    session: { user },
    body: { text, commentId },
    params: { id },
  } = req;
  const video = await Video.findById(id);
  if (!video) {
    return res.sendStatus(404);
  }
  const userData = await User.findById(user?._id);
  if (!userData) {
    return res.sendStatus(404);
  }
  const userInfo = {
    _id: userData._id,
    name: userData.name,
    avatarUrl: userData.socialOnly === true ? userData.avatarUrl : userData.avatarUrl !== undefined ? `/${userData.avatarUrl}` : "",
  };
  let comment;
  let mode;
  if (commentId) {
    comment = await Comment.findById(commentId);
    comment.text = text;
    await comment.save();
    mode = "modify";
  } else {
    comment = await Comment.create({
      text,
      owner: user._id,
      video: id,
    });
    video.comments.push(comment._id);
    await video.save();
    userData.comments.push(comment._id);
    await userData.save();
    mode = "add";
  }
  return res.status(201).json({ newCommentId: comment._id, mode, user: userInfo });
};

export const deleteComment = async (req, res) => {
  const {
    session: { user },
    params: { videoId, commentId },
  } = req;
  const comment = await Comment.findById(commentId).populate("owner").populate("video");
  if (!comment) {
    return res.status(404);
  }
  const userData = comment.owner;
  if (String(userData._id) !== String(user?._id)) {
    return res.status(403);
  }
  await Comment.findByIdAndDelete(commentId);
  const video = comment.video;
  video.comments.splice(video.comments.indexOf(videoId), 1);
  await video.save();
  userData.comments.splice(userData.comments.indexOf(videoId), 1);
  await userData.save();
  return res.status(200).json({ deleteCommentId: comment._id });
};

export const getLike = async (req, res) => {
  const {
    session: { user },
  } = req;
  const title = "Liked videos";
  const videos = await Like.find({ owner: user._id })
    .populate([{ path: "video", populate: { path: "owner" } }])
    .sort({ createdAt: "desc" });
  return res.render("videos/playlist", { title, videos, moment });
};

export const getLikeSingle = async (req, res) => {
  const {
    session: { user, loggedIn },
    params: { id },
  } = req;
  let count = 0;
  let liked = false;
  const videos = await Like.find({ video: id });
  if (videos.length > 0) {
    count = videos.length;
    if (loggedIn) {
      videos.forEach((element) => {
        if (String(element.owner._id) === String(user._id)) {
          liked = true;
          return false;
        }
      });
    }
  }
  return res.status(200).json({ count, liked });
};

export const postLike = async (req, res) => {
  const {
    session: { user },
    params: { id },
  } = req;
  const video = await Video.findById(id).populate("owner");
  if (!video || String(video.owner._id) === String(user._id)) {
    return res.sendStatus(404);
  }
  const userData = await User.findById(user._id);
  let count = video.likes > 0 ? video.likes : 0;
  let liked = false;
  const like = await Like.findOne({ owner: user._id, video: id });
  if (!like) {
    const newLike = await Like.create({
      owner: user._id,
      video: id,
    });
    userData.likes.push(newLike._id);
    count++;
    liked = true;
  } else {
    await Like.findByIdAndDelete(like._id);
    userData.likes.splice(userData.likes.indexOf(like._id), 1);
    count--;
  }
  video.likes = count;
  await video.save();
  await userData.save();
  return res.status(200).json({ count, liked });
};

export const getWatchLater = async (req, res) => {
  const {
    session: { user },
  } = req;
  const title = "Watch later";
  const videos = await Later.find({ owner: user._id })
    .populate([{ path: "video", populate: { path: "owner" } }])
    .sort({ createdAt: "desc" });
  return res.render("videos/playlist", { title, videos, moment });
};

export const getWatchLaterSingle = async (req, res) => {
  const {
    session: { user },
    params: { id },
  } = req;
  let checked = false;
  const video = await Later.findOne({ owner: user._id, video: id });
  if (video) {
    checked = true;
  }
  return res.status(200).json({ checked });
};

export const postWatchLater = async (req, res) => {
  const {
    session: { user },
    params: { id },
  } = req;
  const userData = await User.findById(user._id);
  const later = await Later.findOne({ owner: user._id, video: id });
  if (!later) {
    const newLater = await Later.create({
      owner: user._id,
      video: id,
    });
    userData.laters.push(newLater._id);
  } else {
    await Later.findByIdAndDelete(later._id);
    userData.laters.splice(userData.laters.indexOf(later._id), 1);
  }
  await userData.save();
  return res.sendStatus(200);
};

export const getHashtag = async (req, res) => {
  const {
    params: { keyword },
  } = req;
  let videos = [];
  if (keyword) {
    videos = await Video.find({
      hashtags: {
        $regex: new RegExp(`${keyword}$`, "i"),
      },
    }).populate("owner");
  }
  return res.render("hashtag", { pageTitle: `#${keyword}`, videos });
};

export const getLibrary = async (req, res) => {
  const {
    session: { user },
  } = req;
  const library = await User.findById(user._id)
    .populate({ path: "histories", populate: { path: "video", populate: { path: "owner" } }, sort: { createdAt: -1 }, limit: 10 })
    .populate({ path: "likes", populate: { path: "video", populate: { path: "owner" } }, sort: { createdAt: -1 }, limit: 10 })
    .populate({ path: "laters", populate: { path: "video", populate: { path: "owner" } }, sort: { createdAt: -1 }, limit: 10 });

  const libraryLists = ["histories", "likes", "laters"];
  let uploadedTime = {};
  libraryLists.forEach((key) => {
    if (library[key].length > 0) {
      uploadedTime[key] = new Object();
      uploadedTime[key] = getDiffTime(library[key]);
    }
  });
  return res.render("videos/library", { library, uploadedTime });
};

export const getHistory = async (req, res) => {
  const {
    session: { user },
  } = req;
  let history = await History.find({ owner: user._id }).populate([{ path: "video", populate: { path: "owner" } }]);
  return res.render("videos/history", { videos: history, moment });
};

export const postHistory = async (req, res) => {
  const {
    session: { user },
    params: { id },
  } = req;
  const userData = await User.findById(user._id);
  const today = moment().startOf("day");
  let history = await History.findOne({ owner: user._id, video: id, createdAt: { $gte: today.toDate(), $lte: moment(today).endOf("day").toDate() } });
  if (!history) {
    const newHistory = await History.create({
      owner: user._id,
      video: id,
    });
    userData.histories.push(newHistory._id);
  } else {
    history.createdAt = Date.now();
    await history.save();
    userData.histories.splice(userData.histories.indexOf(history._id), 1);
    userData.histories.push(history._id);
  }
  await userData.save();
  return res.sendStatus(200);
};

export const getSubscribe = async (req, res) => {
  const {
    session: { user },
  } = req;
  let raw = [];
  let videos = [];
  let uploadedTime = {};
  const subscribe = await Subscribe.find({ owner: user._id }).populate({
    path: "channel",
    populate: {
      path: "videos",
      model: "Video",
      populate: {
        path: "owner",
        model: "User",
      },
    },
  });
  if (subscribe) {
    subscribe.forEach((element) => {
      raw = raw.concat(element.channel.videos);
    });
    raw
      .sort((a, b) => {
        const prevDate = new Date(a.createdAt);
        const nextDate = new Date(b.createdAt);
        return nextDate - prevDate;
      })
      .forEach((element) => {
        const date = element.createdAt.toISOString().substring(0, 10);
        if (typeof videos[date] === "undefined") {
          videos[date] = new Array();
        }
        videos[date].push(element);
      });
    const videoKey = Object.keys(videos);
    if (videoKey.length > 0) {
      videoKey.forEach((key) => {
        uploadedTime[key] = new Object();
        uploadedTime[key] = getDiffTime(videos[key]);
      });
    }
  }
  return res.render("videos/subscription", { videos, uploadedTime, moment });
};

export const postSubscribe = async (req, res) => {
  const {
    session: { user },
    params: { id },
  } = req;
  const channel = await User.exists({ _id: id });
  if (!channel) {
    return res.sendStatus(404);
  }
  const subscribe = await Subscribe.findOne({ owner: user._id, channel: id });
  const userData = await User.findById(user._id);
  let result = false;
  if (subscribe) {
    await Subscribe.findByIdAndDelete(subscribe._id);
    userData.subscribes.splice(userData.subscribes.indexOf(subscribe._id), 1);
  } else {
    const newSubscribe = await Subscribe.create({ owner: user._id, channel: id });
    userData.subscribes.push(newSubscribe._id);
    result = true;
  }
  await userData.save();
  return res.status(200).json({ result });
};
