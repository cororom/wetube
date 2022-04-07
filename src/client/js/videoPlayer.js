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
  } else {
    video.pause();
  }
  videoStatus = !video.paused;
  playBtnIcon.classList = video.paused ? "fa-solid fa-play" : "fa-solid fa-pause";
  handleRangeUpdate("timeline");
};

const setMute = () => {
  muteBtnIcon.classList = video.muted ? "fa-solid fa-volume-xmark" : "fa-solid fa-volume-high";
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
    muteBtnIcon.classList = "fa-solid fa-volume-high";
  } else {
    video.muted = false;
    muteBtnIcon.classList = "fa-solid fa-volume-xmark";
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
    fullScreenIcon.classList = "fa-solid fa-expand";
  } else {
    videoContainer.requestFullscreen();
    fullScreenIcon.classList = "fa-solid fa-compress";
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

const handleEnded = () => {
  const { id } = videoContainer.dataset;
  fetch(`/api/videos/${id}/view`, { method: "POST" });
};

const handleShortcut = (event) => {
  const { target, code } = event;
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

const videoInit = () => {
  getVolumeConfig();
  volumeRange.value = volumeCfg.current;
  video.volume = volumeCfg.current;
  video.muted = volumeCfg.muted;
  setMute();
};

videoInit();

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
