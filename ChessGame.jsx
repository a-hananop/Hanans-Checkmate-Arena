import React, { useState, useEffect, useRef, useCallback } from "react";

/* ══════════════════════════════════════════════════
   CHESS ENGINE
══════════════════════════════════════════════════ */
const FILES = ["a","b","c","d","e","f","g","h"];
const RANKS = ["8","7","6","5","4","3","2","1"];
const IC   = { wK:true, wQ:true, bK:true, bQ:true };
const PPieces = ["Q","R","B","N"];
const VALS = { P:1, N:3, B:3, R:5, Q:9, K:0 };

function mkBoard(){
  const b=Array(8).fill(null).map(()=>Array(8).fill(null));
  ["R","N","B","Q","K","B","N","R"].forEach((t,c)=>{
    b[0][c]={type:t,color:"black"}; b[7][c]={type:t,color:"white"};
  });
  for(let c=0;c<8;c++){b[1][c]={type:"P",color:"black"};b[6][c]={type:"P",color:"white"};}
  return b;
}

const inB=(r,c)=>r>=0&&r<8&&c>=0&&c<8;

function rawMoves(board,r,c,ep,cast){
  const p=board[r][c];if(!p)return[];
  const{type,color}=p,opp=color==="white"?"black":"white";
  const mv=[];
  const push=(nr,nc)=>{if(inB(nr,nc)&&board[nr][nc]?.color!==color)mv.push([nr,nc]);};
  const slide=dirs=>{for(const[dr,dc]of dirs){for(let i=1;i<8;i++){
    const nr=r+dr*i,nc=c+dc*i;if(!inB(nr,nc))break;
    if(board[nr][nc]){if(board[nr][nc].color===opp)mv.push([nr,nc]);break;}mv.push([nr,nc]);}}};
  if(type==="P"){
    const d=color==="white"?-1:1,sr=color==="white"?6:1;
    if(inB(r+d,c)&&!board[r+d][c]){mv.push([r+d,c]);if(r===sr&&!board[r+2*d][c])mv.push([r+2*d,c]);}
    for(const dc of[-1,1])if(inB(r+d,c+dc)){
      if(board[r+d][c+dc]?.color===opp)mv.push([r+d,c+dc]);
      if(ep&&ep[0]===r+d&&ep[1]===c+dc)mv.push([r+d,c+dc]);
    }
  }else if(type==="N"){for(const[dr,dc]of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])push(r+dr,c+dc);}
  else if(type==="B")slide([[-1,-1],[-1,1],[1,-1],[1,1]]);
  else if(type==="R")slide([[-1,0],[1,0],[0,-1],[0,1]]);
  else if(type==="Q")slide([[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]);
  else if(type==="K"){
    for(const[dr,dc]of[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]])push(r+dr,c+dc);
    if(color==="white"&&r===7&&c===4){
      if(cast.wK&&!board[7][5]&&!board[7][6]&&board[7][7]?.type==="R")mv.push([7,6]);
      if(cast.wQ&&!board[7][3]&&!board[7][2]&&!board[7][1]&&board[7][0]?.type==="R")mv.push([7,2]);
    }
    if(color==="black"&&r===0&&c===4){
      if(cast.bK&&!board[0][5]&&!board[0][6]&&board[0][7]?.type==="R")mv.push([0,6]);
      if(cast.bQ&&!board[0][3]&&!board[0][2]&&!board[0][1]&&board[0][0]?.type==="R")mv.push([0,2]);
    }
  }
  return mv;
}

function attacked(board,r,c,by){
  const pawnDir=by==="white"?-1:1;
  for(const dc of[-1,1]){
    const pr=r-pawnDir,pc=c-dc;
    if(inB(pr,pc)&&board[pr][pc]?.color===by&&board[pr][pc]?.type==="P")return true;
  }

  for(const[dr,dc]of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]){
    const nr=r+dr,nc=c+dc;
    if(inB(nr,nc)&&board[nr][nc]?.color===by&&board[nr][nc]?.type==="N")return true;
  }

  for(const[dr,dc]of[[-1,-1],[-1,1],[1,-1],[1,1]]){
    for(let i=1;i<8;i++){
      const nr=r+dr*i,nc=c+dc*i;
      if(!inB(nr,nc))break;
      const piece=board[nr][nc];
      if(!piece)continue;
      if(piece.color===by&&(piece.type==="B"||piece.type==="Q"))return true;
      break;
    }
  }

  for(const[dr,dc]of[[-1,0],[1,0],[0,-1],[0,1]]){
    for(let i=1;i<8;i++){
      const nr=r+dr*i,nc=c+dc*i;
      if(!inB(nr,nc))break;
      const piece=board[nr][nc];
      if(!piece)continue;
      if(piece.color===by&&(piece.type==="R"||piece.type==="Q"))return true;
      break;
    }
  }

  for(const[dr,dc]of[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]){
    const nr=r+dr,nc=c+dc;
    if(inB(nr,nc)&&board[nr][nc]?.color===by&&board[nr][nc]?.type==="K")return true;
  }

  return false;
}

function kingPos(board,color){
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)
    if(board[r][c]?.type==="K"&&board[r][c]?.color===color)return[r,c];
  return null;
}

function inCheck(board,color){const kp=kingPos(board,color);return kp?attacked(board,kp[0],kp[1],color==="white"?"black":"white"):false;}

function applyMove(board,from,to,ep,promo){
  const nb=board.map(r=>[...r]);const[fr,fc]=from,[tr,tc]=to;
  const p=nb[fr][fc];let cap=nb[tr][tc];
  if(p.type==="P"&&ep&&tr===ep[0]&&tc===ep[1]){const cr=p.color==="white"?tr+1:tr-1;cap=nb[cr][tc];nb[cr][tc]=null;}
  if(p.type==="K"&&Math.abs(tc-fc)===2){if(tc===6){nb[fr][5]=nb[fr][7];nb[fr][7]=null;}else{nb[fr][3]=nb[fr][0];nb[fr][0]=null;}}
  nb[tr][tc]=promo?{type:promo,color:p.color}:p;nb[fr][fc]=null;
  return{board:nb,cap};
}

function legalMoves(board,r,c,ep,cast){
  const p=board[r][c];if(!p)return[];
  const opp=p.color==="white"?"black":"white";
  return rawMoves(board,r,c,ep,cast).filter(([tr,tc])=>{
    if(p.type==="K"&&Math.abs(tc-c)===2){
      if(attacked(board,r,c,opp))return false;
      if(attacked(board,r,c+(tc>c?1:-1),opp))return false;
    }
    const{board:nb}=applyMove(board,[r,c],[tr,tc],ep,null);
    return!inCheck(nb,p.color);
  });
}

function anyLegal(board,color,ep,cast){
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)
    if(board[r][c]?.color===color&&legalMoves(board,r,c,ep,cast).length)return true;
  return false;
}

function toSAN(p,from,to,cap,check,mate,castle,promo){
  if(castle==="K")return`O-O${mate?"#":check?"+":""}`;
  if(castle==="Q")return`O-O-O${mate?"#":check?"+":""}`;
  const tf=FILES[to[1]],tr=RANKS[to[0]];
  let n=p.type==="P"?"":p.type;
  if(p.type==="P"&&cap)n=FILES[from[1]];
  if(cap)n+="x";n+=tf+tr;
  if(promo)n+="="+promo;
  if(mate)n+="#";else if(check)n+="+";
  return n;
}

/* ══════════════════════════════════════════════════
   AI ENGINE
══════════════════════════════════════════════════ */
const PST={
  P:[[0,0,0,0,0,0,0,0],[50,50,50,50,50,50,50,50],[10,10,20,30,30,20,10,10],
     [5,5,10,25,25,10,5,5],[0,0,0,20,20,0,0,0],[5,-5,-10,0,0,-10,-5,5],
     [5,10,10,-20,-20,10,10,5],[0,0,0,0,0,0,0,0]],
  N:[[-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,0,0,0,0,-20,-40],
     [-30,0,10,15,15,10,0,-30],[-30,5,15,20,20,15,5,-30],
     [-30,0,15,20,20,15,0,-30],[-30,5,10,15,15,10,5,-30],
     [-40,-20,0,5,5,0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50]],
  B:[[-20,-10,-10,-10,-10,-10,-10,-20],[-10,0,0,0,0,0,0,-10],
     [-10,0,5,10,10,5,0,-10],[-10,5,5,10,10,5,5,-10],
     [-10,0,10,10,10,10,0,-10],[-10,10,10,10,10,10,10,-10],
     [-10,5,0,0,0,0,5,-10],[-20,-10,-10,-10,-10,-10,-10,-20]],
  R:[[0,0,0,5,5,0,0,0],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],
     [-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],
     [5,10,10,10,10,10,10,5],[0,0,0,0,0,0,0,0]],
  Q:[[-20,-10,-10,-5,-5,-10,-10,-20],[-10,0,0,0,0,0,0,-10],
     [-10,0,5,5,5,5,0,-10],[-5,0,5,5,5,5,0,-5],[0,0,5,5,5,5,0,-5],
     [-10,5,5,5,5,5,0,-10],[-10,0,5,0,0,0,0,-10],[-20,-10,-10,-5,-5,-10,-10,-20]],
  K:[[20,30,10,0,0,10,30,20],[20,20,0,0,0,0,20,20],[-10,-20,-20,-20,-20,-20,-20,-10],
     [-20,-30,-30,-40,-40,-30,-30,-20],[-30,-40,-40,-50,-50,-40,-40,-30],
     [-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],
     [-30,-40,-40,-50,-50,-40,-40,-30]]
};

