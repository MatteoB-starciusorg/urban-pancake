// Vanilla JS popup controller
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggleBtn');
  const statusBadge = document.getElementById('statusBadge');
  const lastAnswerSec = document.getElementById('lastAnswerSection');
  const lastAnswerEl = document.getElementById('lastAnswer');
  const errorSection = document.getElementById('errorSection');
  const errorMessage = document.getElementById('errorMessage');
  const logArea = document.getElementById('logArea');
  const raceModeToggle = document.getElementById('raceModeToggle');
  const enterPrompt = document.getElementById('enterPrompt');
  const modeRadios = document.querySelectorAll('input[name="botMode"]');
  const skipBreakBtn = document.getElementById('skipBreakBtn');
  const skipAnimToggle = document.getElementById('skipAnimToggle');
  const freezeTimerToggle = document.getElementById('freezeTimerToggle');

  let isRunning = false;
  let selectedMode = null;

  function setRunningUI(running) {
    isRunning = running;
    if (running) {
      statusBadge.textContent = 'Running';
      statusBadge.className = 'status-badge status-running';
      toggleBtn.textContent = 'Stop Bot';
      toggleBtn.className = 'toggle-btn btn-stop';
      toggleBtn.disabled = false; // Always enable stop button
      // Disable mode changes while running
      modeRadios.forEach(r => r.disabled = true);
    } else {
      statusBadge.textContent = 'Stopped';
      statusBadge.className = 'status-badge status-stopped';
      toggleBtn.textContent = 'Start Bot';
      toggleBtn.className = 'toggle-btn btn-start';
      enterPrompt.style.display = 'none';
      // Enable mode changes when stopped
      modeRadios.forEach(r => r.disabled = false);

      // Update start button state based on selection
      toggleBtn.disabled = !selectedMode;
    }
  }

  function addLog(msg) {
    const p = document.createElement('p');
    p.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logArea.prepend(p);
    while (logArea.children.length > 30) logArea.lastChild.remove();
  }

  // Handle mode selection
  modeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.checked) {
        selectedMode = e.target.value;
        if (!isRunning) toggleBtn.disabled = false;

        // Save mode only if running, otherwise we want explicit selection each time
        // Actually, user said "make non the defauld, when the user opens the pop up, it askes"
        // But also "and keeps going untill the user stops the bot"
        // So we will NOT save it to storage for persistence across popup opens unless running
      }
    });
  });

  // Load saved state
  chrome.storage.local.get(['isRunning', 'raceMode', 'botMode', 'skipAnim', 'freezeTimer'], (result) => {
    if (result.raceMode) raceModeToggle.checked = true;
    if (result.skipAnim) skipAnimToggle.checked = true;
    if (result.freezeTimer) freezeTimerToggle.checked = true;

    // Only restore mode if bot matches running state
    if (result.isRunning && result.botMode) {
      selectedMode = result.botMode;
      const radio = document.querySelector(`input[value="${selectedMode}"]`);
      if (radio) radio.checked = true;
      setRunningUI(true);
    } else {
      // If not running, ensure no mode is selected (or at least don't check boxes)
      // and disable start button
      setRunningUI(false);
    }
  });

  // Persist race mode toggle
  raceModeToggle.addEventListener('change', () => {
    chrome.storage.local.set({ raceMode: raceModeToggle.checked });
    addLog(raceModeToggle.checked ? '🏁 Race Mode ON' : '🏁 Race Mode OFF');
  });

  // Skip Animation Toggle
  skipAnimToggle.addEventListener('change', () => {
    const enabled = skipAnimToggle.checked;
    chrome.storage.local.set({ skipAnim: enabled });
    addLog(enabled ? '⚡ Animation Skipper ON' : '⚡ Animation Skipper OFF');
    sendMessageToActiveTab({ action: 'toggleSkipAnim', enabled });
  });

  // Freeze Timer Toggle
  freezeTimerToggle.addEventListener('change', () => {
    const enabled = freezeTimerToggle.checked;
    chrome.storage.local.set({ freezeTimer: enabled });
    addLog(enabled ? '❄️ Timer Freeze ON' : '❄️ Timer Freeze OFF');
    sendMessageToActiveTab({ action: 'toggleFreezeTimer', enabled });
  });

  function sendMessageToActiveTab(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, message);
    });
  }

  // Toggle bot
  toggleBtn.addEventListener('click', () => {
    if (!selectedMode && !isRunning) return; // Should be disabled, but extra safety

    errorSection.style.display = 'none';
    const newState = !isRunning;

    // Save state including mode
    const stateToSave = { isRunning: newState };
    if (newState) {
      stateToSave.botMode = selectedMode;
    } else {
      // When stopping, we keep the UI selection but maybe clear from storage
      // so next time it opens fresh?
      // User said "make non the defauld... keeps going untill the user stops the bot"
      // So when stopping, we remove botMode from storage so next popup open is fresh
      chrome.storage.local.remove('botMode');
    }

    chrome.storage.local.set(stateToSave);
    setRunningUI(newState);

    addLog(newState ? 'Starting bot...' : 'Stopping bot...');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.tabs.sendMessage(
        tabs[0].id,
        {
          action: newState ? 'start' : 'stop',
          raceMode: raceModeToggle.checked,
          mode: selectedMode
        },
        (response) => {
          if (chrome.runtime.lastError) {
            addLog('Error: ' + chrome.runtime.lastError.message);
            errorSection.style.display = '';
            errorMessage.textContent =
              'Could not reach content script. Check page.';
            setRunningUI(false);
            chrome.storage.local.set({ isRunning: false });
          } else {
            addLog(newState ? 'Bot started ✅' : 'Bot stopped 🛑');
          }
        }
      );
    });
  });

  // Listen for updates from content script
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'updateAnswer') {
      lastAnswerSec.style.display = '';
      lastAnswerEl.textContent = msg.answer;
      addLog('Answer: ' + msg.answer);
    } else if (msg.action === 'pressEnter') {
      enterPrompt.style.display = '';
      addLog('🏁 Answer typed — press ENTER!');
    } else if (msg.action === 'enterDone') {
      enterPrompt.style.display = 'none';
    } else if (msg.action === 'error') {
      errorSection.style.display = '';
      errorMessage.textContent = msg.message;
      addLog('Error: ' + msg.message);
    } else if (msg.action === 'log') {
      addLog(msg.message);
    }
  });

  // Skip Break button
  skipBreakBtn.addEventListener('click', () => {
    addLog('⚡ Attempting to skip break...');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          // Clear break timer from localStorage
          localStorage.removeItem('breakEndTime');
          localStorage.removeItem('breakStartTime');

          // Try to clear any active timers
          for (let i = 1; i < 99999; i++) {
            window.clearInterval(i);
            window.clearTimeout(i);
          }

          // Reload the page
          location.reload();
        }
      }, () => {
        if (chrome.runtime.lastError) {
          addLog('❌ Error: ' + chrome.runtime.lastError.message);
          errorSection.style.display = '';
          errorMessage.textContent = 'Could not skip break. Make sure you are on play.rocketmath.com';
        } else {
          addLog('✅ Break skipped! Page reloading...');
        }
      });
    });
  });
  // --- GOD MODE LOGIC ---
  const instantPhaseBtn = document.getElementById('instantPhaseBtn');
  const instantRaceBtn = document.getElementById('instantRaceBtn');
  const stealthModeBtn = document.getElementById('stealthModeBtn');
  const godModeUsesLeft = document.getElementById('godModeUsesLeft');

  let godModeUses = 0;
  const MAX_GOD_MODE_USES = 5;

  // Load usage count
  chrome.storage.local.get(['godModeUses', 'stealthMode'], (result) => {
    godModeUses = result.godModeUses || 0;
    updateGodModeUI();

    if (result.stealthMode) {
      stealthModeBtn.textContent = '🥷 Stealth Mode: ON';
      stealthModeBtn.style.background = '#10b981';
    }
  });

  function updateGodModeUI() {
    const remaining = MAX_GOD_MODE_USES - godModeUses;
    godModeUsesLeft.textContent = remaining;

    if (remaining <= 0) {
      instantPhaseBtn.disabled = true;
      instantRaceBtn.disabled = true;
      instantPhaseBtn.title = "Daily limit reached";
      instantRaceBtn.title = "Daily limit reached";
    }
  }

  function incrementGodModeUse() {
    godModeUses++;
    chrome.storage.local.set({ godModeUses: godModeUses });
    updateGodModeUI();
  }

  // 1. Instant Phase Complete
  instantPhaseBtn.addEventListener('click', () => {
    if (godModeUses >= MAX_GOD_MODE_USES) return;

    if (!confirm('⚠️ WARNING: This will instantly complete the current phase.\n\nUse this sparingly to avoid detection.\n\nContinue?')) return;

    addLog('⏩ Initiating Instant Phase Complete...');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        world: 'MAIN', // IMPORTANT: Run in main world context
        func: async () => {
          try {
            console.log("God Mode: Starting Instant Phase Complete...");
            const studentData = JSON.parse(sessionStorage.getItem('student'));
            if (!studentData) throw new Error('Student data missing from sessionStorage! Are you logged in?');

            console.log("God Mode: Found student ID", studentData.id);

            // Call save-progress API
            const response = await fetch('https://admin.rocketmath.com/api/save-progress', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                student_id: studentData.id,
                set_id: studentData.set_id,
                phase_id: studentData.phase_id,
                start_overs: studentData.start_overs,
                learning_track_id: studentData.learning_track_id,
                problems_answered: 40, // Simulate full phase
                is_webapp: true
              })
            });

            const data = await response.json();
            console.log("God Mode: API Response", data);

            if (data.error) throw new Error('API Error: ' + JSON.stringify(data.error));

            // Reload to reflect changes
            location.reload();
            return 'SUCCESS';
          } catch (e) {
            console.error("God Mode Error:", e);
            return 'ERROR: ' + e.message;
          }
        }
      }, (results) => {
        if (results && results[0] && results[0].result === 'SUCCESS') {
          addLog('✅ Phase Completed!');
          incrementGodModeUse();
        } else {
          const err = results?.[0]?.result || 'Unknown error (check console)';
          addLog('❌ Failed: ' + err);

          if (document.getElementById('errorMessage')) {
            document.getElementById('errorMessage').textContent = err;
            document.getElementById('errorSection').style.display = '';
          }
        }
      });
    });
  });

  // 2. Instant Race Win (Randomized 30-42)
  instantRaceBtn.addEventListener('click', () => {
    if (godModeUses >= MAX_GOD_MODE_USES) return;

    // Random score between 30 and 42
    const score = Math.floor(Math.random() * (42 - 30 + 1)) + 30;

    if (!confirm(`🏆 WARNING: This will submit a Race Score of ${score}/40.\n\nUse this sparingly.\n\nContinue?`)) return;

    addLog(`🏆 Submitting Race Score: ${score}...`);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        world: 'MAIN', // IMPORTANT: Run in main world
        func: async (simulatedScore) => {
          try {
            const studentData = JSON.parse(sessionStorage.getItem('student'));
            if (!studentData) throw new Error('Student data not found in sessionStorage.');

            // Call save-race-results API
            const response = await fetch('https://admin.rocketmath.com/api/save-race-results', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                student_id: studentData.id,
                set_id: studentData.set_id,
                learning_track_id: studentData.learning_track_id,
                correct_answers: simulatedScore,
                total_answers: simulatedScore, // Assuming 100% accuracy for the cheat
                assigned_at: null,
                assigned_at_type: null,
                retake_race_id: null
              })
            });

            const data = await response.json();
            if (data.error) throw new Error(JSON.stringify(data.error));

            location.reload();
            return 'SUCCESS';
          } catch (e) {
            return 'ERROR: ' + e.message;
          }
        },
        args: [score]
      }, (results) => {
        if (results && results[0] && results[0].result === 'SUCCESS') {
          addLog(`✅ Race Won (${score} pts)!`);
          incrementGodModeUse();
        } else {
          const err = results?.[0]?.result || 'Unknown error';
          addLog('❌ Failed: ' + err);
          errorMessage.textContent = err;
          errorSection.style.display = '';
        }
      });
    });
  });

  // 3. Stealth Mode (LogRocket Disable)
  stealthModeBtn.addEventListener('click', () => {
    chrome.storage.local.get('stealthMode', (result) => {
      const newState = !result.stealthMode;
      chrome.storage.local.set({ stealthMode: newState });

      if (newState) {
        stealthModeBtn.textContent = '🥷 Stealth Mode: ON';
        stealthModeBtn.style.background = '#10b981';
        addLog('🥷 Stealth Mode Enabled (Reload required)');
      } else {
        stealthModeBtn.textContent = '🥷 Toggle Stealth Mode';
        stealthModeBtn.style.background = ''; // Reset to CSS default
        addLog('👀 Stealth Mode Disabled');
      }

      // Inject script to disable LogRocket
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          world: 'MAIN', // IMPORTANT: Run in main world to override global window object
          func: (enabled) => {
            if (enabled) {
              // Overwrite LogRocket init to do nothing
              // We assign it to window explicitly to be sure
              Object.defineProperty(window, 'LogRocket', {
                value: {
                  init: function () { console.log("🥷 LogRocket blocked by Stealth Mode"); },
                  identify: function () { console.log("🥷 LogRocket identify blocked"); }
                },
                writable: false,
                configurable: false
              });

              alert('🥷 Stealth Mode Active! Page will now reload to apply changes.');
              location.reload();
            }
          },
          args: [newState]
        });
      });
    });
  });
});
