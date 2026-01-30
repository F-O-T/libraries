# @f-o-t/datetime

Lightweight, Day.js-inspired datetime library with modern fluent API, Zod-first validation, and plugin architecture.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Fluent API**: Chainable methods for intuitive date manipulation
- **Immutable**: All operations return new instances, preventing accidental mutations
- **Type Safety**: Full TypeScript support with Zod schema validation
- **Plugin Architecture**: Extend functionality with timezone, formatting, business days, and relative time plugins
- **Framework Agnostic**: Works with Bun, Node.js, and any JavaScript/TypeScript project
- **Lightweight**: Zero dependencies except Zod
- **ISO 8601 Support**: Built-in ISO format parsing and serialization
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
const birthday = datetime("1990-01-15");
const custom = datetime(new Date(2024, 0, 15));

// Fluent API for manipulation
const nextWeek = now.addDays(7);
const lastMonth = now.subtractMonths(1);

// Comparisons
if (birthday.isBefore(now)) {
  console.log("Birthday has passed");
}

// Formatting
console.log(now.toISO());        // "2024-01-15T14:30:00.000Z"
console.log(now.toDate());       // Date object
console.log(now.valueOf());      // Unix timestamp
```

## Core Concepts

### DateTime Object

The `DateTime` class represents an immutable datetime value wrapping a native JavaScript `Date` object.

```typescript
import { datetime } from "@f-o-t/datetime";

const dt = datetime("2024-01-15T14:30:00Z");
// DateTime instance wrapping 2024-01-15 14:30:00 UTC
```

**Important**: DateTime objects are immutable. All operations return new instances.

### Immutability

Every operation creates a new instance:

```typescript
const original = datetime("2024-01-15");
const modified = original.addDays(7);

console.log(original.format("YYYY-MM-DD"));  // "2024-01-15"
console.log(modified.format("YYYY-MM-DD"));  // "2024-01-22"
```

## API Reference

### Factory Function

Create datetime instances from various inputs:

```typescript
import { datetime } from "@f-o-t/datetime";

// Current time
const now = datetime();

// From ISO string
const dt1 = datetime("2024-01-15T14:30:00Z");
const dt2 = datetime("2024-01-15");

// From Date object
const dt3 = datetime(new Date());

// From timestamp (milliseconds)
const dt4 = datetime(1705330200000);

// From another DateTime
const dt5 = datetime(dt1);
```

### Arithmetic Operations

Add or subtract time units:

```typescript
const dt = datetime("2024-01-15");

// Add units
dt.addYears(1);        // 2025-01-15
dt.addMonths(2);       // 2024-03-15
dt.addWeeks(1);        // 2024-01-22
dt.addDays(7);         // 2024-01-22
dt.addHours(12);       // 2024-01-15 12:00
dt.addMinutes(30);     // 2024-01-15 00:30
dt.addSeconds(45);     // 2024-01-15 00:00:45
dt.addMilliseconds(500); // 2024-01-15 00:00:00.500

// Subtract units
dt.subtractYears(1);   // 2023-01-15
dt.subtractMonths(2);  // 2023-11-15
dt.subtractWeeks(1);   // 2024-01-08
dt.subtractDays(7);    // 2024-01-08
dt.subtractHours(12);  // 2024-01-14 12:00

// Chainable operations
dt.addDays(7).addHours(12).subtractMinutes(30);
```

### Comparison Operations

Compare datetime instances:

```typescript
const dt1 = datetime("2024-01-15");
const dt2 = datetime("2024-01-20");
const dt3 = datetime("2024-01-15");

// Basic comparisons
dt1.isBefore(dt2);     // true
dt1.isAfter(dt2);      // false
dt1.isSame(dt3);       // true

// Granular comparisons
dt1.isSameYear(dt2);   // true
dt1.isSameMonth(dt2);  // true
dt1.isSameDay(dt3);    // true
```

### Getter Methods

Access individual date/time components:

```typescript
const dt = datetime("2024-01-15T14:30:45.500Z");

// Date components
dt.year();        // 2024
dt.month();       // 0 (January, 0-indexed like Date)
dt.date();        // 15
dt.day();         // 1 (Monday, 0=Sunday)

// Time components
dt.hour();        // 14
dt.minute();      // 30
dt.second();      // 45
dt.millisecond(); // 500

// Derived values
dt.daysInMonth(); // 31
dt.valueOf();     // 1705330245500 (Unix timestamp)
dt.toDate();      // Date object
```

### Setter Methods

Create new instances with specific values:

```typescript
const dt = datetime("2024-01-15T14:30:00Z");

