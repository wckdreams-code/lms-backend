// app.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const userRouter       = require('./routers/userRouter');
const courseRouter     = require('./routers/courseRouter');
const moduleRouter     = require('./routers/moduleRouter');
const questionRouter   = require('./routers/questionRouter');
const authRouter       = require('./routers/authRouter');
const statsRouter      = require('./routers/statsRouter');
const transactionRouter = require('./routers/transactionRouter'); // <-- 1. TAMBAHKAN IMPORT INI

const app = express();

// Konfigurasi CORS...
const allowedOrigins = [
  'http://localhost:5555',
  'http://localhost:4321',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://lpia-backend-deploy.up.railway.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1/users',        userRouter);
app.use('/api/v1/courses',      courseRouter);
app.use('/api/v1/modules',      moduleRouter);
app.use('/api/v1/questions',    questionRouter);
app.use('/api/v1/auth',         authRouter);
app.use('/api/v1/stats',        statsRouter);
app.use('/api/v1/transactions', transactionRouter); // <-- 2. DAFTARKAN ROUTE INI

app.get('/', (req, res) => {
    res.send('LMS Backend API is Running...');
});

module.exports = app;