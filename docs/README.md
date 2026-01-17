<div align="center">
    
## P.R.E.P. Trading Journal

</div>

A Progressive Web App (PWA) for grading trades using the PREPARE methodology, featuring AI-powered analysis with web search capabilities.

**Architecture:** 100% client-side static web application. No backend server, uses localStorage for data persistence and public CORS proxies for API access.

## Features

- **Grade Tab**: Pre-trade psychology check, pattern recognition, and risk assessment
- **Trade Tracker**: Plan builder with entry price, stop loss (5-10%), and profit target (15-30%) sliders
- **Trade History**: Search and filter saved trades with detailed trade plan display
- **AI Assistant**: Integration with GitHub Models API for trade analysis
  - **Web Search Tool**: AI-powered web search via DuckDuckGo (free public API) with custom DOM-based scraping
  - **Static Backend Server**: Client-side OAuth authentication handler for GitHub Copilot models
  - **CORS Widget**: Public CORS proxy fallback system (corsproxy.io, cors.sh, codetabs)
  - **Chat History**: Persistent conversation history in localStorage
  - **Syntax Highlighting**: Code blocks with language detection and copy buttons

## Project Structure

```
SFti.Trade_Grade/
├── LICENSE
├── .github
│   └── FUNDING.yml
├── docs
│   ├── AI_ASSISTANT.md
│   ├── API_REFERENCE.md
│   ├── INSTALLATION.md
│   ├── MODULES.md
│   ├── PREPARE_METHODOLOGY.md
│   ├── README.md
│   ├── TECHNICAL.md
│   └── USER_GUIDE.md
├── index.html
└── system
    ├── auth
    │   └── callback
    │       └── index.html
    ├── cs.+
    │   ├── base.css
    │   ├── chat.css
    │   ├── components.css
    │   ├── grading.css
    │   ├── menu.css
    │   ├── modal.css
    │   ├── models.css
    │   ├── responsive.css
    │   ├── sliders.css
    │   ├── styles.css.backup
    │   └── toast.css
    ├── img
    │   ├── icon-192.png
    │   └── icon-512.png
    └── js.on
        ├── ai.js
        ├── app.js.backup
        ├── auth.js
        ├── chat.js
        ├── config.js
        ├── grading.js
        ├── image-processor.js
        ├── init.js
        ├── manifest.json
        ├── menu.js
        ├── modal.js
        ├── models.js
        ├── screenshot.js
        ├── sliders.js
        ├── sw.js
        ├── toast.js
        ├── utils.js
        └── web-search.js

8 directories, 43 files
```

## Installation

This app can be installed as a PWA on mobile devices and desktop browsers. Visit the deployed site and follow your browser's "Add to Home Screen" or "Install" prompt.

## Usage

1. **Grade a Stock**: Enter ticker, adjust PREPARE sliders, add screenshot
2. **Build Trade Plan**: Set entry price, stop loss, and profit target
3. **Save & Review**: View trade history with search and filter capabilities

## Development

The app is a single-page application built with vanilla HTML, CSS, and JavaScript. No build process required - just serve the files from a web server.

---

<div align="center">
  <a href="https://github.com/sponsors/statikfintechllc">
    <img src="https://raw.githubusercontent.com/statikfintechllc/statikfintechllc/master/badges/L.W.badge.svg" alt="Like my work?" />
  </a>
</div>
<div align="center">
<a href="https://github.com/sponsors/statikfintechllc">
  <img src="https://raw.githubusercontent.com/statikfintechllc/statikfintechllc/master/badges/git.sponsor.svg">
</a><br>
<a href="https://ko-fi.com/statikfintech_llc">
  <img src="https://raw.githubusercontent.com/statikfintechllc/statikfintechllc/master/badges/kofi.sponsor.svg">
</a><br>
<a href="https://patreon.com/StatikFinTech_LLC">
  <img src="https://raw.githubusercontent.com/statikfintechllc/statikfintechllc/master/badges/patreon.sponsor.svg">
</a><br>
<a href="https://cash.app/$statikmoney8">
  <img src="https://raw.githubusercontent.com/statikfintechllc/statikfintechllc/master/badges/cashapp.sponsor.svg">
</a><br>
<a href="https://paypal.me/statikmoney8">
  <img src="https://raw.githubusercontent.com/statikfintechllc/statikfintechllc/master/badges/paypal.sponsor.svg">
</a><br>
<a href="https://www.blockchain.com/explorer/addresses/btc/bc1qarsr966ulmcs3mlcvae7p63v4j2y2vqrw74jl8">
  <img src="https://raw.githubusercontent.com/statikfintechllc/statikfintechllc/master/badges/bitcoin.sponsor.svg">
</a><br>
<a href="https://etherscan.io/address/0xC2db50A0fc6c95f36Af7171D8C41F6998184103F">
  <img src="https://raw.githubusercontent.com/statikfintechllc/statikfintechllc/master/badges/ethereum.sponsor.svg">
</a><br>
<a href="https://app.chime.com/link/qr?u=StatikSmokTM">
  <img src="https://raw.githubusercontent.com/statikfintechllc/statikfintechllc/master/badges/chime.sponsor.svg">
</a>
</div>
<div align="center">

  <br/> [© 2025 StatikFinTech, LLC](https://www.github.com/statikfintechllc/SFTi.Trade_Grade/blob/master/LICENSE)

  <a href="https://github.com/statikfintechllc">
    <img src="https://img.shields.io/badge/-000000?logo=github&logoColor=white&style=flat-square" alt="GitHub">
  </a>
  <a href="https://www.linkedin.com/in/daniel-morris-780804368">
    <img src="https://img.shields.io/badge/In-e11d48?logo=linkedin&logoColor=white&style=flat-square" alt="LinkedIn">
  </a>
  <a href="mailto:ascend.gremlin@gmail.com">
    <img src="https://img.shields.io/badge/-D14836?logo=gmail&logoColor=white&style=flat-square" alt="Email">
  </a>
  <a href="https://www.youtube.com/@Gremlins_Forge">
    <img src="https://img.shields.io/badge/-FF0000?logo=youtube&logoColor=white&style=flat-square" alt="YouTube">
  </a>
  <a href="https://x.com/GremlinsForge">
    <img src="https://img.shields.io/badge/-000000?logo=x&logoColor=white&style=flat-square" alt="X">
  </a>
  <a href="https://medium.com/@ascend.gremlin">
    <img src="https://img.shields.io/badge/-000000?logo=medium&logoColor=white&style=flat-square" alt="Medium">
  </a>
</div>

<!--
<div align="center">
  <img src="https://komarev.com/ghpvc/?username=statikfintechllc&color=8b0000&style=flat-square" alt="Profile Views">
</div>
-->