// Set date components
dt.setYear(2025);      // 2025-01-15T14:30:00Z
dt.setMonth(5);        // 2024-06-15T14:30:00Z (June)
dt.setDate(20);        // 2024-01-20T14:30:00Z
dt.setDay(3);          // Next Wednesday

// Set time components
dt.setHour(16);        // 2024-01-15T16:30:00Z
dt.setMinute(45);      // 2024-01-15T14:45:00Z
dt.setSecond(30);      // 2024-01-15T14:30:30Z
dt.setMillisecond(250); // 2024-01-15T14:30:00.250Z

// Chainable
dt.setYear(2025).setMonth(11).setDate(25); // Christmas 2025
```

### Start/End of Time Units

Get the beginning or end of a time period:

```typescript
const dt = datetime("2024-01-15T14:30:45.500Z");

// Start of units
dt.startOfYear();       // 2024-01-01T00:00:00.000Z
dt.startOfMonth();      // 2024-01-01T00:00:00.000Z
dt.startOfWeek();       // 2024-01-14T00:00:00.000Z (Sunday)
dt.startOfDay();        // 2024-01-15T00:00:00.000Z
dt.startOfHour();       // 2024-01-15T14:00:00.000Z
dt.startOfMinute();     // 2024-01-15T14:30:00.000Z
dt.startOfSecond();     // 2024-01-15T14:30:45.000Z

// End of units
dt.endOfYear();         // 2024-12-31T23:59:59.999Z
dt.endOfMonth();        // 2024-01-31T23:59:59.999Z
dt.endOfWeek();         // 2024-01-20T23:59:59.999Z (Saturday)
dt.endOfDay();          // 2024-01-15T23:59:59.999Z
dt.endOfHour();         // 2024-01-15T14:59:59.999Z
dt.endOfMinute();       // 2024-01-15T14:30:59.999Z
dt.endOfSecond();       // 2024-01-15T14:30:45.999Z
```

### Difference Calculations

Calculate time differences between datetime instances:

```typescript
const dt1 = datetime("2024-01-15T14:30:00Z");
const dt2 = datetime("2024-01-20T16:45:30Z");

// Difference in various units
dt2.diffYears(dt1);        // 0
dt2.diffMonths(dt1);       // 0
dt2.diffDays(dt1);         // 5
dt2.diffHours(dt1);        // 122
dt2.diffMinutes(dt1);      // 7335
dt2.diffSeconds(dt1);      // 440130
dt2.diffMilliseconds(dt1); // 440130000

// Floating point differences
dt2.diffDays(dt1, true);   // 5.093402777777778
```

### Serialization

Convert to various formats:

```typescript
const dt = datetime("2024-01-15T14:30:00Z");

// ISO 8601 format
dt.toISO();      // "2024-01-15T14:30:00.000Z"

// Native Date object
dt.toDate();     // Date object

// Unix timestamp
dt.valueOf();    // 1705330200000

// String representation
dt.toString();   // Date.toString() output
```

## Plugin System

Extend DateTime functionality with plugins:

```typescript
import { DateTime } from "@f-o-t/datetime";
import { timezonePlugin } from "@f-o-t/datetime/plugins/timezone";
import { formatPlugin } from "@f-o-t/datetime/plugins/format";

// Register plugins
DateTime.extend(timezonePlugin);
DateTime.extend(formatPlugin);

// Now plugin methods are available
const dt = datetime();
console.log(dt.format("YYYY-MM-DD"));
console.log(dt.tz("America/New_York"));
```

### Timezone Plugin

Work with IANA timezones:

```typescript
import { DateTime, datetime } from "@f-o-t/datetime";
import { timezonePlugin } from "@f-o-t/datetime/plugins/timezone";

DateTime.extend(timezonePlugin);

const dt = datetime("2024-01-15T14:30:00Z");

// Set timezone
const ny = dt.tz("America/New_York");
const tokyo = dt.tz("Asia/Tokyo");

// Convert timezone
const converted = dt.toTimezone("Europe/London");

// UTC conversion
const utc = dt.utc();

// Local timezone
const local = dt.local();

// Get current timezone
console.log(dt.getTimezone()); // "UTC"
console.log(ny.getTimezone()); // "America/New_York"

// Static factory with timezone
const dtNY = DateTime.tz("2024-01-15", "America/New_York");
```

### Format Plugin

Custom date formatting with tokens:

```typescript
import { DateTime, datetime } from "@f-o-t/datetime";
import { formatPlugin } from "@f-o-t/datetime/plugins/format";

DateTime.extend(formatPlugin);

const dt = datetime("2024-01-15T14:30:45.500Z");

