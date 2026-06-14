/** Internal reads used by the cron sweep (user email + reminder prefs). */
import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

export const userContext = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    const settings = await ctx.db
      .query("appSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return {
      email: user?.email ?? null,
      reminderPrefs: settings?.reminderPrefs ?? null,
    };
  },
});
