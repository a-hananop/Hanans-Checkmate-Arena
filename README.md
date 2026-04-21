# Hanan's Checkmate Arena

Hanan's Checkmate Arena is a React-based chess game built with Vite. It features a custom chess engine, a polished blue crystal-themed interface, timed play, move history, captured pieces tracking, board flipping, undo support, and special move handling including castling, en passant, and pawn promotion.

## Features

- Play a full chess match in the browser
- Custom move validation and game state handling
- Support for castling, en passant, and pawn promotion
- Check, checkmate, stalemate, and timeout detection
- Move history panel with algebraic notation
- Captured pieces tracking for both sides
- Undo last move
- Flip board view
- Timed game modes
- Custom branded favicon and title

## Tech Stack

- React 19
- Vite
- JavaScript

## Getting Started

### Prerequisites

- Node.js
- npm

### Installation

```bash
npm install
```

### Run in Development

```bash
npm run dev
```

Then open the local Vite URL shown in the terminal.

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```text
Chess-Game/
├─ src/
│  ├─ main.jsx
│  └─ App.jsx
├─ ChessGame.jsx
├─ index.html
├─ logo.svg
├─ package.json
└─ README.md
```

## How to Play

- Click a piece to see its legal moves
- Click a highlighted square to make a move
- Use `Undo` to revert the last move
- Use `Flip` to reverse the board orientation
- Start a fresh match with `New Game`
- Choose a time mode from the game controls

## Scripts

- `npm run dev` starts the development server
- `npm run build` creates the production build
- `npm run preview` previews the production build locally

## Author

Created by Abdul Hanan Saqlain.
