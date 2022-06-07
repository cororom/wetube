import regeneratorRuntime from "regenerator-runtime";
import "dotenv/config";
import "./db";
import "./models/Video";
import "./models/User";
import "./models/Comment";
import "./models/History";
import "./models/Like";
import "./models/Later";
import app from "./server";

const PORT = 4000;

const handleListening = () => console.log(`✅ Server Listening on port http://localhost:${PORT} 🚀`);

app.listen(PORT, handleListening);
