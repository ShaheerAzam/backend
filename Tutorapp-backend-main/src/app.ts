import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes';
import studentRoutes from './routes/studentRoutes';
import tutorRoutes from './routes/tutorRoutes';
import adminRoutes from './routes/adminRoutes';
import lessonRoutes from './routes/lessonRoutes';
import earningsRoutes from './routes/earningsRoutes';
import errorMiddleware from './middleware/errorMiddleware';
import { logger } from './utils/logger';
import { AdminService } from './services/adminService';
import { SchedulerService } from './services/schedulerService';

dotenv.config();

const app: Application = express();
const port = process.env.PORT || 3000;
const mongoUri =
  process.env.MONGO_URI ||
  "mongodb+srv://admin:admin@cluster0.pcd9vxn.mongodb.net/mydb?retryWrites=true&w=majority";
const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
const adminDefaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || "Admin1234";

// Logger setup

// Middleware
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "*",
  credentials: true,
}));
app.use(express.json());

// Routes
app.use("/api/students", studentRoutes);
app.use("/api/tutors", tutorRoutes);
app.use("/api/admins", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/earnings", earningsRoutes);
app.use(errorMiddleware);

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    mongoConnected: mongoose.connection.readyState === 1,
    message: "Hot reload test",
  });
});

const adminService = new AdminService();
const schedulerService = new SchedulerService();

// Start server
if (process.env.NODE_ENV !== "test") {
  async function startServer() {
    try {
      // Connect to MongoDB with improved configuration
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 30000, // Increased timeout for Atlas
        socketTimeoutMS: 45000,
        connectTimeoutMS: 30000,
        maxPoolSize: 10,
        retryWrites: true,
        retryReads: true,
        heartbeatFrequencyMS: 10000,
      });
      logger.info("Connected to MongoDB Atlas");

      await adminService.initializeAdmin(adminEmail, adminDefaultPassword);

      // Start the lesson status scheduler
      schedulerService.start();

      // Start Express server
      app.listen(port, () => {
        logger.info(`Server running on port ${port}`);
      });
    } catch (error) {
      logger.error("Failed to start server", error);
      process.exit(1);
    }
  }

  startServer();

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    logger.info("SIGTERM received. Closing server...");
    schedulerService.stop();
    await mongoose.disconnect();
    process.exit(0);
  });
}

export default app;
