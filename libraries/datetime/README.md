# @f-o-t/datetime

Lightweight, Day.js-inspired datetime library with modern fluent API, Zod-first validation, and plugin architecture.

[![npm version](https://img.shields.io/npm/v/@f-o-t/datetime.svg)](https://www.npmjs.com/package/@f-o-t/datetime)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Immutable**: All operations return new instances, preventing accidental mutations
- **Type Safety**: Full TypeScript support with Zod schema validation
- **Plugin Architecture**: Extend functionality with timezone, formatting, business days, and relative time plugins
- **Lightweight**: Minimal dependencies, built on native JavaScript Date
- **Fluent API**: Chainable methods for elegant datetime operations
- **Framework Agnostic**: Works with any JavaScript/TypeScript project
- **UTC-First**: All core operations use UTC to avoid timezone confusion
- **Rich API**: Comprehensive operations for creation, arithmetic, comparison, and manipulation

## Installation

```bash
# bun
bun add @f-o-t/datetime

# npm
npm install @f-o-t/datetime

# yarn
yarn add @f-o-t/datetime

# pnpm
pnpm add @f-o-t/datetime
```

## Quick Start

```typescript
import { datetime } from "@f-o-t/datetime";

// Create datetime instances
const now = datetime();
const birthday = datetime("2024-01-15T10:30:00Z");

// Perform arithmetic
const nextWeek = now.addWeeks(1);
const yesterday = now.subtractDays(1);

// Compare dates
if (birthday.isBefore(now)) {
  console.log("Birthday has passed");
}

// Calculate differences
const daysUntil = birthday.diff(now, "day");
console.log(`Days until birthday: ${daysUntil}`);

// Format output
console.log(now.toISO());  // "2024-01-15T10:30:00.000Z"
```

## Core Concepts

### DateTime Object

The `DateTime` class is the core type representing a moment in time:

```typescript
import { datetime } from "@f-o-t/datetime";

const dt = datetime("2024-01-15T10:30:00Z");
```

**Important**: DateTime objects are immutable. All operations return new instances.

### UTC-First Design

All core DateTime methods operate in UTC to avoid timezone-related bugs:

```typescript
const dt = datetime("2024-01-15T10:30:00Z");
dt.year();   // Returns UTC year
dt.hour();   // Returns UTC hour
dt.addDays(1);  // Adds days in UTC
```

Use the timezone plugin for timezone-aware operations.

### Validation

All inputs are validated using Zod schemas:

```typescript
import { datetime } from "@f-o-t/datetime";

// Valid inputs
datetime();                          // Current time
datetime(new Date());               // Date object
datetime("2024-01-15T10:30:00Z");  // ISO string
datetime(1705315800000);           // Unix timestamp
datetime(dt);                      // Another DateTime

// Invalid inputs throw InvalidDateError
datetime("invalid");  // Throws
datetime({});         // Throws
```

## API Reference

### Factory Functions

Create DateTime instances:

```typescript
import { datetime, DateTime } from "@f-o-t/datetime";

// Factory function (recommended)
const dt1 = datetime();                       // Current time
const dt2 = datetime("2024-01-15");          // ISO string
const dt3 = datetime(new Date());            // Date object
const dt4 = datetime(1705315800000);         // Timestamp
const dt5 = datetime(dt1);                   // Clone

// Constructor (alternative)
const dt6 = new DateTime("2024-01-15");
```

### Validation and Conversion

```typescript
const dt = datetime("2024-01-15T10:30:00Z");

// Check validity
dt.isValid();  // true

// Convert to native types
dt.toDate();   // Returns native Date object
dt.toISO();    // "2024-01-15T10:30:00.000Z"
dt.valueOf();  // 1705315800000 (Unix timestamp)
```

### Arithmetic Operations

All arithmetic methods return new DateTime instances:

```typescript
const dt = datetime("2024-01-15T10:30:00Z");

// Add time
dt.addMilliseconds(500);   // Add 500ms
dt.addSeconds(30);         // Add 30 seconds
dt.addMinutes(15);         // Add 15 minutes
dt.addHours(2);            // Add 2 hours
dt.addDays(7);             // Add 7 days
dt.addWeeks(2);            // Add 2 weeks
dt.addMonths(3);           // Add 3 months
dt.addYears(1);            // Add 1 year

// Subtract time
dt.subtractMilliseconds(500);
dt.subtractSeconds(30);
dt.subtractMinutes(15);
dt.subtractHours(2);
dt.subtractDays(7);
dt.subtractWeeks(2);
dt.subtractMonths(3);
dt.subtractYears(1);

// Negative amounts work in reverse
dt.addDays(-7);      // Same as subtractDays(7)
dt.subtractDays(-7); // Same as addDays(7)
```

### Comparison Operations

```typescript
const dt1 = datetime("2024-01-15T10:00:00Z");
const dt2 = datetime("2024-01-20T10:00:00Z");

// Basic comparisons
dt1.isBefore(dt2);       // true
dt1.isAfter(dt2);        // false
dt1.isSame(dt2);         // false
dt1.isSameOrBefore(dt2); // true
dt1.isSameOrAfter(dt2);  // false

// Range checking
const mid = datetime("2024-01-17T10:00:00Z");
mid.isBetween(dt1, dt2);           // false (exclusive)
mid.isBetween(dt1, dt2, true);     // true (inclusive)
```

### Getter Methods

All getters return UTC values:

```typescript
const dt = datetime("2024-01-15T10:30:45.123Z");

dt.year();        // 2024
dt.month();       // 0 (0-indexed, 0=January)
dt.date();        // 15 (day of month)
dt.day();         // 1 (day of week, 0=Sunday)
dt.hour();        // 10
dt.minute();      // 30
dt.second();      // 45
dt.millisecond(); // 123
```

### Setter Methods

All setters return new DateTime instances:

```typescript
const dt = datetime("2024-01-15T10:30:00Z");

dt.setYear(2025);         // Changes year to 2025
dt.setMonth(5);           // Changes month to June (0-indexed)
dt.setDate(20);           // Changes day to 20th
dt.setHour(14);           // Changes hour to 14:00
dt.setMinute(45);         // Changes minute to XX:45
dt.setSecond(30);         // Changes second to XX:XX:30
dt.setMillisecond(500);   // Changes millisecond to XX:XX:XX.500
```

### Start/End of Unit

Get the start or end of a time unit:

```typescript
const dt = datetime("2024-01-15T10:30:45.123Z");

// Start of unit (sets to 00:00:00.000)
dt.startOfDay();    // 2024-01-15T00:00:00.000Z
dt.startOfHour();   // 2024-01-15T10:00:00.000Z
dt.startOfWeek();   // 2024-01-14T00:00:00.000Z (Sunday)
dt.startOfMonth();  // 2024-01-01T00:00:00.000Z
dt.startOfYear();   // 2024-01-01T00:00:00.000Z

// End of unit (sets to 23:59:59.999 or max value)
dt.endOfDay();      // 2024-01-15T23:59:59.999Z
dt.endOfHour();     // 2024-01-15T10:59:59.999Z
dt.endOfWeek();     // 2024-01-20T23:59:59.999Z (Saturday)
dt.endOfMonth();    // 2024-01-31T23:59:59.999Z
dt.endOfYear();     // 2024-12-31T23:59:59.999Z
```

### Difference Calculation

Calculate the difference between two dates:

```typescript
const dt1 = datetime("2024-01-15T10:00:00Z");
const dt2 = datetime("2024-01-20T14:30:00Z");

dt2.diff(dt1, "millisecond");  // 456600000
dt2.diff(dt1, "second");       // 456600
dt2.diff(dt1, "minute");       // 7610
dt2.diff(dt1, "hour");         // 126.83...
dt2.diff(dt1, "day");          // 5.19...
dt2.diff(dt1, "week");         // 0.74...
dt2.diff(dt1, "month");        // 0 (calendar months)
dt2.diff(dt1, "year");         // 0.01...

// Difference can be negative
dt1.diff(dt2, "day");  // -5.19...
```

## Plugins

Extend DateTime functionality with plugins. Each plugin adds new methods to DateTime instances.

### Timezone Plugin

Handle timezone conversions and operations:

```typescript
import { DateTime } from "@f-o-t/datetime";
import timezonePlugin from "@f-o-t/datetime/plugins/timezone";

// Install plugin
DateTime.extend(timezonePlugin);

const dt = datetime("2024-01-15T10:00:00Z");

// Convert to timezone
const nyTime = dt.tz("America/New_York");

// Get timezone offset
const offset = dt.utcOffset("America/New_York");  // -300 (minutes)

// Format in timezone
const formatted = dt.tzFormat("America/New_York", "YYYY-MM-DD HH:mm");

// Get local timezone
const localTz = DateTime.localTimezone();  // e.g., "America/Los_Angeles"

// Validate timezone
DateTime.isValidTimezone("America/New_York");  // true
DateTime.isValidTimezone("Invalid/Zone");      // false
```

**Available Methods:**
- `tz(timezone)` - Convert to timezone
- `toTimezone(timezone)` - Alias for tz()
- `utcOffset(timezone)` - Get UTC offset in minutes
- `tzFormat(timezone, format)` - Format in timezone

**Static Methods:**
- `DateTime.localTimezone()` - Get system timezone
- `DateTime.isValidTimezone(tz)` - Validate timezone string

### Business Days Plugin

Work with business days (Monday-Friday):

```typescript
import { DateTime } from "@f-o-t/datetime";
import businessDaysPlugin from "@f-o-t/datetime/plugins/business-days";

DateTime.extend(businessDaysPlugin);

const dt = datetime("2024-01-15T10:00:00Z");  // Monday

// Check if weekday/weekend
dt.isWeekday();  // true
dt.isWeekend();  // false

// Add/subtract business days (skips weekends)
const nextBizDay = dt.addBusinessDays(1);      // Tuesday
const prevBizDay = dt.subtractBusinessDays(1); // Friday (prev week)

// Calculate business days between dates
const start = datetime("2024-01-15");  // Monday
const end = datetime("2024-01-22");    // Next Monday
start.diffBusinessDays(end);  // 5 business days
```

**Note**: Business days plugin only considers weekends. It does not account for holidays.

### Format Plugin

Format dates with customizable tokens:

```typescript
import { DateTime } from "@f-o-t/datetime";
import formatPlugin from "@f-o-t/datetime/plugins/format";

DateTime.extend(formatPlugin);

const dt = datetime("2024-01-15T14:30:45.123Z");

// Common formats
dt.format("YYYY-MM-DD");           // "2024-01-15"
dt.format("MM/DD/YYYY");           // "01/15/2024"
dt.format("MMMM D, YYYY");         // "January 15, 2024"
dt.format("dddd, MMMM D, YYYY");   // "Monday, January 15, 2024"
dt.format("h:mm A");               // "2:30 PM"
dt.format("HH:mm:ss");             // "14:30:45"
dt.format("YYYY-MM-DDTHH:mm:ss.SSSZ");  // ISO format (default)

// Escape characters with brackets
dt.format("[Year:] YYYY");         // "Year: 2024"
dt.format("[Today is] dddd");      // "Today is Monday"
```

**Available Tokens:**
- `YYYY` - 4-digit year (2024)
- `YY` - 2-digit year (24)
- `MMMM` - Full month name (January)
- `MMM` - Abbreviated month (Jan)
- `MM` - 2-digit month (01)
- `M` - Month number (1)
- `DD` - 2-digit day (15)
- `D` - Day of month (15)
- `dddd` - Full day name (Monday)
- `ddd` - Abbreviated day (Mon)
- `dd` - Min day name (Mo)
- `d` - Day of week (1)
- `HH` - 2-digit hour 24h (14)
- `H` - Hour 24h (14)
- `hh` - 2-digit hour 12h (02)
- `h` - Hour 12h (2)
- `mm` - 2-digit minute (30)
- `m` - Minute (30)
- `ss` - 2-digit second (45)
- `s` - Second (45)
- `SSS` - Milliseconds (123)
- `A` - AM/PM (PM)
- `a` - am/pm (pm)
- `Z` - Timezone offset (+00:00)
- `ZZ` - Compact offset (+0000)

### Relative Time Plugin

Display human-readable relative time:

```typescript
import { DateTime } from "@f-o-t/datetime";
import relativeTimePlugin from "@f-o-t/datetime/plugins/relative-time";

DateTime.extend(relativeTimePlugin);

const now = datetime();

// Get relative time from now
datetime(now.valueOf() - 30000).fromNow();        // "a few seconds ago"
datetime(now.valueOf() - 120000).fromNow();       // "2 minutes ago"
datetime(now.valueOf() - 7200000).fromNow();      // "2 hours ago"
datetime(now.valueOf() + 86400000).fromNow();     // "in a day"

// Get relative time to now
datetime(now.valueOf() - 30000).toNow();          // "in a few seconds"
datetime(now.valueOf() + 120000).toNow();         // "in 2 minutes"

// Relative time between two dates
const dt1 = datetime("2024-01-15");
const dt2 = datetime("2024-01-20");
dt1.from(dt2);  // "5 days ago"
dt1.to(dt2);    // "in 5 days"
```

**Time Ranges:**
- 0-45 seconds: "a few seconds ago"
- 45-90 seconds: "a minute ago"
- 2-45 minutes: "X minutes ago"
- 45 minutes - 21 hours: "X hours ago"
- 21 hours - 30 days: "X days ago"
- 30 days - 1 year: "X months ago"
- 1+ years: "X years ago"

## Zod Schemas

Validate datetime inputs with Zod:

```typescript
import { DateInputSchema } from "@f-o-t/datetime";

// Validate user input
const result = DateInputSchema.safeParse("2024-01-15");

if (result.success) {
  const dt = datetime(result.data);
}

// Use in API schemas
import { z } from "zod";

const EventSchema = z.object({
  name: z.string(),
  startDate: DateInputSchema,
  endDate: DateInputSchema,
});

type Event = z.infer<typeof EventSchema>;
```

**Accepted Inputs:**
- `Date` objects
- ISO date strings
- Unix timestamps (numbers)
- DateTime instances

## Error Handling

The library provides specific error types:

```typescript
import { InvalidDateError, PluginError } from "@f-o-t/datetime";

// InvalidDateError - thrown on invalid input
try {
  datetime("invalid-date");
} catch (error) {
  if (error instanceof InvalidDateError) {
    console.log("Invalid date input:", error.input);
  }
}

// PluginError - thrown on plugin issues
try {
  DateTime.extend(samePluginAgain);
} catch (error) {
  if (error instanceof PluginError) {
    console.log("Plugin error:", error.pluginName);
  }
}

// Check for invalid dates
const dt = datetime(new Date("invalid"));
if (!dt.isValid()) {
  console.log("Date is invalid");
}
```

## Advanced Usage

### Creating Custom Plugins

Extend DateTime with your own functionality:

```typescript
import { createPlugin } from "@f-o-t/datetime";
import type { DateTimeClass } from "@f-o-t/datetime";

// Extend DateTime interface
declare module "@f-o-t/datetime" {
  interface DateTime {
    isLeapYear(): boolean;
  }
}

// Create plugin
const leapYearPlugin = createPlugin(
  "leapYear",
  (DateTimeClass: DateTimeClass) => {
    DateTimeClass.prototype.isLeapYear = function(): boolean {
      const year = this.year();
      return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    };
  }
);

// Install plugin
DateTime.extend(leapYearPlugin);

// Use custom method
const dt = datetime("2024-01-15");
dt.isLeapYear();  // true
```

### Plugin Validation

Check if plugins are installed:

```typescript
import timezonePlugin from "@f-o-t/datetime/plugins/timezone";

// Check if plugin installed
DateTime.hasPlugin("timezone");  // false

// Install plugin
DateTime.extend(timezonePlugin);

// Check again
DateTime.hasPlugin("timezone");  // true

// Get plugin instance
const plugin = DateTime.getPlugin("timezone");
```

### Method Chaining

All operations return DateTime instances, enabling fluent chaining:

```typescript
const result = datetime("2024-01-15T10:00:00Z")
  .addDays(7)
  .startOfDay()
  .addHours(9)
  .setMinute(30);

// Result: 2024-01-22T09:30:00.000Z
```

### Working with Native Date

Convert between DateTime and native Date:

```typescript
// DateTime to Date
const dt = datetime("2024-01-15");
const nativeDate = dt.toDate();

// Date to DateTime
const dt2 = datetime(nativeDate);

// Modify native date (won't affect DateTime due to cloning)
nativeDate.setFullYear(2025);
console.log(dt.year());  // Still 2024
```

## Best Practices

### 1. Use UTC for Storage and Business Logic

```typescript
// Good - UTC operations
const dt = datetime("2024-01-15T10:00:00Z");
const tomorrow = dt.addDays(1);

// Store as ISO string
const stored = dt.toISO();  // "2024-01-15T10:00:00.000Z"

// Use timezone plugin for display only
const displayed = dt.tz("America/New_York");
```

### 2. Validate User Input

```typescript
import { DateInputSchema } from "@f-o-t/datetime";

function parseUserDate(input: unknown): DateTime | null {
  const result = DateInputSchema.safeParse(input);
  if (!result.success) {
    return null;
  }

  const dt = datetime(result.data);
  return dt.isValid() ? dt : null;
}
```

### 3. Use Immutability to Your Advantage

```typescript
// Safe to pass around without worrying about mutations
function processDate(dt: DateTime) {
  // This doesn't affect the original
  const modified = dt.addDays(1);
  return modified;
}

const original = datetime("2024-01-15");
const result = processDate(original);
// original is unchanged
```

### 4. Leverage TypeScript for Safety

```typescript
import type { DateTime, TimeUnit } from "@f-o-t/datetime";

function calculateAge(birthDate: DateTime): number {
  const now = datetime();
  return Math.floor(now.diff(birthDate, "year"));
}

// Type-safe unit parameter
function addTime(dt: DateTime, amount: number, unit: TimeUnit): DateTime {
  switch (unit) {
    case "day": return dt.addDays(amount);
    case "hour": return dt.addHours(amount);
    // TypeScript ensures all units are handled
  }
}
```

### 5. Install Plugins Once at Startup

```typescript
// app.ts or main.ts
import { DateTime } from "@f-o-t/datetime";
import timezonePlugin from "@f-o-t/datetime/plugins/timezone";
import formatPlugin from "@f-o-t/datetime/plugins/format";

// Install plugins once
DateTime.extend(timezonePlugin);
DateTime.extend(formatPlugin);

// Now available everywhere
```

## TypeScript

Full TypeScript support with strict types:

```typescript
import type {
  DateTime,
  DateInput,
  DateTimeClass,
  DateTimeConfig,
  DateTimePlugin,
  TimeUnit,
} from "@f-o-t/datetime";

// DateTime is the core instance type
const dt: DateTime = datetime();

// DateInput accepts multiple input types
const input: DateInput = "2024-01-15";
const dt2: DateTime = datetime(input);

// TimeUnit for diff operations
const unit: TimeUnit = "day";
const difference: number = dt.diff(dt2, unit);

// DateTimePlugin for custom plugins
const plugin: DateTimePlugin = {
  name: "custom",
  install: (DateTimeClass: DateTimeClass) => {
    // Add methods
  }
};
```

## Performance

The library is optimized for common datetime operations:

- **10,000 creations**: < 100ms
- **10,000 arithmetic operations**: < 50ms
- **10,000 comparisons**: < 30ms
- **10,000 format operations**: < 200ms
- **10,000 timezone conversions**: < 300ms

All benchmarks run with Bun runtime on modern hardware.

## Contributing

Contributions are welcome! Please check the repository for guidelines.

## License

MIT License - see [LICENSE](./LICENSE) file for details.

## Credits

Inspired by Day.js and built by the Finance Tracker team as part of the F-O-T libraries collection.

## Links

- [GitHub Repository](https://github.com/F-O-T/libraries)
- [Issue Tracker](https://github.com/F-O-T/libraries/issues)
- [NPM Package](https://www.npmjs.com/package/@f-o-t/datetime)