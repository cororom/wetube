import mongoose from "mongoose";

const subscribeSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
  channel: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
  notification: { type: Boolean, required: true, default: true },
  createdAt: { type: Date, required: true, default: Date.now },
});

const Subscribe = mongoose.model("Subscribe", subscribeSchema);
export default Subscribe;
