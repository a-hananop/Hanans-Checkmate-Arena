import React from "react";
import { renderToString } from "react-dom/server";
import ChessGame from "./ChessGame.jsx";
console.log(renderToString(React.createElement(ChessGame)).slice(0, 500));
