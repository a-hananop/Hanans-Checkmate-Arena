import React, { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════
   CHESS ENGINE
═══════════════════════════════════════════════════════════════ */
const FILES = ["a","b","c","d","e","f","g","h"];
const RANKS = ["8","7","6","5","4","3","2","1"];
const INIT_CAST = { wK:true, wQ:true, bK:true, bQ:true };
const PROMO_PIECES = ["Q","R","B","N"];
const VALS = { P:1, N:3, B:3, R:5, Q:9, K:0 };

function mkBoard() {
  const b = Array(8).fill(null).map(() => Array(8).fill(null));
  ["R","N","B","Q","K","B","N","R"].forEach((t, c) => {
    b[0][c] = { type: t, color: "black" };
    b[7][c] = { type: t, color: "white" };
  });
  for (let c = 0; c < 8; c++) {
    b[1][c] = { type: "P", color: "black" };
    b[6][c] = { type: "P", color: "white" };
  }
  return b;
}

const inBounds = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

function rawMoves(board, r, c, ep, cast) {
  const p = board[r][c]; if (!p) return [];
  const { type, color } = p, opp = color === "white" ? "black" : "white";
  const mv = [];
  const push = (nr, nc) => { if (inBounds(nr, nc) && board[nr][nc]?.color !== color) mv.push([nr, nc]); };
  const slide = dirs => {
    for (const [dr, dc] of dirs) {
      for (let i = 1; i < 8; i++) {
        const nr = r + dr * i, nc = c + dc * i;
        if (!inBounds(nr, nc)) break;
        if (board[nr][nc]) { if (board[nr][nc].color === opp) mv.push([nr, nc]); break; }
        mv.push([nr, nc]);
      }
    }
  };
  if (type === "P") {
    const d = color === "white" ? -1 : 1, sr = color === "white" ? 6 : 1;
    if (inBounds(r+d, c) && !board[r+d][c]) {
      mv.push([r+d, c]);
      if (r === sr && !board[r+2*d][c]) mv.push([r+2*d, c]);
    }
    for (const dc of [-1, 1]) if (inBounds(r+d, c+dc)) {
      if (board[r+d][c+dc]?.color === opp) mv.push([r+d, c+dc]);
      if (ep && ep[0] === r+d && ep[1] === c+dc) mv.push([r+d, c+dc]);
    }
  } else if (type === "N") {
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) push(r+dr, c+dc);
  } else if (type === "B") slide([[-1,-1],[-1,1],[1,-1],[1,1]]);
  else if (type === "R") slide([[-1,0],[1,0],[0,-1],[0,1]]);
  else if (type === "Q") slide([[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]);
  else if (type === "K") {
    for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) push(r+dr, c+dc);
    if (color === "white" && r === 7 && c === 4) {
      if (cast.wK && !board[7][5] && !board[7][6] && board[7][7]?.type === "R") mv.push([7,6]);
      if (cast.wQ && !board[7][3] && !board[7][2] && !board[7][1] && board[7][0]?.type === "R") mv.push([7,2]);
    }
    if (color === "black" && r === 0 && c === 4) {
      if (cast.bK && !board[0][5] && !board[0][6] && board[0][7]?.type === "R") mv.push([0,6]);
      if (cast.bQ && !board[0][3] && !board[0][2] && !board[0][1] && board[0][0]?.type === "R") mv.push([0,2]);
    }
  }
  return mv;
}

function isAttacked(board, r, c, byColor) {
  for (let row = 0; row < 8; row++)
    for (let col = 0; col < 8; col++)
      if (board[row][col]?.color === byColor)
        if (rawMoves(board, row, col, null, INIT_CAST).some(([mr,mc]) => mr === r && mc === c)) return true;
  return false;
}

function kingPos(board, color) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.type === "K" && board[r][c]?.color === color) return [r, c];
  return null;
}

function inCheck(board, color) {
  const kp = kingPos(board, color);
  return kp ? isAttacked(board, kp[0], kp[1], color === "white" ? "black" : "white") : false;
}

function applyMove(board, from, to, ep, promo) {
  const nb = board.map(r => [...r]);
  const [fr, fc] = from, [tr, tc] = to;
  const p = nb[fr][fc]; let cap = nb[tr][tc];
  if (p.type === "P" && ep && tr === ep[0] && tc === ep[1]) {
    const cr = p.color === "white" ? tr + 1 : tr - 1; cap = nb[cr][tc]; nb[cr][tc] = null;
  }
  if (p.type === "K" && Math.abs(tc - fc) === 2) {
    if (tc === 6) { nb[fr][5] = nb[fr][7]; nb[fr][7] = null; }
    else { nb[fr][3] = nb[fr][0]; nb[fr][0] = null; }
  }
  nb[tr][tc] = promo ? { type: promo, color: p.color } : p;
  nb[fr][fc] = null;
  return { board: nb, cap };
}

function legalMoves(board, r, c, ep, cast) {
  const p = board[r][c]; if (!p) return [];
  const opp = p.color === "white" ? "black" : "white";
  return rawMoves(board, r, c, ep, cast).filter(([tr, tc]) => {
    if (p.type === "K" && Math.abs(tc - c) === 2) {
      if (isAttacked(board, r, c, opp)) return false;
      if (isAttacked(board, r, c + (tc > c ? 1 : -1), opp)) return false;
    }
    const { board: nb } = applyMove(board, [r, c], [tr, tc], ep, null);
    return !inCheck(nb, p.color);
  });
}

function anyLegalMove(board, color, ep, cast) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.color === color && legalMoves(board, r, c, ep, cast).length > 0) return true;
  return false;
}

function toNotation(p, from, to, cap, check, mate, castle, promo) {
  if (castle === "K") return `O-O${mate ? "#" : check ? "+" : ""}`;
  if (castle === "Q") return `O-O-O${mate ? "#" : check ? "+" : ""}`;
  const tf = FILES[to[1]], tr = RANKS[to[0]];
  let n = p.type === "P" ? "" : p.type;
  if (p.type === "P" && cap) n = FILES[from[1]];
  if (cap) n += "x"; n += tf + tr;
  if (promo) n += "=" + promo;
  if (mate) n += "#"; else if (check) n += "+";
  return n;
}

