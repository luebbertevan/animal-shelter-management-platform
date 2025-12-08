# Refactoring Policy

This document outlines when and how to refactor code to maintain DRY (Don't Repeat Yourself) principles while avoiding premature optimization.

## Type Extension Policy

### Standard: Use `BaseType & { ... }` for Extensions

**Always use type extensions instead of duplicating fields:**

```typescript
// ✅ GOOD: Extends base type
type MessageWithProfile = Message & {
	profiles: { full_name: string } | null;
};

// ❌ BAD: Duplicates all fields
type MessageWithProfile = {
	id: string;
	conversation_id: string;
	// ... all fields repeated
	profiles: { full_name: string } | null;
};
```

**Benefits:**

-   Auto-updates when base type changes
-   Single source of truth
-   Less code to maintain
-   More intuitive and DRY

**When to use:**

-   Any time you need a base type + additional fields
-   When joining data from Supabase (e.g., `Message & { profiles: ... }`)
-   When adding computed/derived fields (e.g., `Message & { sender_name: string }`)

**Downsides:**

-   Minor: If base type has optional properties (`?`) but joined data always includes them, there's a subtle type difference (usually fine, TypeScript handles it)
-   This is rarely an issue in practice

---

## When to Refactor for DRY

### Consider Refactoring When:

1. **Field Addition Pain:**

    - Adding a single field requires updating **5+ places** in code
    - Example: Adding `edited_by` to Message requires updating 7 files

2. **Type Explosion:**

    - You have **10+ similar type definitions** that could share a base
    - Example: `MessageWithProfile`, `MessageWithTags`, `MessageWithReactions`, etc.

3. **Frequent Mistakes:**

    - You're consistently forgetting to update types in one place
    - Bugs caused by type mismatches

4. **Scale Indicators:**

    - **20+ database tables** (consider type generation)
    - **Schema changes frequently** (consider type generation)
    - **Multiple developers** working on same codebase (consider type generation)

5. **Repeated Patterns:**
    - Same field list repeated in **5+ queries**
    - Same transformation logic in **3+ places**

### Refactoring Strategies

#### 1. Type Extensions (Always Use)

```typescript
// Use immediately for any type extension
type ExtendedType = BaseType & { newField: string };
```

#### 2. Type Generation (Consider at Scale)

```bash
# When: 20+ tables, frequent schema changes, multiple developers
supabase gen types typescript --local > types/database.ts
```

#### 3. Constants File (Consider for Repeated Lists)

```typescript
// When: Same field list in 5+ queries
export const MESSAGE_FIELDS = ['id', 'content', ...] as const;
```

---

## Decision Tree

```
Need a type with base + extra fields?
├─ Yes → Use BaseType & { extra: fields }
└─ No → Continue

Adding a field requires updates in 5+ places?
├─ Yes → Consider constants file or type generation
└─ No → Continue

Have 20+ tables or frequent schema changes?
├─ Yes → Consider type generation from schema
└─ No → Continue with manual types

Same field list in 5+ queries?
├─ Yes → Create constants file
└─ No → Continue
```

---

## Notes

-   **Don't over-engineer:** Simple repetition is fine for small codebases
-   **Type safety first:** TypeScript will catch mismatches, so some repetition is acceptable
-   **Document decisions:** If you choose not to refactor, note why in code comments
