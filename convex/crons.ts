/** Cron sweep — the primary, idempotent reminder sender (plan §Delivery). */
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("reminder sweep", { minutes: 1 }, internal.push_sender.sweep, {});

export default crons;
