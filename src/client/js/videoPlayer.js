const video = document.querySelector("video");
const playBtn = document.getElementById("play");
const playBtnIcon = playBtn.querySelector("i");
const muteBtn = document.getElementById("mute");
const muteBtnIcon = muteBtn.querySelector("i");
const volumeRange = document.getElementById("volume");
const currenTime = document.getElementById("currenTime");
const totalTime = document.getElementById("totalTime");
const timeline = document.getElementById("timeline");
const fullScreenBtn = document.getElementById("fullScreen");
const fullScreenIcon = fullScreenBtn.querySelector("i");
const videoContainer = document.getElementById("videoContainer");
const videoControls = document.getElementById("videoControls");
const videoControlsBg = document.querySelector(".videoControls__bg");
const videoCommentArea = document.querySelector("textarea");
const likeBtn = document.querySelector(".video__like");
const saveBtn = document.querySelector(".video__save");
const subscribeBtn = document.querySelector(".subscribe");

let volumeCfg;
let videoStatus;
let controlsTimeout = null;

const VOLUME_CFG_KEY = "volumeConfig";

const handleRangeUpdate = (selected) => {
  if (selected === "timeline") {
    const { min: timeMin, max: timeMax, value: timeValue } = timeline;
    const timeSize = ((timeValue - timeMin) * 100) / (timeMax - timeMin);
    timeline.style.backgroundImage = "linear-gradient(#FF0F17, #FF0F17)";
    timeline.style.backgroundSize = `${timeSize}% 100%`;
  }
  if (selected === "volume") {
    const { min: volumeMin, max: volumeMax, value: volumeValue } = volumeRange;
    const volumeSize = ((volumeValue - volumeMin) * 100) / (volumeMax - volumeMin);
    volumeRange.style.backgroundImage = "linear-gradient(#FFFFFF, #FFFFFF)";
    volumeRange.style.backgroundSize = `${volumeSize}% 100%`;
  }
};

const handlePlayClick = () => {
  if (video.paused) {
    video.play();
    handleStart();
  } else {
    video.pause();
  }
  videoStatus = !video.paused;
  playBtnIcon.innerText = video.paused ? "play_arrow" : "pause";
  handleRangeUpdate("timeline");
};

const setMute = () => {
  muteBtnIcon.innerText = video.muted ? "volume_off" : "volume_up";
  if (video.muted) {
    volumeCfg.current = "0";
  } else {
    volumeCfg.current = volumeCfg.current === "0" ? volumeCfg.latest : volumeCfg.current;
  }
  volumeCfg.muted = video.muted;
  handleRangeUpdate("volume");
};

const handleMuteClick = () => {
  if (video.muted) {
    video.muted = false;
  } else {
    video.muted = true;
  }
  setMute();
  setVolumeConfig();
};

const handleVolumeChange = (event) => {
  const {
    target: { value },
  } = event;
  if (value === "0") {
    video.muted = true;
    muteBtnIcon.innerText = "volume_up";
  } else {
    video.muted = false;
    muteBtnIcon.innerText = "volume_off";
  }
  volumeCfg.current = value;
  volumeCfg.muted = video.muted;
  setVolumeConfig();
};

const handleLatestVolumeChange = (event) => {
  const {
    target: { value },
  } = event;
  if (value !== "0") {
    volumeCfg.latest = value;
    setVolumeConfig();
  }
};

const getVolumeConfig = () => {
  const volume = volumeRange.value;
  volumeCfg = JSON.parse(localStorage.getItem(VOLUME_CFG_KEY)) || { current: volume, latest: volume, muted: false };
};

const setVolumeConfig = () => {
  const newVolumeCfg = {
    current: volumeCfg.current,
    latest: volumeCfg.latest,
    muted: volumeCfg.current === "0" ? true : false,
  };
  localStorage.setItem(VOLUME_CFG_KEY, JSON.stringify(newVolumeCfg));
  videoInit();
};

const formatTime = (second) => {
  const start = Math.floor(video.duration) >= 3600 ? 11 : 14;
  return new Date(second * 1000).toISOString().substring(start, 19);
};

const handleLoadedMetadata = () => {
  totalTime.innerText = formatTime(Math.floor(video.duration));
  timeline.max = Math.floor(video.duration);
  if (video.readyState == 4) {
    handlePlayClick();
  }
};

const handleTimeUpdate = () => {
  currenTime.innerText = formatTime(Math.floor(video.currentTime));
  timeline.value = Math.floor(video.currentTime);
  handleRangeUpdate("timeline");
};

const handleTimelineChange = (event) => {
  const {
    target: { value },
  } = event;
  video.pause();
  video.currentTime = value;
  handleRangeUpdate("timeline");
};

const handleTimelineSet = () => {
  videoStatus ? video.play() : video.pause();
};

const handleFullScreen = () => {
  const fullscreen = document.fullscreenElement;
  if (fullscreen) {
    document.exitFullscreen();
    fullScreenIcon.innerText = "fullscreen";
  } else {
    videoContainer.requestFullscreen();
    fullScreenIcon.innerText = "fullscreen_exit";
  }
};

const hideControls = () => {
  videoControls.classList.remove("showing");
  videoControlsBg.classList.remove("showing");
};

const handleSkip = (direction) => {
  let skipTime = video.currentTime;
  skipTime = direction == "forward" ? skipTime + 5 : skipTime - 5;
  video.currentTime = skipTime;
  handleMouseMove();
};