/* ═══════════════════════════════════════════════════════════════
   CRYSTAL BACKGROUND
═══════════════════════════════════════════════════════════════ */
function CrystalBackground() {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 0, overflow: "hidden",
      background: "radial-gradient(ellipse at 30% 20%, #0a1628 0%, #050c1c 55%, #020810 100%)",
    }}>
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="cx1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1a3a7a" stopOpacity="0.7"/>
            <stop offset="100%" stopColor="#0a1845" stopOpacity="0.2"/>
          </linearGradient>
          <linearGradient id="cx2" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0e2a60" stopOpacity="0.65"/>
            <stop offset="100%" stopColor="#060f30" stopOpacity="0.15"/>
          </linearGradient>
          <linearGradient id="cx3" x1="0.3" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor="#2050a0" stopOpacity="0.18"/>
            <stop offset="100%" stopColor="#0c1840" stopOpacity="0.06"/>
          </linearGradient>
          <linearGradient id="cx4" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3068c0" stopOpacity="0.25"/>
            <stop offset="100%" stopColor="#1030a0" stopOpacity="0.05"/>
          </linearGradient>
          <linearGradient id="cx5" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#80b0ff" stopOpacity="0.22"/>
            <stop offset="100%" stopColor="#2040a0" stopOpacity="0.05"/>
          </linearGradient>
          <linearGradient id="cx6" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4080e0" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#081830" stopOpacity="0.06"/>
          </linearGradient>
          <radialGradient id="glow1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2060c0" stopOpacity="0.18"/>
            <stop offset="100%" stopColor="#001040" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="glow2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1a50b0" stopOpacity="0.14"/>
            <stop offset="100%" stopColor="#000820" stopOpacity="0"/>
          </radialGradient>
          <style>{`
            @keyframes cs1 { 0%,100%{opacity:.72} 50%{opacity:1} }
            @keyframes cs2 { 0%,100%{opacity:.5} 50%{opacity:.88} }
            @keyframes cs3 { 0%,100%{opacity:.62} 50%{opacity:1} }
            @keyframes cs4 { 0%,100%{opacity:.55} 50%{opacity:.92} }
            @keyframes cs5 { 0%,100%{opacity:.65} 50%{opacity:1} }
            .a1{animation:cs1 4s ease-in-out infinite}
            .a2{animation:cs2 5.5s ease-in-out infinite}
            .a3{animation:cs3 3.8s ease-in-out infinite}
            .a4{animation:cs4 6s ease-in-out infinite}
            .a5{animation:cs5 4.5s ease-in-out infinite}
          `}</style>
        </defs>

        {/* Ambient glows */}
        <ellipse cx="300" cy="200" rx="350" ry="260" fill="url(#glow1)"/>
        <ellipse cx="1140" cy="280" rx="380" ry="280" fill="url(#glow2)"/>
        <ellipse cx="720" cy="520" rx="420" ry="300" fill="url(#glow1)" opacity="0.6"/>
        <ellipse cx="200" cy="750" rx="280" ry="200" fill="url(#glow2)" opacity="0.7"/>
        <ellipse cx="1280" cy="700" rx="300" ry="220" fill="url(#glow1)" opacity="0.5"/>

        {/* Crystal A — top left large */}
        <g className="a1">
          <polygon points="100,10 280,120 310,320 180,420 20,300 -10,120" fill="url(#cx1)"/>
          <polygon points="100,10 280,120 180,10" fill="url(#cx3)" opacity="0.8"/>
          <polygon points="280,120 310,320 360,200" fill="url(#cx2)" opacity="0.7"/>
          <line x1="100" y1="10" x2="280" y2="120" stroke="rgba(140,200,255,0.28)" strokeWidth="1"/>
          <line x1="280" y1="120" x2="310" y2="320" stroke="rgba(100,160,240,0.2)" strokeWidth="0.8"/>
          <line x1="310" y1="320" x2="180" y2="420" stroke="rgba(120,180,255,0.16)" strokeWidth="0.7"/>
          <line x1="180" y1="420" x2="20" y2="300" stroke="rgba(100,160,240,0.18)" strokeWidth="0.8"/>
          <line x1="20" y1="300" x2="-10" y2="120" stroke="rgba(140,200,255,0.15)" strokeWidth="0.7"/>
          <line x1="-10" y1="120" x2="100" y2="10" stroke="rgba(160,210,255,0.22)" strokeWidth="1"/>
          <line x1="100" y1="10" x2="310" y2="320" stroke="rgba(120,180,255,0.08)" strokeWidth="0.5" strokeDasharray="6 9"/>
          <line x1="280" y1="120" x2="20" y2="300" stroke="rgba(100,160,240,0.07)" strokeWidth="0.5" strokeDasharray="6 9"/>
        </g>

        {/* Crystal B — top right large */}
        <g className="a2">
          <polygon points="1160,0 1380,100 1440,280 1400,460 1220,500 1080,360 1060,160" fill="url(#cx2)"/>
          <polygon points="1160,0 1380,100 1280,0" fill="url(#cx4)" opacity="0.7"/>
          <polygon points="1380,100 1440,280 1440,100" fill="url(#cx3)" opacity="0.6"/>
          <polygon points="1220,500 1400,460 1340,560 1180,580" fill="url(#cx1)" opacity="0.5"/>
          <line x1="1160" y1="0" x2="1380" y2="100" stroke="rgba(140,200,255,0.25)" strokeWidth="1"/>
          <line x1="1380" y1="100" x2="1440" y2="280" stroke="rgba(100,160,240,0.2)" strokeWidth="0.8"/>
          <line x1="1440" y1="280" x2="1400" y2="460" stroke="rgba(120,180,255,0.16)" strokeWidth="0.7"/>
          <line x1="1400" y1="460" x2="1220" y2="500" stroke="rgba(100,160,240,0.15)" strokeWidth="0.7"/>
          <line x1="1220" y1="500" x2="1080" y2="360" stroke="rgba(140,190,255,0.18)" strokeWidth="0.8"/>
          <line x1="1080" y1="360" x2="1060" y2="160" stroke="rgba(120,180,255,0.2)" strokeWidth="0.8"/>
          <line x1="1060" y1="160" x2="1160" y2="0" stroke="rgba(160,210,255,0.22)" strokeWidth="1"/>
          <line x1="1160" y1="0" x2="1400" y2="460" stroke="rgba(100,160,240,0.07)" strokeWidth="0.5" strokeDasharray="8 10"/>
          <line x1="1380" y1="100" x2="1080" y2="360" stroke="rgba(120,180,255,0.06)" strokeWidth="0.5" strokeDasharray="8 10"/>
        </g>

        {/* Crystal C — bottom left */}
        <g className="a3">
          <polygon points="-20,580 140,500 300,560 340,740 220,880 0,860" fill="url(#cx2)"/>
          <polygon points="-20,580 140,500 80,480" fill="url(#cx4)" opacity="0.7"/>
          <polygon points="300,560 340,740 380,640" fill="url(#cx3)" opacity="0.6"/>
          <line x1="-20" y1="580" x2="140" y2="500" stroke="rgba(140,200,255,0.22)" strokeWidth="0.9"/>
          <line x1="140" y1="500" x2="300" y2="560" stroke="rgba(100,160,240,0.18)" strokeWidth="0.7"/>
          <line x1="300" y1="560" x2="340" y2="740" stroke="rgba(120,180,255,0.15)" strokeWidth="0.7"/>
          <line x1="340" y1="740" x2="220" y2="880" stroke="rgba(100,160,240,0.14)" strokeWidth="0.6"/>
          <line x1="220" y1="880" x2="0" y2="860" stroke="rgba(140,190,255,0.16)" strokeWidth="0.7"/>
          <line x1="0" y1="860" x2="-20" y2="580" stroke="rgba(120,180,255,0.18)" strokeWidth="0.8"/>
          <line x1="140" y1="500" x2="220" y2="880" stroke="rgba(100,160,240,0.07)" strokeWidth="0.5" strokeDasharray="6 8"/>
        </g>

        {/* Crystal D — bottom right */}
        <g className="a4">
          <polygon points="1100,650 1280,580 1440,680 1440,880 1260,900 1060,820" fill="url(#cx1)"/>
          <polygon points="1100,650 1280,580 1200,560" fill="url(#cx5)" opacity="0.6"/>
          <polygon points="1280,580 1440,680 1440,540" fill="url(#cx3)" opacity="0.5"/>
          <line x1="1100" y1="650" x2="1280" y2="580" stroke="rgba(140,200,255,0.2)" strokeWidth="0.8"/>
          <line x1="1280" y1="580" x2="1440" y2="680" stroke="rgba(100,160,240,0.18)" strokeWidth="0.7"/>
          <line x1="1440" y1="680" x2="1440" y2="880" stroke="rgba(120,180,255,0.15)" strokeWidth="0.6"/>
          <line x1="1440" y1="880" x2="1260" y2="900" stroke="rgba(100,160,240,0.14)" strokeWidth="0.6"/>
          <line x1="1260" y1="900" x2="1060" y2="820" stroke="rgba(140,190,255,0.16)" strokeWidth="0.7"/>
          <line x1="1060" y1="820" x2="1100" y2="650" stroke="rgba(120,180,255,0.18)" strokeWidth="0.8"/>
          <line x1="1100" y1="650" x2="1440" y2="880" stroke="rgba(100,160,240,0.07)" strokeWidth="0.5" strokeDasharray="6 8"/>
        </g>

        {/* Crystal E — center top */}
        <g className="a5">
          <polygon points="600,0 780,80 820,220 720,320 560,280 520,140" fill="url(#cx3)"/>
          <polygon points="600,0 780,80 700,0" fill="url(#cx5)" opacity="0.7"/>
          <line x1="600" y1="0" x2="780" y2="80" stroke="rgba(160,210,255,0.22)" strokeWidth="0.9"/>
          <line x1="780" y1="80" x2="820" y2="220" stroke="rgba(120,180,255,0.17)" strokeWidth="0.7"/>
          <line x1="820" y1="220" x2="720" y2="320" stroke="rgba(100,160,240,0.14)" strokeWidth="0.6"/>
          <line x1="720" y1="320" x2="560" y2="280" stroke="rgba(140,190,255,0.15)" strokeWidth="0.7"/>
          <line x1="560" y1="280" x2="520" y2="140" stroke="rgba(120,180,255,0.18)" strokeWidth="0.7"/>
          <line x1="520" y1="140" x2="600" y2="0" stroke="rgba(160,210,255,0.2)" strokeWidth="0.9"/>
          <line x1="600" y1="0" x2="720" y2="320" stroke="rgba(100,160,240,0.07)" strokeWidth="0.5" strokeDasharray="5 7"/>
        </g>

        {/* Small accent crystals */}
        <g className="a2" opacity="0.8">
          <polygon points="400,30 480,90 460,180 360,200 300,130" fill="url(#cx4)"/>
          <line x1="400" y1="30" x2="480" y2="90" stroke="rgba(160,210,255,0.2)" strokeWidth="0.7"/>
          <line x1="480" y1="90" x2="460" y2="180" stroke="rgba(120,180,255,0.15)" strokeWidth="0.6"/>
          <line x1="460" y1="180" x2="360" y2="200" stroke="rgba(100,160,240,0.13)" strokeWidth="0.6"/>
          <line x1="360" y1="200" x2="300" y2="130" stroke="rgba(140,190,255,0.16)" strokeWidth="0.6"/>
          <line x1="300" y1="130" x2="400" y2="30" stroke="rgba(160,210,255,0.18)" strokeWidth="0.7"/>
        </g>
        <g className="a1" opacity="0.7">
          <polygon points="980,100 1060,60 1120,130 1090,220 1000,240 940,180" fill="url(#cx5)"/>
          <line x1="980" y1="100" x2="1060" y2="60" stroke="rgba(160,210,255,0.2)" strokeWidth="0.7"/>
          <line x1="1060" y1="60" x2="1120" y2="130" stroke="rgba(120,180,255,0.15)" strokeWidth="0.6"/>
          <line x1="1120" y1="130" x2="1090" y2="220" stroke="rgba(100,160,240,0.13)" strokeWidth="0.6"/>
          <line x1="1090" y1="220" x2="1000" y2="240" stroke="rgba(140,190,255,0.15)" strokeWidth="0.6"/>
          <line x1="1000" y1="240" x2="940" y2="180" stroke="rgba(120,180,255,0.16)" strokeWidth="0.6"/>
          <line x1="940" y1="180" x2="980" y2="100" stroke="rgba(160,210,255,0.18)" strokeWidth="0.7"/>
        </g>
        <g className="a3" opacity="0.6">
          <polygon points="480,680 580,640 640,720 600,820 480,840 420,760" fill="url(#cx6)"/>
          <line x1="480" y1="680" x2="580" y2="640" stroke="rgba(140,200,255,0.18)" strokeWidth="0.6"/>
          <line x1="580" y1="640" x2="640" y2="720" stroke="rgba(100,160,240,0.14)" strokeWidth="0.5"/>
          <line x1="640" y1="720" x2="600" y2="820" stroke="rgba(120,180,255,0.12)" strokeWidth="0.5"/>
          <line x1="600" y1="820" x2="480" y2="840" stroke="rgba(100,160,240,0.13)" strokeWidth="0.5"/>
          <line x1="480" y1="840" x2="420" y2="760" stroke="rgba(140,190,255,0.15)" strokeWidth="0.6"/>
          <line x1="420" y1="760" x2="480" y2="680" stroke="rgba(160,210,255,0.17)" strokeWidth="0.6"/>
        </g>
        <g className="a5" opacity="0.55">
          <polygon points="820,720 920,680 980,750 950,850 840,870 780,800" fill="url(#cx2)"/>
          <line x1="820" y1="720" x2="920" y2="680" stroke="rgba(140,200,255,0.16)" strokeWidth="0.6"/>
          <line x1="920" y1="680" x2="980" y2="750" stroke="rgba(100,160,240,0.13)" strokeWidth="0.5"/>
          <line x1="980" y1="750" x2="950" y2="850" stroke="rgba(120,180,255,0.11)" strokeWidth="0.5"/>
          <line x1="950" y1="850" x2="840" y2="870" stroke="rgba(100,160,240,0.12)" strokeWidth="0.5"/>
          <line x1="840" y1="870" x2="780" y2="800" stroke="rgba(140,190,255,0.14)" strokeWidth="0.5"/>
          <line x1="780" y1="800" x2="820" y2="720" stroke="rgba(160,210,255,0.16)" strokeWidth="0.6"/>
        </g>

        {/* Fine diagonal lattice */}
        <g stroke="rgba(70,120,210,0.055)" strokeWidth="0.5">
          <line x1="0" y1="200" x2="200" y2="0"/><line x1="0" y1="400" x2="400" y2="0"/>
          <line x1="0" y1="600" x2="600" y2="0"/><line x1="0" y1="800" x2="800" y2="0"/>
          <line x1="100" y1="900" x2="1000" y2="0"/><line x1="300" y1="900" x2="1200" y2="0"/>
          <line x1="500" y1="900" x2="1400" y2="0"/><line x1="700" y1="900" x2="1440" y2="160"/>
          <line x1="900" y1="900" x2="1440" y2="360"/><line x1="1100" y1="900" x2="1440" y2="560"/>
          <line x1="1300" y1="900" x2="1440" y2="760"/>
        </g>

        {/* Sparkle vertex nodes */}
        {[
          [100,10,3],[280,120,2.5],[310,320,2],[180,420,2],
          [1160,0,3],[1380,100,2.5],[1440,280,2],[1400,460,2],
          [600,0,3],[780,80,2.5],[820,220,2],
          [400,30,2],[480,90,2],[1060,60,2.5],[1120,130,2],
          [140,500,2.2],[300,560,2],[340,740,1.8],
          [1280,580,2.5],[1440,680,2],
        ].map(([cx,cy,r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill={`rgba(${180+(i%3)*18},${210+(i%2)*14},255,${0.52+(i%4)*0.1})`}
            style={{ animation: `cs${(i%5)+1} ${3.2+i*0.38}s ease-in-out infinite` }}
          />
        ))}

        {/* Top-edge bright accent lines */}
        <line x1="100" y1="10" x2="280" y2="120" stroke="rgba(200,230,255,0.18)" strokeWidth="1.2"/>
        <line x1="1160" y1="0" x2="1380" y2="100" stroke="rgba(200,230,255,0.15)" strokeWidth="1"/>
        <line x1="600" y1="0" x2="780" y2="80" stroke="rgba(200,230,255,0.14)" strokeWidth="1"/>
        <line x1="140" y1="500" x2="300" y2="560" stroke="rgba(180,220,255,0.12)" strokeWidth="0.8"/>
        <line x1="1280" y1="580" x2="1440" y2="680" stroke="rgba(180,220,255,0.13)" strokeWidth="0.9"/>
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PIECE SVG
═══════════════════════════════════════════════════════════════ */
function PieceSVG({ type, color }) {
  const [f, s] = color === "white" ? ["#F5E8CC","#7a5c12"] : ["#1a0e06","#a0b8e0"];
  const sw = 1.4;
  const shapes = {
    K: <g>
      <rect x="20" y="7" width="10" height="4" rx="1" fill={f} stroke={s} strokeWidth={sw}/>
      <rect x="23" y="4" width="4" height="8" rx="1" fill={f} stroke={s} strokeWidth={sw}/>
      <ellipse cx="25" cy="22" rx="7" ry="6" fill={f} stroke={s} strokeWidth={sw}/>
      <rect x="13" y="28" width="24" height="6" rx="2" fill={f} stroke={s} strokeWidth={sw}/>
      <rect x="11" y="33" width="28" height="5" rx="2" fill={f} stroke={s} strokeWidth={sw}/>
    </g>,
    Q: <g>
      <circle cx="25" cy="9" r="3.5" fill={f} stroke={s} strokeWidth={sw}/>
      <circle cx="14" cy="12" r="3" fill={f} stroke={s} strokeWidth={sw}/>
      <circle cx="36" cy="12" r="3" fill={f} stroke={s} strokeWidth={sw}/>
      <path d="M14 14 L18 30 L25 26 L32 30 L36 14" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round"/>
      <rect x="13" y="29" width="24" height="5" rx="2" fill={f} stroke={s} strokeWidth={sw}/>
      <rect x="11" y="34" width="28" height="5" rx="2" fill={f} stroke={s} strokeWidth={sw}/>
    </g>,
    R: <g>
      <rect x="14" y="5" width="5" height="9" rx="1" fill={f} stroke={s} strokeWidth={sw}/>
      <rect x="22" y="5" width="6" height="9" rx="1" fill={f} stroke={s} strokeWidth={sw}/>
      <rect x="31" y="5" width="5" height="9" rx="1" fill={f} stroke={s} strokeWidth={sw}/>
      <rect x="14" y="13" width="22" height="16" rx="1" fill={f} stroke={s} strokeWidth={sw}/>
      <rect x="12" y="29" width="26" height="5" rx="2" fill={f} stroke={s} strokeWidth={sw}/>
      <rect x="10" y="34" width="30" height="5" rx="2" fill={f} stroke={s} strokeWidth={sw}/>
    </g>,
    B: <g>
      <circle cx="25" cy="9" r="3.5" fill={f} stroke={s} strokeWidth={sw}/>
      <path d="M25 11 L17 31 L25 27 L33 31 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round"/>
      <circle cx="25" cy="31" r="3" fill={f} stroke={s} strokeWidth={sw}/>
      <rect x="13" y="34" width="24" height="4" rx="2" fill={f} stroke={s} strokeWidth={sw}/>
      <rect x="11" y="38" width="28" height="3" rx="2" fill={f} stroke={s} strokeWidth={sw}/>
    </g>,
    N: <g>
      <path d="M18 39 L18 28 Q13 22 15 14 Q17 7 24 6 Q31 5 32 10 Q34 8 35 11 Q33 15 30 14 Q33 19 30 25 L32 39 Z"
        fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round"/>
      <circle cx="22" cy="13" r="2" fill={s}/>
      <rect x="14" y="39" width="22" height="4" rx="2" fill={f} stroke={s} strokeWidth={sw}/>
    </g>,
    P: <g>
      <circle cx="25" cy="14" r="6" fill={f} stroke={s} strokeWidth={sw}/>
      <path d="M20 19 L17 32 L33 32 L30 19 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round"/>
      <rect x="13" y="32" width="24" height="4" rx="2" fill={f} stroke={s} strokeWidth={sw}/>
      <rect x="11" y="36" width="28" height="5" rx="2" fill={f} stroke={s} strokeWidth={sw}/>
    </g>,
  };
  const drp = color === "white"
    ? "drop-shadow(0 1.5px 3px rgba(0,0,0,0.8))"
    : "drop-shadow(0 1px 3px rgba(160,200,255,0.12))";
  return (
    <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"
      style={{ width:"100%", height:"100%", filter:drp }}>
      {shapes[type]}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SQUARE
═══════════════════════════════════════════════════════════════ */
function Square({ piece, light, selected, isLegal, isLastMove, isCheck, onClick, rank, file }) {
  const [hov, setHov] = useState(false);
  const L = "#d8e8f8", D = "#527aaa";
  let bg = light ? L : D;
  if (isCheck)      bg = light ? "#e07070" : "#b84040";
  else if (selected)   bg = light ? "#78c078" : "#489048";
  else if (isLastMove) bg = light ? "#c8d060" : "#909820";
  else if (hov && piece) bg = light ? "#98d098" : "#62a862";
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ position:"relative", background:bg,
        cursor: piece||isLegal ? "pointer":"default",
        display:"flex", alignItems:"center", justifyContent:"center",
        userSelect:"none", transition:"background .1s",
        width:"100%", height:"100%" }}>
      {rank && <span style={{position:"absolute",top:2,left:3,fontSize:"clamp(7px,1vw,10px)",
        fontWeight:700,color:light?D:L,opacity:.75,lineHeight:1,pointerEvents:"none"}}>{rank}</span>}
      {file && <span style={{position:"absolute",bottom:2,right:3,fontSize:"clamp(7px,1vw,10px)",
        fontWeight:700,color:light?D:L,opacity:.75,lineHeight:1,pointerEvents:"none"}}>{file}</span>}
      {isLegal && !piece && (
        <div style={{width:"33%",height:"33%",borderRadius:"50%",background:"rgba(0,0,0,.2)",pointerEvents:"none"}}/>
      )}
      {isLegal && piece && (
        <div style={{position:"absolute",inset:0,border:"3.5px solid rgba(0,0,0,.25)",boxSizing:"border-box",pointerEvents:"none"}}/>
      )}
      {piece && (
        <div style={{ width:"88%",height:"88%",
          transform:selected?"scale(1.1)":hov?"scale(1.05)":"scale(1)",
          transition:"transform .1s",position:"relative",zIndex:1 }}>
          <PieceSVG type={piece.type} color={piece.color}/>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SHARED STYLES
═══════════════════════════════════════════════════════════════ */
const glass = {
  background: "rgba(8,16,42,0.68)",
  border: "1px solid rgba(100,160,255,0.18)",
  borderRadius: 10,
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
};

/* ═══════════════════════════════════════════════════════════════
   UI COMPONENTS
═══════════════════════════════════════════════════════════════ */
function Timer({ secs, active, low }) {
  const m = Math.floor(secs / 60), s = secs % 60;
  return (
    <div style={{
      fontFamily:"'Courier New',monospace",
      fontSize:"clamp(.85rem,1.8vw,1.12rem)",
      fontWeight:700, letterSpacing:".07em", flexShrink:0,
      color: low?"#ff6666":active?"#90d0ff":"rgba(120,170,230,.5)",
      border:`1.5px solid ${low?"rgba(255,80,80,.6)":active?"rgba(90,160,255,.5)":"rgba(80,130,210,.2)"}`,
      borderRadius:7, padding:"3px 10px", transition:"all .3s",
      textShadow: low?"0 0 8px rgba(255,80,80,.5)":active?"0 0 8px rgba(100,180,255,.4)":"none",
    }}>
      {m}:{s.toString().padStart(2,"0")}
    </div>
  );
}

function CapturedPieces({ pieces, color }) {
  const sorted = [...pieces].sort((a,b) => VALS[b]-VALS[a]);
  const score = pieces.reduce((s,p) => s+VALS[p], 0);
  return (
    <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:1,minHeight:18}}>
      {sorted.map((t,i) => <div key={i} style={{width:17,height:17}}><PieceSVG type={t} color={color}/></div>)}
      {score > 0 && <span style={{color:"#7ab0e8",fontSize:"10px",marginLeft:3,fontFamily:"monospace"}}>+{score}</span>}
    </div>
  );
}

function MoveHistory({ hist }) {
  const endRef = useRef(null);
  useEffect(() => endRef.current?.scrollIntoView({behavior:"smooth"}), [hist]);
  const pairs = [];
  for (let i = 0; i < hist.length; i += 2) pairs.push({n:Math.floor(i/2)+1,w:hist[i],b:hist[i+1]});
  return (
    <div style={{flex:1,overflowY:"auto",fontSize:"11px",
      scrollbarWidth:"thin",scrollbarColor:"rgba(80,140,255,.3) transparent"}}>
      {pairs.length === 0 && (
        <div style={{color:"rgba(120,170,240,.25)",textAlign:"center",padding:"12px 0"}}>No moves yet</div>
      )}
      {pairs.map(({n,w,b}) => (
        <div key={n} style={{display:"grid",gridTemplateColumns:"18px 1fr 1fr",gap:2,marginBottom:2}}>
          <span style={{color:"rgba(120,170,240,.28)",textAlign:"right",paddingRight:3,paddingTop:2,fontFamily:"monospace"}}>{n}.</span>
          {[w,b].map((mv,mi) => (
            <div key={mi} style={{padding:"2px 4px",borderRadius:3,fontFamily:"monospace",
              background:mv?.notation.includes("#")?"rgba(200,50,50,.3)":mv?.notation.includes("+")?"rgba(180,110,0,.2)":"rgba(255,255,255,.04)",
              color:mv?.notation.includes("#")?"#ff8888":mv?.notation.includes("+")?"#ffaa60":mi===0?"#a0c8f8":"rgba(150,195,240,.6)"}}>
              {mv?.notation||""}
            </div>
          ))}
        </div>
      ))}
      <div ref={endRef}/>
    </div>
  );
}

function Btn({ children, onClick, disabled, primary }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: disabled?"rgba(255,255,255,.02)":primary?(hov?"rgba(55,115,255,.5)":"rgba(55,115,255,.28)"):(hov?"rgba(80,140,255,.15)":"rgba(255,255,255,.04)"),
        border:`1px solid ${disabled?"rgba(255,255,255,.05)":primary?"rgba(80,150,255,.6)":"rgba(80,130,220,.25)"}`,
        borderRadius:7, padding:"5px 11px",
        color:disabled?"rgba(255,255,255,.18)":primary?"#b0deff":"rgba(155,200,255,.8)",
        fontSize:"11px", fontWeight:600, cursor:disabled?"not-allowed":"pointer",
        letterSpacing:".04em", transition:"all .15s",
        display:"inline-flex", alignItems:"center", gap:4,
        transform:!disabled&&hov?"translateY(-1px)":"none",
        whiteSpace:"nowrap", fontFamily:"Georgia,serif",
      }}>
      {children}
    </button>
  );
}

