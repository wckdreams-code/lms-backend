// app.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const userRouter = require("./routers/userRouter");
const courseRouter = require("./routers/courseRouter");
const moduleRouter = require("./routers/moduleRouter");
const questionRouter = require("./routers/questionRouter");
const authRouter = require("./routers/authRouter");
const statsRouter = require("./routers/statsRouter");
const transactionRouter = require("./routers/transactionRouter");
const adminRouter = require("./routers/adminRouter");
const teacherRouter = require("./routers/teacherRouter");
const recommendationRouter = require("./routers/recommendationRouter");
const landingRouter = require("./routers/landingRouter");
const offlineRegistrationRouter = require("./routers/offlineRegistrationRouter");
const offlineScheduleRouter = require("./routers/offlineScheduleRouter");
const studentRouter = require("./routers/studentRouter");

const app = express();

// Konfigurasi CORS.
const corsOptions = {
  origin(origin, callback) {
    const allowedOrigins = [
      "http://localhost:5555",
      "http://localhost:4321",
      "http://localhost:5173",
      "http://127.0.0.1:5555",
      "http://127.0.0.1:4321",
      "http://127.0.0.1:5173",
      "https://lpia-backend-deploy.up.railway.app",
      "https://lms-frontend-production-9d81.up.railway.app"
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`CORS blocked origin: ${origin}`);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors({
  origin: true, // Otomatis mengizinkan request dari origin manapun (Frontend Railway/Localhost)
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/courses", courseRouter);
app.use("/api/v1/modules", moduleRouter);
app.use("/api/v1/questions", questionRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/stats", statsRouter);
app.use("/api/v1/transactions", transactionRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/teacher", teacherRouter);
app.use("/api/v1/recommendations", recommendationRouter);
app.use("/api/v1/landing", landingRouter);
app.use("/api/v1/offline-registrations", offlineRegistrationRouter);
app.use("/api/v1/offline-schedules", offlineScheduleRouter);
app.use("/api/v1/student", studentRouter);
console.log("Recommendation router loaded");
app.get("/", (req, res) => {
  res.send("LMS Backend API is Running...");
});

module.exports = app;
