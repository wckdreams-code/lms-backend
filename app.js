const express = require('express');
const cors = require('cors');
require('dotenv').config();

const userRouter    = require('./routers/userRouter');
const courseRouter  = require('./routers/courseRouter');
const moduleRouter  = require('./routers/moduleRouter');
const questionRouter = require('./routers/questionRouter');
const authRouter    = require('./routers/authRouter');
const statsRouter   = require('./routers/statsRouter');   // ← tambahan

const app = express();

// Middleware Global
// Konfigurasi CORS yang lebih longgar untuk development
app.use(cors({
  origin: ['http://localhost:4321', 'https://lpia-backend-deploy.up.railway.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1/users',     userRouter);
app.use('/api/v1/courses',   courseRouter);
app.use('/api/v1/modules',   moduleRouter);
app.use('/api/v1/questions', questionRouter);
app.use('/api/v1/auth',      authRouter);
app.use('/api/v1/stats',     statsRouter);   // ← tambahan

app.get('/', (req, res) => {
    res.send('LMS Backend API is Running...');
});

module.exports = app;