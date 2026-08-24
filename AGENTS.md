<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Protected Components - Default Baseline Setup

The Kumite Scoreboard (`src/app/dashboard/scoreboard`), Match Console Hub, and Control Panel (`src/app/display`) design and functionality are locked as the **DEFAULT SETUP**.
- DO NOT alter, redesign, or refactor the Kumite Scoreboard, Match Console, or Control Panel layout/styling unless explicitly instructed.
- Preserve all existing WKF Kumite score handling, time management, tatami sync, and spectator display features.

# Scoreboard Color Lock (Mandatory Rule)

When implementing or switching console themes (e.g., **WKF Dark**, **Arena Blue**, **Tatami Green**):
- **DO NOT apply console theme colors to the competition scoreboard fighter colors.**
- Competitor colors are strictly protected:
  - 🔴 **AKA = RED** (`AKA_COLOR = 'RED'`)
  - 🔵 **AO = BLUE** (`AO_COLOR = 'BLUE'`)
- The theme system affects only the KarateTech UI (backgrounds, panels, buttons, docks, lists, popups, borders).
- The competition scoreboard remains permanently **RED for AKA** and **BLUE for AO** in every theme.


