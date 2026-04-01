# TypeScript guidelines (agents & contributors)

Conventions for new and edited TypeScript in this repo. Supplements stack choices in `AGENTS.md`.


## 1. Prefer early returns

Use **early returns** when it keeps control flow shallow. Avoid deep nesting from `if` / `else if` / `else` ladders when a guard clause or early exit is clearer.

## 2. Blank line before `return`

Put a **blank line above every `return` statement**, unless the `return` is the **only** statement in the function body or if/else block.

## 3. JSDoc on every new function or method

Add a **JSDoc comment directly above** every **new** function or method (public or private). Describe purpose, parameters, return value, and thrown errors when relevant.

Example:

```typescript
/**
 * Reads access JWT token to see if it is valid
 *
 * @param accessToken - Clover access JWT.
 * 
 * @returns if token is valid
 *
 * @throws Error if the claim is missing or read error occured
 */
```

## 4. **Readable Names:** Use descriptive names; avoid redundant naming (e.g., use `User`, not `UserDataObj`).

## 5. File-level JSDoc on new files

Every **new** file must start with a **file-level JSDoc block** that states the purpose of the module (or main export) and includes **`@since`** set to the **current Git branch name** at the time the file is added (not a date). Replace the value when merging if your workflow requires tracking the introducing branch.

Example:

```typescript
/**
 * Validates OAuth callback query params and maps them to internal types.
 *
 * @since app-login--JP
 */
```

## 6. One responsibility per function

As much as possible, each function or method should **do one thing**. If a name needs “and” to describe it, consider splitting helpers. If an AI struggles, break it down.

## 7. Fluent instance methods (`return this`)

For **instance methods** on classes (not `static` methods), if the method does **not** return a meaningful value—i.e. it would otherwise be **`void`**—it must **`return this`** so callers can **chain** calls: `obj.a().b().c()`.

Does **not** apply when the method intentionally returns a value (including `undefined` as a meaningful result). Does **not** apply to `static` methods, free functions, or object literals unless you adopt the same pattern deliberately and document it.

## 8. TypeScript Errors Before task completion

If the agent triggers TypeErrors, require them to fix them *before* considering the task complete.

## 9. Interfaces over Aliases (for objects):

Prefer `interface` for object structures to allow declaration merging. All new interfaces go into the `packages/src/interfaces/` folder, and can be made in a new interface file if interface abstraction/purpose doesnt fit existing interface files (e.g. ReportsContracts.ts created if we have a passed data structure involving report data models). Export new files in `/packages/src/index.ts`

## 10. Type definitions

All new type definitions are in `packages/src/types/PrimitiveTypes`. Check to see if type definition doesn't already exist before adding.

## 11. Const definitions

All new const definitions are in `packages/src/consts/`. Check to see if relative const definition doesn't already exist before adding. All new interfaces go into the `packages/src/consts/` folder, and can be made in a new const file if const abstraction/purpose doesnt fit existing const files (e.g. ReportsConsts.ts created if we have a const involving report data properties). Export new files in `/packages/src/index.ts`

## 12. Enum definitions

All new enum definitions are in `packages/src/enums/`. Check to see if relative enum definition doesn't already exist before adding. All new interfaces go into the `packages/src/enums/` folder, and can be made in a new enum file if enum abstraction/purpose doesnt fit existing enum files (e.g. Reports.ts created if we have an enum involving report data properties). Export new files in `/packages/src/index.ts`