// Common formats
dt.format("YYYY-MM-DD");           // "2024-01-15"
dt.format("MM/DD/YYYY");           // "01/15/2024"
dt.format("MMMM D, YYYY");         // "January 15, 2024"
dt.format("dddd, MMMM D, YYYY");   // "Monday, January 15, 2024"
dt.format("h:mm A");               // "2:30 PM"
dt.format("HH:mm:ss");             // "14:30:45"

// Escaped text
dt.format("[Today is] YYYY-MM-DD"); // "Today is 2024-01-15"

// Default (ISO format)
dt.format(); // "2024-01-15T14:30:45.500Z"
```

**Available Tokens:**
- `YYYY`: 4-digit year (2024)
- `YY`: 2-digit year (24)
- `MMMM`: Full month name (January)
- `MMM`: Abbreviated month (Jan)
- `MM`: 2-digit month (01)
- `M`: Month number (1)
- `DD`: 2-digit day (15)
- `D`: Day of month (15)
- `dddd`: Full day name (Monday)
- `ddd`: Abbreviated day (Mon)
- `dd`: Min day name (Mo)
- `d`: Day of week (1, 0=Sunday)
- `HH`: 2-digit hour 24h (14)
- `H`: Hour 24h (14)
- `hh`: 2-digit hour 12h (02)
- `h`: Hour 12h (2)
- `mm`: 2-digit minute (30)
- `m`: Minute (30)
- `ss`: 2-digit second (45)
- `s`: Second (45)
- `SSS`: Millisecond (500)
- `A`: AM/PM uppercase
- `a`: am/pm lowercase
- `[text]`: Escaped text (literal)

### Business Days Plugin

Work with business days (weekdays):

```typescript
import { DateTime, datetime } from "@f-o-t/datetime";
import { businessDaysPlugin } from "@f-o-t/datetime/plugins/business-days";

DateTime.extend(businessDaysPlugin);

const dt = datetime("2024-01-15"); // Monday

// Check day type
dt.isWeekday(); // true (Monday-Friday)
dt.isWeekend(); // false (Saturday-Sunday)

// Add/subtract business days
const nextBusiness = dt.addBusinessDays(5);  // Next Monday (skips weekend)
const prevBusiness = dt.subtractBusinessDays(3); // Previous Wednesday

// Calculate business days between dates
const start = datetime("2024-01-15"); // Monday
const end = datetime("2024-01-22");   // Next Monday
const businessDays = end.diffBusinessDays(start); // 5 (excludes weekend)
```

### Relative Time Plugin

Human-readable relative time strings:

```typescript
import { DateTime, datetime } from "@f-o-t/datetime";
import { relativeTimePlugin } from "@f-o-t/datetime/plugins/relative-time";

DateTime.extend(relativeTimePlugin);

const dt = datetime().subtractHours(2);

// From now
dt.fromNow(); // "2 hours ago"

// To now
dt.toNow(); // "in 2 hours"

// From another datetime
const other = datetime("2024-01-15");
const compare = datetime("2024-01-20");
compare.from(other); // "5 days ago" (from other's perspective)

// To another datetime
compare.to(other); // "in 5 days" (to other's perspective)
```

**Output Examples:**
- `"a few seconds ago"` / `"in a few seconds"`
- `"a minute ago"` / `"in a minute"`
- `"2 minutes ago"` / `"in 2 minutes"`
- `"an hour ago"` / `"in an hour"`
- `"3 hours ago"` / `"in 3 hours"`
- `"a day ago"` / `"in a day"`
- `"5 days ago"` / `"in 5 days"`
- `"a month ago"` / `"in a month"`
- `"2 months ago"` / `"in 2 months"`
- `"a year ago"` / `"in a year"`
- `"3 years ago"` / `"in 3 years"`

### Creating Custom Plugins

Build your own plugins:

```typescript
import { createPlugin } from "@f-o-t/datetime";
import type { DateTimeClass } from "@f-o-t/datetime";

// Extend the DateTime interface
declare module "@f-o-t/datetime" {
  interface DateTime {
    isLeapYear(): boolean;
  }
}

// Create the plugin
const leapYearPlugin = createPlugin(
  "leap-year",
  (DateTimeClass: DateTimeClass) => {
    DateTimeClass.prototype.isLeapYear = function (): boolean {
      const year = this.year();
      return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    };
  }
);

// Register and use
DateTime.extend(leapYearPlugin);
datetime("2024-01-01").isLeapYear(); // true
```

## Zod Schemas

Validate datetime input with Zod:

```typescript
import { DateInputSchema } from "@f-o-t/datetime";
import { z } from "zod";

