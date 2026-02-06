# UI Coding Standards

## Core Principles

1. **ONLY use shadcn UI components** from `src/components/ui/`
2. **ABSOLUTELY NO custom wrapper components**
3. **All UI logic must be inline** in pages/layouts
4. **Use date-fns** for ALL date formatting via `@/lib/date-utils`

## Available shadcn UI Components

### Button
- Variants: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`
- Sizes: `default`, `sm`, `lg`, `icon`
- Usage: `<Button variant="default" size="md">Click me</Button>`

### Card Components
- `Card` - Container
- `CardHeader` - Top section
- `CardTitle` - Main heading
- `CardDescription` - Subtitle/description
- `CardContent` - Main content area
- `CardFooter` - Bottom section (actions)

### Badge
- Variants: `default`, `secondary`, `destructive`, `outline`
- Usage: `<Badge variant="default">New</Badge>`

### Alert Components
- `Alert` - Container (variants: `default`, `destructive`)
- `AlertTitle` - Heading
- `AlertDescription` - Message content

### Form Components
- `Input` - Text input field
- `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` - Dropdown
- `Label` - Form labels

### Table Components
- `Table` - Container
- `TableHeader` - Header section
- `TableBody` - Body section
- `TableFooter` - Footer section
- `TableRow` - Row
- `TableHead` - Header cell
- `TableCell` - Data cell
- `TableCaption` - Table caption

## Date Formatting Standards

**ALWAYS use functions from `@/lib/date-utils`:**

- `formatMatchDate(date: Date)` → "1st Sep 2025", "2nd Aug 2025", "3rd Jan 2026"
- `formatMatchTime(date: Date, timezone: string)` → "7:00 PM EDT"
- `formatFullDate(date: Date)` → "Monday, 1st September 2025"

**Example:**
```tsx
import { formatMatchDate, formatMatchTime } from '@/lib/date-utils';

// Good
<p>{formatMatchDate(match.kickoffTime)}</p>
<p>{formatMatchTime(match.kickoffTime, match.timezone)}</p>

// Bad - NEVER do this
<p>{match.kickoffTime.toLocaleDateString()}</p>
```

## Prohibited Practices

❌ Creating custom components in `src/components/` (except `ui/` directory)
❌ Using native Date methods (`toLocaleDateString`, `toLocaleTimeString`, `toDateString`)
❌ Creating wrapper components around shadcn primitives
❌ Domain-specific reusable components (like `<MatchCard>`, `<LeaderboardTable>`)
❌ Abstracting UI patterns into separate files

## Allowed Patterns

✅ Inline composition of shadcn UI components directly in pages
✅ Using shadcn UI component variants and props
✅ Tailwind CSS utility classes for styling
✅ Date formatting via `@/lib/date-utils` functions
✅ Inline conditional rendering
✅ Inline map/filter operations for lists

## Example: Correct Pattern

```tsx
// src/app/matches/page.tsx
export default async function MatchesPage() {
  const matches = await getMatches();

  return (
    <div className="space-y-4">
      {matches.map((match) => (
        <Card key={match.id}>
          <CardHeader>
            <CardTitle>{match.homeTeam} vs {match.awayTeam}</CardTitle>
            <CardDescription>
              {formatMatchDate(match.kickoffTime)} at {formatMatchTime(match.kickoffTime, match.timezone)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant={match.status === 'completed' ? 'default' : 'secondary'}>
              {match.status}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

## Why These Rules?

1. **Simplicity** - All UI logic is visible in one place
2. **Maintainability** - No need to hunt through component files
3. **Flexibility** - Easy to customize per-page without affecting others
4. **Consistency** - Standardized date formatting across the entire app
5. **Clarity** - Explicit composition makes data flow obvious
