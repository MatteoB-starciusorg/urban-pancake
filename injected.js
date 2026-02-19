// injected.js - Runs in the MAIN world context

(function () {
    console.log('[RocketBot] Injected script loaded');
    let timerFrozen = false;
    let originalDateNow = Date.now;
    let originalPerfNow = performance.now.bind(performance);

    // Captured values when frozen
    let freezeTimeDate = 0;
    let freezeTimePerf = 0;

    window.addEventListener('message', (event) => {
        if (event.data.type === 'RMSE_FREEZE_TIMER') {
            if (event.data.enabled) {
                if (!timerFrozen) {
                    timerFrozen = true;
                    freezeTimeDate = originalDateNow();
                    freezeTimePerf = originalPerfNow();
                    console.log('[RocketBot] Timer Frozen ❄️ at', freezeTimeDate);
                }
            } else {
                if (timerFrozen) {
                    timerFrozen = false;
                    console.log('[RocketBot] Timer Unfrozen ☀️');
                }
            }
        }
    });

    // Monkey-patch Date.now
    Date.now = function () {
        if (timerFrozen) return freezeTimeDate;
        return originalDateNow();
    };

    // Monkey-patch performance.now
    performance.now = function () {
        if (timerFrozen) return freezeTimePerf;
        return originalPerfNow();
    };

    // Also try to help with animation skipping if CSS fails
    // We can't easily "skip" JS animations without breaking them, 
    // but we can try to speed them up? 
    // For now, let's stick to the CSS approach for animations, 
    // but ensure this script is actually running.
})();