// Validate date input
const result = DateInputSchema.safeParse("2024-01-15");
if (result.success) {
  const dt = datetime(result.data);
}

// Use in schemas
const EventSchema = z.object({
  name: z.string(),
  date: DateInputSchema,
  startTime: DateInputSchema.optional(),
});

const event = EventSchema.parse({
  name: "Meeting",
  date: "2024-01-15T14:30:00Z",
});

// DateInputSchema accepts:
// - ISO strings: "2024-01-15T14:30:00Z"
// - Date objects: new Date()
// - Numbers: 1705330200000 (timestamp)
// - DateTime instances
```

## Error Handling

The library provides specific error types:

```typescript
import { InvalidDateError, PluginError } from "@f-o-t/datetime";

// Invalid date input
try {
  datetime("invalid-date");
} catch (error) {
  if (error instanceof InvalidDateError) {
    console.log("Invalid date:", error.message);
  }
}

// Plugin errors
try {
  DateTime.extend(invalidPlugin);
} catch (error) {
  if (error instanceof PluginError) {
    console.log("Plugin error:", error.message);
  }
}

// Zod validation errors
import { DateInputSchema } from "@f-o-t/datetime";

const result = DateInputSchema.safeParse(null);
if (!result.success) {
  console.log("Validation failed:", result.error);
}
```

## Best Practices

### 1. Use ISO Strings for Precision

```typescript
// Good - unambiguous ISO format
const dt = datetime("2024-01-15T14:30:00Z");

// Avoid - ambiguous formats may parse incorrectly
const dt = datetime("1/15/2024");
```

### 2. Leverage Immutability

```typescript
// Good - clear that original is unchanged
const original = datetime("2024-01-15");
const modified = original.addDays(7);

// Don't mutate and reuse variable names
let date = datetime("2024-01-15");
date = date.addDays(7); // Confusing
```

### 3. Chain Operations for Clarity

```typescript
// Good - readable and concise
const result = datetime("2024-01-15")
  .addDays(7)
  .startOfDay()
  .addHours(9);

// Avoid - verbose and harder to read
const dt1 = datetime("2024-01-15");
const dt2 = dt1.addDays(7);
const dt3 = dt2.startOfDay();
const dt4 = dt3.addHours(9);
```

### 4. Use Plugins Sparingly

```typescript
// Good - register plugins once at app startup
import { DateTime } from "@f-o-t/datetime";
import { formatPlugin, timezonePlugin } from "@f-o-t/datetime/plugins";

DateTime.extend(formatPlugin);
DateTime.extend(timezonePlugin);

// Don't register repeatedly
function formatDate(dt) {
  DateTime.extend(formatPlugin); // Bad - registers every call
  return dt.format("YYYY-MM-DD");
}
```

### 5. Validate User Input

```typescript
import { DateInputSchema, datetime } from "@f-o-t/datetime";

function createEvent(input: unknown) {
  // Validate first
  const validated = DateInputSchema.parse(input);
  const eventDate = datetime(validated);
  
  // Use validated date
  return {
    date: eventDate.toISO(),
    isUpcoming: eventDate.isAfter(datetime()),
  };
}
```

### 6. Handle Timezones Explicitly

```typescript
import { DateTime, datetime } from "@f-o-t/datetime";
import { timezonePlugin } from "@f-o-t/datetime/plugins/timezone";

DateTime.extend(timezonePlugin);

// Good - explicit timezone handling
function scheduleEvent(dateStr: string, userTimezone: string) {
  return datetime(dateStr).tz(userTimezone);
}

// Avoid - implicit local timezone may cause issues
function scheduleEvent(dateStr: string) {
  return datetime(dateStr); // May use unexpected timezone
}
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

// DateTime is the core type
const dt: DateTime = datetime("2024-01-15");

// DateInput accepts various inputs
const input: DateInput = "2024-01-15";
const input2: DateInput = new Date();
const input3: DateInput = 1705330200000;

// TimeUnit for unit-based operations
const unit: TimeUnit = "day";
dt.add(5, unit);

// Plugin types for custom plugins
const plugin: DateTimePlugin = {
  name: "my-plugin",
  install: (DateTimeClass: DateTimeClass) => {
    // Plugin implementation
  },
};
```

## Contributing

Contributions are welcome! Please check the repository for guidelines.

## License

MIT License - see [LICENSE](./LICENSE) file for details.

## Credits

Built by the Finance Tracker team as part of the F-O-T libraries collection.

## Links

- [GitHub Repository](https://github.com/F-O-T/libraries)
- [Issue Tracker](https://github.com/F-O-T/libraries/issues)