function evalBoard(board,forColor){
  let s=0;
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const p=board[r][c];if(!p)continue;
    const mat=VALS[p.type]*100;
    const row=p.color==="white"?7-r:r;
    const pos=PST[p.type]?.[row]?.[c]??0;
    if(p.color===forColor)s+=mat+pos;else s-=mat+pos;
  }
  return s;
}

function minimax(board,depth,alpha,beta,isMax,aiColor,ep,cast){
  if(depth===0)return evalBoard(board,aiColor);
  const color=isMax?aiColor:(aiColor==="white"?"black":"white");
  const moves=[];
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)
    if(board[r][c]?.color===color)
      for(const to of legalMoves(board,r,c,ep,cast))moves.push({from:[r,c],to});
  if(!moves.length)return inCheck(board,color)?(isMax?-1e6:1e6):0;
  // sort: captures first
  moves.sort((a,b)=>(board[b.to[0]][b.to[1]]?1:0)-(board[a.to[0]][a.to[1]]?1:0));
  if(isMax){
    let best=-Infinity;
    for(const mv of moves){
      const{board:nb}=applyMove(board,mv.from,mv.to,ep,null);
      const[tr,tc]=mv.to;
      if(nb[tr][tc]?.type==="P"&&(tr===0||tr===7))nb[tr][tc]={type:"Q",color:aiColor};
      const nep=board[mv.from[0]][mv.from[1]]?.type==="P"&&Math.abs(mv.to[0]-mv.from[0])===2?[(mv.from[0]+mv.to[0])/2,mv.to[1]]:null;
      const v=minimax(nb,depth-1,alpha,beta,false,aiColor,nep,cast);
      best=Math.max(best,v);alpha=Math.max(alpha,v);if(beta<=alpha)break;
    }
    return best;
  }else{
    let best=Infinity;
    for(const mv of moves){
      const{board:nb}=applyMove(board,mv.from,mv.to,ep,null);
      const[tr,tc]=mv.to;
      if(nb[tr][tc]?.type==="P"&&(tr===0||tr===7))nb[tr][tc]={type:"Q",color:aiColor==="white"?"black":"white"};
      const nep=board[mv.from[0]][mv.from[1]]?.type==="P"&&Math.abs(mv.to[0]-mv.from[0])===2?[(mv.from[0]+mv.to[0])/2,mv.to[1]]:null;
      const v=minimax(nb,depth-1,alpha,beta,true,aiColor,nep,cast);
      best=Math.min(best,v);beta=Math.min(beta,v);if(beta<=alpha)break;
    }
    return best;
  }
}

function getAIMove(board,aiColor,ep,cast,difficulty){
  const moves=[];
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)
    if(board[r][c]?.color===aiColor)
      for(const to of legalMoves(board,r,c,ep,cast))moves.push({from:[r,c],to});
  if(!moves.length)return null;
  if(difficulty==="easy"){
    const caps=moves.filter(mv=>board[mv.to[0]][mv.to[1]]);
    const pool=caps.length&&Math.random()>.4?caps:moves;
    return pool[Math.floor(Math.random()*pool.length)];
  }
  const depth=difficulty==="medium"?2:3;
  moves.sort(()=>Math.random()-.5);
  let best=moves[0],bestV=-Infinity;
  for(const mv of moves){
    const{board:nb}=applyMove(board,mv.from,mv.to,ep,null);
    const[tr,tc]=mv.to;
    if(nb[tr][tc]?.type==="P"&&(tr===0||tr===7))nb[tr][tc]={type:"Q",color:aiColor};
    const nep=board[mv.from[0]][mv.from[1]]?.type==="P"&&Math.abs(mv.to[0]-mv.from[0])===2?[(mv.from[0]+mv.to[0])/2,mv.to[1]]:null;
    const v=minimax(nb,depth-1,-Infinity,Infinity,false,aiColor,nep,cast);
    if(v>bestV){bestV=v;best=mv;}
  }
  return best;
}

/* ══════════════════════════════════════════════════
   RESPONSIVE HOOK
══════════════════════════════════════════════════ */
function useWW(){
  const[w,setW]=useState(()=>typeof window!=="undefined"?window.innerWidth:1024);
  useEffect(()=>{
    const h=()=>setW(window.innerWidth);
    window.addEventListener("resize",h);
    return()=>window.removeEventListener("resize",h);
  },[]);
  return w;
}

