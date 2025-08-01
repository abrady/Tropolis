# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm install` - Install dependencies (requires Node.js 20+)
- `npm run dev` - Start development server with hot reload and auto-open browser
- `npm run build` - Build production bundle with Vite
- `npm run test` - Run tests with Vitest
- `npm run test -- src/path/to/file.test.ts` - Run specific test file
- `npm run test -- --watch` - Run tests in watch mode

## Architecture Overview

This is a browser-based sprite animation prototype built with TypeScript, Vite, HTML5 Canvas, and React.

### Core Systems

**Character Animation System**
- `CharacterDef` interface defines sprites with animation frames (`src/character.ts`)
- Frame data parsed from JSON animation files in `data/characters/` using `parseFrames()` (`src/frame-utils.ts`)
- Characters organized in `src/characters/` with dedicated modules (e.g., `overlord.ts`)

**Dialogue System Architecture**
- `DialogueManager` class handles Yarn Spinner dialogue files (`src/dialog-manager.ts`)
- Parses `.yarn` files from `src/dialogue/` using `parseYarnFile()` (`src/yarn-utils.ts`)
- Supports speaker-based animations, branching choices, visited state tracking, and custom commands
- Commands: `loadPuzzle`, `loadLevel`, `return` for game flow control
- Key methods: `start()`, `nextLines()`, `follow()`, `choose()`, `getCurrent()`

**UI Component Architecture**
- `App.tsx` manages dialogue state and coordinates between components
- `DialogueWidget` displays dialogue lines one at a time with spacebar advancement
- `OptionsWidget` provides full-screen overlay for dialogue choices with keyboard navigation
- Clean separation: App owns DialogueManager, widgets handle presentation

**Game Loop & Rendering**
- `GameCanvas` component handles canvas rendering and animation timing using requestAnimationFrame
- Character animations synchronized with dialogue speaker changes
- Level system with background images loaded as static assets from `data/locations/`
- Canvas dimensions match background image dimensions
- The game should run at a 16:9 aspect ratio, that's what all the backgrounds should be

**Puzzle System**
- Modular puzzle components in `src/puzzles/` (currently Tower of Hanoi)
- Integrated with dialogue system via commands

### Dialogue Flow Control

**DialogueManager State Management:**
- Uses generator-based flow: `start()` initializes state, `advance()` returns generator
- Generator yields `DialogueEvent` objects (line, choice, command types)
- Choice events require `DialogueAdvanceParam` passed to `gen.next({ type: 'choice', optionIndex })`
- Speaker animations: Character animations change based on dialogue speaker
- State progression: Lines → Choices → Commands → Jump to next node

**UI Interaction Patterns:**

- Spacebar advances individual dialogue lines within DialogueWidget
- When all lines shown, spacebar triggers `follow()` to advance dialogue flow
- Arrow keys navigate dialogue options, Space/Enter selects in OptionsWidget
- Options display as full-screen overlay with visited state styling
- Escape key from dialogue options opens action menu system
- 'A' key or Space opens action menu when not in active dialogue

### File Structure Conventions

- Characters: `src/characters/` with index exports
- Character assets: `data/characters/[Name]/` containing `.png`, `.anim`, `.def` files
- Dialogue: `src/dialogue/` containing `.yarn` files
- Level backgrounds: `data/locations/` as `.png` files
- UI Components: Top-level in `src/` (DialogueWidget, OptionsWidget)
- Tests: Co-located with source files as `.test.ts`

### Testing

Tests use Vitest and focus on:

- Asset validation for character definitions
- Dialogue parsing and validation  
- Frame parsing utilities
- Yarn file integrity
- Dialogue flow validation ensuring all nodes are reachable and terminate properly

## Code Style and Best Practices

- When writing code, bias towards fail fast: assert rather than protecting if it is an error. E.g., calling goto or return and there's nothing to return or a location to goto it should crash
- UI components should handle their own keyboard interactions rather than using refs
- Maintain clean separation between state management (App.tsx) and presentation (widget components)