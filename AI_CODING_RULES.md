# AI Coding Rules & Knowledge Item: Arena "Visual Silence"

This file acts as the primary Knowledge Item (KI) and Skill Set for the AI. Whenever interacting with this codebase, the AI MUST adhere strictly to these architectural and design guidelines to maintain the premium quality of the Arena app.

## 🧠 1. Core Design Philosophy: "Visual Silence"
- **Elite & Minimalist:** The UI must feel like a high-end digital gallery. Avoid clutter, excessive lines, and visual noise.
- **Premium Depth:** Replace rigid solid borders with tonal background layering, subtle transparent overlays (Glassmorphism), and soft shadows.
- **Brand Identity:** The interface should feel athletic, clinical, and precise.

## 🎨 2. Design System & UI Components (Arena Identity)
- **Colors & Contrast:**
  - **Backgrounds:** Soft off-whites (e.g., `#F7F7F7`) for screens, and rich deep blacks/dark grays (`#18181A`) for high-contrast cards.
  - **Accent:** "Arena Green" (Vibrant, luminous green) MUST be used for primary actions, active indicators, progress bars, and success states.
  - **Text:** High-contrast crisp darks for primary headings, and muted ash-grays for secondary descriptions.
- **Typography:**
  - Strictly use fonts defined in `constants/typography.ts`.
  - Maintain strong hierarchy: Massive, bold headers (e.g., "Final Verification") paired with highly legible, tracked-out microcopy for labels (e.g., "REVIEW & CONFIRM").
- **Component Usage:**
  - Prioritize existing glassmorphic components located in `components/glass/` (e.g., `LiquidProgressBar`, `SportGlassChip`).
  - Cards should have generous padding (e.g., `p-6` or `padding: 24`), deeply rounded corners (e.g., `borderRadius: 16` or `24`), and smooth drop shadows.

## 🏗️ 3. Code Quality & Architecture
- **Strict TypeScript:** Writing `any` is strictly prohibited. Define rigorous `Interfaces` or `Types` for every component prop, API response, and state.
- **Modularization:** Keep React components under 150-200 lines. If a component grows, break it down into smaller visual pieces.
- **Global State:** Leverage `context/AppContext.tsx` for application state gracefully, avoiding prop-drilling.

## 🛠️ 4. AI Workflow & Self-Correction Expectations
- **Self-Linting:** The AI must ensure zero TypeScript warnings or duplicate imports before considering a task complete.
- **Auto-Formatting:** Always maintain clean, readable indentation.
- **Localization First:** Never hardcode english/arabic strings directly in UI if they belong in the `i18n` dictionary. Always check `i18n/check_keys.js` logic.
- **Continuous UI Upgrade:** If the AI is asked to edit an older screen, it should proactively suggest upgrading its styles to match the "Visual Silence" design language.
