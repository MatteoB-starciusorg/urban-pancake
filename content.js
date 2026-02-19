// Content script for Rocket Math automation
// Main orchestrator that coordinates different problem solvers

let isRunning = false;
let raceMode = false;
let currentMode = null; // 'equivalent-fractions' or 'factors-primes'
let automationTimer = null;
let processing = false;

// ── messaging ─────────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'start') {
        isRunning = true;
        raceMode = !!request.raceMode;
        currentMode = request.mode;

        const modeLabel = currentMode === 'equivalent-fractions' ? 'Fractions'
            : currentMode === 'factors-primes' ? 'Factors' : 'Unknown';

        log(`Bot started: ${modeLabel} Mode` + (raceMode ? ' (Race Mode 🏁)' : ''));
        startAutomation();
        sendResponse({ success: true });
    } else if (request.action === 'stop') {
        isRunning = false;
        stopAutomation();
        log('Bot stopped');
        sendResponse({ success: true });
    } else if (request.action === 'toggleSkipAnim') {
        toggleAnimationSkipper(request.enabled);
    } else if (request.action === 'toggleFreezeTimer') {
        toggleTimerFreeze(request.enabled);
    }
    return true;
});

function log(msg) {
    console.log(`[RocketBot] ${msg}`);
    try { chrome.runtime.sendMessage({ action: 'log', message: msg }); } catch (_) { }
}

// ── automation loop ───────────────────────────────────────
function startAutomation() {
    stopAutomation();
    runCycle();
    automationTimer = setInterval(() => {
        if (isRunning && !processing) runCycle();
    }, 700); // Polling every 0.7s
}

function stopAutomation() {
    if (automationTimer) { clearInterval(automationTimer); automationTimer = null; }
}

// ── single cycle ──────────────────────────────────────────
async function runCycle() {
    if (processing) return;
    processing = true;

    try {
        const playingScreen = document.querySelector('playing-screen');
        if (!playingScreen || playingScreen.classList.contains('hidden') || playingScreen.style.display === 'none') {
            processing = false;
            return;
        }

        // Only run the solver corresponding to the selected mode
        if (currentMode === 'equivalent-fractions') {
            if (await solveEquivalentFractions(raceMode)) {
                processing = false;
                return;
            }
        } else if (currentMode === 'factors-primes') {
            if (await solveFactorsPrimes(raceMode)) {
                processing = false;
                return;
            }
        }

        // No matching problem found for current mode
        processing = false;

    } catch (err) {
        log('❌ ' + err.message);
        processing = false;
    }
}

// ── input simulation ──────────────────────────────────────
function clickButton(selector) {
    return new Promise((resolve) => {
        const btn = document.querySelector(selector);
        if (btn) {
            btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
            btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        } else {
            console.warn(`[RocketBot] Button not found: ${selector}`);
        }
        setTimeout(resolve, 30);
    });
}

/**
 * Simulates a physical keyboard key press
 * @param {string} key - The key to press (e.g., '1', 'Enter', 'Backspace')
 */
function simulateKeyPress(key) {
    const eventParams = {
        key: key,
        code: isNaN(key) ? key : `Digit${key}`,
        keyCode: isNaN(key) ? (key === 'Enter' ? 13 : 8) : 48 + parseInt(key),
        which: isNaN(key) ? (key === 'Enter' ? 13 : 8) : 48 + parseInt(key),
        bubbles: true,
        cancelable: true
    };

    const target = document.activeElement || document.body;
    target.dispatchEvent(new KeyboardEvent('keydown', eventParams));
    target.dispatchEvent(new KeyboardEvent('keypress', eventParams));
    setTimeout(() => {
        target.dispatchEvent(new KeyboardEvent('keyup', eventParams));
    }, 20);
}

function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// ── auto-resume ───────────────────────────────────────────
chrome.storage.local.get(['isRunning', 'raceMode', 'botMode', 'skipAnim', 'freezeTimer'], (r) => {
    if (r.isRunning && r.botMode) {
        isRunning = true;
        raceMode = !!r.raceMode;
        currentMode = r.botMode;

        const modeLabel = currentMode === 'equivalent-fractions' ? 'Fractions'
            : currentMode === 'factors-primes' ? 'Factors' : 'Unknown';

        log(`🔄 Resuming: ${modeLabel} Mode` + (raceMode ? ' (Race Mode 🏁)' : ''));
        startAutomation();
    }
    // Apply persistent cheats
    if (r.skipAnim) toggleAnimationSkipper(true);
    if (r.freezeTimer) toggleTimerFreeze(true);
});

// ── Animation Skipper ──────────────────────────────────────
function toggleAnimationSkipper(enabled) {
    const styleId = 'rmse-skip-anim';
    let style = document.getElementById(styleId);

    if (enabled) {
        if (!style) {
            style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                * {
                    transition: none !important;
                    animation: none !important;
                }
            `;
            document.head.appendChild(style);
            log('⚡ Animation Skipper ENABLED');
        }
    } else {
        if (style) {
            style.remove();
            log('⚡ Animation Skipper DISABLED');
        }
    }
}

// ── Timer Freeze ───────────────────────────────────────────
function toggleTimerFreeze(enabled) {
    // We can't easily remove the script once injected, but we can toggle functionality via window property
    // Check if script is already injected
    if (!document.getElementById('rmse-timer-freeze')) {
        injectTimerFreezeScript();
    }

    // Send event to page context
    window.postMessage({ type: 'RMSE_FREEZE_TIMER', enabled: enabled }, '*');
    log(enabled ? '❄️ Timer Freeze ENABLED' : '❄️ Timer Freeze DISABLED');
}

function injectTimerFreezeScript() {
    // Prevent multiple injections
    if (document.getElementById('rmse-timer-freeze')) return;

    const script = document.createElement('script');
    script.id = 'rmse-timer-freeze';
    script.src = chrome.runtime.getURL('injected.js');
    script.onload = function () {
        this.remove(); // Clean up the tag, the code remains in memory
    };
    (document.head || document.documentElement).appendChild(script);
    log('💉 Injected freeze script');
}

log('🎮 Content script loaded (Fraction.js v' + (typeof Fraction !== 'undefined' ? 'OK' : 'MISSING') + ')');