function PlayerCard({ color, timer, capList, isActive, timerOn }) {
  return (
    <div style={{
      ...glass, padding:"8px 12px",
      borderColor:isActive?"rgba(100,175,255,.52)":"rgba(100,160,255,.16)",
      boxShadow:isActive?"0 0 16px rgba(70,150,255,.18)":"none",
      transition:"all .3s",
    }}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:7,minWidth:0}}>
          <div style={{width:12,height:12,borderRadius:"50%",flexShrink:0,
            background:color==="white"?"#F5E8CC":"#1a0e06",
            border:`1.5px solid ${color==="white"?"rgba(255,255,255,.4)":"rgba(100,175,255,.4)"}`}}/>
          <span style={{color:isActive?"#9cd4ff":"rgba(155,200,255,.52)",fontWeight:600,fontSize:"12px",
            transition:"all .3s",textShadow:isActive?"0 0 8px rgba(100,185,255,.45)":"none"}}>
            {color==="white"?"White":"Black"}
            {isActive && <span style={{marginLeft:5,fontSize:"10px",color:"#80ff80"}}>▶</span>}
          </span>
        </div>
        <Timer secs={timer} active={isActive&&timerOn} low={timer<30}/>
      </div>
      <CapturedPieces pieces={capList} color={color==="white"?"black":"white"}/>
    </div>
  );
}

