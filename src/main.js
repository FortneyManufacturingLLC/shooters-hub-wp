"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var client_1 = require("react-dom/client");
var MatchFinderPage_1 = require("../../web-app/src/components/MatchFinderPage");
require("../../web-app/src/index.css");
client_1.default.createRoot(document.getElementById('shooters-hub-match-finder')).render(<react_1.default.StrictMode>
    <MatchFinderPage_1.default />
  </react_1.default.StrictMode>);
