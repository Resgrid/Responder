<!-- dgc-policy-v10 -->
# Dual-Graph Context Policy

This project uses a local dual-graph MCP server for efficient context retrieval.

## MANDATORY: Always follow this order

1. **Call `graph_continue` first** — before any file exploration, grep, or code reading.

2. **If `graph_continue` returns `needs_project=true`**: call `graph_scan` with the
   current project directory (`pwd`). Do NOT ask the user.

3. **If `graph_continue` returns `skip=true`**: project has fewer than 5 files.
   Do NOT do broad or recursive exploration. Read only specific files if their names
   are mentioned, or ask the user what to work on.

4. **Read `recommended_files`** using `graph_read` — **one call per file**.
   - `graph_read` accepts a single `file` parameter (string). Call it separately for each
     recommended file. Do NOT pass an array or batch multiple files into one call.
   - `recommended_files` may contain `file::symbol` entries (e.g. `src/auth.ts::handleLogin`).
     Pass them verbatim to `graph_read(file: "src/auth.ts::handleLogin")` — it reads only
     that symbol's lines, not the full file.
   - Example: if `recommended_files` is `["src/auth.ts::handleLogin", "src/db.ts"]`,
     call `graph_read(file: "src/auth.ts::handleLogin")` and `graph_read(file: "src/db.ts")`
     as two separate calls (they can be parallel).

5. **Check `confidence` and obey the caps strictly:**
   - `confidence=high` -> Stop. Do NOT grep or explore further.
   - `confidence=medium` -> If recommended files are insufficient, call `fallback_rg`
     at most `max_supplementary_greps` time(s) with specific terms, then `graph_read`
     at most `max_supplementary_files` additional file(s). Then stop.
   - `confidence=low` -> Call `fallback_rg` at most `max_supplementary_greps` time(s),
     then `graph_read` at most `max_supplementary_files` file(s). Then stop.

## Token Usage

A `token-counter` MCP is available for tracking live token usage.

- To check how many tokens a large file or text will cost **before** reading it:
  `count_tokens({text: "<content>"})`
- To log actual usage after a task completes (if the user asks):
  `log_usage({input_tokens: <est>, output_tokens: <est>, description: "<task>"})`
- To show the user their running session cost:
  `get_session_stats()`

Live dashboard URL is printed at startup next to "Token usage".

## Rules

- Do NOT use `rg`, `grep`, or bash file exploration before calling `graph_continue`.
- Do NOT do broad/recursive exploration at any confidence level.
- `max_supplementary_greps` and `max_supplementary_files` are hard caps - never exceed them.
- Do NOT dump full chat history.
- Do NOT call `graph_retrieve` more than once per turn.
- After edits, call `graph_register_edit` with the changed files. Use `file::symbol` notation (e.g. `src/auth.ts::handleLogin`) when the edit targets a specific function, class, or hook.

## Context Store

Whenever you make a decision, identify a task, note a next step, fact, or blocker during a conversation, append it to `.dual-graph/context-store.json`.

**Entry format:**
```json
{"type": "decision|task|next|fact|blocker", "content": "one sentence max 15 words", "tags": ["topic"], "files": ["relevant/file.ts"], "date": "YYYY-MM-DD"}
```

**To append:** Read the file → add the new entry to the array → Write it back → call `graph_register_edit` on `.dual-graph/context-store.json`.

**Rules:**
- Only log things worth remembering across sessions (not every minor detail)
- `content` must be under 15 words
- `files` lists the files this decision/task relates to (can be empty)
- Log immediately when the item arises — not at session end

## Session End

When the user signals they are done (e.g. "bye", "done", "wrap up", "end session"), proactively update `CONTEXT.md` in the project root with:
- **Current Task**: one sentence on what was being worked on
- **Key Decisions**: bullet list, max 3 items
- **Next Steps**: bullet list, max 3 items

Keep `CONTEXT.md` under 20 lines total. Do NOT summarize the full conversation — only what's needed to resume next session.

---

# Project: Resgrid Responder (React Native / Expo)

## Stack

| Concern | Library |
|---|---|
| Package manager | `yarn` |
| State | `zustand` |
| Forms | `react-hook-form` |
| Data fetching | `react-query` |
| HTTP | `axios` |
| i18n | `react-i18next` |
| Local storage | `react-native-mmkv` |
| Secure storage | Expo SecureStore |
| Navigation | React Navigation |
| UI components | `gluestack-ui` (from `components/ui`) |
| Icons | `lucide-react-native` (use directly in markup, NOT via gluestack Icon) |
| Maps / nav | `@rnmapbox/maps` |
| Images | `react-native-fast-image` |

## Code Rules

- TypeScript everywhere. No `any`. Use `interface` for props/state. `React.FC` for components.
- Enable strict typing in `tsconfig.json`.
- Functional components and hooks only — no class components.
- File/directory names: `lowercase-hyphenated`. Components: `PascalCase`. Variables/functions: `camelCase`.
- Organize by feature: group related components, hooks, and styles together.
- **Conditional rendering: use `? :` — never `&&`.**
- All user-visible text must be wrapped in `t()` from `react-i18next`. Translation files are in `src/translations`.
- This is an Expo managed project using prebuild. Do NOT make native code changes outside Expo prebuild capabilities.

## Styling

- Use `gluestack-ui` components from `components/ui` first.
- If no Gluestack component exists, use `StyleSheet.create()` or Styled Components.
- Support both light and dark mode.
- Design for all screen sizes and orientations (iOS + Android).

## Performance

- Minimize `useEffect`, `useState`, and heavy computations in render.
- Use `React.memo()` for components with static props.
- FlatLists: set `removeClippedSubviews`, `maxToRenderPerBatch`, `windowSize`. Use `getItemLayout` when item height is fixed.
- No anonymous functions in `renderItem` or event handlers.

## Quality & Testing

- Write Jest tests for all generated components, services, and logic. Tests must pass.
- Handle errors gracefully with user feedback.
- Implement offline support.
- Follow WCAG accessibility guidelines for mobile.
- Optimize for low-end devices.
