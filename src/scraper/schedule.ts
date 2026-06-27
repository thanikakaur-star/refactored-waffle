import { CronJob } from "cron";
import { runScrapers } from "./run.js";
import { logger } from "../utils/logger.js";

/**
 * Schedule the scrapers to run automatically on a recurring basis.
 *
 * Controlled by environment variables:
 *   ENABLE_SCRAPER_CRON  — must be "true" to activate (off by default, so local
 *                          dev and tests never kick off scraping)
 *   SCRAPER_CRON         — cron expression (default: daily at 03:00)
 *   SCRAPER_TIMEZONE     — IANA timezone for the schedule (default: Europe/London)
 *
 * Cron format: minute hour day-of-month month day-of-week
 *   "0 3 * * *"   → 03:00 every day (default)
 *   "0 3 1 * *"   → 03:00 on the 1st of every month
 *   "0 */6 * * *" → every 6 hours
 */
export function startScraperSchedule(): CronJob | null {
  if (process.env.ENABLE_SCRAPER_CRON !== "true") {
    logger.info("Scraper cron disabled (set ENABLE_SCRAPER_CRON=true to enable)");
    return null;
  }

  const cronExpression = process.env.SCRAPER_CRON || "0 3 * * *";
  const timeZone = process.env.SCRAPER_TIMEZONE || "Europe/London";

  let isRunning = false;

  const job = new CronJob(
    cronExpression,
    async () => {
      // Guard against overlap if a previous run is still going
      if (isRunning) {
        logger.warn("Skipping scheduled scrape — previous run still in progress");
        return;
      }
      isRunning = true;
      logger.info("Scheduled scrape starting");
      try {
        const summary = await runScrapers();
        logger.info("Scheduled scrape finished", summary);
      } catch (err) {
        logger.error("Scheduled scrape failed", { error: String(err) });
      } finally {
        isRunning = false;
      }
    },
    null, // onComplete
    true, // start immediately
    timeZone,
  );

  logger.info("Scraper cron scheduled", {
    cronExpression,
    timeZone,
    nextRun: job.nextDate().toISO(),
  });

  return job;
}
