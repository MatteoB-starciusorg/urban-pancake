# 🚀 Rocket Math Automation Extension

A Chrome Extension (Manifest V3) that automates solving math problems on [play.rocketmath.com](https://play.rocketmath.com) by reading game data directly from the DOM.

## Supported Problem Types

- ✅ **Equivalent Fractions** - Simplifies fractions to lowest terms
- ✅ **Factors & Primes** - Finds factor pairs for numbers 1-100

## Features

- **DOM-Based Solving**: Reads problems directly from the page elements (no Vision API required)
- **Modular Architecture**: Separate solver modules for each problem type
- **Fraction Logic**: Uses `fraction.min.js` for robust arithmetic and automatic fraction simplification
- **Pre-computed Factors**: Uses `factors_100.json` for instant factor lookups
- **Keyboard Simulation**: Simulates mouse events on the game's on-screen keyboard to input answers
- **High Performance**: Checks every 700ms for rapid response times
- **Race Mode**: Optional delay before typing with manual Enter confirmation
- **Auto-Resume**: Remembers your bot state across page refreshes

## Installation

1.  **Download the Extension**: Ensure you have all the project files in a folder.
2.  **Open Extensions Page**: Navigate to `chrome://extensions/` or your extensions page in your browser.
3.  **Enable Developer Mode**: Toggle the "Developer mode" switch in the top-right corner (or were it is in your browser).
4.  **Load Unpacked**: Click the **Load unpacked** button.
5.  **Select Directory**: Choose the folder containing this project: `Rocketmath automation thing`
6.  **Pin Extension**: Click the puzzle icon in Chrome and pin "Rocket Math Bot" for easy access.

## Usage

### Running the Bot

1.  Navigate to [https://play.rocketmath.com](https://play.rocketmath.com)
2.  Start a level (Equivalent Fractions or Factors & Primes)
3.  Click the extension icon in your toolbar
4.  **Select the Mode**: Choose "Equivalent Fractions" or "Factors & Primes"
5.  (Optional) Enable **Race Mode** for a more human-like delay
6.  Click **Start Bot**
7.  The bot will automatically solve problems for the selected mode

### Stopping the Bot

- Open the popup again and click **Stop Bot**.

## How It Works

1.  **DOM Inspection**: The extension monitors the page for the `playing-screen` element
2.  **Problem Detection**: Checks for problem type containers (`.problem-details-equivalent-fractions` or `.problem-details-factors-primes`)
3.  **Data Extraction**: Reads problem data from the appropriate DOM elements
4.  **Solution Calculation**:
    - **Equivalent Fractions**: Uses `Fraction.js` library to simplify fractions
    - **Factors & Primes**: Looks up factor pairs from pre-computed `factors_100.json`
5.  **Keypad Simulation**: Triggers `mousedown`, `mouseup`, and `click` events on the on-screen buttons
6.  **State Management**: Uses `chrome.storage.local` to track bot state across page reloads

## Technical Details

### File Structure

```
rocketmath-automation/
├── manifest.json                              # Extension configuration (Manifest V3)
├── popup.html                                 # Popup UI
├── popup.js                                   # Popup controller logic
├── styles.css                                 # Modern CSS styling
├── content.js                                 # Main orchestrator script
├── background.js                              # Service worker for state handling
├── fraction.min.js                            # Fraction arithmetic library
├── factors_100.json                           # Pre-computed factors for 1-100
├── solvers/
│   ├── equivalent-fractions/
│   │   └── solver.js                          # Equivalent fractions solver
│   └── factors-primes/
│       └── solver.js                          # Factors & primes solver
├── icon16.png, icon48.png, icon128.png        # Extension icons
└── README.md                                  # This file
```

### Permissions

-   `activeTab`: Access to the current tab when extension is clicked.
-   `storage`: Store bot state.
-   `host_permissions`: Access to `play.rocketmath.com`.

## Troubleshooting

-   **Bot Not Starting**: Ensure you are on an active "Equivalent Fractions" or "Factors & Primes" level
-   **Wrong Answers (Fractions)**: The bot simplifies fractions to their lowest terms (e.g., 2/4 becomes 1/2)
-   **Wrong Answers (Factors)**: The bot uses pre-computed data for numbers 1-100. Numbers outside this range are not supported
-   **Button Not Found**: If the game UI changes, the selectors in the solver modules might need updating

## Safety & Disclaimer

⚠️ **Use at your own risk**: This bot automates gameplay. Extensive use of automation may be detectable by the site and could potentially violate their terms of service.

## License

Apache License 2.0 - (look at the LICENSE file for more info)

## Credits

-   Built with Chrome Extension Manifest V3
-   Math logic powered by [Fraction.js](https://github.com/infusion/Fraction.js/), which is made by https://raw.org/
-   Iconography generated for Rocket Math branding.


