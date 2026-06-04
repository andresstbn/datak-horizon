---
name: pug-tailwind-guard
description: >
  Apply this skill whenever writing or editing Vue templates that use lang="pug" in this project.
  It prevents build failures caused by Tailwind CSS class names that are invalid as Pug selector tokens.
  Covers fractional values (mt-0.5, py-1.5, py-2.5), pseudo-class variants (hover:, focus:, first:, last:),
  arbitrary values (text-[28px]), and slash-based classes (top-1/2, -translate-y-1/2).
---

# Pug + Tailwind Guard

## Why this skill exists

Pug parses class names in the selector chain (`.some-class.another-class`) as tokens. It fails silently or with cryptic errors when a class name contains characters that the lexer cannot handle:

- A `.` followed by a digit → `.5` is invalid (`.mt-0.5` splits into `.mt-0` + `.5`)
- A `\:` immediately before `(` → causes "unexpected text" error
- A `\/` inside a class name before `(` → can confuse the lexer

These errors **only surface at build time**, not in dev mode with HMR, so they can be committed undetected.

---

## The Rule

> **Never put a Tailwind class with a fractional value, pseudo-class variant, slash, or arbitrary value directly in the Pug selector chain.  
> Always place them inside a `class=""` static attribute.**

---

## Patterns and Correct Forms

### 1. Fractional values — `x.5`, `x.25`, etc.

Any Tailwind class ending in a decimal number (`.5`, `.25`, `.75`) **must** go in `class=""`.

```pug
// WRONG — Pug sees `.mt-0` then `.5` (invalid token)
p.text-sm.text-slate-500.mt-0.5 Hello

// CORRECT
p.text-sm.text-slate-500(class="mt-0.5") Hello
```

Common fractional classes: `mt-0.5`, `py-1.5`, `py-2.5`, `py-0.5`, `gap-1.5`, `mt-1.5`, `size-3.5`, `translate-x-0.5`, `space-y-2.5`, etc.

### 2. Pseudo-class variants — `hover:`, `focus:`, `first:`, `last:`, `dark:`, `sm:`, `md:`, `lg:`

**Case A — No attribute block on the element:**  
Use `class=""` for the variant, backslash-escape works for the rest.

```pug
// CORRECT — no (attrs), backslash escaping is fine
.bg-white.hover\:bg-slate-100 Item

// ALSO CORRECT — explicit class=""
.bg-white(class="hover:bg-slate-100") Item
```

**Case B — Element already has an attribute block `(...)`:**  
When combining `\:` pseudo-classes in the selector with `(class="...")`, the lexer fails if `\:xxx` is the **last class before `(`**.

```pug
// WRONG — `\:pb-0(class=` triggers "unexpected text \:pb" error
.flex.first\:pt-0.last\:pb-0(class="py-2.5"
  v-for="item in items" :key="item.id"
)

// CORRECT — all pseudo-classes moved into class=""
.flex(class="py-2.5 first:pt-0 last:pb-0"
  v-for="item in items" :key="item.id"
)
```

Note: inside `class=""` strings, colons do **not** need escaping (`first:pt-0` not `first\:pt-0`).

**Case C — Pseudo-class is NOT the last class before `(`:**  
Safe — the `(` follows a regular class.

```pug
// SAFE — hover\: is followed by more regular classes before (
.bg-white.hover\:bg-slate-100.transition.duration-150(
  @click="doSomething"
)
```

### 3. Slash in class names — `top-1/2`, `-translate-y-1/2`, `w-1/2`

Use `class=""` whenever a slash-class appears on an element that has any attribute block.

```pug
// WRONG
UIcon.absolute.left-3.top-1\/2.-translate-y-1\/2(name="i-heroicons-search")

// CORRECT
UIcon.absolute.left-3(class="top-1/2 -translate-y-1/2" name="i-heroicons-search")
```

### 4. Arbitrary values — `text-[28px]`, `w-[320px]`, `bg-[#ff0]`

Square brackets are safe in `class=""` only. Never in the selector chain.

```pug
// WRONG
h1.text-[28px].font-bold Title

// CORRECT — already the convention used in this project
h1.font-bold(class="text-[28px]") Title
```

---

## Checklist Before Writing a Pug Template

Before writing or reviewing any `<template lang="pug">` block, verify every element:

- [ ] No class in the selector chain ends with a digit after a `-` (e.g., `-0.5`, `-1.5`, `-2.5`)
- [ ] No `\:xxx` pseudo-class is the **last token** in the selector chain when the element has `(attrs)`
- [ ] No `\/` slash in a class name when the element has `(attrs)`
- [ ] No `[...]` arbitrary value anywhere in the selector chain
- [ ] Responsive prefixes like `sm:`, `md:`, `lg:`, `dark:` always inside `class=""` when combined with `(attrs)`

---

## Quick Reference: class="" vs selector chain

| Tailwind class example | Selector chain | `class=""` |
|---|---|---|
| `mt-4`, `px-3`, `gap-2` | ✅ Safe | ✅ Also fine |
| `mt-0.5`, `py-2.5`, `gap-1.5` | ❌ NEVER | ✅ Required |
| `hover:bg-slate-100` (no attrs block) | ✅ with `\:` escape | ✅ without escape |
| `first:pt-0` (with attrs block) | ❌ if last before `(` | ✅ Required |
| `top-1/2`, `-translate-y-1/2` (with attrs) | ❌ NEVER | ✅ Required |
| `text-[28px]`, `w-[calc(100%-2rem)]` | ❌ NEVER | ✅ Required |
| `sm:flex-row`, `md:grid-cols-2` (with attrs) | ❌ if last before `(` | ✅ Required |

---

## Merging multiple `class` sources

An element can have both a static `class=""` and a dynamic `:class`. They merge correctly:

```pug
.flex(
  class="py-2.5 first:pt-0 last:pb-0"
  :class="isActive ? 'bg-primary-50' : 'bg-white'"
  @click="select"
)
```

This is valid Pug and Vue handles the merge at runtime.

---

## Responsive prefixes in class=""

When adding responsive variants to an element that already has `(attrs)`, always use `class=""`:

```pug
// CORRECT
.flex.flex-col(class="md:flex-row md:items-center")
  slot

// Also correct — combine with fractional
.space-y-4(class="md:space-y-2.5")
```

Do NOT use `class` as a prop name on Nuxt UI components that accept it — prefer `:ui` instead for component-level customization.
