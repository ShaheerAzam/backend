import { Router } from "express";
import {
  cancelLesson,
  completeLesson,
  createLesson,
  createLessonBundle,
  getLessons,
  rescheduleLesson,
  updateLesson,
  updateExpiredLessons,
  bulkUpdateLessons,
} from "../controllers/lessonController";
import { validateRequest } from "../middleware/validateRequest";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  createLessonSchema,
  createLessonBundleSchema,
  rescheduleLessonSchema,
  cancelLessonSchema,
  bulkUpdateLessonsSchema,
} from "../utils/validationSchemas";

const router = Router();

router.post(
  "/",
  authMiddleware("admin"),
  validateRequest(createLessonSchema),
  createLesson
);
router.post(
  "/bundle",
  authMiddleware("admin"),
  validateRequest(createLessonBundleSchema),
  createLessonBundle
);

router.get("/", authMiddleware(), getLessons);

router.put(
  "/:lessonId",
  authMiddleware(),
  updateLesson
);

router.patch(
  "/:lessonId/reschedule",
  authMiddleware(),
  validateRequest(rescheduleLessonSchema),
  rescheduleLesson
);

router.patch(
  "/:lessonId/cancel",
  authMiddleware(),
  validateRequest(cancelLessonSchema),
  cancelLesson
);

router.patch(
  "/:lessonId/complete",
  authMiddleware(),
  completeLesson
);

router.post(
  "/bulk-update",
  authMiddleware("admin"),
  validateRequest(bulkUpdateLessonsSchema),
  bulkUpdateLessons
);

router.post(
  "/update-expired",
  authMiddleware("admin"),
  updateExpiredLessons
);

export default router;
