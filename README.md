# Hanan's Chess Arena

A polished browser-based chess game built with React and Vite. The project includes a custom chess engine, human and computer play modes, time controls, move history, captured piece tracking, and a crystal-themed UI designed for desktop and mobile screens.

## Overview

This project is a self-contained chess application that runs entirely in the browser. It supports standard chess rules, presents legal move highlights, tracks game state in real time, and offers both local two-player matches and player-versus-AI gameplay.

## Features

- Full chess gameplay in the browser
- Player vs player mode on the same device
- Player vs computer mode
- Difficulty levels: `easy`, `medium`, and `hard`
- Side selection in AI mode: `white`, `black`, or `random`
- Time controls: `1m`, `5m`, `10m`, `15m`, and unlimited
- Legal move validation
- Castling support
- En passant support
- Pawn promotion with piece selection
- Check, checkmate, and stalemate detection
- Timeout and resignation handling
- Move history in chess notation
- Captured pieces display
- Undo support
- Board flip support
- Responsive layouts for desktop, tablet, and mobile

## Tech Stack

- React 19
- Vite
- JavaScript

## Project Structure

```text
Chess-Game/
|-- src/
|   |-- App.jsx
|   `-- main.jsx
|-- ChessGame.jsx
|-- index.html
|-- logo.svg
|-- package.json
|-- package-lock.json
`-- README.md
```

## Requirements

Before running the project, make sure you have:

- Node.js 18 or newer
- npm

## Installation

Install dependencies:

```bash
npm install
```

## Running the Project

Start the development server:

```bash
npm run dev
```

Then open the local URL shown by Vite, usually:

```text
http://localhost:5173
```

## Production Build

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Available Scripts

- `npm run dev` starts the Vite development server
- `npm run build` creates an optimized production build
- `npm run preview` serves the production build locally

## How to Play

1. Start the app.
2. Choose your game settings in the setup modal.
3. Select a piece to view its legal moves.
4. Click a highlighted square to make the move.
5. Continue until the game ends by checkmate, stalemate, timeout, or resignation.

## Controls

- `Setup` opens the match configuration screen
- `Undo` reverts the previous move
- `Flip` reverses the board orientation
- `Resign` ends the game immediately
- Clock controls let you change the time setting before or during a session

## Game Modes

### Local Multiplayer

Two players play on the same device, taking turns on a single board.

### Player vs Computer

The AI can play as white or black, and you can choose from:

- `Easy`: lighter play with simpler decisions
- `Medium`: deeper move evaluation
- `Hard`: stronger move search

## Chess Rules Supported

The game includes support for standard chess rules, including:

- Normal legal movement for all pieces
- Captures
- Castling
- En passant
- Promotion
- Check and checkmate detection
- Stalemate detection

## UI Highlights

- Crystal-blue visual style
- Move history panel
- Captured pieces summary
- Active player timer display
- Check and game-over status indicators
- Responsive board layout for smaller screens

## Customization Notes

Some common places you may want to edit:

- App title in the browser tab: `index.html`
- Main game UI and logic: `ChessGame.jsx`
- React entrypoint: `src/main.jsx`
- App wrapper: `src/App.jsx`

## Troubleshooting

### Blank screen on startup

If the app opens to a blank page:

- confirm dependencies are installed with `npm install`
- restart the dev server
- check the terminal for Vite errors
- make sure `ChessGame.jsx` imports React correctly

### Port already in use

If Vite says the port is busy, stop the old process or run:

```bash
npm run dev -- --port 5174
```

## Future Improvements

Possible next additions for the project:

- Save and resume matches
- PGN export
- Move replay mode
- Sound effects
- Online multiplayer
- Opening assistance or hints

## Author

Created by Abdul Hanan Saqlain.
