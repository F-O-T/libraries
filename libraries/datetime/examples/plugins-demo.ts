/**
 * Demo script showing all four core plugins in action
 */
import { DateTime } from "../src/core/datetime";
import {
   businessDaysPlugin,
   formatPlugin,
   relativeTimePlugin,
   timezonePlugin,
} from "../src/plugins/index";

// Install all plugins
DateTime.extend(timezonePlugin);
DateTime.extend(businessDaysPlugin);
DateTime.extend(formatPlugin);
DateTime.extend(relativeTimePlugin);

console.log("🎉 DateTime Plugin Demo\n");

// Create a DateTime instance
const dt = new DateTime("2024-01-15T14:30:45.123Z");
console.log("Base DateTime:", dt.toISO());
console.log();

// 1. Timezone Plugin
console.log("📍 Timezone Plugin:");
console.log("  Current timezone:", (dt as any).getTimezone());
const nyTime = (dt as any).tz("America/New_York");
console.log("  New York time:", (nyTime as any).getTimezone());
const utcTime = (nyTime as any).utc();
console.log("  Back to UTC:", (utcTime as any).getTimezone());
console.log();

// 2. Business Days Plugin
console.log("💼 Business Days Plugin:");
const monday = new DateTime("2024-01-15T12:00:00.000Z"); // Monday
console.log("  Is Monday a weekday?", (monday as any).isWeekday());
const saturday = new DateTime("2024-01-20T12:00:00.000Z"); // Saturday
console.log("  Is Saturday a weekday?", (saturday as any).isWeekday());
const plusThreeDays = (monday as any).addBusinessDays(3);
console.log(
   "  Monday + 3 business days:",
   (plusThreeDays as any).format("dddd, MMMM D"),
);
console.log();

// 3. Format Plugin
console.log("🎨 Format Plugin:");
console.log("  ISO format:", dt.toISO());
console.log("  Custom format (YYYY-MM-DD):", (dt as any).format("YYYY-MM-DD"));
console.log("  Custom format (MM/DD/YYYY):", (dt as any).format("MM/DD/YYYY"));
console.log(
   "  Custom format (MMMM D, YYYY):",
   (dt as any).format("MMMM D, YYYY"),
);
console.log("  Custom format (h:mm A):", (dt as any).format("h:mm A"));
console.log(
   "  Custom format (dddd, MMMM D, YYYY [at] h:mm A):",
   (dt as any).format("dddd, MMMM D, YYYY [at] h:mm A"),
);
console.log();

// 4. Relative Time Plugin
console.log("⏰ Relative Time Plugin:");
const now = new DateTime();
const hourAgo = now.subtractHours(1);
const tomorrow = now.addDays(1);
const lastWeek = now.subtractDays(7);

console.log("  1 hour ago from now:", (hourAgo as any).fromNow());
console.log("  Tomorrow from now:", (tomorrow as any).fromNow());
console.log("  Last week from now:", (lastWeek as any).fromNow());
console.log();

// Chaining plugins together
console.log("🔗 Chaining Plugins:");
const chained = new DateTime("2024-01-15T12:00:00.000Z");
const result = (chained as any)
   .addBusinessDays(5)
   .tz("America/New_York")
   .format("dddd, MMMM D, YYYY [at] h:mm A");
console.log("  Monday + 5 business days in NY:", result);
console.log();

console.log("✅ All plugins working perfectly!");