/* ══════════════════════════════════════════════════
   CRYSTAL BACKGROUND
══════════════════════════════════════════════════ */
function CrystalBG(){
  return(
    <div style={{position:"fixed",inset:0,zIndex:0,overflow:"hidden",
      background:"radial-gradient(ellipse at 30% 20%,#0a1628 0%,#050c1c 55%,#020810 100%)"}}>
      <svg style={{position:"absolute",inset:0,width:"100%",height:"100%"}}
        viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#1a3a7a" stopOpacity=".7"/><stop offset="100%" stopColor="#0a1845" stopOpacity=".2"/></linearGradient>
          <linearGradient id="g2" x1="1" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0e2a60" stopOpacity=".65"/><stop offset="100%" stopColor="#060f30" stopOpacity=".15"/></linearGradient>
          <linearGradient id="g3" x1=".3" y1="0" x2=".8" y2="1"><stop offset="0%" stopColor="#2050a0" stopOpacity=".18"/><stop offset="100%" stopColor="#0c1840" stopOpacity=".06"/></linearGradient>
          <linearGradient id="g4" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#3068c0" stopOpacity=".25"/><stop offset="100%" stopColor="#1030a0" stopOpacity=".05"/></linearGradient>
          <linearGradient id="g5" x1=".5" y1="0" x2=".5" y2="1"><stop offset="0%" stopColor="#80b0ff" stopOpacity=".22"/><stop offset="100%" stopColor="#2040a0" stopOpacity=".05"/></linearGradient>
          <radialGradient id="gl1" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#2060c0" stopOpacity=".18"/><stop offset="100%" stopColor="#001040" stopOpacity="0"/></radialGradient>
          <radialGradient id="gl2" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#1a50b0" stopOpacity=".14"/><stop offset="100%" stopColor="#000820" stopOpacity="0"/></radialGradient>
          <style>{`
            @keyframes s1{0%,100%{opacity:.72}50%{opacity:1}}
            @keyframes s2{0%,100%{opacity:.5}50%{opacity:.88}}
            @keyframes s3{0%,100%{opacity:.62}50%{opacity:1}}
            @keyframes s4{0%,100%{opacity:.55}50%{opacity:.92}}
            @keyframes s5{0%,100%{opacity:.65}50%{opacity:1}}
            .b1{animation:s1 4s ease-in-out infinite}.b2{animation:s2 5.5s ease-in-out infinite}
            .b3{animation:s3 3.8s ease-in-out infinite}.b4{animation:s4 6s ease-in-out infinite}
            .b5{animation:s5 4.5s ease-in-out infinite}
          `}</style>
        </defs>
        <ellipse cx="300" cy="200" rx="350" ry="260" fill="url(#gl1)"/>
        <ellipse cx="1140" cy="280" rx="380" ry="280" fill="url(#gl2)"/>
        <ellipse cx="720" cy="520" rx="420" ry="300" fill="url(#gl1)" opacity=".6"/>
        <ellipse cx="200" cy="750" rx="280" ry="200" fill="url(#gl2)" opacity=".7"/>
        <ellipse cx="1280" cy="700" rx="300" ry="220" fill="url(#gl1)" opacity=".5"/>
        <g className="b1">
          <polygon points="100,10 280,120 310,320 180,420 20,300 -10,120" fill="url(#g1)"/>
          <polygon points="100,10 280,120 180,10" fill="url(#g3)" opacity=".8"/>
          <line x1="100" y1="10" x2="280" y2="120" stroke="rgba(140,200,255,.28)" strokeWidth="1"/>
          <line x1="280" y1="120" x2="310" y2="320" stroke="rgba(100,160,240,.2)" strokeWidth=".8"/>
          <line x1="310" y1="320" x2="180" y2="420" stroke="rgba(120,180,255,.16)" strokeWidth=".7"/>
          <line x1="180" y1="420" x2="20" y2="300" stroke="rgba(100,160,240,.18)" strokeWidth=".8"/>
          <line x1="20" y1="300" x2="-10" y2="120" stroke="rgba(140,200,255,.15)" strokeWidth=".7"/>
          <line x1="-10" y1="120" x2="100" y2="10" stroke="rgba(160,210,255,.22)" strokeWidth="1"/>
          <line x1="100" y1="10" x2="310" y2="320" stroke="rgba(120,180,255,.08)" strokeWidth=".5" strokeDasharray="6 9"/>
          <line x1="200,230,255,.18" x2="rgba(200,230,255,.18)" stroke="rgba(200,230,255,.18)" strokeWidth="1.2"/>
        </g>
        <g className="b2">
          <polygon points="1160,0 1380,100 1440,280 1400,460 1220,500 1080,360 1060,160" fill="url(#g2)"/>
          <polygon points="1160,0 1380,100 1280,0" fill="url(#g4)" opacity=".7"/>
          <line x1="1160" y1="0" x2="1380" y2="100" stroke="rgba(140,200,255,.25)" strokeWidth="1"/>
          <line x1="1380" y1="100" x2="1440" y2="280" stroke="rgba(100,160,240,.2)" strokeWidth=".8"/>
          <line x1="1440" y1="280" x2="1400" y2="460" stroke="rgba(120,180,255,.16)" strokeWidth=".7"/>
          <line x1="1400" y1="460" x2="1220" y2="500" stroke="rgba(100,160,240,.15)" strokeWidth=".7"/>
          <line x1="1220" y1="500" x2="1080" y2="360" stroke="rgba(140,190,255,.18)" strokeWidth=".8"/>
          <line x1="1080" y1="360" x2="1060" y2="160" stroke="rgba(120,180,255,.2)" strokeWidth=".8"/>
          <line x1="1060" y1="160" x2="1160" y2="0" stroke="rgba(160,210,255,.22)" strokeWidth="1"/>
        </g>
        <g className="b3">
          <polygon points="-20,580 140,500 300,560 340,740 220,880 0,860" fill="url(#g2)"/>
          <line x1="-20" y1="580" x2="140" y2="500" stroke="rgba(140,200,255,.22)" strokeWidth=".9"/>
          <line x1="140" y1="500" x2="300" y2="560" stroke="rgba(100,160,240,.18)" strokeWidth=".7"/>
          <line x1="300" y1="560" x2="340" y2="740" stroke="rgba(120,180,255,.15)" strokeWidth=".7"/>
          <line x1="340" y1="740" x2="220" y2="880" stroke="rgba(100,160,240,.14)" strokeWidth=".6"/>
          <line x1="220" y1="880" x2="0" y2="860" stroke="rgba(140,190,255,.16)" strokeWidth=".7"/>
          <line x1="0" y1="860" x2="-20" y2="580" stroke="rgba(120,180,255,.18)" strokeWidth=".8"/>
        </g>
        <g className="b4">
          <polygon points="1100,650 1280,580 1440,680 1440,880 1260,900 1060,820" fill="url(#g1)"/>
          <line x1="1100" y1="650" x2="1280" y2="580" stroke="rgba(140,200,255,.2)" strokeWidth=".8"/>
          <line x1="1280" y1="580" x2="1440" y2="680" stroke="rgba(100,160,240,.18)" strokeWidth=".7"/>
          <line x1="1440" y1="680" x2="1440" y2="880" stroke="rgba(120,180,255,.15)" strokeWidth=".6"/>
          <line x1="1440" y1="880" x2="1260" y2="900" stroke="rgba(100,160,240,.14)" strokeWidth=".6"/>
          <line x1="1260" y1="900" x2="1060" y2="820" stroke="rgba(140,190,255,.16)" strokeWidth=".7"/>
          <line x1="1060" y1="820" x2="1100" y2="650" stroke="rgba(120,180,255,.18)" strokeWidth=".8"/>
        </g>
        <g className="b5">
          <polygon points="600,0 780,80 820,220 720,320 560,280 520,140" fill="url(#g3)"/>
          <line x1="600" y1="0" x2="780" y2="80" stroke="rgba(160,210,255,.22)" strokeWidth=".9"/>
          <line x1="780" y1="80" x2="820" y2="220" stroke="rgba(120,180,255,.17)" strokeWidth=".7"/>
          <line x1="820" y1="220" x2="720" y2="320" stroke="rgba(100,160,240,.14)" strokeWidth=".6"/>
          <line x1="720" y1="320" x2="560" y2="280" stroke="rgba(140,190,255,.15)" strokeWidth=".7"/>
          <line x1="560" y1="280" x2="520" y2="140" stroke="rgba(120,180,255,.18)" strokeWidth=".7"/>
          <line x1="520" y1="140" x2="600" y2="0" stroke="rgba(160,210,255,.2)" strokeWidth=".9"/>
        </g>
        <g className="b2" opacity=".75">
          <polygon points="400,30 480,90 460,180 360,200 300,130" fill="url(#g4)"/>
          <line x1="400" y1="30" x2="480" y2="90" stroke="rgba(160,210,255,.2)" strokeWidth=".7"/>
          <line x1="480" y1="90" x2="460" y2="180" stroke="rgba(120,180,255,.15)" strokeWidth=".6"/>
          <line x1="460" y1="180" x2="360" y2="200" stroke="rgba(100,160,240,.13)" strokeWidth=".6"/>
          <line x1="360" y1="200" x2="300" y2="130" stroke="rgba(140,190,255,.16)" strokeWidth=".6"/>
          <line x1="300" y1="130" x2="400" y2="30" stroke="rgba(160,210,255,.18)" strokeWidth=".7"/>
        </g>
        <g className="b1" opacity=".65">
          <polygon points="980,100 1060,60 1120,130 1090,220 1000,240 940,180" fill="url(#g5)"/>
          <line x1="980" y1="100" x2="1060" y2="60" stroke="rgba(160,210,255,.2)" strokeWidth=".7"/>
          <line x1="1060" y1="60" x2="1120" y2="130" stroke="rgba(120,180,255,.15)" strokeWidth=".6"/>
          <line x1="1120" y1="130" x2="1090" y2="220" stroke="rgba(100,160,240,.13)" strokeWidth=".6"/>
          <line x1="1090" y1="220" x2="1000" y2="240" stroke="rgba(140,190,255,.15)" strokeWidth=".6"/>
          <line x1="1000" y1="240" x2="940" y2="180" stroke="rgba(120,180,255,.16)" strokeWidth=".6"/>
          <line x1="940" y1="180" x2="980" y2="100" stroke="rgba(160,210,255,.18)" strokeWidth=".7"/>
        </g>
        <g className="b3" opacity=".55">
          <polygon points="480,680 580,640 640,720 600,820 480,840 420,760" fill="url(#g2)"/>
          <line x1="480" y1="680" x2="580" y2="640" stroke="rgba(140,200,255,.18)" strokeWidth=".6"/>
          <line x1="580" y1="640" x2="640" y2="720" stroke="rgba(100,160,240,.14)" strokeWidth=".5"/>
          <line x1="640" y1="720" x2="600" y2="820" stroke="rgba(120,180,255,.12)" strokeWidth=".5"/>
          <line x1="600" y1="820" x2="480" y2="840" stroke="rgba(100,160,240,.13)" strokeWidth=".5"/>
          <line x1="480" y1="840" x2="420" y2="760" stroke="rgba(140,190,255,.15)" strokeWidth=".6"/>
          <line x1="420" y1="760" x2="480" y2="680" stroke="rgba(160,210,255,.17)" strokeWidth=".6"/>
        </g>
        <g stroke="rgba(70,120,210,.055)" strokeWidth=".5">
          <line x1="0" y1="200" x2="200" y2="0"/><line x1="0" y1="400" x2="400" y2="0"/>
          <line x1="0" y1="600" x2="600" y2="0"/><line x1="0" y1="800" x2="800" y2="0"/>
          <line x1="100" y1="900" x2="1000" y2="0"/><line x1="300" y1="900" x2="1200" y2="0"/>
          <line x1="500" y1="900" x2="1400" y2="0"/><line x1="700" y1="900" x2="1440" y2="160"/>
          <line x1="900" y1="900" x2="1440" y2="360"/><line x1="1100" y1="900" x2="1440" y2="560"/>
        </g>
        {[[100,10,3,"s1 4s"],[280,120,2.5,"s2 5s"],[310,320,2,"s3 3.8s"],[1160,0,3,"s1 4.5s"],
          [1380,100,2.5,"s2 5.5s"],[1440,280,2,"s3 4s"],[600,0,3,"s4 6s"],[780,80,2.5,"s5 4.5s"],
          [400,30,2,"s1 3.5s"],[1060,60,2.5,"s2 5s"],[140,500,2,"s3 4.2s"],[1280,580,2.5,"s4 5.8s"]
        ].map(([cx,cy,r,anim],i)=>(
          <circle key={i} cx={cx} cy={cy} r={r}
            fill={`rgba(${180+(i%3)*18},${210+(i%2)*14},255,${0.52+(i%4)*0.1})`}
            style={{animation:`${anim} ease-in-out infinite`}}/>
        ))}
        <line x1="100" y1="10" x2="280" y2="120" stroke="rgba(200,230,255,.18)" strokeWidth="1.2"/>
        <line x1="1160" y1="0" x2="1380" y2="100" stroke="rgba(200,230,255,.15)" strokeWidth="1"/>
        <line x1="600" y1="0" x2="780" y2="80" stroke="rgba(200,230,255,.14)" strokeWidth="1"/>
      </svg>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   PIECE SVG
══════════════════════════════════════════════════ */
function PieceSVG({type,color}){
  const[f,s]=color==="white"?["#F5E8CC","#7a5c12"]:["#1a0e06","#a0b8e0"];
  const sw=1.4;
  const shapes={
    K:<g><rect x="20" y="7" width="10" height="4" rx="1" fill={f} stroke={s} strokeWidth={sw}/>
      <rect x="23" y="4" width="4" height="8" rx="1" fill={f} stroke={s} strokeWidth={sw}/>
      <ellipse cx="25" cy="22" rx="7" ry="6" fill={f} stroke={s} strokeWidth={sw}/>
      <rect x="13" y="28" width="24" height="6" rx="2" fill={f} stroke={s} strokeWidth={sw}/>
      <rect x="11" y="33" width="28" height="5" rx="2" fill={f} stroke={s} strokeWidth={sw}/></g>,
    Q:<g><circle cx="25" cy="9" r="3.5" fill={f} stroke={s} strokeWidth={sw}/>
      <circle cx="14" cy="12" r="3" fill={f} stroke={s} strokeWidth={sw}/>
      <circle cx="36" cy="12" r="3" fill={f} stroke={s} strokeWidth={sw}/>
      <path d="M14 14 L18 30 L25 26 L32 30 L36 14" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round"/>
      <rect x="13" y="29" width="24" height="5" rx="2" fill={f} stroke={s} strokeWidth={sw}/>
      <rect x="11" y="34" width="28" height="5" rx="2" fill={f} stroke={s} strokeWidth={sw}/></g>,
    R:<g><rect x="14" y="5" width="5" height="9" rx="1" fill={f} stroke={s} strokeWidth={sw}/>
      <rect x="22" y="5" width="6" height="9" rx="1" fill={f} stroke={s} strokeWidth={sw}/>
      <rect x="31" y="5" width="5" height="9" rx="1" fill={f} stroke={s} strokeWidth={sw}/>
      <rect x="14" y="13" width="22" height="16" rx="1" fill={f} stroke={s} strokeWidth={sw}/>
      <rect x="12" y="29" width="26" height="5" rx="2" fill={f} stroke={s} strokeWidth={sw}/>
      <rect x="10" y="34" width="30" height="5" rx="2" fill={f} stroke={s} strokeWidth={sw}/></g>,
    B:<g><circle cx="25" cy="9" r="3.5" fill={f} stroke={s} strokeWidth={sw}/>
      <path d="M25 11 L17 31 L25 27 L33 31 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round"/>
      <circle cx="25" cy="31" r="3" fill={f} stroke={s} strokeWidth={sw}/>
      <rect x="13" y="34" width="24" height="4" rx="2" fill={f} stroke={s} strokeWidth={sw}/>
      <rect x="11" y="38" width="28" height="3" rx="2" fill={f} stroke={s} strokeWidth={sw}/></g>,
    N:<g><path d="M18 39 L18 28 Q13 22 15 14 Q17 7 24 6 Q31 5 32 10 Q34 8 35 11 Q33 15 30 14 Q33 19 30 25 L32 39 Z"
        fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round"/>
      <circle cx="22" cy="13" r="2" fill={s}/>
      <rect x="14" y="39" width="22" height="4" rx="2" fill={f} stroke={s} strokeWidth={sw}/></g>,
    P:<g><circle cx="25" cy="14" r="6" fill={f} stroke={s} strokeWidth={sw}/>
      <path d="M20 19 L17 32 L33 32 L30 19 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round"/>
      <rect x="13" y="32" width="24" height="4" rx="2" fill={f} stroke={s} strokeWidth={sw}/>
      <rect x="11" y="36" width="28" height="5" rx="2" fill={f} stroke={s} strokeWidth={sw}/></g>,
  };
  const drp=color==="white"?"drop-shadow(0 1.5px 3px rgba(0,0,0,.8))":"drop-shadow(0 1px 3px rgba(160,200,255,.12))";
  return<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%",filter:drp}}>{shapes[type]}</svg>;
}

/* ══════════════════════════════════════════════════
   SQUARE
══════════════════════════════════════════════════ */
function Square({piece,light,selected,isLegal,isLastMove,isCheck,onClick,rank,file}){
  const[hov,sh]=useState(false);
  const L="#d8e8f8",D="#527aaa";
  let bg=light?L:D;
  if(isCheck)bg=light?"#e07070":"#b84040";
  else if(selected)bg=light?"#78c078":"#489048";
  else if(isLastMove)bg=light?"#c8d060":"#909820";
  else if(hov&&piece)bg=light?"#98d098":"#62a862";
  return(
    <div onClick={onClick} onMouseEnter={()=>sh(true)} onMouseLeave={()=>sh(false)}
      style={{position:"relative",background:bg,cursor:piece||isLegal?"pointer":"default",
        display:"flex",alignItems:"center",justifyContent:"center",
        userSelect:"none",transition:"background .1s",width:"100%",height:"100%"}}>
      {rank&&<span style={{position:"absolute",top:1,left:2,fontSize:"clamp(6px,.9vw,10px)",fontWeight:700,
        color:light?D:L,opacity:.75,lineHeight:1,pointerEvents:"none"}}>{rank}</span>}
      {file&&<span style={{position:"absolute",bottom:1,right:2,fontSize:"clamp(6px,.9vw,10px)",fontWeight:700,
        color:light?D:L,opacity:.75,lineHeight:1,pointerEvents:"none"}}>{file}</span>}
      {isLegal&&!piece&&<div style={{width:"33%",height:"33%",borderRadius:"50%",background:"rgba(0,0,0,.2)",pointerEvents:"none"}}/>}
      {isLegal&&piece&&<div style={{position:"absolute",inset:0,border:"3px solid rgba(0,0,0,.25)",boxSizing:"border-box",pointerEvents:"none"}}/>}
      {piece&&<div style={{width:"88%",height:"88%",transform:selected?"scale(1.1)":hov?"scale(1.05)":"scale(1)",
        transition:"transform .1s",position:"relative",zIndex:1}}>
        <PieceSVG type={piece.type} color={piece.color}/>
      </div>}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   SHARED STYLE
══════════════════════════════════════════════════ */
const glass={
  background:"rgba(8,16,42,.70)",
  border:"1px solid rgba(100,160,255,.18)",
  borderRadius:10,
  backdropFilter:"blur(14px)",
  WebkitBackdropFilter:"blur(14px)",
};

/* ══════════════════════════════════════════════════
   TIMER
══════════════════════════════════════════════════ */
function Timer({secs,active,low}){
  const m=Math.floor(secs/60),s=secs%60;
  return(
    <div style={{fontFamily:"'Courier New',monospace",fontSize:"clamp(.8rem,1.8vw,1.1rem)",
      fontWeight:700,letterSpacing:".07em",flexShrink:0,
      color:low?"#ff6666":active?"#90d0ff":"rgba(120,170,230,.5)",
      border:`1.5px solid ${low?"rgba(255,80,80,.6)":active?"rgba(90,160,255,.5)":"rgba(80,130,210,.2)"}`,
      borderRadius:7,padding:"3px 10px",transition:"all .3s",
      textShadow:low?"0 0 8px rgba(255,80,80,.5)":active?"0 0 8px rgba(100,180,255,.4)":"none"}}>
      {secs===0&&!active?<span style={{fontSize:".7em",letterSpacing:0}}>TIME</span>:`${m}:${s.toString().padStart(2,"0")}`}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   CAPTURED PIECES
══════════════════════════════════════════════════ */
function CapturedPieces({pieces,color}){
  const sorted=[...pieces].sort((a,b)=>VALS[b]-VALS[a]);
  const score=pieces.reduce((s,p)=>s+VALS[p],0);
  return(
    <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:1,minHeight:18}}>
      {sorted.map((t,i)=><div key={i} style={{width:17,height:17}}><PieceSVG type={t} color={color}/></div>)}
      {score>0&&<span style={{color:"#7ab0e8",fontSize:"10px",marginLeft:3,fontFamily:"monospace"}}>+{score}</span>}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   MOVE HISTORY
══════════════════════════════════════════════════ */
function MoveHistory({hist}){
  const endRef=useRef(null);
  useEffect(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),[hist]);
  const pairs=[];
  for(let i=0;i<hist.length;i+=2)pairs.push({n:Math.floor(i/2)+1,w:hist[i],b:hist[i+1]});
  return(
    <div style={{flex:1,overflowY:"auto",fontSize:"11px",
      scrollbarWidth:"thin",scrollbarColor:"rgba(80,140,255,.3) transparent"}}>
      {!pairs.length&&<div style={{color:"rgba(120,170,240,.25)",textAlign:"center",padding:"12px 0"}}>No moves yet</div>}
      {pairs.map(({n,w,b})=>(
        <div key={n} style={{display:"grid",gridTemplateColumns:"18px 1fr 1fr",gap:2,marginBottom:2}}>
          <span style={{color:"rgba(120,170,240,.28)",textAlign:"right",paddingRight:3,paddingTop:2,fontFamily:"monospace"}}>{n}.</span>
          {[w,b].map((mv,mi)=>(
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

/* ══════════════════════════════════════════════════
   BUTTON
══════════════════════════════════════════════════ */
function Btn({children,onClick,disabled,primary,danger,small,full}){
  const[hov,sh]=useState(false);
  const bg=disabled?"rgba(255,255,255,.02)":danger?(hov?"rgba(180,40,40,.5)":"rgba(180,40,40,.25)"):primary?(hov?"rgba(55,115,255,.5)":"rgba(55,115,255,.28)"):(hov?"rgba(80,140,255,.15)":"rgba(255,255,255,.04)");
  const bd=disabled?"rgba(255,255,255,.05)":danger?"rgba(200,60,60,.55)":primary?"rgba(80,150,255,.6)":"rgba(80,130,220,.25)";
  const cl=disabled?"rgba(255,255,255,.18)":danger?"#ff9090":primary?"#b0deff":"rgba(155,200,255,.8)";
  return(
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={()=>sh(true)} onMouseLeave={()=>sh(false)}
      style={{background:bg,border:`1px solid ${bd}`,borderRadius:7,
        padding:small?"4px 9px":"5px 12px",color:cl,
        fontSize:small?"10px":"11px",fontWeight:600,cursor:disabled?"not-allowed":"pointer",
        letterSpacing:".04em",transition:"all .15s",
        display:"inline-flex",alignItems:"center",justifyContent:"center",gap:4,
        transform:!disabled&&hov?"translateY(-1px)":"none",
        whiteSpace:"nowrap",fontFamily:"Georgia,serif",
        width:full?"100%":"auto"}}>
      {children}
    </button>
  );
}

/* ══════════════════════════════════════════════════
   PLAYER CARD
══════════════════════════════════════════════════ */
function PlayerCard({color,timer,capList,isActive,timerOn,isAI,aiThinking,compact}){
  return(
    <div style={{...glass,padding:compact?"6px 10px":"8px 12px",
      borderColor:isActive?"rgba(100,175,255,.52)":"rgba(100,160,255,.16)",
      boxShadow:isActive?"0 0 16px rgba(70,150,255,.18)":"none",transition:"all .3s"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:compact?3:5}}>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <div style={{width:11,height:11,borderRadius:"50%",flexShrink:0,
            background:color==="white"?"#F5E8CC":"#1a0e06",
            border:`1.5px solid ${color==="white"?"rgba(255,255,255,.4)":"rgba(100,175,255,.4)"}`}}/>
          <span style={{color:isActive?"#9cd4ff":"rgba(155,200,255,.52)",fontWeight:600,
            fontSize:compact?"11px":"12px",transition:"all .3s",
            textShadow:isActive?"0 0 8px rgba(100,185,255,.45)":"none"}}>
            {color==="white"?"White":"Black"}
            {isAI&&<span style={{marginLeft:5,fontSize:"9px",color:"rgba(120,200,255,.5)",
              border:"1px solid rgba(100,170,255,.25)",borderRadius:4,padding:"1px 4px"}}>CPU</span>}
            {isActive&&!aiThinking&&<span style={{marginLeft:5,fontSize:"10px",color:"#80ff80"}}>▶</span>}
            {isActive&&aiThinking&&<span style={{marginLeft:5,fontSize:"9px",color:"#90ccff",
              animation:"s2 1s ease-in-out infinite"}}>thinking…</span>}
          </span>
        </div>
        <Timer secs={timer} active={isActive&&timerOn&&!aiThinking} low={timer<30&&timer>0}/>
      </div>
      {!compact&&<CapturedPieces pieces={capList} color={color==="white"?"black":"white"}/>}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   SETUP MODAL
══════════════════════════════════════════════════ */
function SetupModal({onStart,initialSettings}){
  const[mode,setMode]=useState(initialSettings.mode);
  const[diff,setDiff]=useState(initialSettings.diff);
  const[side,setSide]=useState(initialSettings.side);
  const[time,setTime]=useState(initialSettings.time);
  const ww=useWW();
  const isMobile=ww<520;

  const selBtn=(active,onClick,children,extra={})=>(
    <button onClick={onClick} style={{
      background:active?"rgba(60,120,255,.38)":"rgba(255,255,255,.05)",
      border:`1.5px solid ${active?"rgba(90,160,255,.8)":"rgba(80,130,220,.2)"}`,
      color:active?"#b0e0ff":"rgba(140,190,255,.55)",
      borderRadius:8,padding:"8px 14px",cursor:"pointer",fontWeight:600,
      fontSize:isMobile?"11px":"12px",transition:"all .15s",fontFamily:"Georgia,serif",
      flex:1,textAlign:"center",...extra}}>
      {children}
    </button>
  );

  const Section=({label,children})=>(
    <div style={{marginBottom:16}}>
      <div style={{fontSize:"9px",color:"rgba(100,160,255,.4)",letterSpacing:".1em",
        textTransform:"uppercase",marginBottom:8}}>{label}</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{children}</div>
    </div>
  );

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,4,20,.92)",
      display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000,
      backdropFilter:"blur(14px)",WebkitBackdropFilter:"blur(14px)",padding:16}}>
      <div style={{...glass,width:"100%",maxWidth:420,padding:isMobile?"20px 18px":"28px 28px",
        boxShadow:"0 0 60px rgba(60,120,255,.22),0 30px 80px rgba(0,0,0,.95)",
        maxHeight:"95vh",overflowY:"auto"}}>
        {/* Header */}
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:"1.8rem",color:"#70b4ff",fontWeight:700,letterSpacing:"-.02em",
            textShadow:"0 0 24px rgba(80,160,255,.45)",marginBottom:4, whiteSpace:"nowrap"}}>♟ Hanan's Chess Arena</div>
          <div style={{color:"rgba(140,190,255,.4)",fontSize:"11px",letterSpacing:".08em",
            textTransform:"uppercase"}}>Configure your match</div>
        </div>

        <Section label="Game Mode">
          {selBtn(mode==="pvp",()=>setMode("pvp"),"👥 vs Human")}
          {selBtn(mode==="pvai",()=>setMode("pvai"),"🤖 vs Computer")}
        </Section>

        {mode==="pvai"&&<>
          <Section label="Difficulty">
            {selBtn(diff==="easy",()=>setDiff("easy"),"Easy")}
            {selBtn(diff==="medium",()=>setDiff("medium"),"Medium")}
            {selBtn(diff==="hard",()=>setDiff("hard"),"Hard")}
          </Section>
          <div style={{marginBottom:4,fontSize:"9px",color:"rgba(100,160,255,.4)",
            letterSpacing:".1em",textTransform:"uppercase"}}>Play as</div>
          <div style={{display:"flex",gap:8,marginBottom:18}}>
            {[["white","♔ White"],["random","🎲 Random"],["black","♚ Black"]].map(([v,label])=>(
              <button key={v} onClick={()=>setSide(v)} style={{
                background:side===v?"rgba(60,120,255,.38)":"rgba(255,255,255,.05)",
                border:`1.5px solid ${side===v?"rgba(90,160,255,.8)":"rgba(80,130,220,.2)"}`,
                color:side===v?"#b0e0ff":"rgba(140,190,255,.55)",
                borderRadius:8,padding:"10px 6px",cursor:"pointer",fontWeight:600,
                fontSize:isMobile?"11px":"12px",transition:"all .15s",fontFamily:"Georgia,serif",
                flex:1,textAlign:"center"}}>
                {label}
              </button>
            ))}
          </div>
        </>}

        <Section label="Time Control">
          {[["1m",60],["5m",300],["10m",600],["15m",900],["∞",0]].map(([label,v])=>(
            <span key={v} style={{display:"contents"}}>
              {selBtn(time===v,()=>setTime(v),label,{minWidth:isMobile?"calc(33% - 4px)":"auto",flex:"unset",padding:"7px 10px"})}
            </span>
          ))}
        </Section>

        <div style={{fontSize:"9px",color:"rgba(100,160,255,.28)",
          background:"rgba(60,120,255,.07)",border:"1px solid rgba(80,140,255,.12)",
          borderRadius:7,padding:"7px 10px",marginBottom:20,lineHeight:1.7}}>
          {mode==="pvp"?"Two players on same device — take turns making moves.":
           diff==="easy"?"CPU plays randomly, prefers captures.":
           diff==="medium"?"CPU thinks 2 moves ahead. Good challenge for beginners.":
           "CPU thinks 3 moves ahead with alpha-beta. Strong play."}
        </div>

        <button onClick={()=>onStart({mode,diff,side,time})} style={{
          width:"100%",background:"linear-gradient(135deg,rgba(70,130,255,.85),rgba(40,90,220,.9))",
          border:"none",borderRadius:9,padding:"13px",color:"#e8f4ff",fontWeight:700,
          fontSize:"14px",cursor:"pointer",letterSpacing:".06em",textTransform:"uppercase",
          boxShadow:"0 4px 24px rgba(60,120,255,.4)",transition:"all .2s",fontFamily:"Georgia,serif"}}
          onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
          onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
          Start Game ▶
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   PROMOTION MODAL
══════════════════════════════════════════════════ */
function PromotionModal({color,onSelect}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,4,18,.88)",
      display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,
      backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)"}}>
      <div style={{...glass,padding:"20px 24px",textAlign:"center",
        boxShadow:"0 0 50px rgba(60,120,255,.22),0 20px 60px rgba(0,0,0,.92)"}}>
        <div style={{color:"#78b8f0",fontSize:"11px",fontWeight:700,marginBottom:12,
          letterSpacing:".12em",textTransform:"uppercase"}}>Promote Pawn</div>
        <div style={{display:"flex",gap:8}}>
          {PPieces.map(t=>(
            <button key={t} onClick={()=>onSelect(t)}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(70,130,255,.22)";e.currentTarget.style.transform="translateY(-2px)";}}
              onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.05)";e.currentTarget.style.transform="translateY(0)";}}
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

/* ══════════════════════════════════════════════════
   GAME OVER MODAL
══════════════════════════════════════════════════ */
function GameOverModal({msg,sub,onNew,onRematch}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,4,18,.9)",
      display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,
      backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)"}}>
      <div style={{...glass,padding:"clamp(24px,5vw,40px) clamp(28px,6vw,52px)",textAlign:"center",
        boxShadow:"0 0 70px rgba(50,110,255,.2),0 30px 80px rgba(0,0,0,.96)",
        maxWidth:"90vw",width:380}}>
        <div style={{fontSize:"clamp(1.2rem,4vw,1.8rem)",fontWeight:700,color:"#88c8ff",
          marginBottom:6,letterSpacing:"-.02em"}}>{msg}</div>
        <div style={{color:"rgba(130,185,255,.45)",fontSize:".85rem",marginBottom:28}}>{sub}</div>
        <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
          <Btn onClick={onRematch} primary>↺ Rematch</Btn>
          <Btn onClick={onNew}>⚙ New Setup</Btn>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   INFO PANELS (right side)
══════════════════════════════════════════════════ */
function InfoPanels(){
  return(
    <>
      <div style={{...glass,padding:"9px 12px"}}>
        <div style={{fontSize:"9px",color:"rgba(100,160,255,.28)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:8}}>Legend</div>
        {[["rgba(88,175,88,.75)","Selected / Legal"],["rgba(190,200,50,.55)","Last move"],["rgba(220,60,60,.8)","King in check"]].map(([col,lbl])=>(
          <div key={lbl} style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
            <div style={{width:13,height:13,borderRadius:3,background:col,flexShrink:0}}/>
            <span style={{fontSize:"10px",color:"rgba(135,190,255,.45)"}}>{lbl}</span>
          </div>
        ))}
      </div>
      <div style={{...glass,padding:"9px 12px"}}>
        <div style={{fontSize:"9px",color:"rgba(100,160,255,.28)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:7}}>Piece Values</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 8px"}}>
          {[["Q",9],["R",5],["B",3],["N",3],["P",1]].map(([t,v])=>(
            <div key={t} style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:17,height:17}}><PieceSVG type={t} color="white"/></div>
              <span style={{color:"rgba(120,170,240,.42)",fontSize:"10px",fontFamily:"monospace"}}>{t}={v}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{...glass,padding:"9px 12px",fontSize:"10px",color:"rgba(120,170,240,.38)",lineHeight:1.85}}>
        <div style={{fontSize:"9px",color:"rgba(100,160,255,.28)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:7}}>Special Moves</div>
        <div>🏰 <span style={{color:"rgba(170,210,255,.55)"}}>Castling</span> — King 2 squares</div>
        <div>⚡ <span style={{color:"rgba(170,210,255,.55)"}}>En Passant</span> — Pawn diagonal</div>
        <div>⭐ <span style={{color:"rgba(170,210,255,.55)"}}>Promotion</span> — Reach 8th rank</div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════
   MAIN CHESS GAME
══════════════════════════════════════════════════ */
const DEFAULT_SETUP={mode:"pvp",diff:"medium",side:"white",time:600};

export default function ChessGame(){
  /* ── Game state ── */
  const[board,setBoard]=useState(mkBoard);
  const[turn,setTurn]=useState("white");
  const[sel,setSel]=useState(null);
  const[legal,setLegal]=useState([]);
  const[ep,setEp]=useState(null);
  const[cast,setCast]=useState(IC);
  const[hist,setHist]=useState([]);
  const[cap,setCap]=useState({white:[],black:[]});
  const[status,setStatus]=useState("playing");
  const[promo,setPromo]=useState(null);
  const[lastMv,setLastMv]=useState(null);
  const[flipped,setFlipped]=useState(false);
  const[wTime,setWTime]=useState(600);
  const[bTime,setBTime]=useState(600);
  const[timerOn,setTimerOn]=useState(false);
  const[over,setOver]=useState(false);
  const[snaps,setSnaps]=useState([]);
  const[resigned,setResigned]=useState(null);

  /* ── Setup/AI state ── */
  const[showSetup,setShowSetup]=useState(true);
  const[settings,setSettings]=useState(DEFAULT_SETUP);
  const[aiThinking,setAiThinking]=useState(false);
  const[showMobileHistory,setShowMobileHistory]=useState(false);

  const ww=useWW();
  const isMobile=ww<640;
  const isTablet=ww>=640&&ww<960;
  const isDesktop=ww>=960;

  /* ── Timer ── */
  useEffect(()=>{
    if(!timerOn||over||settings.time===0)return;
    const id=setInterval(()=>{
      if(turn==="white")setWTime(t=>{if(t<=1){setOver(true);return 0;}return t-1;});
      else setBTime(t=>{if(t<=1){setOver(true);return 0;}return t-1;});
    },1000);
    return()=>clearInterval(id);
  },[timerOn,turn,over,settings.time]);

  /* ── AI trigger ── */
  useEffect(()=>{
    if(settings.mode!=="pvai")return;
    if(turn!==settings.aiColor)return;
    if(over||promo||showSetup)return;
    if(status==="checkmate"||status==="stalemate")return;
    setAiThinking(true);
    const delay=settings.diff==="easy"?300:settings.diff==="medium"?500:700;
    const t=setTimeout(()=>{
      const mv=getAIMove(board,settings.aiColor,ep,cast,settings.diff);
      if(mv)execMove(mv.from,mv.to,null,true);
      setAiThinking(false);
    },delay);
    return()=>{clearTimeout(t);setAiThinking(false);};
  },[turn,settings.mode,settings.aiColor,over,promo,showSetup,status]);

  /* ── execMove ── */
  const execMove=useCallback((from,to,promoType,isAI=false)=>{
    const[fr,fc]=from,[tr,tc]=to;
    const piece=board[fr][fc];if(!piece)return;
    if(piece.type==="P"&&(tr===0||tr===7)&&!promoType){setPromo({from,to});return;}
    setSnaps(s=>[...s,{board:board.map(r=>[...r]),turn,ep,cast:{...cast},
      cap:{white:[...cap.white],black:[...cap.black]},hist:[...hist],lastMv,wTime,bTime}]);
    const{board:nb,cap:captured}=applyMove(board,from,to,ep,promoType||null);
    const nc={...cast};
    if(piece.type==="K"){if(piece.color==="white"){nc.wK=false;nc.wQ=false;}else{nc.bK=false;nc.bQ=false;}}
    if(piece.type==="R"||captured?.type==="R"){
      if(fr===7&&fc===0)nc.wQ=false;if(fr===7&&fc===7)nc.wK=false;
      if(fr===0&&fc===0)nc.bQ=false;if(fr===0&&fc===7)nc.bK=false;
      if(captured){if(tr===7&&tc===0)nc.wQ=false;if(tr===7&&tc===7)nc.wK=false;
        if(tr===0&&tc===0)nc.bQ=false;if(tr===0&&tc===7)nc.bK=false;}
    }
    const nep=(piece.type==="P"&&Math.abs(tr-fr)===2)?[(fr+tr)/2,tc]:null;
    const ncap={white:[...cap.white],black:[...cap.black]};
    if(captured)ncap[captured.color].push(captured.type);
    let castSide=null;
    if(piece.type==="K"&&Math.abs(tc-fc)===2)castSide=tc===6?"K":"Q";
    const next=turn==="white"?"black":"white";
    const chk=inCheck(nb,next);
    const more=anyLegal(nb,next,nep,nc);
    let ns="playing";
    if(chk&&!more)ns="checkmate";
    else if(!chk&&!more)ns="stalemate";
    else if(chk)ns="check";
    const note=toSAN(piece,from,to,captured,ns==="check"||ns==="checkmate",ns==="checkmate",castSide,promoType);
    setBoard(nb);setTurn(next);setCast(nc);setEp(nep);
    setCap(ncap);setHist(h=>[...h,{notation:note,color:piece.color}]);
    setLastMv({from,to});setSel(null);setLegal([]);setStatus(ns);setPromo(null);
    if(ns==="checkmate"||ns==="stalemate")setOver(true);
    if(!timerOn&&settings.time>0)setTimerOn(true);
  },[board,turn,ep,cast,cap,hist,lastMv,wTime,bTime,timerOn,settings.time]);

  /* ── Click handler ── */
  const handleClick=useCallback((ri,ci)=>{
    if(over||promo||showSetup)return;
    if(settings.mode==="pvai"&&turn===settings.aiColor)return;
    const r=flipped?7-ri:ri,c=flipped?7-ci:ci;
    const piece=board[r][c];
    if(sel){
      const[sr,sc]=sel;
      if(legal.some(([lr,lc])=>lr===r&&lc===c)){execMove([sr,sc],[r,c]);return;}
      if(piece?.color===turn){setSel([r,c]);setLegal(legalMoves(board,r,c,ep,cast));return;}
      setSel(null);setLegal([]);
    }else{
      if(piece?.color===turn){
        setSel([r,c]);setLegal(legalMoves(board,r,c,ep,cast));
        if(!timerOn&&settings.time>0)setTimerOn(true);
      }
    }
  },[over,promo,showSetup,settings,turn,flipped,board,sel,legal,ep,cast,timerOn,execMove]);

  /* ── Undo ── */
  const undo=()=>{
    if(!snaps.length)return;
    const prev=snaps[snaps.length-1];
    setBoard(prev.board);setTurn(prev.turn);setEp(prev.ep);setCast(prev.cast);
    setCap(prev.cap);setHist(prev.hist);setLastMv(prev.lastMv);
    setWTime(prev.wTime);setBTime(prev.bTime);
    setSnaps(s=>s.slice(0,-1));setSel(null);setLegal([]);
    setStatus("playing");setOver(false);setPromo(null);setResigned(null);
  };

  /* ── New game ── */
  const startGame=(cfg)=>{
    const actualAiColor=cfg.mode==="pvai"
      ?(cfg.side==="random"?(Math.random()>.5?"black":"white"):(cfg.side==="white"?"black":"white"))
      :"black";
    const shouldFlip=cfg.mode==="pvai"&&(cfg.side==="black"||(cfg.side==="random"&&actualAiColor==="white"));
    const newSettings={...cfg,aiColor:actualAiColor};
    setSettings(newSettings);
    const t=cfg.time||0;
    setBoard(mkBoard());setTurn("white");setSel(null);setLegal([]);
    setEp(null);setCast(IC);setHist([]);setCap({white:[],black:[]});
    setStatus("playing");setPromo(null);setLastMv(null);
    setWTime(t||9999);setBTime(t||9999);setTimerOn(false);setOver(false);setSnaps([]);
    setFlipped(shouldFlip);setResigned(null);setShowSetup(false);
    setAiThinking(false);
  };

  const resign=()=>{
    if(over)return;
    setResigned(turn);setOver(true);
  };

  /* ── Derived values ── */
  const rows=flipped?[7,6,5,4,3,2,1,0]:[0,1,2,3,4,5,6,7];
  const cols=flipped?[7,6,5,4,3,2,1,0]:[0,1,2,3,4,5,6,7];
  const isSel=(r,c)=>sel&&sel[0]===r&&sel[1]===c;
  const isLeg=(r,c)=>legal.some(([a,b])=>a===r&&b===c);
  const isLast=(r,c)=>lastMv&&((lastMv.from[0]===r&&lastMv.from[1]===c)||(lastMv.to[0]===r&&lastMv.to[1]===c));
  const isChk=(r,c)=>board[r][c]?.type==="K"&&board[r][c]?.color===turn&&(status==="check"||status==="checkmate");

  const timedOut=(settings.time>0)&&(wTime<=0||bTime<=0);
  let goMsg="",goSub="";
  if(resigned){goMsg=`${resigned==="white"?"White":"Black"} resigned.`;goSub=`${resigned==="white"?"Black":"White"} wins!`;}
  else if(timedOut){goMsg=`${wTime<=0?"Black":"White"} wins on time!`;goSub="Clock ran out";}
  else if(status==="checkmate"){goMsg=`${turn==="white"?"Black":"White"} wins by Checkmate!`;goSub="The king has been cornered";}
  else if(status==="stalemate"){goMsg="Stalemate — Draw!";goSub="No legal moves available";}

  const statusColor=status==="check"?"#ff8060":status==="checkmate"?"#ff6060":status==="stalemate"?"#a0b8ff":"#80c8f0";
  const statusText=over&&resigned?`${resigned==="white"?"White":"Black"} resigned`:
    over&&timedOut?`${wTime<=0?"Black":"White"} wins on time`:
    status==="checkmate"?`${turn==="white"?"Black":"White"} wins!`:
    status==="stalemate"?"Stalemate — Draw":
    status==="check"?`${turn==="white"?"White":"Black"} in Check!`:
    aiThinking?"CPU is thinking...":
    `${turn==="white"?"White":"Black"} to move`;

  const blackIsAI=settings.mode==="pvai"&&settings.aiColor==="black";
  const whiteIsAI=settings.mode==="pvai"&&settings.aiColor==="white";
  const canUndo=snaps.length>0&&(settings.mode==="pvp"||
    (settings.mode==="pvai"&&snaps.length>=2&&turn!==settings.aiColor&&!aiThinking));

  /* ── Board size ── */
  const boardSize=isDesktop?"min(calc(100vh - 100px),560px)":
    isTablet?"min(75vw, calc(100vh - 220px))":
    "min(calc(100vw - 16px), calc(100vh - 280px), 480px)";

  /* ── Controls row ── */
  const Controls=(
    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
      <Btn onClick={()=>setShowSetup(true)} primary small>⚙ Setup</Btn>
      <Btn onClick={undo} disabled={!canUndo} small>⟵ Undo</Btn>
      <Btn onClick={()=>setFlipped(f=>!f)} small>⇅ Flip</Btn>
      {!over&&<Btn onClick={resign} danger small>⚑ Resign</Btn>}
    </div>
  );

  /* ── Status box ── */
  const StatusBox=(
    <div style={{...glass,padding:"7px 12px",flexShrink:0,
      borderColor:status==="check"||status==="checkmate"?"rgba(220,80,0,.5)":"rgba(100,160,255,.16)",
      background:status==="check"||status==="checkmate"?"rgba(180,50,0,.18)":"rgba(8,16,42,.68)",
      transition:"all .3s"}}>
      <div style={{fontSize:"9px",color:"rgba(100,160,255,.3)",letterSpacing:".1em",
        textTransform:"uppercase",marginBottom:3}}>Status</div>
      <div style={{fontSize:"12px",fontWeight:600,color:statusColor}}>{statusText}</div>
    </div>
  );

  /* ── Board element ── */
  const BoardEl=(
    <div style={{
      borderRadius:4,flexShrink:0,
      boxShadow:"0 0 0 2px #0c1d4a,0 0 0 4px rgba(60,120,255,.42),0 0 0 7px #060f28,0 0 40px rgba(40,100,255,.22)",
      overflow:"hidden",
      width:boardSize,height:boardSize,
    }}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",gridTemplateRows:"repeat(8,1fr)",
        width:"100%",height:"100%"}}>
        {rows.map((r,ri)=>cols.map((c,ci)=>(
          <Square key={`${r}-${c}`} piece={board[r][c]} light={(r+c)%2===0}
            selected={isSel(r,c)} isLegal={isLeg(r,c)} isLastMove={isLast(r,c)} isCheck={isChk(r,c)}
            onClick={()=>handleClick(ri,ci)}
            rank={ci===0?RANKS[r]:undefined} file={ri===7?FILES[c]:undefined}
          />
        )))}
      </div>
    </div>
  );

  /* ══════════════════ DESKTOP LAYOUT ══════════════════ */
  const DesktopLayout=(
    <div style={{flex:1,display:"grid",gridTemplateColumns:"minmax(180px,210px) 1fr minmax(180px,210px)",
      gap:12,minHeight:0,alignItems:"start"}}>
      {/* LEFT */}
      <div style={{display:"flex",flexDirection:"column",gap:9}}>
        <PlayerCard color="black" timer={bTime} capList={[...cap.black]}
          isActive={turn==="black"&&!over} timerOn={timerOn} isAI={blackIsAI}
          aiThinking={aiThinking&&turn==="black"}/>
        {StatusBox}
        {Controls}
        <div style={{...glass,padding:"8px 8px 4px",flex:1,display:"flex",flexDirection:"column",
          minHeight:0,maxHeight:"calc(100vh - 380px)",overflow:"hidden"}}>
          <div style={{fontSize:"9px",color:"rgba(100,160,255,.28)",letterSpacing:".1em",
            textTransform:"uppercase",marginBottom:5}}>Moves ({hist.length})</div>
          <MoveHistory hist={hist}/>
        </div>
      </div>
      {/* BOARD */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}>{BoardEl}</div>
      {/* RIGHT */}
      <div style={{display:"flex",flexDirection:"column",gap:9}}>
        <PlayerCard color="white" timer={wTime} capList={[...cap.white]}
          isActive={turn==="white"&&!over} timerOn={timerOn} isAI={whiteIsAI}
          aiThinking={aiThinking&&turn==="white"}/>
        <InfoPanels/>
      </div>
    </div>
  );

  /* ══════════════════ TABLET LAYOUT ══════════════════ */
  const TabletLayout=(
    <div style={{flex:1,display:"flex",flexDirection:"column",gap:10,minHeight:0}}>
      {/* Player row top */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,flexShrink:0}}>
        <PlayerCard color="black" timer={bTime} capList={[...cap.black]}
          isActive={turn==="black"&&!over} timerOn={timerOn} isAI={blackIsAI}
          aiThinking={aiThinking&&turn==="black"}/>
        <PlayerCard color="white" timer={wTime} capList={[...cap.white]}
          isActive={turn==="white"&&!over} timerOn={timerOn} isAI={whiteIsAI}
          aiThinking={aiThinking&&turn==="white"}/>
      </div>
      {/* Board centered */}
      <div style={{display:"flex",justifyContent:"center",flexShrink:0}}>{BoardEl}</div>
      {/* Bottom row */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {StatusBox}
          {Controls}
        </div>
        <div style={{...glass,padding:"8px",display:"flex",flexDirection:"column",
          maxHeight:160,overflow:"hidden"}}>
          <div style={{fontSize:"9px",color:"rgba(100,160,255,.28)",letterSpacing:".1em",
            textTransform:"uppercase",marginBottom:5}}>Moves ({hist.length})</div>
          <MoveHistory hist={hist}/>
        </div>
      </div>
    </div>
  );

  /* ══════════════════ MOBILE LAYOUT ══════════════════ */
  const MobileLayout=(
    <div style={{flex:1,display:"flex",flexDirection:"column",gap:8,minHeight:0}}>
      {/* Opponent */}
      <div style={{flexShrink:0}}>
        <PlayerCard color={flipped?"white":"black"}
          timer={flipped?wTime:bTime}
          capList={flipped?[...cap.white]:[...cap.black]}
          isActive={(flipped?"white":"black")===turn&&!over}
          timerOn={timerOn}
          isAI={flipped?whiteIsAI:blackIsAI}
          aiThinking={aiThinking&&(flipped?"white":"black")===turn}
          compact/>
      </div>
      {/* Board */}
      <div style={{display:"flex",justifyContent:"center",flexShrink:0}}>{BoardEl}</div>
      {/* Player */}
      <div style={{flexShrink:0}}>
        <PlayerCard color={flipped?"black":"white"}
          timer={flipped?bTime:wTime}
          capList={flipped?[...cap.black]:[...cap.white]}
          isActive={(flipped?"black":"white")===turn&&!over}
          timerOn={timerOn}
          isAI={flipped?blackIsAI:whiteIsAI}
          aiThinking={aiThinking&&(flipped?"black":"white")===turn}
          compact/>
      </div>
      {/* Status + Controls */}
      <div style={{flexShrink:0,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{...glass,padding:"5px 10px",flex:1,minWidth:120}}>
          <div style={{fontSize:"10px",fontWeight:600,color:statusColor}}>{statusText}</div>
        </div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          <Btn onClick={()=>setShowSetup(true)} primary small>⚙</Btn>
          <Btn onClick={undo} disabled={!canUndo} small>⟵</Btn>
          <Btn onClick={()=>setFlipped(f=>!f)} small>⇅</Btn>
          {!over&&<Btn onClick={resign} danger small>⚑</Btn>}
          <Btn onClick={()=>setShowMobileHistory(h=>!h)} small>{showMobileHistory?"▲":"📋"}</Btn>
        </div>
      </div>
      {/* Mobile history panel */}
      {showMobileHistory&&(
        <div style={{...glass,padding:"8px",display:"flex",flexDirection:"column",
          height:140,overflow:"hidden",flexShrink:0}}>
          <div style={{fontSize:"9px",color:"rgba(100,160,255,.28)",letterSpacing:".1em",
            textTransform:"uppercase",marginBottom:5}}>Moves ({hist.length})</div>
          <MoveHistory hist={hist}/>
        </div>
      )}
    </div>
  );

  return(
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html,body,#root{width:100%;height:100%;overflow:hidden;}
        body{font-family:Georgia,serif;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:rgba(80,140,255,.3);border-radius:2px;}
        ::-webkit-scrollbar-track{background:transparent;}
        @keyframes s2{0%,100%{opacity:.5}50%{opacity:.88}}
      `}</style>

      <CrystalBG/>

      <div style={{position:"relative",zIndex:1,width:"100%",height:"100%",
        display:"flex",flexDirection:"column",padding:isMobile?"8px":"10px 14px",gap:isMobile?6:10,
        overflow:isMobile?"auto":"hidden"}}>

        {/* TOP BAR */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          paddingBottom:isMobile?6:8,borderBottom:"1px solid rgba(80,140,255,.15)",
          flexShrink:0,gap:8}}>
          <div style={{display:"flex",alignItems:"baseline",gap:8}}>
            <span style={{fontSize:"clamp(1rem,2.5vw,1.4rem)",fontWeight:700,color:"#70b4ff",
              letterSpacing:"-.02em",textShadow:"0 0 24px rgba(80,160,255,.45)"}}>♟ Hanan's Chess Arena</span>
            {!isMobile&&<span style={{color:"rgba(100,160,255,.3)",fontSize:"9px",letterSpacing:".1em"}}>
              {settings.mode==="pvai"?`CPU · ${settings.diff}`:"vs Human"}
            </span>}
          </div>
          {/* Clock selector (desktop/tablet) */}
          {!isMobile&&(
            <div style={{display:"flex",gap:5,alignItems:"center"}}>
              <span style={{color:"rgba(100,160,255,.35)",fontSize:"10px"}}>Clock:</span>
              {[[60,"1m"],[300,"5m"],[600,"10m"],[900,"15m"],[0,"∞"]].map(([s,lbl])=>(
                <button key={s} onClick={()=>{
                  const t=s||9999;setWTime(t);setBTime(t);
                  setSettings(prev=>({...prev,time:s}));
                }} style={{
                  background:settings.time===s?"rgba(55,115,255,.32)":"rgba(255,255,255,.04)",
                  border:`1px solid ${settings.time===s?"rgba(80,155,255,.7)":"rgba(80,130,220,.2)"}`,
                  color:settings.time===s?"#90d0ff":"rgba(120,175,240,.45)",
                  borderRadius:6,padding:"3px 8px",fontSize:"10px",cursor:"pointer",
                  fontWeight:600,fontFamily:"Georgia,serif",transition:"all .15s",
                }}>{lbl}</button>
              ))}
            </div>
          )}
        </div>

        {/* MAIN CONTENT */}
        {isDesktop?DesktopLayout:isTablet?TabletLayout:MobileLayout}
      </div>

      {/* MODALS */}
      {promo&&<PromotionModal color={turn} onSelect={t=>execMove(promo.from,promo.to,t)}/>}
      {over&&goMsg&&<GameOverModal msg={goMsg} sub={goSub}
        onRematch={()=>startGame(settings)}
        onNew={()=>setShowSetup(true)}/>}
      {showSetup&&<SetupModal onStart={startGame} initialSettings={settings}/>}
    </>
  );
}
