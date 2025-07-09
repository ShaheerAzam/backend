import { LessonService } from "./lessonService";
import { EarningsApprovalService } from "./earningsApprovalService";
import { logger } from "../utils/logger";

export class SchedulerService {
    private lessonService: LessonService;
    private earningsApprovalService: EarningsApprovalService;
    private intervalId: NodeJS.Timeout | null = null;

    constructor() {
        this.lessonService = new LessonService();
        this.earningsApprovalService = new EarningsApprovalService();
    }

    start() {
        // Run every 5 minutes
        this.intervalId = setInterval(async () => {
            try {
                // Update lesson statuses
                await this.lessonService.updateExpiredLessons();

                // Generate bi-weekly approvals (only creates if needed)
                await this.earningsApprovalService.generateBiWeeklyApprovals();
            } catch (error) {
                logger.error(
                    `Scheduler error: ${error instanceof Error ? error.message : "Unknown error"}`,
                    error
                );
            }
        }, 5 * 60 * 1000); // 5 minutes in milliseconds

        logger.info("Lesson status and earnings scheduler started (runs every 5 minutes)");
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            logger.info("Lesson status and earnings scheduler stopped");
        }
    }
} 