const handleMouseMove = () => {
  if (controlsTimeout) {
    clearTimeout(controlsTimeout);
    controlsTimeout = null;
  }
  videoControls.classList.add("showing");
  videoControlsBg.classList.add("showing");
  controlsTimeout = setTimeout(hideControls, 3000);
};

const handleMouseLeave = () => {
  hideControls();
};

const handleStart = () => {
  const { id } = videoContainer.dataset;
  fetch(`/api/videos/${id}/history`, { method: "POST" });
};

const handleEnded = async () => {
  const { id } = videoContainer.dataset;
  const response = await fetch(`/api/videos/${id}/view`, { method: "POST" });
  if (response.status === 200) {
    const { views } = await response.json();
    const countSection = document.querySelector(".video__view-count");
    countSection.innerText = views;
  }
};

const handleShortcut = (event) => {
  const { target, code } = event;
  if (target.nodeName == "TEXTAREA" || target.nodeName == "INPUT") {
    return;
  }
  target.blur();
  if (code === "Space") {
    handlePlayClick();
  }
  if (code === "KeyM") {
    handleMuteClick();
  }
  if (code === "KeyF") {
    handleFullScreen();
  }
  if (code === "ArrowLeft") {
    handleSkip("backward");
  }
  if (code === "ArrowRight") {
    handleSkip("forward");
  }
};

const likeInit = (count, liked) => {
  const likeIcon = likeBtn.querySelector("span:first-child");
  const likeCount = likeBtn.querySelector("span:last-child");
  likeIcon.innerText = liked === true ? "thumb_up" : "thumb_up_off_alt";
  likeCount.innerText = count;
};

const handleCheckedLike = async () => {
  const { id } = videoContainer.dataset;
  const response = await fetch(`/api/videos/${id}/check-like`, { method: "POST" });
  if (response.status === 200) {
    const { count, liked } = await response.json();
    likeInit(count, liked);
  }
};

const handleLike = async (event) => {
  event.preventDefault();
  const videoId = videoContainer.dataset.id;
  const response = await fetch(`/api/videos/${videoId}/like`, {
    method: "POST",
  });
  if (response.status === 200) {
    const { count, liked } = await response.json();
    likeInit(count, liked);
  }
};

const handleCheckedLater = async () => {
  const { id } = videoContainer.dataset;
  const response = await fetch(`/api/videos/${id}/check-later`, { method: "POST" });
  if (response.status === 200) {
    const { checked } = await response.json();
    return checked;
  }
};

const handleDialog = async (event) => {
  event.preventDefault();
  const checked = await handleCheckedLater();
  if (checked === undefined) {
    return;
  }
  const dialog = document.querySelector(".dialog");
  const saveCloseBtn = dialog.querySelector(".save__close");
  const checkbox = dialog.querySelector("input[type='checkbox']");
  if (checked === true) {
    checkbox.setAttribute("checked", "checked");
  } else {
    checkbox.removeAttribute("checked");
  }
  dialog.classList.toggle("close");
  if (dialog.classList.contains("close")) {
    saveCloseBtn.removeEventListener("click", handleDialog);
    checkbox.removeEventListener("change", handleLater);
  } else {
    saveCloseBtn.addEventListener("click", handleDialog);
    checkbox.addEventListener("change", handleLater);
  }
};

const handleLater = async () => {
  const { id } = videoContainer.dataset;
  const response = await fetch(`/api/videos/${id}/later`, { method: "POST" });
  if (response.status === 200) {
  }
};

const videoInit = () => {
  getVolumeConfig();
  volumeRange.value = volumeCfg.current;
  video.volume = volumeCfg.current;
  video.muted = volumeCfg.muted;
  setMute();
};

const handleSubscribe = async (event) => {
  event.preventDefault();
  const channelSection = document.querySelector(".channel__subscribe-action");
  const { owner } = channelSection.dataset;
  const response = await fetch(`/api/videos/${owner}/subscribe`, { method: "POST" });
  if (response.status === 200) {
    const { result } = await response.json();
    if (result === true) {
      subscribeBtn.classList.add("subscribed");
      subscribeBtn.innerText = "Subscribed";
    } else {
      subscribeBtn.classList.remove("subscribed");
      subscribeBtn.innerText = "Subscribe";
    }
  }
};

const setCommentEditor = () => {
  videoCommentArea.style.height = "";
  videoCommentArea.style.height = `${videoCommentArea.scrollHeight}px`;
};

videoInit();
handleCheckedLike();

playBtn.addEventListener("click", handlePlayClick);
muteBtn.addEventListener("click", handleMuteClick);
volumeRange.addEventListener("input", handleVolumeChange);
volumeRange.addEventListener("change", handleLatestVolumeChange);
video.addEventListener("loadedmetadata", handleLoadedMetadata);
video.addEventListener("timeupdate", handleTimeUpdate);
video.addEventListener("click", handlePlayClick);
video.addEventListener("ended", handleEnded);
timeline.addEventListener("input", handleTimelineChange);
timeline.addEventListener("change", handleTimelineSet);
fullScreenBtn.addEventListener("click", handleFullScreen);
videoContainer.addEventListener("mousemove", handleMouseMove);
videoContainer.addEventListener("mouseleave", handleMouseLeave);
window.addEventListener("keydown", handleShortcut);
likeBtn.addEventListener("click", handleLike);
saveBtn.addEventListener("click", handleDialog);

if (subscribeBtn) {
  subscribeBtn.addEventListener("click", handleSubscribe);
}

if (videoCommentArea) {
  videoCommentArea.addEventListener("input", setCommentEditor);
}

if (video.readyState == 4) {
  handleLoadedMetadata();
}
