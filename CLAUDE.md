# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm install` - Install dependencies (requires Node.js 20+)
- `npm run dev` - Start development server with hot reload and auto-open browser
- `npm run build` - Build production bundle with Vite
- `npm run test` - Run tests with Vitest

## Architecture Overview

This is a browser-based sprite animation prototype built with TypeScript, Vite, and HTML5 Canvas.

### Core Systems

**Character Animation System**
- `CharacterDef` interface defines sprites with animation frames (`src/character.ts`)
- Frame data parsed from JSON animation files in `data/characters/` using `parseFrames()` (`src/frame-utils.ts`)
- Characters organized in `src/characters/` with dedicated modules (e.g., `overlord.ts`)

**Dialogue System** 
- `DialogManager` class handles Yarn Spinner dialogue files (`src/dialog-manager.ts`)
- Parses `.yarn` files from `src/dialogue/` using `parseYarnFile()` (`src/yarn-utils.ts`)
- Supports speaker-based animations, branching choices, visited state tracking, and custom commands
- Commands: `loadPuzzle`, `loadLevel` for game flow control

**Game Loop & Rendering**
- Main game loop in `src/main.ts` handles canvas rendering, animation timing, and UI management
- Responsive canvas scaling with viewport support
- Level system with background images and dialogue integration

**Puzzle System**
- Modular puzzle components in `src/puzzles/` (currently Tower of Hanoi)
- Integrated with dialogue system via commands

### File Structure Conventions

- Characters: `src/characters/` with index exports
- Character assets: `data/characters/[Name]/` containing `.png`, `.anim`, `.def` files
- Dialogue: `src/dialogue/` containing `.yarn` files
- Level backgrounds: `data/` as `.png` files
- Tests: Co-located with source files as `.test.ts`

### Testing

Tests use Vitest and focus on:
- Asset validation for character definitions
- Dialogue parsing and validation
- Frame parsing utilities
- Yarn file integrity

The project includes comprehensive validation for dialogue flow, ensuring all nodes are reachable and terminate properly.