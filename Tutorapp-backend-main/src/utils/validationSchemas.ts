import { z } from "zod";

export const createStudentSchema = z.object({
  studentName: z.string().min(1, "Student name is required").trim(),
  email: z.string().email("Invalid email address").trim(),
  phoneNumber: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .trim(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
});

export const createTutorSchema = z.object({
  fullName: z.string().min(1, "Full name is required").trim(),
  email: z.string().email("Invalid email address").trim(),
  phoneNumber: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .trim(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  hourlyRate: z.number().min(0, "Hourly rate must be non-negative"),
});
export const changeAdminPasswordSchema = z.object({
  email: z.string().email("Invalid email address").trim(),
  currentPassword: z
    .string()
    .min(8, "Current password must be at least 8 characters"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});
export const loginSchema = z.object({
  email: z.string().email("Invalid email address").trim(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const logoutSchema = z.object({
  email: z.string().email("Invalid email address").trim(),
});

export const createLessonSchema = z.object({
  lessonDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
  lessonTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  duration: z.number().min(1, "Duration must be at least 1 minute"),
  subject: z.string().min(1, "Subject is required").trim(),
  topic: z.string().min(1, "Topic is required").trim(),
  type: z.enum(["online", "in-person"]),
  location: z.string().trim().optional(),
  tutorId: z.string().min(1, "Tutor ID is required"),
  studentId: z.string().min(1, "Student ID is required"),
});

export const createLessonBundleSchema = z.object({
  lessonTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  duration: z.number().min(1, "Duration must be at least 1 minute"),
  subject: z.string().min(1, "Subject is required").trim(),
  topic: z.string().min(1, "Topic is required").trim(),
  type: z.enum(["online", "in-person"]),
  location: z.string().trim().optional(),
  numberOfLessons: z
    .number()
    .min(1, "Number of lessons must be at least 1")
    .max(52, "Cannot schedule more than 52 lessons"),
  firstLessonDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
  studentId: z.string().min(1, "Student ID is required"),
  tutorId: z.string().min(1, "Tutor ID is required"),
});

export const rescheduleLessonSchema = z
  .object({
    newDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid date format",
      })
      .optional(),
    newTime: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)")
      .optional(),
  })
  .refine((data) => data.newDate || data.newTime, {
    message: "At least one of newDate or newTime must be provided",
  });

export const updateStudentProfileSchema = z
  .object({
    studentName: z
      .string()
      .min(1, "Student name is required")
      .trim()
      .optional(),
    phoneNumber: z
      .string()
      .min(10, "Phone number must be at least 10 digits")
      .trim()
      .optional(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .optional(),
  })
  .refine((data) => data.studentName || data.phoneNumber || data.password, {
    message:
      "At least one of studentName, phoneNumber, or password must be provided",
  });

export const updateTutorProfileSchema = z
  .object({
    fullName: z.string().min(1, "Full name is required").trim().optional(),
    phoneNumber: z
      .string()
      .min(10, "Phone number must be at least 10 digits")
      .trim()
      .optional(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .optional(),
  })
  .refine((data) => data.fullName || data.phoneNumber || data.password, {
    message:
      "At least one of fullName, phoneNumber, or password must be provided",
  });

export const cancelLessonSchema = z.object({});