function PromotionModal({ color, onSelect }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,4,18,.88)",
      display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,
      backdropFilter:"blur(10px)",animation:"fadeInScale .2s ease"}}>
      <div style={{...glass,padding:"20px 24px",textAlign:"center",
        boxShadow:"0 0 50px rgba(60,120,255,.22),0 20px 60px rgba(0,0,0,.92)"}}>
        <div style={{color:"#78b8f0",fontSize:"11px",fontWeight:700,marginBottom:12,
          letterSpacing:".12em",textTransform:"uppercase"}}>Promote Pawn</div>
        <div style={{display:"flex",gap:8}}>
          {PROMO_PIECES.map(t => (
            <button key={t} onClick={() => onSelect(t)}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(70,130,255,.22)";e.currentTarget.style.transform="translateY(-2px)";}}
              onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.05)";e.currentTarget.style.transform="translateY(0)";;}}
              style={{width:56,height:56,borderRadius:8,background:"rgba(255,255,255,.05)",
                border:"1.5px solid rgba(100,170,255,.35)",cursor:"pointer",padding:5,transition:"all .2s"}}>
              <PieceSVG type={t} color={color}/>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function GameOverModal({ msg, sub, onNew }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,4,18,.9)",
      display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,
      backdropFilter:"blur(12px)",animation:"fadeInScale .4s ease"}}>
      <div style={{...glass,padding:"36px 52px",textAlign:"center",
        boxShadow:"0 0 70px rgba(50,110,255,.2),0 30px 80px rgba(0,0,0,.96)"}}>
        <div style={{fontSize:"clamp(1.3rem,3vw,1.9rem)",fontWeight:700,
          color:"#88c8ff",marginBottom:6,letterSpacing:"-.02em"}}>{msg}</div>
        <div style={{color:"rgba(130,185,255,.45)",fontSize:".85rem",marginBottom:28}}>{sub}</div>
        <button onClick={onNew}
          onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
          onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}
          style={{background:"linear-gradient(135deg,rgba(70,130,255,.85),rgba(40,90,220,.9))",
            border:"none",borderRadius:8,padding:"10px 32px",color:"#e8f4ff",
            fontWeight:700,fontSize:".85rem",cursor:"pointer",letterSpacing:".06em",
            textTransform:"uppercase",boxShadow:"0 4px 20px rgba(60,120,255,.4)",transition:"all .2s"}}>
          New Game
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN CHESS APP
═══════════════════════════════════════════════════════════════ */
export default function ChessGame() {
  const [board, setBoard]     = useState(mkBoard);
  const [turn, setTurn]       = useState("white");
  const [sel, setSel]         = useState(null);
  const [legal, setLegal]     = useState([]);
  const [ep, setEp]           = useState(null);
  const [cast, setCast]       = useState(INIT_CAST);
  const [hist, setHist]       = useState([]);
  const [cap, setCap]         = useState({ white:[], black:[] });
  const [status, setStatus]   = useState("playing");
  const [promo, setPromo]     = useState(null);
  const [lastMv, setLastMv]   = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [wTime, setWTime]     = useState(600);
  const [bTime, setBTime]     = useState(600);
  const [timerOn, setTimerOn] = useState(false);
  const [over, setOver]       = useState(false);
  const [snaps, setSnaps]     = useState([]);
  const [timeMd, setTimeMd]   = useState(600);

  useEffect(() => {
    if (!timerOn || over) return;
    const id = setInterval(() => {
      if (turn === "white") setWTime(t => { if (t<=1){setOver(true);return 0;} return t-1; });
      else                  setBTime(t => { if (t<=1){setOver(true);return 0;} return t-1; });
    }, 1000);
    return () => clearInterval(id);
  }, [timerOn, turn, over]);

  const execMove = (from, to, promoType) => {
    const [fr,fc]=from, [tr,tc]=to;
    const piece = board[fr][fc]; if (!piece) return;
    if (piece.type==="P" && (tr===0||tr===7) && !promoType) { setPromo({from,to}); return; }
    setSnaps(s => [...s, {board:board.map(r=>[...r]),turn,ep,cast:{...cast},
      cap:{white:[...cap.white],black:[...cap.black]},hist:[...hist],lastMv,wTime,bTime}]);
    const {board:nb,cap:captured} = applyMove(board,from,to,ep,promoType||null);
    const nc = {...cast};
    if (piece.type==="K") { if(piece.color==="white"){nc.wK=false;nc.wQ=false;}else{nc.bK=false;nc.bQ=false;} }
    if (piece.type==="R"||captured?.type==="R") {
      if(fr===7&&fc===0)nc.wQ=false; if(fr===7&&fc===7)nc.wK=false;
      if(fr===0&&fc===0)nc.bQ=false; if(fr===0&&fc===7)nc.bK=false;
      if(captured){if(tr===7&&tc===0)nc.wQ=false;if(tr===7&&tc===7)nc.wK=false;
        if(tr===0&&tc===0)nc.bQ=false;if(tr===0&&tc===7)nc.bK=false;}
    }
    const nep = (piece.type==="P"&&Math.abs(tr-fr)===2) ? [(fr+tr)/2,tc] : null;
    const ncap = {white:[...cap.white],black:[...cap.black]};
    if (captured) ncap[captured.color].push(captured.type);
    let castSide = null;
    if (piece.type==="K"&&Math.abs(tc-fc)===2) castSide = tc===6?"K":"Q";
    const next = turn==="white"?"black":"white";
    const chk  = inCheck(nb,next);
    const more = anyLegalMove(nb,next,nep,nc);
    let newStatus = "playing";
    if (chk&&!more) newStatus="checkmate";
    else if (!chk&&!more) newStatus="stalemate";
    else if (chk) newStatus="check";
    const note = toNotation(piece,from,to,captured,
      newStatus==="check"||newStatus==="checkmate",newStatus==="checkmate",castSide,promoType);
    setBoard(nb); setTurn(next); setCast(nc); setEp(nep);
    setCap(ncap); setHist(h => [...h,{notation:note,color:piece.color}]);
    setLastMv({from,to}); setSel(null); setLegal([]); setStatus(newStatus); setPromo(null);
    if (newStatus==="checkmate"||newStatus==="stalemate") setOver(true);
    if (!timerOn) setTimerOn(true);
  };

  const handleSquareClick = (ri, ci) => {
    if (over||promo) return;
    const r=flipped?7-ri:ri, c=flipped?7-ci:ci;
    const piece = board[r][c];
    if (sel) {
      const [sr,sc] = sel;
      if (legal.some(([lr,lc])=>lr===r&&lc===c)) { execMove([sr,sc],[r,c]); return; }
      if (piece?.color===turn) { setSel([r,c]); setLegal(legalMoves(board,r,c,ep,cast)); return; }
      setSel(null); setLegal([]);
    } else {
      if (piece?.color===turn) {
        setSel([r,c]); setLegal(legalMoves(board,r,c,ep,cast));
        if (!timerOn) setTimerOn(true);
      }
    }
  };

  const undo = () => {
    if (!snaps.length) return;
    const prev = snaps[snaps.length-1];
    setBoard(prev.board); setTurn(prev.turn); setEp(prev.ep); setCast(prev.cast);
    setCap(prev.cap); setHist(prev.hist); setLastMv(prev.lastMv);
    setWTime(prev.wTime); setBTime(prev.bTime);
    setSnaps(s=>s.slice(0,-1)); setSel(null); setLegal([]);
    setStatus("playing"); setOver(false); setPromo(null);
  };

  const newGame = (t=timeMd) => {
    setBoard(mkBoard()); setTurn("white"); setSel(null); setLegal([]);
    setEp(null); setCast(INIT_CAST); setHist([]); setCap({white:[],black:[]});
    setStatus("playing"); setPromo(null); setLastMv(null);
    setWTime(t); setBTime(t); setTimerOn(false); setOver(false); setSnaps([]);
  };

  const rows = flipped?[7,6,5,4,3,2,1,0]:[0,1,2,3,4,5,6,7];
  const cols = flipped?[7,6,5,4,3,2,1,0]:[0,1,2,3,4,5,6,7];
  const isSel  = (r,c)=>sel&&sel[0]===r&&sel[1]===c;
  const isLeg  = (r,c)=>legal.some(([a,b])=>a===r&&b===c);
  const isLast = (r,c)=>lastMv&&((lastMv.from[0]===r&&lastMv.from[1]===c)||(lastMv.to[0]===r&&lastMv.to[1]===c));
  const isChk  = (r,c)=>board[r][c]?.type==="K"&&board[r][c]?.color===turn&&(status==="check"||status==="checkmate");

  const timedOut = wTime<=0||bTime<=0;
  let goMsg="",goSub="";
  if (timedOut)              { goMsg=`${wTime<=0?"Black":"White"} wins on time!`; goSub="Clock ran out"; }
  else if (status==="checkmate") { goMsg=`${turn==="white"?"Black":"White"} wins by Checkmate!`; goSub="The king has been cornered"; }
  else if (status==="stalemate") { goMsg="Stalemate — Draw!"; goSub="No legal moves available"; }

  const statusColor = status==="check"?"#ff8060":status==="checkmate"?"#ff6060":status==="stalemate"?"#a0b8ff":"#80c8f0";
  const statusText  = over&&timedOut?`${wTime<=0?"Black":"White"} wins on time`:
    status==="checkmate"?`${turn==="white"?"Black":"White"} wins!`:
    status==="stalemate"?"Stalemate — Draw":
    status==="check"?`${turn==="white"?"White":"Black"} in Check!`:
    `${turn==="white"?"White":"Black"} to move`;

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        html, body, #root { width:100%; min-height:100%; }
        body { font-family:Georgia,serif; }
        body, #root { overflow-x:hidden; }
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-thumb { background:rgba(80,140,255,.3); border-radius:2px; }
        ::-webkit-scrollbar-track { background:transparent; }
        @keyframes fadeInScale { from{opacity:0;transform:scale(.92)} to{opacity:1;transform:scale(1)} }
        .app-shell { position:relative; z-index:1; width:100%; min-height:100vh; display:flex; flex-direction:column; padding:10px 14px 14px; gap:10px; }
        .top-bar { display:flex; align-items:center; justify-content:space-between; padding-bottom:8px; border-bottom:1px solid rgba(80,140,255,.15); flex-shrink:0; flex-wrap:wrap; gap:8px; }
        .main-layout { flex:1; display:grid; grid-template-columns:minmax(180px,220px) minmax(0,1fr) minmax(180px,220px); gap:12px; min-height:0; align-items:start; }
        .panel-col { display:flex; flex-direction:column; gap:9px; min-height:0; }
        .left-col { order:1; }
        .board-col { order:2; display:flex; align-items:center; justify-content:center; min-width:0; }
        .right-col { order:3; }
        .board-frame { width:min(100%, 580px, calc(100vh - 170px)); aspect-ratio:1 / 1; border-radius:4px; overflow:hidden; box-shadow:0 0 0 2px #0c1d4a,0 0 0 4px rgba(60,120,255,.42),0 0 0 7px #060f28,0 0 40px rgba(40,100,255,.22),0 0 80px rgba(30,80,200,.12); }
        .moves-card { display:flex; flex-direction:column; min-height:180px; overflow:hidden; }
        .info-grid { display:grid; gap:9px; }
        @media (max-width: 1100px) {
          .main-layout { grid-template-columns:minmax(0,1fr) minmax(280px,540px); }
          .left-col { grid-column:1; }
          .board-col { grid-column:2; grid-row:1 / span 2; align-self:start; }
          .right-col { grid-column:1; }
          .board-frame { width:min(100%, 540px, calc(100vw - 56px)); }
        }
        @media (max-width: 780px) {
          .app-shell { padding:10px 10px 16px; gap:12px; }
          .main-layout { display:flex; flex-direction:column; gap:10px; }
          .board-col { order:1; }
          .left-col { order:2; }
          .right-col { order:3; }
          .board-frame { width:min(100%, calc(100vw - 20px), 520px); }
          .moves-card { min-height:200px; max-height:260px; }
          .info-grid { grid-template-columns:repeat(2, minmax(0,1fr)); align-items:start; }
        }
        @media (max-width: 520px) {
          .top-bar { align-items:stretch; }
          .top-title { justify-content:space-between; width:100%; }
          .clock-controls { width:100%; }
          .board-frame { width:min(100%, calc(100vw - 16px)); }
          .info-grid { grid-template-columns:1fr; }
        }
      `}</style>

      <CrystalBackground/>

      <div className="app-shell">
        {/* TOP BAR */}
        <div className="top-bar">
          <div className="top-title" style={{display:"flex",alignItems:"baseline",gap:9}}>
            <span style={{fontSize:"clamp(1.1rem,2.5vw,1.5rem)",fontWeight:700,color:"#70b4ff",
              letterSpacing:"-.02em",textShadow:"0 0 24px rgba(80,160,255,.45)"}}>♟ Hanan's Checkmate Arena</span>
            <span style={{color:"rgba(100,160,255,.3)",fontSize:"9px",letterSpacing:".1em"}}>CLASSIC</span>
          </div>
          <div className="clock-controls" style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{color:"rgba(100,160,255,.4)",fontSize:"10px"}}>Clock:</span>
            {[["1m",60],["5m",300],["10m",600],["15m",900]].map(([lbl,s]) => (
              <button key={s} onClick={() => {setTimeMd(s);newGame(s);}} style={{
                background:timeMd===s?"rgba(55,115,255,.32)":"rgba(255,255,255,.04)",
                border:`1px solid ${timeMd===s?"rgba(80,155,255,.7)":"rgba(80,130,220,.2)"}`,
                color:timeMd===s?"#90d0ff":"rgba(120,175,240,.45)",
                borderRadius:6,padding:"3px 10px",fontSize:"11px",cursor:"pointer",
                fontWeight:600,fontFamily:"Georgia,serif",transition:"all .15s",
              }}>{lbl}</button>
            ))}
          </div>
        </div>

        {/* MAIN 3-COLUMN */}
        <div className="main-layout">

          {/* LEFT */}
          <div className="panel-col left-col">
            <PlayerCard color="black" timer={bTime} capList={[...cap.black]}
              isActive={turn==="black"&&!over} timerOn={timerOn}/>
            <div style={{...glass,padding:"8px 12px",
              borderColor:status==="check"||status==="checkmate"?"rgba(220,80,0,.5)":"rgba(100,160,255,.16)",
              background:status==="check"||status==="checkmate"?"rgba(180,50,0,.18)":"rgba(8,16,42,.68)",
              transition:"all .3s"}}>
              <div style={{fontSize:"9px",color:"rgba(100,160,255,.3)",letterSpacing:".1em",
                textTransform:"uppercase",marginBottom:4}}>Status</div>
              <div style={{fontSize:"12px",fontWeight:600,color:statusColor}}>{statusText}</div>
            </div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              <Btn onClick={() => newGame()} primary>↺ New</Btn>
              <Btn onClick={undo} disabled={!snaps.length}>⟵ Undo</Btn>
              <Btn onClick={() => setFlipped(f=>!f)}>⇅ Flip</Btn>
            </div>
            <div className="moves-card" style={{...glass,padding:"8px 8px 4px",flex:1}}>
              <div style={{fontSize:"9px",color:"rgba(100,160,255,.28)",letterSpacing:".1em",
                textTransform:"uppercase",marginBottom:5}}>Moves ({hist.length})</div>
              <MoveHistory hist={hist}/>
            </div>
          </div>

          {/* BOARD */}
          <div className="board-col">
            <div className="board-frame">
              <div style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",
                gridTemplateRows:"repeat(8,1fr)",width:"100%",height:"100%"}}>
                {rows.map((r,ri) => cols.map((c,ci) => (
                  <Square key={`${r}-${c}`} piece={board[r][c]} light={(r+c)%2===0}
                    selected={isSel(r,c)} isLegal={isLeg(r,c)}
                    isLastMove={isLast(r,c)} isCheck={isChk(r,c)}
                    onClick={() => handleSquareClick(ri,ci)}
                    rank={ci===0?RANKS[r]:undefined}
                    file={ri===7?FILES[c]:undefined}
                  />
                )))}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="panel-col right-col">
            <PlayerCard color="white" timer={wTime} capList={[...cap.white]}
              isActive={turn==="white"&&!over} timerOn={timerOn}/>
            <div className="info-grid">
            <div style={{...glass,padding:"9px 12px"}}>
              <div style={{fontSize:"9px",color:"rgba(100,160,255,.28)",letterSpacing:".1em",
                textTransform:"uppercase",marginBottom:8}}>Legend</div>
              {[
                ["rgba(88,175,88,.75)", "Selected / Legal"],
                ["rgba(190,200,50,.55)","Last move"],
                ["rgba(220,60,60,.8)",  "King in check"],
              ].map(([col,lbl]) => (
                <div key={lbl} style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
                  <div style={{width:13,height:13,borderRadius:3,background:col,flexShrink:0}}/>
                  <span style={{fontSize:"10px",color:"rgba(135,190,255,.45)"}}>{lbl}</span>
                </div>
              ))}
            </div>
            <div style={{...glass,padding:"9px 12px"}}>
              <div style={{fontSize:"9px",color:"rgba(100,160,255,.28)",letterSpacing:".1em",
                textTransform:"uppercase",marginBottom:8}}>Piece Values</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 8px"}}>
                {[["Q",9],["R",5],["B",3],["N",3],["P",1]].map(([t,v]) => (
                  <div key={t} style={{display:"flex",alignItems:"center",gap:5}}>
                    <div style={{width:17,height:17}}><PieceSVG type={t} color="white"/></div>
                    <span style={{color:"rgba(120,170,240,.42)",fontSize:"10px",fontFamily:"monospace"}}>{t}={v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{...glass,padding:"9px 12px",fontSize:"10px",
              color:"rgba(120,170,240,.38)",lineHeight:1.85}}>
              <div style={{fontSize:"9px",color:"rgba(100,160,255,.28)",letterSpacing:".1em",
                textTransform:"uppercase",marginBottom:7}}>Special Moves</div>
              <div>🏰 <span style={{color:"rgba(170,210,255,.55)"}}>Castling</span> — King 2 sq</div>
              <div>⚡ <span style={{color:"rgba(170,210,255,.55)"}}>En Passant</span> — Pawn capture</div>
              <div>⭐ <span style={{color:"rgba(170,210,255,.55)"}}>Promotion</span> — Reach 8th</div>
            </div>
            </div>
          </div>
        </div>
      </div>

      {promo && <PromotionModal color={turn} onSelect={t => execMove(promo.from,promo.to,t)}/>}
      {over && goMsg && <GameOverModal msg={goMsg} sub={goSub} onNew={() => newGame()}/>}
    </>
  );
}
