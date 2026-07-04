// Copa del Mundo 2026 Polla Digital - Core Application Logic
// Powered by Parley.com.ve

// Normalization and mapping helper for FlagCDN flags
function getFlagCode(countryName) {
  if (!countryName) return "un";
  const normalized = countryName
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s.\/-]/g, "");

  const mapping = {
    "alemania": "de",
    "arabia saudita": "sa",
    "argelia": "dz",
    "argentina": "ar",
    "australia": "au",
    "austria": "at",
    "bosnia-herzegovina": "ba",
    "brasil": "br",
    "belgica": "be",
    "cabo verde": "cv",
    "canada": "ca",
    "catar": "qa",
    "colombia": "co",
    "costa de marfil": "ci",
    "croacia": "hr",
    "curazao": "cw",
    "ee.uu.": "us",
    "ecuador": "ec",
    "egipto": "eg",
    "escocia": "gb-sct",
    "espana": "es",
    "francia": "fr",
    "ghana": "gh",
    "haiti": "ht",
    "inglaterra": "gb-eng",
    "irak": "iq",
    "iran": "ir",
    "japon": "jp",
    "jordania": "jo",
    "marruecos": "ma",
    "mexico": "mx",
    "noruega": "no",
    "nueva zelanda": "nz",
    "panama": "pa",
    "paraguay": "py",
    "paises bajos": "nl",
    "portugal": "pt",
    "rd congo": "cd",
    "rep. de corea": "kr",
    "rep. checa": "cz",
    "senegal": "sn",
    "sudafrica": "za",
    "suecia": "se",
    "suiza": "ch",
    "turquia": "tr",
    "tunez": "tn",
    "uruguay": "uy",
    "uzbekistan": "uz"
  };

  return mapping[normalized] || "un";
}

// Generate the HTML for a flag using remote assets and fallback handler
function getFlagHTML(countryName) {
  const code = getFlagCode(countryName);
  const url = `https://flagcdn.com/w80/${code}.png`;
  const fallback = `https://flagcdn.com/w80/un.png`;
  return `<img src="${url}" alt="${countryName}" class="flag-svg" onerror="this.src='${fallback}'">`;
}

// Venezuelan date and time formatting (12H, DD-MM-AAAA)
function formatDateVZLA(dateStr) {
  if (!dateStr) return { date: "", time: "" };

  const hasOffset = /(Z|z|[+-]\d{2}(:?\d{2})?)$/.test(dateStr.trim());
  let year, month, day, hour, minStr;

  if (hasOffset) {
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) {
      return { date: dateStr, time: "" };
    }
    const vzlaMs = dateObj.getTime() - (4 * 60 * 60 * 1000);
    const vzlaDate = new Date(vzlaMs);
    
    year = String(vzlaDate.getUTCFullYear());
    month = String(vzlaDate.getUTCMonth() + 1).padStart(2, '0');
    day = String(vzlaDate.getUTCDate()).padStart(2, '0');
    hour = vzlaDate.getUTCHours();
    minStr = String(vzlaDate.getUTCMinutes()).padStart(2, '0');
  } else {
    let cleanStr = dateStr.replace("T", " ").trim();
    const parts = cleanStr.split(" ");
    if (parts.length < 2) return { date: dateStr, time: "" };
    const [datePart, timePart] = parts;
    
    const dateParts = datePart.split("-");
    if (dateParts.length < 3) return { date: dateStr, time: "" };
    [year, month, day] = dateParts;
    
    const timeParts = timePart.split(":");
    if (timeParts.length < 2) return { date: dateStr, time: "" };
    const [hourStr, minPart] = timeParts;
    hour = parseInt(hourStr, 10);
    minStr = minPart;
  }

  const ampm = hour >= 12 ? "PM" : "AM";
  let hour12 = hour % 12;
  hour12 = hour12 ? hour12 : 12;
  const formattedHour = String(hour12).padStart(2, '0');

  return {
    date: `${day}-${month}-${year}`,
    time: `${formattedHour}:${minStr} ${ampm}`
  };
}



// Check if tournament is finished
function checkTournamentFinished() {
  return STATE.tournamentFinished;
}

// Admin inspect user details modals
async function openAdminUserModal(cedula) {
  STATE.inspectedUserCedula = cedula;
  const user = STATE.users.find(u => u.cedula === cedula);
  if (!user) return;
  
  // Load predictions and specials on-demand
  if (!user.predictionsLoaded && !user.is_mock) {
    try {
      const loadedData = await loadUserData(user.id);
      if (loadedData) {
        Object.assign(user, loadedData);
      }
    } catch (err) {
      console.error("Error loading user data for admin modal:", err);
      showToast("ERROR AL CARGAR DATOS DEL USUARIO.", "error");
      closeAdminUserModal();
      return;
    }
  }
  
  // ponytail: ensure user's calculations are fully populated locally for breakdown rendering
  recalculateAllPoints();
  
  document.getElementById('admin-inspect-name').innerText = user.name;
  document.getElementById('admin-inspect-id').innerText = user.id;
  document.getElementById('admin-inspect-cedula').innerText = user.cedula;
  document.getElementById('admin-inspect-phone').innerText = user.phone || 'N/A';
  document.getElementById('admin-inspect-email').innerText = user.email || 'N/A';
  document.getElementById('admin-inspect-dob').innerText = user.dob || 'N/A';
  
  // Set parley username in admin inspect
  const parleyUsernameEl = document.getElementById('admin-inspect-parley-username');
  if (parleyUsernameEl) {
    parleyUsernameEl.innerText = user.parley_username || 'N/A';
  }
  
  const points = user.points || 0;
  const bd = user.points_breakdown || { exacts: 0, simple_1x2: 0, exact_gd: 0, group_leaders_points: 0, badges_points: 0, extra_knockout: 0 };
  
  document.getElementById('admin-inspect-points').innerText = `${points} PTS`;
  document.getElementById('admin-inspect-exacts').innerText = `${bd.exacts} PTS`;
  document.getElementById('admin-inspect-1x2').innerText = `${bd.simple_1x2} PTS`;
  document.getElementById('admin-inspect-gd').innerText = `${bd.exact_gd} PTS`;
  
  const extraKoEl = document.getElementById('admin-inspect-extra-knockout');
  if (extraKoEl) {
    extraKoEl.innerText = `${bd.extra_knockout || 0} PTS`;
  }
  
  // Safeguard against removed element
  const teamGoalsEl = document.getElementById('admin-inspect-team-goals');
  if (teamGoalsEl) {
    teamGoalsEl.innerText = `${bd.team_goals || 0} PTS`;
  }
  const groupLeadersEl = document.getElementById('admin-inspect-group-leaders');
  if (groupLeadersEl) {
    groupLeadersEl.innerText = `${bd.group_leaders_points || 0} PTS`;
  }
  document.getElementById('admin-inspect-badges-pts').innerText = `${bd.badges_points || 0} PTS`;
  document.getElementById('admin-inspect-badges').innerText = user.badges && user.badges.length > 0 ? user.badges.join(", ") : "Ninguna";
  
  // Check if HAT-TRICK VIP is active
  const toggleVipBtn = document.getElementById('btn-toggle-vip-badge');
  if (toggleVipBtn) {
    if (user.badges && user.badges.includes("HAT-TRICK VIP")) {
      toggleVipBtn.innerText = "REVOCAR HAT-TRICK VIP";
      toggleVipBtn.style.borderColor = "var(--alert)";
      toggleVipBtn.style.color = "var(--alert)";
    } else {
      toggleVipBtn.innerText = "ASIGNAR HAT-TRICK VIP";
      toggleVipBtn.style.borderColor = "var(--accent)";
      toggleVipBtn.style.color = "var(--accent)";
    }
  }
  
  // Load Predictions Ticket visual receipt
  const ticketContainer = document.getElementById('admin-inspect-ticket-container');
  ticketContainer.innerHTML = "";
  
  STATE.matches.forEach(m => {
    const pred = user.predictions[m.match_no];
    let predText = "Sin pronóstico";
    let wildcardHTML = "";
    let ptsEarned = 0;
    
    if (pred && pred.home_score !== null && pred.away_score !== null) {
      predText = `${pred.home_score} - ${pred.away_score}`;
      if (pred.wildcard) wildcardHTML = " 🚨 (x2)";
      
      // Calculate single match points
      if (m.home_score !== null && m.away_score !== null) {
        let matchPoints = 0;
        if (pred.home_score === m.home_score && pred.away_score === m.away_score) {
          matchPoints = 6;
        } else {
          const r_win = m.home_score > m.away_score ? 'home' : (m.home_score < m.away_score ? 'away' : 'draw');
          const p_win = pred.home_score > pred.away_score ? 'home' : (pred.home_score < pred.away_score ? 'away' : 'draw');
          if (r_win === p_win) {
            matchPoints += 3;
            if (m.home_score !== m.away_score && (m.home_score - m.away_score) === (pred.home_score - pred.away_score)) {
              matchPoints += 2;
            }
          }
        }
        if (pred.home_score === pred.away_score && m.home_score === m.away_score) {
          const actualAdvancing = m.extra_time_winner || m.penalties_winner;
          if (pred.extra_time_winner && pred.extra_time_winner === actualAdvancing) {
            matchPoints += 1;
          }
        }
        if (pred.wildcard) matchPoints *= 2;
        ptsEarned = matchPoints;
      }
    }
    
    const realText = m.home_score !== null && m.away_score !== null ? `${m.home_score} - ${m.away_score}` : "Por jugar";
    
    const item = document.createElement('div');
    item.className = "ticket-row-item";
    item.innerHTML = `
      <div class="ticket-team-row">
        <div class="ticket-team-col" style="flex: 1; justify-content: flex-end; text-align: right; min-width: 0;">
          ${getFlagHTML(m.home_name)}
          <span style="margin-left: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.home_name}</span>
        </div>
        <span style="font-weight: 800; font-size: 13px; color: var(--accent); margin: 0 10px; min-width: 50px; text-align: center; white-space: nowrap; flex-shrink: 0;">${predText}${wildcardHTML}</span>
        <div class="ticket-team-col" style="flex: 1; justify-content: flex-start; text-align: left; min-width: 0;">
          <span style="margin-right: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.away_name}</span>
          ${getFlagHTML(m.away_name)}
        </div>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 10px; color: var(--text-muted); margin-top: 4px; flex-wrap: wrap; gap: 4px;">
        <span>Partido #${m.match_no} (${m.group ? `Grupo ${m.group}` : ''})</span>
        <span>Real: <strong style="color: #FFF;">${realText}</strong> | Ganado: <strong style="color: var(--accent);">${ptsEarned} PTS</strong></span>
      </div>
    `;
    ticketContainer.appendChild(item);
  });
  
  document.getElementById('admin-user-modal').classList.add('active');
}

function closeAdminUserModal() {
  document.getElementById('admin-user-modal').classList.remove('active');
}

async function adminToggleVipBadge() {
  const cedula = STATE.inspectedUserCedula;
  if (!cedula) return;
  const user = STATE.users.find(u => u.cedula === cedula);
  if (!user) return;
  
  if (!supabaseClient) {
    showToast("ERROR DE CONEXIÓN CON EL SERVIDOR.", "error");
    return;
  }
  
  if (!user.badges) {
    user.badges = [];
  }
  
  const updatedBadges = [...user.badges];
  const idx = updatedBadges.indexOf("HAT-TRICK VIP");
  let action = "";
  if (idx > -1) {
    updatedBadges.splice(idx, 1);
    action = "revoke";
  } else {
    updatedBadges.push("HAT-TRICK VIP");
    action = "assign";
  }
  
  try {
    const { data, error } = await supabaseClient
      .from('profiles')
      .update({ badges: updatedBadges })
      .eq('id', user.id)
      .select();
      
    if (error) throw error;
    
    if (!data || data.length === 0) {
      showToast("NO SE PUDO ACTUALIZAR LA INSIGNIA. VERIFICA TUS PERMISOS DE ADMINISTRADOR.", "error");
      return;
    }
    
    user.badges = updatedBadges;
    if (action === "revoke") {
      showToast("INSIGNIA HAT-TRICK VIP REVOCADA.");
    } else {
      showToast("INSIGNIA HAT-TRICK VIP ASIGNADA.");
    }
    
    recalculateAllPoints();
    openAdminUserModal(cedula);
    renderApp();
    
    const searchInput = document.getElementById('admin-user-search-input');
    const query = searchInput ? searchInput.value : "";
    renderAdminUsersList(query);
  } catch (err) {
    console.error("Error toggling VIP badge in Supabase:", err);
    showToast("ERROR AL ACTUALIZAR LA INSIGNIA EN EL SERVIDOR.", "error");
  }
}

async function toggleTournamentFinished() {
  STATE.tournamentFinished = !STATE.tournamentFinished;
  if (supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from('app_config')
        .upsert({ key: 'tournament_finished', value: STATE.tournamentFinished ? 'true' : 'false' }, { onConflict: 'key' });
      if (error) {
        console.error("Error updating tournament_finished in Supabase:", error);
        showToast("Error al guardar el estado del torneo en el servidor.", "error");
      }
    } catch (e) {
      console.error("Connection error updating tournament_finished:", e);
    }
  }
  if (STATE.tournamentFinished) {
    showToast("TORNEO DECLARADO FINALIZADO. ¡FIESTA DE PREMIACIÓN ACTIVADA!");
    
    // Enqueue final push notification to all regular users
    if (supabaseClient) {
      try {
        const regularUsers = STATE.users.filter(u => !u.is_admin && !u.is_mock);
        const pushQueue = regularUsers.map(u => ({
          cedula: u.cedula,
          type: 'ranking',
          title: "🏆 ¡Torneo Finalizado!",
          body: `Hola ${u.name.split(' ')[0]}. La Polla ha concluido. ¡Entra ya para ver tu posición final en la tabla y los ganadores!`,
          tag: 'tournament-finished',
          url: './',
          priority: 2
        }));
        
        if (pushQueue.length > 0) {
          supabaseClient
            .from('notification_queue')
            .insert(pushQueue)
            .then(({ error: insertErr }) => {
              if (insertErr) {
                console.error("Error inserting final notifications into queue:", insertErr);
              } else {
                console.log(`Successfully enqueued final notifications for ${pushQueue.length} users.`);
                // Trigger send-push edge function to process the queue
                const pushBase = `${supabaseUrl}/functions/v1`;
                const pushHeaders = { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` };
                fetch(`${pushBase}/send-push`, {
                  method: "POST",
                  headers: pushHeaders,
                  body: JSON.stringify({ action: "process-queue" })
                }).then(() => {
                  console.log("Triggered process-queue for final notifications.");
                }).catch(err => {
                  console.error("Error triggering process-queue:", err);
                });
              }
            });
        }
      } catch (err) {
        console.error("Error enqueuing final notifications:", err);
      }
    }
  } else {
    showToast("ESTADO DEL TORNEO REESTABLECIDO A ACTIVO.");
  }
  recalculateAllPoints();
  renderApp();
  if (STATE.adminMode) {
    renderAdminView();
  }
}

// Global App State
let STATE = {
  users: [],
  matches: [],
  groups: {},
  assign_third: {},
  leagues: [],
  currentUser: null,
  // Milestone M4: Pagination State
  leaderboardPage: 1,
  leaderboardPageSize: 50, // default size of 50 records
  leaderboardTotalCount: 0,
  leaderboardData: [],
  adminMode: false,
  tournamentFinished: false,
  inspectedUserCedula: null,
  groupStandingsOverrides: {},
  tempOverrideTeams: [],
  matchDateFilter: 'all',
  dateFilterPopulated: false
};

// Helper: Toast alerts
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  container.className = `toast active toast-${type}`;
  container.innerText = message;
  setTimeout(() => {
    container.classList.remove('active');
  }, 4000);
}

// Format Cédula: digits only + prefix
function formatCedulaInput(prefixVal, numberVal) {
  const digits = numberVal.replace(/\D/g, '');
  return `${prefixVal}-${digits}`;
}

// Age check (18+)
function isAdult(dobString) {
  if (!dobString) return false;
  const dob = new Date(dobString);
  const now = new Date(getCurrentTime());
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 18;
}

// Streak calculation (correct 1X2 or exact score counts for streak)
function calculateUserStreak(user) {
  let currentStreak = 0;
  let maxStreak = 0;
  
  const finishedMatches = STATE.matches
    .filter(m => m.home_score !== null && m.away_score !== null)
    .sort((a, b) => a.match_no - b.match_no);
    
  finishedMatches.forEach(m => {
    const pred = user.predictions[m.match_no];
    if (!pred) {
      currentStreak = 0;
      return;
    }
    
    const H_p = pred.home_score;
    const A_p = pred.away_score;
    if (H_p === null || H_p === undefined || A_p === null || A_p === undefined) {
      currentStreak = 0;
      return;
    }
    
    const H_r = m.home_score;
    const A_r = m.away_score;
    
    const r_winner = H_r > A_r ? 'home' : (H_r < A_r ? 'away' : 'draw');
    const p_winner = H_p > A_p ? 'home' : (H_p < A_p ? 'away' : 'draw');
    
    if (r_winner === p_winner) {
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else {
      currentStreak = 0;
    }
  });
  
  return { currentStreak, maxStreak };
}



// Gold visual feedback flash + particles on save
function triggerSaveVisualFeedback(matchNo) {
  const container = document.getElementById(`score-wrapper-${matchNo}`);
  if (container) {
    container.classList.remove('save-flash-gold');
    void container.offsetWidth;
    container.classList.add('save-flash-gold');
    for (let i = 0; i < 6; i++) {
      const p = document.createElement('div');
      p.className = 'gold-particle';
      const angle = Math.random() * Math.PI * 2;
      const distance = 15 + Math.random() * 25;
      p.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
      p.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
      p.style.left = '50%';
      p.style.top = '50%';
      container.appendChild(p);
      setTimeout(() => p.remove(), 600);
    }
  }
  // ponytail: instant DOM lock — avoids waiting for full re-render after async Supabase upsert
  const homeInput = document.getElementById(`home-score-${matchNo}`);
  const awayInput = document.getElementById(`away-score-${matchNo}`);
  if (homeInput) homeInput.disabled = true;
  if (awayInput) awayInput.disabled = true;

  const chipRow = document.getElementById(`chip-row-${matchNo}`);
  if (chipRow && !chipRow.querySelector('.lock-saved-chip')) {
    chipRow.innerHTML = `<button class="lock-saved-chip" onclick="toggleEditLock(${matchNo})" id="lock-btn-${matchNo}" title="Toca para editar">
      <span class="lock-saved-icon">🔒</span>
      <span class="lock-saved-label">Guardado · <em>Editar</em></span>
    </button>`;
  }
}

// Dynamic PWA registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker registered successfully'))
      .catch(err => console.log('Service Worker registration failed: ', err));
  });

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

// PWA Add to Home Screen / Installation Logic
let deferredPrompt = null;

// Check if running on iOS (Safari)
const isIosDevice = () => {
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
};

// Check if already in standalone mode (installed)
const isRunningStandalone = () => {
  return window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
};

// Capture the browser installation prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  // Show install buttons
  const btn = document.getElementById('pwa-install-btn');
  const btnHero = document.getElementById('pwa-install-btn-hero');
  if (btn) btn.style.display = 'flex';
  if (btnHero) btnHero.style.display = 'flex';
});

// Setup click handlers for the install buttons
function initPwaInstallHandlers() {
  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (isIosDevice()) {
        const iosTip = document.getElementById('pwa-ios-instructions');
        const iosTipHero = document.getElementById('pwa-ios-instructions-hero');
        if (iosTip) iosTip.style.display = iosTip.style.display === 'block' ? 'none' : 'block';
        if (iosTipHero) iosTipHero.style.display = iosTipHero.style.display === 'block' ? 'none' : 'block';
      } else {
        alert("Para instalar, usa el menú de tu navegador y selecciona 'Instalar aplicación' o 'Agregar a la pantalla principal'.");
      }
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User installation choice outcome: ${outcome}`);
    deferredPrompt = null;
    
    // Hide buttons
    const btn = document.getElementById('pwa-install-btn');
    const btnHero = document.getElementById('pwa-install-btn-hero');
    if (btn) btn.style.display = 'none';
    if (btnHero) btnHero.style.display = 'none';
  };

  const btn = document.getElementById('pwa-install-btn');
  if (btn) btn.addEventListener('click', handleInstallClick);

  const btnHero = document.getElementById('pwa-install-btn-hero');
  if (btnHero) btnHero.addEventListener('click', handleInstallClick);
  // ponytail: divs need explicit cursor style via JS since they replaced button elements
  [btn, btnHero].forEach(el => { if (el) el.style.cursor = 'pointer'; });
}

// Show iOS manual install guide if user is on iOS and hasn't installed yet
function checkIosPwaInstallTip() {
  if (isIosDevice() && !isRunningStandalone()) {
    const btn = document.getElementById('pwa-install-btn');
    const btnHero = document.getElementById('pwa-install-btn-hero');
    if (btn) btn.style.display = 'flex';
    if (btnHero) btnHero.style.display = 'flex';
    
    const iosTip = document.getElementById('pwa-ios-instructions');
    const iosTipHero = document.getElementById('pwa-ios-instructions-hero');
    if (iosTip) iosTip.style.display = 'none';
    if (iosTipHero) iosTipHero.style.display = 'none';
  }
}

// Listen for successful installation
window.addEventListener('appinstalled', () => {
  console.log('Polla Parley PWA was installed successfully');
  deferredPrompt = null;
  const btn = document.getElementById('pwa-install-btn');
  const btnHero = document.getElementById('pwa-install-btn-hero');
  if (btn) btn.style.display = 'none';
  if (btnHero) btnHero.style.display = 'none';
  
  const iosTip = document.getElementById('pwa-ios-instructions');
  const iosTipHero = document.getElementById('pwa-ios-instructions-hero');
  if (iosTip) iosTip.style.display = 'none';
  if (iosTipHero) iosTipHero.style.display = 'none';
  
  showToast("¡APLICACIÓN INSTALADA CON ÉXITO!");
});

// Initialize Supabase Client
const supabaseUrl = 'https://blqglkqywmchqrtsqcxi.supabase.co';
const supabaseKey = 'sb_publishable_1SdbwZXSpp9tLybeubtGXQ_tu1AIMBA';
const supabaseClient = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

// API Service Layer rewritten for Supabase compatibility
const API = {
  getCurrentUser: function() {
    return STATE.currentUser ? STATE.currentUser.cedula : null;
  },
  
  setCurrentUser: function(cedula) {
    // Session is managed in-memory via STATE.currentUser and Supabase auth session
  },

  getTutorialSeen: function(cedula) {
    if (STATE.currentUser && STATE.currentUser.cedula === cedula) {
      return STATE.currentUser.tutorial_seen === true;
    }
    return false;
  },
  
  saveTutorialSeen: function(cedula, seen) {
    if (STATE.currentUser && STATE.currentUser.cedula === cedula) {
      STATE.currentUser.tutorial_seen = seen;
    }
    if (supabaseClient && STATE.currentUser && STATE.currentUser.cedula === cedula) {
      supabaseClient.from('profiles').update({ tutorial_seen: seen }).eq('id', STATE.currentUser.id)
        .then(({ error }) => { if (error) console.error("Error saving tutorial_seen in Supabase", error); });
    }
  },

  saveTournamentFinished: function(finished) {
    if (supabaseClient) {
      supabaseClient.from('app_config').upsert({ key: 'tournament_finished', value: finished ? 'true' : 'false' }, { onConflict: 'key' })
        .then(({ error }) => { if (error) console.error("Error saving tournament_finished in Supabase", error); });
    }
  }
};

// Generate code for leagues (kept standard)
function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Load user details including predictions and special predictions from Supabase
async function loadUserData(userId) {
  if (!supabaseClient) return null;
  
  // Helper to fetch profile with retry backoff loop (up to 3 times, 500ms delay)
  const fetchProfileWithRetry = async () => {
    let profile = null;
    let profileError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        profile = result.data;
        profileError = result.error;
        if (!profileError && profile) {
          break;
        }
      } catch (err) {
        profileError = err;
      }
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    return { profile, error: profileError };
  };

  // Parallelize the queries inside loadUserData() using Promise.all
  const [profileResult, predsResult, glPredsResult, rankResult, statsResult] = await Promise.all([
    fetchProfileWithRetry(),
    supabaseClient.from('predictions').select('*').eq('user_id', userId),
    supabaseClient.from('group_leader_predictions').select('*').eq('user_id', userId),
    supabaseClient.from('leaderboard').select('rank, total_points').eq('user_id', userId).maybeSingle(),
    supabaseClient.from('user_calculated_points').select('calculated_badges, total_points').eq('user_id', userId).maybeSingle()
  ]);

  if (profileResult.error) {
    throw profileResult.error;
  }

  const profile = profileResult.profile;
  if (!profile) {
    const err = new Error("Profile not found");
    err.code = 'PGRST116';
    throw err;
  }

  // ponytail: Hydrate points and rank directly inside loadUserData to prevent race condition during login
  if (rankResult && rankResult.data) {
    profile.rank = rankResult.data.rank;
    profile.points = rankResult.data.total_points;
  } else {
    if (rankResult && rankResult.error) {
      console.warn("Transient error loading rank/points for user:", rankResult.error);
    }
    profile.rank = '-';
    profile.points = 0;
  }
  
  // ponytail: Hydrate calculated badges and points from view to prevent visual delay
  if (statsResult && statsResult.data) {
    profile.badges = statsResult.data.calculated_badges || [];
    profile.points = statsResult.data.total_points;
  } else {
    profile.badges = profile.badges || [];
  }
  
  profile.predictions = {};
  const preds = predsResult.data;
  if (preds) {
    preds.forEach(p => {
      profile.predictions[p.match_no] = {
        home_score: p.home_score,
        away_score: p.away_score,
        wildcard: p.wildcard,
        extra_time_winner: p.extra_time_winner,
        penalties_winner: p.penalties_winner,
        penalties_home_score: p.penalties_home_score,
        penalties_away_score: p.penalties_away_score
      };
    });
  }
  
  profile.special_predictions = { group_leaders: {} };
  const glPreds = glPredsResult.data;
  if (glPreds) {
    glPreds.forEach(gp => {
      if (gp.group_letter === 'CHAMPION') {
        profile.special_predictions.champion = gp.team_code;
      } else if (gp.group_letter === 'SUBCHAMPION') {
        profile.special_predictions.subchampion = gp.team_code;
      } else if (gp.group_letter === 'THIRD_PLACE') {
        profile.special_predictions.third_place = gp.team_code;
      } else {
        profile.special_predictions.group_leaders[gp.group_letter] = gp.team_code;
      }
    });
  }
  
  profile.predictionsLoaded = true;
  return profile;
}

let currentSyncPromise = null;
// Fetch paginated leaderboard page from the leaderboard database view
async function fetchPaginatedLeaderboard(page, pageSize = STATE.leaderboardPageSize) {
  if (!supabaseClient) return { data: [], count: 0 };
  
  const from = (page - 1) * pageSize;
  const to = (page * pageSize) - 1;
  
  const { data, error, count } = await supabaseClient
    .from('leaderboard')
    .select('*', { count: 'exact' })
    .range(from, to);
    
  if (error) {
    console.error("Error fetching paginated leaderboard:", error);
    showToast("ERROR AL OBTENER LA CLASIFICACIÓN.", "error");
    return { data: [], count: 0 };
  }
  
  return { data: data || [], count: count || 0 };
}

// Fetch rank and total points of the current user
async function fetchCurrentUserRank() {
  if (!supabaseClient || !STATE.currentUser) return null;
  
  const { data, error } = await supabaseClient
    .from('leaderboard')
    .select('rank, total_points')
    .eq('cedula', STATE.currentUser.cedula)
    .maybeSingle();
    
  if (error) {
    console.error("Error fetching current user rank:", error);
    return null;
  }
  return data;
}

let pendingSyncRequest = false;

// Fetch matches, config, leaderboard, and user leagues from Supabase
async function syncFromSupabase() {
  if (!supabaseClient) return;

  if (currentSyncPromise) {
    pendingSyncRequest = true;
    return currentSyncPromise.then(() => {
      if (pendingSyncRequest) {
        pendingSyncRequest = false;
        return syncFromSupabase();
      }
    });
  }

  const doSync = async () => {
    // 1. Fetch matches
    const { data: dbMatches } = await supabaseClient
      .from('matches')
      .select('*')
      .order('match_no', { ascending: true });
    if (dbMatches) {
      STATE.matches = dbMatches.map(m => {
        let localDate = m.match_date;
        if (typeof WORLD_CUP_DATA !== 'undefined' && WORLD_CUP_DATA.matches) {
          const localMatch = WORLD_CUP_DATA.matches.find(lm => lm.match_no === m.match_no);
          if (localMatch) {
            localDate = localMatch.date; // Use the local VET date string
          }
        }
        return {
          ...m,
          date: localDate,
          group: m.group_letter // Map group_letter to group for frontend compatibility
        };
      });
      STATE.dateFilterPopulated = false;
    }
    
    // 2. Batch config queries
    const { data: configData } = await supabaseClient
      .from('app_config')
      .select('key, value')
      .in('key', ['tournament_finished', 'group_standings_overrides']);

    let finishedVal = 'false';
    let overridesVal = '{}';

    if (configData) {
      configData.forEach(row => {
        if (row.key === 'tournament_finished') finishedVal = row.value;
        else if (row.key === 'group_standings_overrides') overridesVal = row.value;
      });
    }

    STATE.tournamentFinished = finishedVal === 'true';
    try {
      STATE.groupStandingsOverrides = JSON.parse(overridesVal);
    } catch (e) {
      STATE.groupStandingsOverrides = {};
    }

    // 5. Check logged in user
    const { data: { user: authUser } } = await supabaseClient.auth.getUser();
    if (authUser) {
      try {
        const profile = await loadUserData(authUser.id);
        if (profile) {
          STATE.currentUser = profile;
          STATE.adminMode = profile.is_admin || profile.cedula === 'V-12345678';
          API.setCurrentUser(profile.cedula);
        } else {
          await supabaseClient.auth.signOut();
          STATE.currentUser = null;
          STATE.adminMode = false;
          API.setCurrentUser(null);
        }
      } catch (err) {
        if (err && (err.code === 'PGRST116' || err.message === 'Profile not found')) {
          console.warn("User profile explicitly missing from database. Forcing logout.", err);
          await supabaseClient.auth.signOut();
          STATE.currentUser = null;
          STATE.adminMode = false;
          API.setCurrentUser(null);
        } else {
          console.warn("Transient database/network error while fetching user profile. Session preserved.", err);
        }
      }
    } else {
      STATE.currentUser = null;
      STATE.adminMode = false;
      API.setCurrentUser(null);
    }
    
    // 6. Fetch Page 1 of the leaderboard
    const { data: pageData, count } = await fetchPaginatedLeaderboard(1);
    STATE.leaderboardPage = 1;
    STATE.leaderboardData = pageData || [];
    STATE.leaderboardTotalCount = count || 0;
    
    // Fetch current user rank and points if logged in
    if (STATE.currentUser) {
      const rankInfo = await fetchCurrentUserRank();
      if (rankInfo) {
        STATE.currentUser.rank = rankInfo.rank;
        STATE.currentUser.points = rankInfo.total_points;
      }
    }
    
    const userMap = new Map();
    
    if (STATE.leaderboardData) {
      STATE.leaderboardData.forEach(p => {
        // Map view columns to fields expected by the client
        const mappedUser = {
          id: p.user_id,
          cedula: p.cedula,
          name: p.name,
          points: p.total_points,
          badges: p.calculated_badges || [],
          exacts_count: p.exacts_count || 0,
          outcomes_count: p.outcomes_count || 0,
          successful_wildcards_count: p.successful_wildcards_count || 0,
          predictions: {},
          special_predictions: { group_leaders: {} },
          predictionsLoaded: false
        };
        userMap.set(p.cedula, mappedUser);
      });
    }
    
    // Add current user to map if not present
    if (STATE.currentUser) {
      userMap.set(STATE.currentUser.cedula, STATE.currentUser);
      
      // 7. Load leagues for current user
      const { data: dbMembers } = await supabaseClient
        .from('league_members')
        .select(`
          league_id,
          leagues (
            id,
            code,
            name,
            owner_id
          )
        `)
        .eq('user_id', STATE.currentUser.id);
        
      if (dbMembers) {
        const leaguesList = [];
        // Eliminate the N+1 loop in private leagues sync. Replace it with a single .in('league_id', leagueIds) query to load all league members.
        const leagueIds = dbMembers.map(item => item.league_id).filter(id => id);
        
        let membersByLeague = {};
        if (leagueIds.length > 0) {
          const { data: allLeagueMembers } = await supabaseClient
            .from('league_members')
            .select(`
              league_id,
              user_id,
              profiles (
                id,
                cedula,
                name,
                points,
                badges,
                exacts_count,
                outcomes_count
              )
            `)
            .in('league_id', leagueIds);
            
          if (allLeagueMembers) {
            allLeagueMembers.forEach(m => {
              if (!membersByLeague[m.league_id]) {
                membersByLeague[m.league_id] = [];
              }
              membersByLeague[m.league_id].push(m);
            });
          }
        }
        
        for (const item of dbMembers) {
          const dbLeague = item.leagues;
          if (!dbLeague) continue;
          
          const leagueMembers = membersByLeague[dbLeague.id] || [];
          const membersCedulas = [];
          
          leagueMembers.forEach(m => {
            const p = m.profiles;
            if (p) {
              p.predictions = p.predictions || {};
              p.special_predictions = p.special_predictions || { group_leaders: {} };
              if (!userMap.has(p.cedula)) {
                userMap.set(p.cedula, p);
              }
              membersCedulas.push(p.cedula);
            }
          });
          
          leaguesList.push({
            id: dbLeague.id,
            code: dbLeague.code,
            name: dbLeague.name,
            owner_id: dbLeague.owner_id,
            members: membersCedulas
          });
        }
        STATE.leagues = leaguesList;
      }
    } else {
      STATE.leagues = [];
    }
    
    STATE.users = Array.from(userMap.values());
    
    if (STATE.currentUser && STATE.currentUser.is_admin) {
      try {
        const [profilesResult, statsResult] = await Promise.all([
          supabaseClient.from('profiles').select('id, cedula, name, parley_username, email, phone, dob, is_admin, is_mock, badges, notification_preferences'),
          supabaseClient.from('user_calculated_points').select('user_id, total_points, exacts_count, outcomes_count, calculated_badges')
        ]);
        
        if (profilesResult.data) {
          const statsMap = {};
          if (statsResult.data) {
            statsResult.data.forEach(s => {
              statsMap[s.user_id] = s;
            });
          }
          
          profilesResult.data.forEach(p => {
            const stats = statsMap[p.id] || {};
            const existing = STATE.users.find(u => u.id === p.id);
            const userData = {
              id: p.id,
              cedula: p.cedula,
              name: p.name,
              parley_username: p.parley_username,
              email: p.email,
              phone: p.phone,
              dob: p.dob,
              is_admin: p.is_admin,
              is_mock: p.is_mock,
              points: stats.total_points || 0,
              badges: p.badges || stats.calculated_badges || [],
              exacts_count: stats.exacts_count || 0,
              outcomes_count: stats.outcomes_count || 0,
              predictions: existing ? existing.predictions : {},
              special_predictions: existing ? existing.special_predictions : { group_leaders: {} },
              predictionsLoaded: existing ? existing.predictionsLoaded : false
            };
            
            if (existing) {
              Object.assign(existing, userData);
            } else {
              STATE.users.push(userData);
            }
          });
        }
      } catch (err) {
        console.error("Error loading all users for admin:", err);
      }
    }
  };

  try {
    currentSyncPromise = doSync();
    await currentSyncPromise;
    // ponytail: run local calculations to synchronize stats and badges across all client states
    recalculateAllPoints();
  } finally {
    currentSyncPromise = null;
    pendingSyncRequest = false;
  }
}

// Initialize database
async function initDatabase() {
  console.log("Initializing database with Supabase...");
  
  if (typeof WORLD_CUP_DATA !== 'undefined') {
    STATE.groups = WORLD_CUP_DATA.groups;
    STATE.assign_third = WORLD_CUP_DATA.assign_third;
  } else {
    showToast("ERROR CRÍTICO: DATOS DE COPA DEL MUNDO NO ENCONTRADOS.", "error");
  }

  // Register real-time Auth State Change Listener
  if (supabaseClient && supabaseClient.auth && typeof supabaseClient.auth.onAuthStateChange === 'function') {
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      console.log(`Supabase Auth state changed: ${event}`);
      if (session && session.user) {
        if (!STATE.currentUser || STATE.currentUser.id !== session.user.id) {
          try {
            const profile = await loadUserData(session.user.id);
            if (profile) {
              STATE.currentUser = profile;
              STATE.adminMode = profile.is_admin || profile.cedula === 'V-12345678';
              recalculateAllPoints(); // Recalculate local stats immediately
              renderApp();
              checkOnboardingTutorial();
              
              // ponytail: Auto push notifications prompt only if just registered
              const justRegistered = sessionStorage.getItem('just_registered_user') === 'true';
              if (justRegistered) {
                sessionStorage.removeItem('just_registered_user');
                try {
                  const toggleEl = document.getElementById('push-notifications-toggle');
                  if (toggleEl) toggleEl.checked = true;
                  togglePushNotifications(true);
                } catch (e) {
                  console.error("Auto push activation failed on auth change:", e);
                }
              }
            }
          } catch (err) {
            console.error("Error loading user profile on auth state change", err);
          }
        }
      } else {
        STATE.currentUser = null;
        STATE.adminMode = false;
        renderApp();
      }
    });
  }
  
  try {
    await syncFromSupabase();
    console.log("Supabase database successfully initialized.");
  } catch (err) {
    console.error("Error initializing Supabase database", err);
    showToast("ERROR DE CONEXIÓN CON EL SERVIDOR DE BASE DE DATOS.", "error");
  }
}


function recalculateAllPoints() {
  console.log("Recalculating all points...");
  
  // First calculate standings & group leaders based on REAL matches
  const { standings, leaders } = resolveBrackets(STATE.matches);
  
  // Find actual champion, subchampion, and third place using matches 104 and 103:
  const m104 = STATE.matches.find(m => m.match_no === 104);
  const m103 = STATE.matches.find(m => m.match_no === 103);
  let actualChamp = null;
  let actualSubchamp = null;
  let actualThird = null;
  
  if (m104 && m104.home_score !== null && m104.away_score !== null) {
    if (m104.home_score > m104.away_score) {
      actualChamp = m104.resolved_home_code;
      actualSubchamp = m104.resolved_away_code;
    } else if (m104.home_score < m104.away_score) {
      actualChamp = m104.resolved_away_code;
      actualSubchamp = m104.resolved_home_code;
    } else {
      if (m104.extra_time_winner === 'home' || m104.penalties_winner === 'home') {
        actualChamp = m104.resolved_home_code;
        actualSubchamp = m104.resolved_away_code;
      } else if (m104.extra_time_winner === 'away' || m104.penalties_winner === 'away') {
        actualChamp = m104.resolved_away_code;
        actualSubchamp = m104.resolved_home_code;
      }
    }
  }
  
  if (m103 && m103.home_score !== null && m103.away_score !== null) {
    if (m103.home_score > m103.away_score) {
      actualThird = m103.resolved_home_code;
    } else if (m103.home_score < m103.away_score) {
      actualThird = m103.resolved_away_code;
    } else {
      if (m103.extra_time_winner === 'home' || m103.penalties_winner === 'home') {
        actualThird = m103.resolved_home_code;
      } else if (m103.extra_time_winner === 'away' || m103.penalties_winner === 'away') {
        actualThird = m103.resolved_away_code;
      }
    }
  }

  STATE.users.forEach(user => {
    // Skip recalculation if the user's prediction data is not loaded in memory and they are not a mock user.
    const isCurrentUser = STATE.currentUser && user.id === STATE.currentUser.id;
    if (!user.predictionsLoaded && !user.is_mock && !isCurrentUser) {
      return;
    }

    let totalPoints = 0;
    let exactsCount = 0;
    let winnerCount = 0;
    let predictionsCount = 0;
    let successfulWildcardsCount = 0;
    
    let breakdown = {
      exacts: 0,
      simple_1x2: 0,
      exact_gd: 0,
      group_leaders_points: 0,
      extra_knockout: 0
    };
    
    // A. Match predictions points
    STATE.matches.forEach(match => {
      const pred = user.predictions[match.match_no];
      if (!pred) return;
      
      const H_p = pred.home_score;
      const A_p = pred.away_score;
      
      // Only calculate if scores are filled (not null)
      if (H_p === null || H_p === undefined || A_p === null || A_p === undefined) return;
      
      predictionsCount++;
      
      if (match.home_score === null || match.home_score === undefined || match.away_score === null || match.away_score === undefined) return;
      
      const H_r = match.home_score;
      const A_r = match.away_score;
      
      let matchPoints = 0;
      
      // Exact Score
      if (H_p === H_r && A_p === A_r) {
        matchPoints = 6;
        breakdown.exacts += 6;
        exactsCount++;
        winnerCount++;
      } else {
        // Partial points
        const r_winner = H_r > A_r ? 'home' : (H_r < A_r ? 'away' : 'draw');
        const p_winner = H_p > A_p ? 'home' : (H_p < A_p ? 'away' : 'draw');
        
        let p_earned = 0;
        
        // 1. Simple outcome correct
        if (r_winner === p_winner) {
          p_earned += 3;
          breakdown.simple_1x2 += 3;
          winnerCount++;
          
          // 2. Goal Difference correct (only if winner correct and not a draw as draw is already checked by exact diff)
          if (H_r !== A_r && (H_r - A_r) === (H_p - A_p)) {
            p_earned += 2;
            breakdown.exact_gd += 2;
          }
        }
        
        matchPoints = p_earned;
      }
      
      // Extra knockout points for draw
      let extraPoints = 0;
      if (H_p === A_p && H_r === A_r) {
        const actualAdvancing = match.extra_time_winner || match.penalties_winner;
        if (pred.extra_time_winner && pred.extra_time_winner === actualAdvancing) {
          extraPoints += 1;
        }
      }
      
      matchPoints += extraPoints;
      // Add extra points to distinct extra_knockout category
      breakdown.extra_knockout += extraPoints;
      
      // Comodín (Wildcard) double multiplier
      if (pred.wildcard) {
        matchPoints *= 2;
      }
      
      totalPoints += matchPoints;
      
      // Check if wildcard is successful
      if (pred.wildcard && matchPoints > 0) {
        successfulWildcardsCount++;
      }
    });
    
    // B. Group Leaders predictions (Removed for Knockout stage)
    breakdown.group_leaders_points = 0;
    
    // D. Gamification badges
    let badges = [];
    if (exactsCount >= 3) badges.push("Ojo Clínico");
    if (winnerCount >= 7) badges.push("Ganador Frecuente");
    if (predictionsCount >= 12) badges.push("Pronosticador Activo");
    
    // Check for "El Vidente" badge
    const userChamp = user.special_predictions && user.special_predictions.champion;
    const userSubchamp = user.special_predictions && user.special_predictions.subchampion;
    const userThird = user.special_predictions && user.special_predictions.third_place;
    
    if (actualChamp && actualSubchamp && actualThird &&
        userChamp && userChamp === actualChamp &&
        userSubchamp && userSubchamp === actualSubchamp &&
        userThird && userThird === actualThird) {
      badges.push("El Vidente");
    }
    
    if (user.badges && user.badges.includes("HAT-TRICK VIP")) {
      badges.push("HAT-TRICK VIP");
    }
    
    // Calculate badge points
    let badgePoints = 0;
    badges.forEach(b => {
      if (b === "Pronosticador Activo") badgePoints += 5;
      else if (b === "Ganador Frecuente") badgePoints += 10;
      else if (b === "Ojo Clínico") badgePoints += 15;
      else if (b === "El Vidente") badgePoints += 20;
      else if (b === "HAT-TRICK VIP") badgePoints += 20;
    });
    totalPoints += badgePoints;
    breakdown.badges_points = badgePoints;
    
    // Only overwrite points/badges for currentUser, mock users, or if current user is admin.
    const isAdmin = STATE.currentUser && STATE.currentUser.is_admin;
    if (isCurrentUser || user.is_mock || isAdmin) {
      user.points = totalPoints;
      user.points_breakdown = breakdown;
      user.badges = badges;
      user.exacts_count = exactsCount;
      user.outcomes_count = winnerCount;
      user.successful_wildcards_count = successfulWildcardsCount;
    }
  });
  
  // Sincronizar el puntaje calculado con el objeto del usuario activo (cintillo superior)
  if (STATE.currentUser) {
    const calcUser = STATE.users.find(u => u.cedula === STATE.currentUser.cedula);
    if (calcUser) {
      STATE.currentUser.points = calcUser.points;
      STATE.currentUser.badges = calcUser.badges;
    }
    
    // Forzar actualización inmediata del cintillo superior en el DOM con animación
    updatePointsWithAnimation('header-points-value', STATE.currentUser.points);
  }
}

function sortUsersLeaderboard(usersArray) {
  return [...usersArray].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const exactsA = a.exacts_count || 0;
    const exactsB = b.exacts_count || 0;
    if (exactsB !== exactsA) return exactsB - exactsA;
    
    // Sort by non-exact outcomes (total outcomes minus exact outcomes)
    const nonExactsA = (a.outcomes_count || 0) - exactsA;
    const nonExactsB = (b.outcomes_count || 0) - exactsB;
    if (nonExactsB !== nonExactsA) return nonExactsB - nonExactsA;
    
    const wcsA = a.successful_wildcards_count || 0;
    const wcsB = b.successful_wildcards_count || 0;
    if (wcsB !== wcsA) return wcsB - wcsA;
    return a.cedula.localeCompare(b.cedula);
  });
}

// Brackets engine: Resolves group leaders, qualified third-placed teams, and flows knockout winners/losers
function resolveBrackets(matchesList) {
  // Helper to resolve match winner code
  const getMatchWinnerCode = (m) => {
    if (!m || m.home_score === null || m.away_score === null) return null;
    if (m.home_score > m.away_score) return m.resolved_home_code || m.home_code;
    if (m.home_score < m.away_score) return m.resolved_away_code || m.away_code;
    
    // Draw: check extra time or penalties
    if (m.extra_time_winner === 'home' || m.penalties_winner === 'home') {
      return m.resolved_home_code || m.home_code;
    }
    if (m.extra_time_winner === 'away' || m.penalties_winner === 'away') {
      return m.resolved_away_code || m.away_code;
    }
    return null;
  };

  // Helper to resolve match loser code
  const getMatchLoserCode = (m) => {
    if (!m || m.home_score === null || m.away_score === null) return null;
    if (m.home_score > m.away_score) return m.resolved_away_code || m.away_code;
    if (m.home_score < m.away_score) return m.resolved_home_code || m.home_code;
    
    // Draw: check extra time or penalties
    if (m.extra_time_winner === 'home' || m.penalties_winner === 'home') {
      return m.resolved_away_code || m.away_code;
    }
    if (m.extra_time_winner === 'away' || m.penalties_winner === 'away') {
      return m.resolved_home_code || m.home_code;
    }
    return null;
  };

  // Helper to resolve code
  const resolveCode = (code) => {
    if (!code) return "";
    
    // Winner of match (e.g. W73)
    if (code.startsWith('W') && !code.startsWith('WA') && !code.startsWith('WI')) {
      const mNo = parseInt(code.substring(1), 10);
      const match = matchesList.find(m => m.match_no === mNo);
      return getMatchWinnerCode(match) || "";
    }
    
    // Loser of match (e.g. RU101)
    if (code.startsWith('RU')) {
      const mNo = parseInt(code.substring(2), 10);
      const match = matchesList.find(m => m.match_no === mNo);
      return getMatchLoserCode(match) || "";
    }
    
    return code;
  };

  // Resolve knockout matches in progression order
  const sortedMatches = [...matchesList].sort((a, b) => a.match_no - b.match_no);
  
  sortedMatches.forEach(m => {
    if (m.stage === 'group') return;
    
    m.resolved_home_code = resolveCode(m.home_code);
    m.resolved_away_code = resolveCode(m.away_code);
    
    // Set visual names
    if (m.resolved_home_code) {
      m.home_name = getTeamNameById(m.resolved_home_code);
    } else {
      m.home_name = m.home_code.startsWith('W') ? "Ganador " + m.home_code.substring(1) : (m.home_code.startsWith('RU') ? "Perdedor " + m.home_code.substring(2) : "Tercero");
    }
    
    if (m.resolved_away_code) {
      m.away_name = getTeamNameById(m.resolved_away_code);
    } else {
      m.away_name = m.away_code.startsWith('W') ? "Ganador " + m.away_code.substring(1) : (m.away_code.startsWith('RU') ? "Perdedor " + m.away_code.substring(2) : "Tercero");
    }
  });

  return {
    standings: {},
    leaders: {}
  };
}

// Check if a match is locked (10 mins before kickoff or if real scores are entered)
function isMatchLocked(match) {
  if (checkTournamentFinished()) return true;
  
  // Lock immediately if the match already has a real result manually entered
  if (match.home_score !== null && match.home_score !== undefined &&
      match.away_score !== null && match.away_score !== undefined) {
    return true;
  }
  
  // Treat the database date string literally as Venezuela Time (UTC-4)
  let cleanStr = match.date.replace(" ", "T");
  if (cleanStr.includes("+")) {
    cleanStr = cleanStr.split("+")[0];
  } else if (cleanStr.includes("Z")) {
    cleanStr = cleanStr.split("Z")[0];
  }
  
  // Explicitly parse in Venezuela Time zone to make checks location-independent
  const kickoffStr = cleanStr + "-04:00";
  const kickoffTime = new Date(kickoffStr).getTime();
  const lockoutLimit = kickoffTime - (10 * 60 * 1000); // 10 mins
  
  return getCurrentTime() >= lockoutLimit;
}

// Check if the tournament specials are locked
function isSpecialPredictionsLocked() {
  const deadlineMs = new Date("2026-06-23T12:00:00-04:00").getTime();
  return getCurrentTime() >= deadlineMs;
}

// Check if El Vidente specials are locked (July 9, 2026, 4:00 PM VET)
function isVidentePredictionsLocked() {
  const deadlineMs = new Date("2026-07-09T16:00:00-04:00").getTime();
  return getCurrentTime() >= deadlineMs;
}

// -------------------------------------------------------------------------
// PWA Robustness: IndexedDB Offline Queue for Predictions
// -------------------------------------------------------------------------
function getOfflineDB() {
  return new Promise((resolve, reject) => {
    try {
      if (typeof indexedDB === 'undefined' || !indexedDB) {
        reject(new Error("IndexedDB is not supported or restricted in this environment."));
        return;
      }
      const request = indexedDB.open('OfflinePredictionsDB', 2);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (db.objectStoreNames.contains('queue')) {
          db.deleteObjectStore('queue');
        }
        db.createObjectStore('queue', { keyPath: 'match_no' });
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error || new Error("Failed to open IndexedDB"));
    } catch (err) {
      reject(err);
    }
  });
}

async function queueOfflinePrediction(prediction) {
  try {
    const db = await getOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['queue'], 'readwrite');
      const store = transaction.objectStore('queue');
      const request = store.put(prediction);
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("Error queueing offline prediction:", err);
    return false;
  }
}

async function getPendingPredictions() {
  try {
    const db = await getOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['queue'], 'readonly');
      const store = transaction.objectStore('queue');
      const request = store.getAll();
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("Error getting pending predictions:", err);
    return [];
  }
}

async function dequeueOfflinePrediction(match_no) {
  try {
    const db = await getOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['queue'], 'readwrite');
      const store = transaction.objectStore('queue');
      const request = store.delete(match_no);
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("Error dequeuing offline prediction:", err);
    return false;
  }
}

async function syncOfflineQueue() {
  if (!navigator.onLine || !supabaseClient || !STATE.currentUser) return;
  const pending = await getPendingPredictions();
  if (pending.length === 0) return;
  
  console.log(`Syncing ${pending.length} offline predictions...`);
  for (const item of pending) {
    if (item.user_id !== STATE.currentUser.id) {
      await dequeueOfflinePrediction(item.match_no);
      continue;
    }

    // Offline Match Lockout Bypass Check
    const match = STATE.matches.find(m => m.match_no === item.match_no);
    if (!match || isMatchLocked(match)) {
      console.warn(`Match ${item.match_no} is locked/expired or not found. Removing from offline queue without syncing.`);
      await dequeueOfflinePrediction(item.match_no);
      continue;
    }

    try {
      const { error } = await supabaseClient
        .from('predictions')
        .upsert({
          user_id: item.user_id,
          match_no: item.match_no,
          home_score: item.home_score,
          away_score: item.away_score,
          wildcard: item.wildcard,
          extra_time_winner: item.extra_time_winner,
          penalties_winner: null,
          penalties_home_score: null,
          penalties_away_score: null
        }, { onConflict: 'user_id,match_no' });
      
      if (!error) {
        await dequeueOfflinePrediction(item.match_no);
      } else {
        console.error(`Error syncing offline prediction for match ${item.match_no}:`, error);
      }
    } catch (err) {
      console.error(`Error syncing offline prediction for match ${item.match_no}:`, err);
    }
  }
  
  await syncFromSupabase();
  recalculateAllPoints();
  renderApp();
  renderMatchesView();
  showToast("PRONÓSTICOS SINCRONIZADOS DESDE LA COLA OFFLINE. ✅");
}

window.addEventListener('online', syncOfflineQueue);

// User Actions: Save predictions
async function saveUserPrediction(matchNo, homeScoreVal, awayScoreVal, extraTimeWinner = null, penaltiesWinner = null, penaltiesHomeScoreVal = null, penaltiesAwayScoreVal = null) {
  if (!STATE.currentUser) {
    showToast("DEBES INICIAR SESIÓN PARA GUARDAR TUS PRONÓSTICOS.", "error");
    return;
  }
  
  const match = STATE.matches.find(m => m.match_no === matchNo);
  if (isMatchLocked(match)) {
    showToast("ESTE PARTIDO ESTÁ BLOQUEADO PARA PREDICCIONES.", "error");
    return;
  }
  
  // Restrict to match range #73 to #104 for non-admin users
  const isAdminUser = STATE.currentUser && STATE.currentUser.is_admin;
  if (!isAdminUser && (matchNo < 89 || matchNo > 104)) {
    showToast("ESTE PARTIDO NO ESTÁ DISPONIBLE PARA PRONÓSTICOS.", "error");
    return;
  }

  // Block if teams are not confirmed and user is not admin
  const isConfirmed = match.stage === 'group' || (match.resolved_home_code && match.resolved_away_code);
  if (!isConfirmed && !isAdminUser) {
    showToast("ESTE PARTIDO NO TIENE EQUIPOS CONFIRMADOS AÚN.", "error");
    return;
  }
  
  // Format inputs
  if (homeScoreVal === "" || awayScoreVal === "") {
    return;
  }
  
  const hs = parseInt(homeScoreVal, 10);
  const as = parseInt(awayScoreVal, 10);
  
  if (isNaN(hs) || isNaN(as) || hs < 0 || as < 0) {
    showToast("POR FAVOR INGRESE MARCADORES VÁLIDOS.", "error");
    return;
  }
  
  // Update local memory STATE
  if (!STATE.currentUser.predictions[matchNo]) {
    STATE.currentUser.predictions[matchNo] = { home_score: null, away_score: null, wildcard: false };
  }
  STATE.currentUser.predictions[matchNo].home_score = hs;
  STATE.currentUser.predictions[matchNo].away_score = as;
  
  if (hs === as) {
    STATE.currentUser.predictions[matchNo].extra_time_winner = extraTimeWinner || (STATE.currentUser.predictions[matchNo].extra_time_winner || null);
  } else {
    STATE.currentUser.predictions[matchNo].extra_time_winner = null;
  }
  STATE.currentUser.predictions[matchNo].penalties_winner = null;
  STATE.currentUser.predictions[matchNo].penalties_home_score = null;
  STATE.currentUser.predictions[matchNo].penalties_away_score = null;
  
  const userInUsers = STATE.users.find(u => u.cedula === STATE.currentUser.cedula);
  if (userInUsers) {
    userInUsers.predictions = STATE.currentUser.predictions;
  }

  if (!navigator.onLine) {
    const predData = {
      user_id: STATE.currentUser.id,
      match_no: matchNo,
      home_score: hs,
      away_score: as,
      wildcard: STATE.currentUser.predictions[matchNo].wildcard,
      extra_time_winner: STATE.currentUser.predictions[matchNo].extra_time_winner,
      penalties_winner: null,
      penalties_home_score: null,
      penalties_away_score: null
    };
    const queued = await queueOfflinePrediction(predData);
    if (queued) {
      triggerSaveVisualFeedback(matchNo);
      recalculateAllPoints();
      renderApp();
      renderMatchesView();
      showToast("PRONÓSTICO GUARDADO OFFLINE (SE SINCRONIZARÁ AL VOLVER A LA RED). 📡");
    } else {
      showToast("ERROR AL GUARDAR EL PRONÓSTICO LOCALMENTE.", "error");
    }
    return;
  }
  
  if (!supabaseClient) {
    showToast("ERROR DE CONEXIÓN CON EL SERVIDOR.", "error");
    return;
  }
  
  try {
    const { error } = await supabaseClient
      .from('predictions')
      .upsert({
        user_id: STATE.currentUser.id,
        match_no: matchNo,
        home_score: hs,
        away_score: as,
        wildcard: STATE.currentUser.predictions[matchNo].wildcard,
        extra_time_winner: STATE.currentUser.predictions[matchNo].extra_time_winner,
        penalties_winner: null,
        penalties_home_score: null,
        penalties_away_score: null
      }, { onConflict: 'user_id,match_no' });
      
    if (error) throw error;
    
    triggerSaveVisualFeedback(matchNo);
    recalculateAllPoints();
    renderApp();
    renderMatchesView();
  } catch (err) {
    console.warn("Supabase upsert failed silently, falling back to IndexedDB local queue:", err);
    const predData = {
      user_id: STATE.currentUser.id,
      match_no: matchNo,
      home_score: hs,
      away_score: as,
      wildcard: STATE.currentUser.predictions[matchNo].wildcard,
      extra_time_winner: STATE.currentUser.predictions[matchNo].extra_time_winner,
      penalties_winner: null,
      penalties_home_score: null,
      penalties_away_score: null
    };
    await queueOfflinePrediction(predData);
    triggerSaveVisualFeedback(matchNo);
    recalculateAllPoints();
    renderApp();
    renderMatchesView();
  }
}

// Explicit edit lock toggler for match card predictions
function toggleEditLock(matchNo) {
  const homeInput = document.getElementById(`home-score-${matchNo}`);
  const awayInput = document.getElementById(`away-score-${matchNo}`);
  const chipRow = document.getElementById(`chip-row-${matchNo}`);

  if (!homeInput || !awayInput) return;
  const currentlyDisabled = homeInput.disabled;

  if (currentlyDisabled) {
    // UNLOCK for editing
    homeInput.disabled = false;
    awayInput.disabled = false;
    homeInput.focus();
    if (chipRow) {
      const chip = chipRow.querySelector('.lock-saved-chip');
      if (chip) {
        chip.querySelector('.lock-saved-icon').textContent = '🔓';
        chip.querySelector('.lock-saved-label').innerHTML = 'Editando…';
        chip.classList.add('lock-saved-chip--editing');
      }
    }
    showToast(`PARTIDO #${matchNo} DESBLOQUEADO PARA EDICIÓN.`);
  } else {
    // RE-LOCK
    homeInput.disabled = true;
    awayInput.disabled = true;
    if (chipRow) {
      const chip = chipRow.querySelector('.lock-saved-chip');
      if (chip) {
        chip.querySelector('.lock-saved-icon').textContent = '🔒';
        chip.querySelector('.lock-saved-label').innerHTML = 'Guardado · <em>Editar</em>';
        chip.classList.remove('lock-saved-chip--editing');
      }
    }
    showToast(`PARTIDO #${matchNo} GUARDADO.`);
  }
}

// Wildcard management
// Toggle Wildcard on match (Only up to 3 wildcards active in total across all matches)
async function toggleWildcard(matchNo) {
  if (!STATE.currentUser) {
    showToast("INICIA SESIÓN PARA USAR TU COMODÍN.", "error");
    return;
  }
  
  const targetMatch = STATE.matches.find(m => m.match_no === matchNo);
  if (isMatchLocked(targetMatch)) {
    showToast("NO PUEDES CAMBIAR EL COMODÍN DE UN PARTIDO BLOQUEADO.", "error");
    return;
  }
  
  // Restrict to match range #73 to #104 for non-admin users (Knockout Stage)
  const isAdminUser = STATE.currentUser && STATE.currentUser.is_admin;
  if (!isAdminUser && (matchNo < 89 || matchNo > 104)) {
    showToast("ESTE PARTIDO NO ESTÁ DISPONIBLE PARA EL COMODÍN.", "error");
    return;
  }
  
  // Initialize pred object if empty
  if (!STATE.currentUser.predictions[matchNo]) {
    STATE.currentUser.predictions[matchNo] = { home_score: null, away_score: null, wildcard: false };
  }
  
  const currentlyActive = STATE.currentUser.predictions[matchNo].wildcard;
  const homeScore = STATE.currentUser.predictions[matchNo].home_score;
  const awayScore = STATE.currentUser.predictions[matchNo].away_score;
  
  if (!currentlyActive) {
    // Safety check: must have predicted first
    if (homeScore === null || awayScore === null) {
      showToast("DEBES INGRESAR UN PRONÓSTICO ANTES DE ACTIVAR EL COMODÍN.", "error");
      return;
    }
    
    // Count how many wildcards are already active (only on unlocked knockout matches)
    let activeCount = 0;
    STATE.matches.forEach(m => {
      if (!isMatchLocked(m) && m.match_no >= 89) {
        const pred = STATE.currentUser.predictions[m.match_no];
        if (pred && pred.wildcard) {
          activeCount++;
        }
      }
    });
    
    if (activeCount >= 3) {
      showToast("LÍMITE ALCANZADO: SÓLO PUEDES ACTIVAR HASTA 3 COMODINES EN TOTAL.", "error");
      return;
    }
    
    // Assign new wildcard
    STATE.currentUser.predictions[matchNo].wildcard = true;
    showToast(`¡COMODÍN PARLEY ACTIVADO PARA EL PARTIDO ${matchNo}!`);
  } else {
    // Turn it OFF
    STATE.currentUser.predictions[matchNo].wildcard = false;
    showToast("COMODÍN PARLEY DESACTIVADO.");
  }
  
  const userInUsers = STATE.users.find(u => u.cedula === STATE.currentUser.cedula);
  if (userInUsers) {
    userInUsers.predictions = STATE.currentUser.predictions;
  }

  if (!navigator.onLine) {
    const predData = {
      user_id: STATE.currentUser.id,
      match_no: matchNo,
      home_score: STATE.currentUser.predictions[matchNo].home_score,
      away_score: STATE.currentUser.predictions[matchNo].away_score,
      wildcard: STATE.currentUser.predictions[matchNo].wildcard
    };
    const queued = await queueOfflinePrediction(predData);
    if (queued) {
      recalculateAllPoints();
      renderApp();
      renderMatchesView();
      showToast("COMODÍN GUARDADO OFFLINE (SE SINCRONIZARÁ AL VOLVER A LA RED). 📡");
    } else {
      showToast("ERROR AL GUARDAR EL COMODÍN LOCALMENTE.", "error");
    }
    return;
  }
  
  if (!supabaseClient) {
    showToast("ERROR DE CONEXIÓN CON EL SERVIDOR.", "error");
    return;
  }
  
  try {
    const { error } = await supabaseClient
      .from('predictions')
      .upsert({
        user_id: STATE.currentUser.id,
        match_no: matchNo,
        home_score: STATE.currentUser.predictions[matchNo].home_score,
        away_score: STATE.currentUser.predictions[matchNo].away_score,
        wildcard: STATE.currentUser.predictions[matchNo].wildcard,
        extra_time_winner: STATE.currentUser.predictions[matchNo].extra_time_winner || null,
        penalties_winner: null,
        penalties_home_score: null,
        penalties_away_score: null
      }, { onConflict: 'user_id,match_no' });
      
    if (error) throw error;
    
    recalculateAllPoints();
    renderApp();
    renderMatchesView();
  } catch (err) {
    console.error("Error toggling wildcard in Supabase", err);
    const predData = {
      user_id: STATE.currentUser.id,
      match_no: matchNo,
      home_score: STATE.currentUser.predictions[matchNo].home_score,
      away_score: STATE.currentUser.predictions[matchNo].away_score,
      wildcard: STATE.currentUser.predictions[matchNo].wildcard,
      extra_time_winner: STATE.currentUser.predictions[matchNo].extra_time_winner || null,
      penalties_winner: null,
      penalties_home_score: null,
      penalties_away_score: null
    };
    await queueOfflinePrediction(predData);
    recalculateAllPoints();
    renderApp();
    renderMatchesView();
  }
}

// Tournament Specials: Group Leaders, Champion, Runner-up
async function saveTournamentSpecials(type, val, key = null) {
  if (!supabaseClient) {
    showToast("ERROR DE CONEXIÓN CON EL SERVIDOR.", "error");
    return;
  }
  if (!STATE.currentUser) return;
  
  const isGroupType = (type === 'group');
  const locked = isGroupType ? isSpecialPredictionsLocked() : isVidentePredictionsLocked();
  if (locked) {
    showToast("LAS PREDICCIONES DE ESTA SECCIÓN ESTÁN CERRADAS.", "error");
    return;
  }
  
  // Update local memory STATE
  if (!STATE.currentUser.special_predictions) {
    STATE.currentUser.special_predictions = { group_leaders: {} };
  }
  
  const dbGroupLetter = isGroupType ? key : type.toUpperCase(); // e.g. CHAMPION, SUBCHAMPION, THIRD_PLACE
  
  if (isGroupType) {
    STATE.currentUser.special_predictions.group_leaders[key] = val;
  } else {
    STATE.currentUser.special_predictions[type] = val;
  }
  
  const userInUsers = STATE.users.find(u => u.cedula === STATE.currentUser.cedula);
  if (userInUsers) {
    userInUsers.special_predictions = STATE.currentUser.special_predictions;
  }
  
  try {
    const { error } = await supabaseClient
      .from('group_leader_predictions')
      .upsert({
        user_id: STATE.currentUser.id,
        group_letter: dbGroupLetter,
        team_code: val
      }, { onConflict: 'user_id,group_letter' });
      
    if (error) throw error;
    
    recalculateAllPoints();
    renderApp();
    showToast("PREDICCIONES DE TORNEO ACTUALIZADAS.");
  } catch (err) {
    console.error("Error saving special prediction in Supabase", err);
    showToast("ERROR AL GUARDAR EN EL SERVIDOR.", "error");
  }
}

async function createLeague(nameVal) {
  if (!supabaseClient) {
    showToast("ERROR DE CONEXIÓN CON EL SERVIDOR.", "error");
    return;
  }
  if (!STATE.currentUser) return;
  const name = nameVal.trim();
  if (!name) {
    showToast("POR FAVOR INGRESA UN NOMBRE PARA EL GRUPO.", "error");
    return;
  }
  
  const code = generateCode();
  
  try {
    // 1. Insert league row
    const { data: dbLeague, error: leagueError } = await supabaseClient
      .from('leagues')
      .insert({
        code: code,
        name: name,
        owner_id: STATE.currentUser.id
      })
      .select()
      .single();
      
    if (leagueError) throw leagueError;
    
    // 2. Insert owner as the first member
    const { error: joinError } = await supabaseClient
      .from('league_members')
      .insert({
        league_id: dbLeague.id,
        user_id: STATE.currentUser.id
      });
      
    if (joinError) throw joinError;
    
    showToast(`¡LIGA "${name}" CREADA CON ÉXITO! CÓDIGO: ${code}`);
    
    // Refresh memory and view
    await syncFromSupabase();
    renderLeaguesView();
  } catch (err) {
    console.error("Error creating league in Supabase", err);
    showToast("ERROR AL CREAR LA LIGA EN EL SERVIDOR.", "error");
  }
}

async function joinLeague(codeVal) {
  if (!supabaseClient) {
    showToast("ERROR DE CONEXIÓN CON EL SERVIDOR.", "error");
    return;
  }
  if (!STATE.currentUser) return;
  const code = codeVal.trim().toUpperCase();
  if (code.length !== 5) {
    showToast("EL CÓDIGO DEBE TENER 5 CARACTERES.", "error");
    return;
  }
  
  try {
    // 1. Find league by code
    const { data: dbLeague, error: findError } = await supabaseClient
      .from('leagues')
      .select('id, name')
      .eq('code', code)
      .maybeSingle();
      
    if (findError || !dbLeague) {
      showToast("NO SE ENCONTRÓ NINGÚN GRUPO CON ESE CÓDIGO.", "error");
      return;
    }
    
    // 2. Insert member row
    const { error: joinError } = await supabaseClient
      .from('league_members')
      .insert({
        league_id: dbLeague.id,
        user_id: STATE.currentUser.id
      });
      
    if (joinError) {
      if (joinError.code === '23505') {
        showToast("YA ERES MIEMBRO DE ESTA LIGA.", "error");
      } else {
        throw joinError;
      }
      return;
    }
    
    showToast(`TE HAS UNIDO A LA LIGA "${dbLeague.name}".`);
    
    // Refresh memory and view
    await syncFromSupabase();
    renderLeaguesView();
  } catch (err) {
    console.error("Error joining league in Supabase", err);
    showToast("ERROR AL UNIRSE A LA LIGA EN EL SERVIDOR.", "error");
  }
}

// Authentication & Recovery Temp Variables
let tempRecoveryData = null;async function handleRegister() {
  if (!supabaseClient) {
    showToast("ERROR DE CONEXIÓN CON EL SERVIDOR.", "error");
    return;
  }
  const nameVal = document.getElementById('reg-name').value;
  const parleyUserVal = document.getElementById('reg-parley-username').value;
  const prefix = document.getElementById('reg-cedula-prefix').value;
  const num = document.getElementById('reg-cedula').value;
  const dobVal = document.getElementById('reg-dob').value;
  const emailVal = document.getElementById('reg-email').value;
  const phoneVal = document.getElementById('reg-phone').value;
  const passVal = document.getElementById('reg-password').value;
  const passConfVal = document.getElementById('reg-password-confirm').value;
  
  const cedula = formatCedulaInput(prefix, num);
  
  // Validations
  if (!nameVal.trim() || !num.trim() || !dobVal.trim() || !emailVal.trim() || !phoneVal.trim() || !passVal || !passConfVal) {
    showToast("TODOS LOS CAMPOS DEL REGISTRO SON OBLIGATORIOS Y DEBEN COMPLETARSE.", "error");
    return;
  }
  
  if (!nameVal.trim()) {
    showToast("EL NOMBRE COMPLETO ES REQUERIDO.", "error");
    return;
  }
  
  // Strict Regular Expression Check for Venezuelan Cédula de Identidad
  const cedulaRegex = /^(V|E)-[0-9]{6,8}$/;
  if (!cedulaRegex.test(cedula)) {
    showToast("CÉDULA INVÁLIDA. DEBE TENER EL FORMATO V-XXXXXXXX O E-XXXXXXXX.", "error");
    return;
  }
  
  if (!dobVal) {
    showToast("LA FECHA DE NACIMIENTO ES REQUERIDA.", "error");
    return;
  }
  if (!isAdult(dobVal)) {
    showToast("LO SENTIMOS, DEBES SER MAYOR DE 18 AÑOS PARA REGISTRARSE.", "error");
    document.getElementById('age-gate-error').style.display = 'block';
    return;
  }
  
  // Strict Email Validation
  const emailClean = emailVal.trim();
  if (!emailClean) {
    showToast("EL CORREO ELECTRÓNICO ES REQUERIDO.", "error");
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailClean)) {
    showToast("CORREO ELECTRÓNICO CON FORMATO INVÁLIDO.", "error");
    return;
  }
  
  // Strict Mobile phone format validation
  if (!phoneVal.trim()) {
    showToast("EL NÚMERO DE TELÉFONO ES REQUERIDO.", "error");
    return;
  }
  const phoneClean = phoneVal.replace(/\D/g, '');
  const phoneRegex = /^04(12|14|24|16|26)[0-9]{7}$/;
  if (!phoneRegex.test(phoneClean)) {
    showToast("TELÉFONO MÓVIL VENEZOLANO INVÁLIDO. EJEMPLO: 04141234567.", "error");
    return;
  }
  
  if (passVal.length < 6) {
    showToast("LA CONTRASEÑA DEBE TENER AL MENOS 6 CARACTERES.", "error");
    return;
  }
  if (passVal !== passConfVal) {
    showToast("LAS CONTRASEÑAS NO COINCIDEN.", "error");
    return;
  }
  
  try {
    // 1. Verificación preventiva de datos duplicados en profiles
    let orFilter = `cedula.eq."${cedula}",email.eq."${emailClean}",phone.eq."${phoneClean}"`;
    if (parleyUserVal.trim()) {
      orFilter += `,parley_username.eq."${parleyUserVal.trim()}"`;
    }
    
    const { data: duplicateUsers, error: checkError } = await supabaseClient
      .from('profiles')
      .select('cedula, email, phone, parley_username')
      .or(orFilter);
      
    if (checkError) {
      console.error("Error checking for duplicate profile details:", checkError);
    }
    
    if (duplicateUsers && duplicateUsers.length > 0) {
      const dupe = duplicateUsers[0];
      if (dupe.cedula === cedula) {
        showToast("⚠️ LA CÉDULA DE IDENTIDAD YA SE ENCUENTRA REGISTRADA.", "error");
        return;
      }
      if (dupe.email && dupe.email.toLowerCase() === emailClean.toLowerCase()) {
        showToast("⚠️ EL CORREO ELECTRÓNICO YA SE ENCUENTRA REGISTRADO.", "error");
        return;
      }
      if (dupe.phone === phoneClean) {
        showToast("⚠️ EL NÚMERO DE TELÉFONO YA SE ENCUENTRA REGISTRADO.", "error");
        return;
      }
      if (parleyUserVal.trim() && dupe.parley_username && dupe.parley_username.toLowerCase() === parleyUserVal.trim().toLowerCase()) {
        showToast("⚠️ EL NOMBRE DE USUARIO DE PARLEY.COM.VE YA SE ENCUENTRA REGISTRADO.", "error");
        return;
      }
    }

    // ponytail: Set registration flag in sessionStorage to prompt push permission only on first login session
    sessionStorage.setItem('just_registered_user', 'true');

    // 2. Register in Supabase Auth (Postgres trigger on_auth_user_created will insert public.profiles row automatically)
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email: emailClean,
      password: passVal,
      options: {
        data: {
          name: nameVal.trim(),
          cedula: cedula,
          parley_username: parleyUserVal.trim() || null,
          phone: phoneClean,
          dob: dobVal
        }
      }
    });
    
    if (authError) {
      showToast("ERROR EN EL REGISTRO: " + authError.message, "error");
      return;
    }
    
    if (authData.session) {
      showToast("¡REGISTRO EXITOSO! BIENVENIDO");
      // Sync state and login details
      await syncFromSupabase();
      closeAuthModal();
      
      // Trigger tutorial onboarding
      API.saveTutorialSeen(cedula, false);
      checkOnboardingTutorial();
      
      // Redraw app and navigate
      renderApp();
      navigateTo('inicio');
    } else {
      showToast("REGISTRO EXITOSO. Por favor confirma tu correo electrónico para iniciar sesión.", "info");
      closeAuthModal();
      openAuthModal('login');
    }
  } catch (err) {
    console.error("Registration error", err);
    showToast("ERROR AL CONECTAR CON EL SERVIDOR.", "error");
  }
}

// Recovery password flows are handled manually via support (redirection to parley.com.ve)

// Admin credentials checks
async function handleAdminLogin(password) {
  if (!supabaseClient) {
    showToast("ERROR DE CONEXIÓN CON EL SERVIDOR.", "error");
    return;
  }
  try {
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('email')
      .eq('cedula', 'V-12345678')
      .maybeSingle();
      
    if (!profile) {
      showToast("CUENTA DE ADMINISTRADOR NO CONFIGURADA EN EL SERVIDOR.", "error");
      return;
    }
    
    const { error } = await supabaseClient.auth.signInWithPassword({
      email: profile.email,
      password: password
    });
    
    if (error) {
      showToast("CONTRASEÑA DE ADMINISTRADOR INCORRECTA.", "error");
      return;
    }
    
    STATE.adminMode = true;
    await syncFromSupabase();
    showToast("ACCESO DE ADMINISTRADOR CONCEDIDO.");
    renderApp();
    renderAdminView();
  } catch (err) {
    console.error("Admin login error", err);
    showToast("ERROR AL CONECTAR CON EL SERVIDOR.", "error");
  }
}

// Access Login Controller
async function handleLogin(cedulaPrefix, cedulaNum, password) {
  if (!supabaseClient) {
    showToast("ERROR DE CONEXIÓN CON EL SERVIDOR.", "error");
    return false;
  }
  const cedula = formatCedulaInput(cedulaPrefix, cedulaNum);
  
  if (!cedulaNum.trim() || !password) {
    showToast("POR FAVOR INGRESA TU CÉDULA Y CONTRASEÑA.", "error");
    return false;
  }
  
  try {
    // 1. Get user's email by Cédula
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('email')
      .eq('cedula', cedula)
      .maybeSingle();
      
    if (profileError || !profile) {
      showToast("CÉDULA NO REGISTRADA EN LA POLLA.", "error");
      return false;
    }
    
    // 2. Sign in with the fetched email and password
    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
      email: profile.email,
      password: password
    });
    
    if (authError) {
      if (authError.message.includes("Email not confirmed")) {
        showToast("POR FAVOR VERIFICA TU CORREO ELECTRÓNICO PARA ACTIVAR TU CUENTA.", "error");
      } else {
        showToast("CONTRASEÑA INCORRECTA.", "error");
      }
      return false;
    }
    
    showToast("INICIO DE SESIÓN EXITOSO.");
    
    // 3. Sync from Supabase
    await syncFromSupabase();
    
    closeAuthModal();
    renderApp();
    
    // ponytail: Auto push notifications prompt only if just registered
    const justRegistered = sessionStorage.getItem('just_registered_user') === 'true';
    if (justRegistered) {
      sessionStorage.removeItem('just_registered_user');
      try {
        const toggleEl = document.getElementById('push-notifications-toggle');
        if (toggleEl) toggleEl.checked = true;
        await togglePushNotifications(true);
      } catch (e) {
        console.error("Auto push activation failed on login:", e);
      }
    }
    
    // 4. Check if user must change password (reset by admin)
    if (STATE.currentUser && STATE.currentUser.must_change_password) {
      showForcedPasswordChangeOverlay();
      return true;
    }
    
    if (STATE.currentUser && STATE.currentUser.is_admin) {
      navigateTo('admin');
    } else {
      navigateTo('inicio');
    }
    return true;
  } catch (err) {
    console.error("Login error", err);
    showToast("ERROR AL CONECTAR CON EL SERVIDOR.", "error");
    return false;
  }
}

async function handleLogout() {
  if (!supabaseClient) {
    STATE.currentUser = null;
    STATE.adminMode = false;
    API.setCurrentUser(null);
    showToast("SESIÓN CERRADA LOCALMENTE.");
    renderApp();
    navigateTo('inicio');
    return;
  }
  try {
    await supabaseClient.auth.signOut();
  } catch (err) {
    console.error("Error signing out from Supabase", err);
  }
  
  STATE.currentUser = null;
  STATE.adminMode = false;
  API.setCurrentUser(null);
  
  // Reload profiles map to clear user specific info
  await syncFromSupabase();
  
  showToast("SESIÓN CERRADA.");
  renderApp();
  navigateTo('inicio');
}

// Share app content natively or via clipboard copy fallback
function shareApp() {
  const shareUrl = window.location.origin + window.location.pathname;
  const shareData = {
    title: 'Polla Mundialista Parley',
    text: '🔥 ¡Llegó la Polla Mundialista de Parley! Demuestra tu conocimiento, arma tus pronósticos gratis y compite por premios espectaculares. ¿Estás listo para subir al podio? 👉 ¡Juega ahora! ⚽🏆',
    url: shareUrl
  };

  if (navigator.share) {
    navigator.share({
      title: shareData.title,
      text: `${shareData.text} ${shareUrl}`,
      url: shareUrl
    })
      .then(() => showToast("¡QUINIELA COMPARTIDA EXITOSAMENTE!"))
      .catch(err => {
        if (err && err.name === 'AbortError') return;
        console.log('Error al compartir:', err);
      });
  } else {
    // Fallback: Copy link to clipboard
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(`${shareData.text} ${shareUrl}`)
          .then(() => showToast("¡MENSAJE Y ENLACE DE LA QUINIELA COPIADO!"))
          .catch(err => showToast("ERROR AL COPIAR EL ENLACE.", "error"));
      } else {
        showToast("COMPARTIR NO COMPATIBLE EN ESTE NAVEGADOR.", "error");
      }
    } catch (err) {
      console.error("Clipboard write failed:", err);
      showToast("ERROR AL COPIAR EL ENLACE.", "error");
    }
  }
}

// User Profile Ticket View
function openTicketModal(user) {
  if (!user) {
    user = STATE.currentUser;
  }
  if (!user) return;
  
  STATE.activeTicketUser = user;
  
  const isMe = STATE.currentUser && STATE.currentUser.cedula === user.cedula;
  document.getElementById('ticket-modal-title-text').innerText = isMe ? "MI TICKET DE PRONÓSTICOS" : `TICKET DE ${user.name.toUpperCase()}`;
  
  const shareBtn = document.getElementById('btn-share-my-ticket');
  if (shareBtn) {
    shareBtn.style.display = isMe ? 'flex' : 'none';
  }
  
  const pushToggleContainer = document.getElementById('ticket-push-notifications-container');
  if (pushToggleContainer) {
    pushToggleContainer.style.display = isMe ? 'flex' : 'none';
  }
  const pushToggle = document.getElementById('push-notifications-toggle');
  const subpanel = document.getElementById('notification-preferences-subpanel');
  if (pushToggle && isMe) {
    const pushEnabled = sessionStorage.getItem('parley_wc_push_enabled') === 'true';
    pushToggle.checked = (typeof Notification !== 'undefined' && Notification.permission === 'granted' && pushEnabled);
    
    // Set notification preferences checkboxes
    const prefs = user.notification_preferences || { reminder: true, result: true, ranking: true, leagues: true };
    const prefReminder = document.getElementById('pref-reminder');
    const prefResult = document.getElementById('pref-result');
    const prefRanking = document.getElementById('pref-ranking');
    const prefLeagues = document.getElementById('pref-leagues');
    
    if (prefReminder) prefReminder.checked = prefs.reminder !== false;
    if (prefResult) prefResult.checked = prefs.result !== false;
    if (prefRanking) prefRanking.checked = prefs.ranking !== false;
    if (prefLeagues) prefLeagues.checked = prefs.leagues !== false;

    // Show/hide subpanel based on push enabled status
    if (subpanel) {
      subpanel.style.display = pushToggle.checked ? 'flex' : 'none';
    }
  } else {
    if (subpanel) subpanel.style.display = 'none';
  }
  
  document.getElementById('ticket-user-name').innerText = user.name;
  document.getElementById('ticket-user-id').innerText = user.id;
  document.getElementById('ticket-user-points').innerText = `${user.points} PTS`;
  
  // R3. Player UUID Privacy: Ticket Modal UI visibility
  const idContainer = document.getElementById('ticket-user-id-container');
  if (idContainer) {
    const isAdmin = (STATE.currentUser && STATE.currentUser.is_admin) || STATE.adminMode;
    idContainer.style.display = isAdmin ? 'block' : 'none';
  }
  
  const container = document.getElementById('my-ticket-predictions-container');
  container.innerHTML = "";
  
  STATE.matches.forEach(m => {
    if (m.match_no < 89 || m.match_no > 104) return;
    const pred = user.predictions[m.match_no];
    let predText = "Sin pronóstico";
    let wildcardHTML = "";
    let ptsEarned = 0;
    
    if (pred && pred.home_score !== null && pred.away_score !== null) {
      predText = `${pred.home_score} - ${pred.away_score}`;
      if (pred.wildcard) wildcardHTML = ' <span class="vs-wildcard-star">🚨</span>';
      
      // Calculate single match points
      if (m.home_score !== null && m.away_score !== null) {
        let matchPoints = 0;
        if (pred.home_score === m.home_score && pred.away_score === m.away_score) {
          matchPoints = 6;
        } else {
          const r_win = m.home_score > m.away_score ? 'home' : (m.home_score < m.away_score ? 'away' : 'draw');
          const p_win = pred.home_score > pred.away_score ? 'home' : (pred.home_score < pred.away_score ? 'away' : 'draw');
          if (r_win === p_win) {
            matchPoints += 3;
            if (m.home_score !== m.away_score && (m.home_score - m.away_score) === (pred.home_score - pred.away_score)) {
              matchPoints += 2;
            }
          }
        }
        
        // Extra knockout points for draw
        if (pred.home_score === pred.away_score && m.home_score === m.away_score) {
          const actualAdvancing = m.extra_time_winner || m.penalties_winner;
          if (pred.extra_time_winner && pred.extra_time_winner === actualAdvancing) {
            matchPoints += 1;
          }
        }
        
        if (pred.wildcard) matchPoints *= 2;
        ptsEarned = matchPoints;
      }
    }
    
    const realText = m.home_score !== null && m.away_score !== null ? `${m.home_score} - ${m.away_score}` : "Por jugar";
    
    const item = document.createElement('div');
    item.className = "ticket-row-item";
    item.innerHTML = `
      <div class="ticket-team-row">
        <div class="ticket-team-col home" style="flex: 1; justify-content: flex-end; text-align: right; min-width: 0; display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600;">
          ${getFlagHTML(m.home_name)}
          <span style="margin-left: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.home_name}</span>
        </div>
        <span class="ticket-score-badge" style="font-weight: 800; font-size: 13px; color: var(--accent); margin: 0 10px; min-width: 60px; text-align: center; white-space: nowrap; flex-shrink: 0;">${predText}${wildcardHTML}</span>
        <div class="ticket-team-col away" style="flex: 1; justify-content: flex-start; text-align: left; min-width: 0; display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600;">
          <span style="margin-right: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.away_name}</span>
          ${getFlagHTML(m.away_name)}
        </div>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 10px; color: var(--text-muted); margin-top: 4px; flex-wrap: wrap; gap: 4px;">
        <span>Partido #${m.match_no} (${m.group ? `Grupo ${m.group}` : ''})</span>
        <span>Real: <strong style="color: #FFF;">${realText}</strong> | Ganado: <strong style="color: var(--accent);">${ptsEarned} PTS</strong></span>
      </div>
    `;
    container.appendChild(item);
  });
  
  document.getElementById('ticket-modal').classList.add('active');
}

function closeTicketModal() {
  document.getElementById('ticket-modal').classList.remove('active');
}

async function shareUserTicket() {
  const user = STATE.activeTicketUser || STATE.currentUser;
  if (!user) return;
  
  showToast("Generando imagen de tu ticket... ⏳", "info");
  
  try {
    // Load logos and banner
    const logoSrc = "./Icono Oficial de la App.png";
    const parleyLogoSrc = "./PARLEY LOGO - copia (2).png";
    const bannerSrc = "./MUNDIAL DE GANADORES.jpg";
    
    const hash = btoa(user.cedula);
    const shareUrl = `${window.location.origin}${window.location.pathname}?ticket=${hash}`;
    
    // Generate QR code locally (PWA offline readiness) with maximum resolution
    const qrContainer = document.createElement('div');
    qrContainer.style.display = 'none';
    document.body.appendChild(qrContainer);
    
    new QRCode(qrContainer, {
      text: shareUrl,
      width: 256,
      height: 256,
      correctLevel: QRCode.CorrectLevel.H
    });
    
    const qrCanvas = qrContainer.querySelector('canvas');
    
    const [logoImg, parleyLogoImg, bannerImg] = await Promise.all([
      loadImage(logoSrc),
      loadImage(parleyLogoSrc),
      loadImage(bannerSrc)
    ]);

    // 5. Reinforce date logic
    const simDate = new Date(getCurrentTime());
    const year = simDate.getFullYear();
    const month = String(simDate.getMonth() + 1).padStart(2, '0');
    const day = String(simDate.getDate()).padStart(2, '0');
    const simDateStr = `${year}-${month}-${day}`; // "YYYY-MM-DD"

    // Get ALL matches of simulated today
    let matchesToShow = STATE.matches.filter(m => m.date.startsWith(simDateStr));
    let targetDayStr = simDateStr;

    if (matchesToShow.length === 0) {
      // Find nearest future date with matches
      const futureMatches = STATE.matches.filter(m => m.date.split(' ')[0] > simDateStr);
      if (futureMatches.length > 0) {
        const sortedFuture = [...futureMatches].sort((a, b) => a.date.localeCompare(b.date));
        targetDayStr = sortedFuture[0].date.split(' ')[0];
        matchesToShow = STATE.matches.filter(m => m.date.startsWith(targetDayStr));
      }
    }

    // Fallback if still empty
    if (matchesToShow.length === 0) {
      const sortedMatches = [...STATE.matches].sort((a, b) => a.date.localeCompare(b.date));
      if (sortedMatches.length > 0) {
        targetDayStr = sortedMatches[sortedMatches.length - 1].date.split(' ')[0];
        matchesToShow = STATE.matches.filter(m => m.date.startsWith(targetDayStr));
      }
    }

    matchesToShow.sort((a, b) => a.match_no - b.match_no);

    let displayDateText = "";
    const parts = targetDayStr.split('-');
    if (parts.length === 3) {
      const months = [
        "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
        "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
      ];
      const dVal = parseInt(parts[2], 10);
      const mIndex = parseInt(parts[1], 10) - 1;
      if (mIndex >= 0 && mIndex < 12) {
        displayDateText = ` (${dVal} DE ${months[mIndex]})`;
      }
    }

    // Dynamic height calculation
    const N = matchesToShow.length;
    const headerHeight = 485;
    const rowHeight = 85;
    const matchesHeight = N * rowHeight;
    const footerHeight = 200;
    const canvasHeight = headerHeight + matchesHeight + footerHeight;

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    
    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    grad.addColorStop(0, '#13223F');
    grad.addColorStop(1, '#080E1A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, canvasHeight);
    
    // Decorative grid lines
    ctx.strokeStyle = 'rgba(255, 223, 0, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 800; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvasHeight);
      ctx.stroke();
    }
    for (let j = 0; j < canvasHeight; j += 40) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(800, j);
      ctx.stroke();
    }
    
    // Draw top central logo
    if (logoImg) {
      ctx.drawImage(logoImg, 400 - 45, 40, 90, 90);
    }
    
    // Title
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFDF00';
    ctx.font = '900 36px Outfit, sans-serif';
    ctx.fillText("LA POLLA MUNDIALISTA", 400, 175);
    
    // 1. Symmetrical App Icon on the sides of the title
    if (logoImg) {
      const titleText = "LA POLLA MUNDIALISTA";
      const textWidth = ctx.measureText(titleText).width;
      const iconSize = 45;
      const gap = 15;
      const leftX = 400 - (textWidth / 2) - iconSize - gap;
      const rightX = 400 + (textWidth / 2) + gap;
      const iconY = 175 - 35;
      ctx.drawImage(logoImg, leftX, iconY, iconSize, iconSize);
      ctx.drawImage(logoImg, rightX, iconY, iconSize, iconSize);
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 22px Outfit, sans-serif';
    ctx.fillText("TICKET OFICIAL DE PRONÓSTICOS", 400, 210);
    
    // Profile Card background
    drawRoundedRect(ctx, 50, 245, 700, 155, 16);
    ctx.fillStyle = 'rgba(19, 34, 63, 0.6)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Avatar circle
    ctx.beginPath();
    ctx.arc(110, 322, 42, 0, Math.PI * 2);
    ctx.fillStyle = '#FFDF00';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Avatar text (initials)
    const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'P';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000000';
    ctx.font = '900 30px Outfit, sans-serif';
    ctx.fillText(initials, 110, 322);
    
    // Profile info text
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 24px Outfit, sans-serif';

    ctx.textBaseline = 'middle';
    ctx.fillText(user.name.toUpperCase(), 170, 322);
    ctx.textBaseline = 'alphabetic'; // Always restore afterwards
    // 2. Remove "Quiniela Patrocinada" text from the ticket profile card
    
    // Score Badge
    drawRoundedRect(ctx, 510, 275, 210, 95, 12);
    ctx.fillStyle = 'rgba(255, 223, 0, 0.08)';
    ctx.fill();
    ctx.strokeStyle = '#FFDF00';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFDF00';
    ctx.font = '900 34px Outfit, sans-serif';
    ctx.fillText(`${user.points} PTS`, 615, 325);
    
    ctx.fillStyle = '#94A3B8';
    ctx.font = '700 11px Outfit, sans-serif';
    ctx.fillText("PUNTAJE ACUMULADO", 615, 350);
    
    // List Title
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 20px Outfit, sans-serif';
    ctx.fillText("PRONÓSTICOS REGISTRADOS" + displayDateText, 50, 455);
    ctx.fillStyle = '#FFDF00';
    ctx.fillRect(50, 468, 80, 4);
    
    // Pre-load all flag images for matches displayed
    const flagPromises = [];
    matchesToShow.forEach(m => {
      flagPromises.push(loadImage(`https://flagcdn.com/w80/${getFlagCode(m.home_name)}.png`));
      flagPromises.push(loadImage(`https://flagcdn.com/w80/${getFlagCode(m.away_name)}.png`));
    });
    const flagImages = await Promise.all(flagPromises);
    
    // Draw prediction rows
    let startY = 495;
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i < matchesToShow.length; i++) {
      const m = matchesToShow[i];
      if (!m) continue;
      
      const pred = user.predictions[m.match_no];
      const hasPred = pred && pred.home_score !== null && pred.away_score !== null;
      const isWildcard = hasPred && pred.wildcard;
      
      const rowY = startY + i * rowHeight;
      
      // Zebra background
      ctx.fillStyle = (i % 2 === 0) ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(50, rowY, 700, 75);
      
      // Outline border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.strokeRect(50, rowY, 700, 75);
      
      // Match meta info
      ctx.textAlign = 'left';
      ctx.fillStyle = '#64748B';
      ctx.font = '700 11px Outfit, sans-serif';
      const stageShortNames = {
        'group': m.group ? `GRUPO ${m.group}` : 'Fase Grupos',
        'R32': '16VOS',
        'R16': '8VOS',
        'QF': '4TOS',
        'SF': 'SEMIS',
        'third': '3ER LUGAR',
        'final': 'FINAL'
      };
      const stageText = stageShortNames[m.stage] || m.stage || 'K.O.';
      ctx.fillText(`PARTIDO #${m.match_no} | ${stageText}`, 70, rowY + 20);
      
      // Draw Home flag
      const homeFlagImg = flagImages[i * 2];
      if (homeFlagImg) {
        ctx.drawImage(homeFlagImg, 315, rowY + 26, 35, 23);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(315, rowY + 26, 35, 23);
      }
      
      // Home Name
      ctx.textAlign = 'right';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 15px Outfit, sans-serif';
      ctx.fillText(m.home_name, 305, rowY + 45);
      
      // Score Badge Box
      drawRoundedRect(ctx, 360, rowY + 20, 80, 35, 6);
      ctx.fillStyle = 'rgba(7, 12, 20, 0.6)';
      ctx.fill();
      ctx.strokeStyle = hasPred ? '#FFDF00' : 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      
      // Score Text / stylized S/P
      ctx.textAlign = 'center';
      if (hasPred) {
        ctx.fillStyle = '#FFDF00';
        ctx.font = '900 18px Outfit, sans-serif';
        ctx.fillText(`${pred.home_score} - ${pred.away_score}`, 400, rowY + 37);
      } else {
        // 4. Stylized, centered and serious S/P
        ctx.fillStyle = '#94A3B8';
        ctx.font = '800 16px Outfit, sans-serif';
        ctx.fillText("S/P", 400, rowY + 37);
      }
      
      // Comodín Badge
      if (isWildcard) {
        ctx.fillStyle = '#FF0000';
        ctx.font = '14px Segoe UI Emoji, Apple Color Emoji, sans-serif';
        ctx.fillText("🚨", 425, rowY + 38);
      }
      
      // Draw Away flag
      const awayFlagImg = flagImages[i * 2 + 1];
      if (awayFlagImg) {
        ctx.drawImage(awayFlagImg, 450, rowY + 26, 35, 23);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(450, rowY + 26, 35, 23);
      }
      
      // Away Name
      ctx.textAlign = 'left';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 15px Outfit, sans-serif';
      ctx.fillText(m.away_name, 495, rowY + 45);
    }
    
    // 6. Bottom Cintillo: Use the image "MUNDIAL DE GANADORES.jpg" as a banner at the bottom of the ticket
    const footerY = headerHeight + matchesHeight;
    if (bannerImg) {
      ctx.drawImage(bannerImg, 0, footerY, 800, footerHeight);
    }
    
    // Draw PARLEY logo from "./PARLEY LOGO - copia (2).png" properly instead of plain text if loaded
    if (parleyLogoImg) {
      ctx.drawImage(parleyLogoImg, 40, footerY + 35, 180, 50);
    } else {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 22px Outfit, sans-serif';
      ctx.fillText("PARLEY.COM.VE", 40, footerY + 65);
    }
    
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFDF00';
    ctx.font = '700 12px Outfit, sans-serif';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3.5;
    ctx.strokeText("DISFRUTA CON LOS MEJORES", 40, footerY + 145);
    ctx.fillText("DISFRUTA CON LOS MEJORES", 40, footerY + 145);
    ctx.strokeText("JUEGA CON RESPONSABILIDAD | +18", 40, footerY + 125);
    ctx.fillText("JUEGA CON RESPONSABILIDAD | +18", 40, footerY + 125);
    
    // QR code background card
    drawRoundedRect(ctx, 630, footerY + 25, 130, 130, 8);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    
    if (qrCanvas) {
      ctx.drawImage(qrCanvas, 635, footerY + 30, 120, 120);
    }
    document.body.removeChild(qrContainer);
    
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFDF00';
    ctx.font = '900 11px Outfit, sans-serif';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3.5;
    ctx.strokeText("ESCANEA PARA JUGAR", 695, footerY + 175);
    ctx.fillText("ESCANEA PARA JUGAR", 695, footerY + 175);
    
    // Convert to blob and share
    canvas.toBlob((blob) => {
      if (!blob) {
        throw new Error("Blob conversion failed.");
      }
      
      const file = new File([blob], `quiniela_${user.id}.png`, { type: 'image/png' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          files: [file],
          title: `Mi Ticket - ${user.name}`,
          text: `🔥 ¡El Mundial se vive al límite! Llevo ${user.points} PTS acumulados en la Polla Mundialista de Parley. ¿Crees poder superar mi ticket? 🧠⚽ Entra gratis y arma tu jugada. 👉 ${shareUrl}`
        }).then(() => {
          showToast("¡IMAGEN DEL TICKET COMPARTIDA! 🚀");
        }).catch((err) => {
          if (err && err.name === 'AbortError') return;
          downloadTicketImage(blob, user.id);
        });
      } else {
        downloadTicketImage(blob, user.id);
      }
    }, 'image/png');
    
  } catch (error) {
    console.error("Error drawing ticket canvas:", error);
    showToast("Error al generar imagen de ticket.", "error");
    
    const hash = btoa(user.cedula);
    const shareUrl = `${window.location.origin}${window.location.pathname}?ticket=${hash}`;
    copyTextToClipboard(shareUrl, `🔥 ¡El Mundial se vive al límite! Llevo ${user.points} PTS acumulados en la Polla Mundialista de Parley. ¿Crees poder superar mi ticket? 🧠⚽ Entra gratis y arma tu jugada. 👉 ${shareUrl}`);
  }
}

// Helper: Load Image dynamically with CORS support
function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn("Failed to load image resource for canvas:", src);
      resolve(null);
    };
    img.src = src;
  });
}

// Helper: Canvas Rounded Rectangle
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Helper: Trigger browser download for desktop fallback
function downloadTicketImage(blob, userId) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `quiniela_ticket_${userId}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("TICKET DESCARGADO EN IMAGEN. ¡YA PUEDES SUBIRLO A TUS REDES! 🚀");
}

function copyTextToClipboard(url, introText) {
  const fullText = `${introText}\n${url}`;
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(fullText).then(() => {
        showToast("¡ENLACE DE TICKET COPIADO AL PORTAPAPELES!");
      }).catch(err => {
        fallbackCopyText(fullText);
      });
    } else {
      fallbackCopyText(fullText);
    }
  } catch (err) {
    console.error("Clipboard write failed:", err);
    fallbackCopyText(fullText);
  }
}

function fallbackCopyText(fullText) {
  try {
    const el = document.createElement('textarea');
    el.value = fullText;
    el.style.position = 'fixed';
    el.style.top = '-9999px';
    document.body.appendChild(el);
    el.select();
    const success = document.execCommand('copy');
    document.body.removeChild(el);
    if (success) {
      showToast("¡ENLACE DE TICKET COPIADO AL PORTAPAPELES!");
    } else {
      showToast("ERROR AL COPIAR EL ENLACE.", "error");
    }
  } catch (err) {
    console.error("Legacy copy failed:", err);
    showToast("ERROR AL COPIAR EL ENLACE.", "error");
  }
}

// Mobile touch gestures swipe navigation between spa sections
let touchstartX = 0;
let touchendX = 0;

function handleSwipeGesture(e) {
  // Avoid conflicts inside scrollable blocks or interactive components
  if (e.target.closest('.bracket-tree-container') || e.target.closest('#grupos') || e.target.closest('.bracket-wrapper') || e.target.closest('.special-pred-grid') || e.target.closest('input') || e.target.closest('select') || e.target.closest('button')) {
    return;
  }

  const sectionsList = ['inicio', 'pronosticos', 'clasificacion', 'grupos'];
  if (STATE.adminMode) {
    sectionsList.push('admin');
  }
  
  const activeSection = document.querySelector('.app-section.active');
  if (!activeSection) return;
  const currentId = activeSection.id;
  const currentIndex = sectionsList.indexOf(currentId);
  if (currentIndex === -1) return;
  
  const swipeThreshold = 80; // minimum touch drag distance
  const diff = touchstartX - touchendX;
  
  if (Math.abs(diff) > swipeThreshold) {
    if (diff > 0) {
      // Swipe left -> Next tab
      if (currentIndex < sectionsList.length - 1) {
        navigateTo(sectionsList[currentIndex + 1]);
      }
    } else {
      // Swipe right -> Previous tab
      if (currentIndex > 0) {
        navigateTo(sectionsList[currentIndex - 1]);
      }
    }
  }
}

document.addEventListener('touchstart', e => {
  touchstartX = e.changedTouches[0].screenX;
}, { passive: true });

document.addEventListener('touchend', e => {
  touchendX = e.changedTouches[0].screenX;
  handleSwipeGesture(e);
}, { passive: true });

// Onboarding welcome tutorial slides controller
let currentTutorialSlide = 0;
function checkOnboardingTutorial() {
  if (!STATE.currentUser) return;
  const seen = API.getTutorialSeen(STATE.currentUser.cedula);
  if (!seen) {
    openTutorialModal();
  }
}

// Interactive tutorial states - Simulator A (Victorias)
let tutAPredHome = 2;
let tutAPredAway = 1;
let tutAWildcard = false;
let tutAOption = 'exacto';

// Interactive tutorial states - Simulator B (Empates)
let tutBPredHome = 1;
let tutBPredAway = 1;
let tutBETWinner = 'home'; // Spain
let tutBWildcard = false;
let tutBOption = 'empate-clasif';

function openTutorialModal() {
  document.getElementById('tutorial-modal').classList.add('active');
  
  // Reset Simulator A states
  tutAPredHome = 2;
  tutAPredAway = 1;
  tutAWildcard = false;
  tutAOption = 'exacto';
  
  // Reset Simulator B states
  tutBPredHome = 1;
  tutBPredAway = 1;
  tutBETWinner = 'home';
  tutBWildcard = false;
  tutBOption = 'empate-clasif';
  
  // Reset Selector Buttons classes for Simulator A
  const buttonsA = document.querySelectorAll('#tutorial-modal .tutorial-slide:nth-child(2) .btn-tut-option');
  buttonsA.forEach(btn => btn.classList.remove('active'));
  const btnExactoA = document.getElementById('tut-a-opt-exacto');
  if (btnExactoA) btnExactoA.classList.add('active');
  
  const wbtnA = document.getElementById('tut-a-wildcard-btn');
  if (wbtnA) wbtnA.classList.remove('active');
  
  // Reset Selector Buttons classes for Simulator B
  const buttonsB = document.querySelectorAll('#tutorial-modal .tutorial-slide:nth-child(3) .btn-tut-option');
  buttonsB.forEach(btn => btn.classList.remove('active'));
  const btnClasifB = document.getElementById('tut-b-opt-empate-clasif');
  if (btnClasifB) btnClasifB.classList.add('active');
  
  const wbtnB = document.getElementById('tut-b-wildcard-btn');
  if (wbtnB) wbtnB.classList.remove('active');
  
  updateTutorialDemoA_UI();
  updateTutorialDemoB_UI();
  showTutorialSlide(0);
}

// Simulator A Handler
function selectTutorialDemoAOption(optionType) {
  const buttons = document.querySelectorAll('#tutorial-modal .tutorial-slide:nth-child(2) .btn-tut-option');
  buttons.forEach(btn => btn.classList.remove('active'));
  
  const activeBtn = document.getElementById('tut-a-opt-' + optionType);
  if (activeBtn) activeBtn.classList.add('active');
  
  tutAOption = optionType;
  
  if (optionType === 'exacto') {
    tutAPredHome = 2;
    tutAPredAway = 1;
  } else if (optionType === 'diferencia') {
    tutAPredHome = 3;
    tutAPredAway = 2;
  } else if (optionType === 'ganador') {
    tutAPredHome = 1;
    tutAPredAway = 0;
  } else if (optionType === 'errado') {
    tutAPredHome = 0;
    tutAPredAway = 1;
  }
  
  updateTutorialDemoA_UI();
}

function toggleTutorialAWildcard() {
  tutAWildcard = !tutAWildcard;
  const btn = document.getElementById('tut-a-wildcard-btn');
  if (btn) {
    if (tutAWildcard) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  }
  updateTutorialDemoA_UI();
}

function updateTutorialDemoA_UI() {
  const predScoreText = document.getElementById('tut-a-mock-score-pred');
  if (predScoreText) {
    let html = `<div style="font-weight: 700; font-size: 16px;">${tutAPredHome} - ${tutAPredAway}</div>`;
    if (tutAWildcard) {
      html += `<div style="font-size: 9px; margin-top: 4px; color: #ff9800; font-weight: 700; letter-spacing: 0.5px;">🚨 COMODÍN ACTIVO (x2)</div>`;
    }
    predScoreText.innerHTML = html;
  }
  
  // Real match stats España 2 - 1 Inglaterra
  const match = {
    home_score: 2,
    away_score: 1,
    extra_time_winner: null,
    penalties_winner: null
  };
  
  const pred = {
    home_score: tutAPredHome,
    away_score: tutAPredAway,
    extra_time_winner: null,
    wildcard: tutAWildcard
  };
  
  const grade = gradePrediction(pred, match);
  const badge = document.getElementById('tut-a-points-badge');
  if (badge) {
    badge.className = `user-points-badge ${grade.class}`;
    badge.innerText = grade.text;
  }
  
  // Explanatory Text for Selected Option (Error 5)
  const explanationEl = document.getElementById('tut-a-explanation');
  if (explanationEl) {
    let expText = "";
    if (tutAOption === 'exacto') {
      expText = tutAWildcard 
        ? "<strong>EXACTO:</strong> Ganas <strong>+12 PTS</strong> (marcador exacto de 6 PTS x2 por Comodín)."
        : "<strong>EXACTO:</strong> Ganas <strong>+6 PTS</strong> al acertar el marcador exacto (2-1).";
    } else if (tutAOption === 'diferencia') {
      expText = tutAWildcard
        ? "<strong>DIFERENCIA:</strong> Ganas <strong>+10 PTS</strong> (diferencia de goles de 5 PTS x2 por Comodín)."
        : "<strong>DIFERENCIA:</strong> Ganas <strong>+5 PTS</strong> por acertar el ganador y la misma diferencia de goles.";
    } else if (tutAOption === 'ganador') {
      expText = tutAWildcard
        ? "<strong>GANADOR:</strong> Ganas <strong>+6 PTS</strong> (ganador simple de 3 PTS x2 por Comodín)."
        : "<strong>GANADOR SIMPLE:</strong> Ganas <strong>+3 PTS</strong> por acertar quien gana el partido en los 90'.";
    } else if (tutAOption === 'errado') {
      expText = "<strong>ERRADO:</strong> Obtienes <strong>0 PTS</strong> al fallar el ganador del partido.";
    }
    explanationEl.innerHTML = expText;
  }
}

// Simulator B Handler
function selectTutorialDemoBOption(optionType) {
  const buttons = document.querySelectorAll('#tutorial-modal .tutorial-slide:nth-child(3) .btn-tut-option');
  buttons.forEach(btn => btn.classList.remove('active'));
  
  const activeBtn = document.getElementById('tut-b-opt-' + optionType);
  if (activeBtn) activeBtn.classList.add('active');
  
  tutBOption = optionType;
  
  if (optionType === 'empate-clasif') {
    tutBPredHome = 1;
    tutBPredAway = 1;
    tutBETWinner = 'home'; // Spain
  } else if (optionType === 'empate-simple') {
    tutBPredHome = 0; // Simple Draw: not exact (e.g. 0-0 predicted, 1-1 real)
    tutBPredAway = 0;
    tutBETWinner = 'home'; // Spain advances
  } else if (optionType === 'errado') {
    tutBPredHome = 2;
    tutBPredAway = 1;
    tutBETWinner = null;
  }
  
  updateTutorialDemoB_UI();
}

function toggleTutorialBWildcard() {
  tutBWildcard = !tutBWildcard;
  const btn = document.getElementById('tut-b-wildcard-btn');
  if (btn) {
    if (tutBWildcard) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  }
  updateTutorialDemoB_UI();
}

function updateTutorialDemoB_UI() {
  const predScoreText = document.getElementById('tut-b-mock-score-pred');
  if (predScoreText) {
    let html = `<div style="font-weight: 700; font-size: 16px;">${tutBPredHome} - ${tutBPredAway}</div>`;
    if (tutBPredHome === tutBPredAway) {
      if (tutBETWinner === 'home') {
        html += `<div style="font-size: 10px; margin-top: 2px; color: var(--accent-light); font-weight: 700;">Clasifica: ESPAÑA</div>`;
      } else if (tutBETWinner === 'away') {
        html += `<div style="font-size: 10px; margin-top: 2px; color: var(--accent-light); font-weight: 700;">Clasifica: INGLATERRA</div>`;
      }
    }
    if (tutBWildcard) {
      html += `<div style="font-size: 9px; margin-top: 4px; color: #ff9800; font-weight: 700; letter-spacing: 0.5px;">🚨 COMODÍN ACTIVO (x2)</div>`;
    }
    predScoreText.innerHTML = html;
  }
  
  // Real match stats España 1 - 1 Inglaterra (avanza España)
  const match = {
    home_score: 1,
    away_score: 1,
    extra_time_winner: 'home',
    penalties_winner: null
  };
  
  const pred = {
    home_score: tutBPredHome,
    away_score: tutBPredAway,
    extra_time_winner: tutBETWinner,
    wildcard: tutBWildcard
  };
  
  const grade = gradePrediction(pred, match);
  const badge = document.getElementById('tut-b-points-badge');
  if (badge) {
    badge.className = `user-points-badge ${grade.class}`;
    badge.innerText = grade.text;
  }
  
  // Explanatory Text for Selected Option (Error 5 & 6)
  const explanationEl = document.getElementById('tut-b-explanation');
  if (explanationEl) {
    let expText = "";
    if (tutBOption === 'empate-clasif') {
      expText = tutBWildcard
        ? "<strong>EMPATE EXACTO:</strong> Ganas <strong>+14 PTS</strong> (7 PTS totales x2 por Comodín)."
        : "<strong>EMPATE EXACTO:</strong> Ganas <strong>+7 PTS</strong> (6 PTS por el empate exacto 1-1 + 1 PT por acertar quién clasifica).";
    } else if (tutBOption === 'empate-simple') {
      expText = tutBWildcard
        ? "<strong>EMPATE SIMPLE:</strong> Ganas <strong>+8 PTS</strong> (4 PTS totales x2 por Comodín)."
        : "<strong>EMPATE SIMPLE:</strong> Ganas <strong>+4 PTS</strong> (3 PTS por acertar el empate en los 90' + 1 PT por acertar quién clasifica).";
    } else if (tutBOption === 'errado') {
      expText = "<strong>ERRADO:</strong> Obtienes <strong>0 PTS</strong> al fallar el empate del partido en los 90'.";
    }
    explanationEl.innerHTML = expText;
  }
}

function closeTutorialModal() {
  document.getElementById('tutorial-modal').classList.remove('active');
  if (STATE.currentUser) {
    API.saveTutorialSeen(STATE.currentUser.cedula, true);
  }
}

function showTutorialSlide(index) {
  const slides = document.querySelectorAll('.tutorial-slide');
  const dots = document.querySelectorAll('.tutorial-dots .dot');
  
  slides.forEach(s => s.classList.remove('active'));
  dots.forEach(d => d.classList.remove('active'));
  
  currentTutorialSlide = index;
  if (slides[index]) slides[index].classList.add('active');
  if (dots[index]) dots[index].classList.add('active');
  
  const btnNext = document.getElementById('btn-tutorial-next');
  if (btnNext) {
    if (index === slides.length - 1) {
      btnNext.innerText = "¡EMPEZAR A JUGAR!";
    } else {
      btnNext.innerText = "SIGUIENTE";
    }
  }
}

function nextTutorialSlide() {
  const slides = document.querySelectorAll('.tutorial-slide');
  if (currentTutorialSlide < slides.length - 1) {
    showTutorialSlide(currentTutorialSlide + 1);
  } else {
    closeTutorialModal();
  }
}


// Grades a user prediction for VS display
function gradePrediction(pred, match) {
  if (match.home_score === null || match.away_score === null) {
    return { class: "neutral", text: "PENDIENTE" };
  }
  if (!pred || pred.home_score === null || pred.away_score === null) {
    return { class: "wrong", text: "✕ SIN PRED" };
  }
  
  const H_p = pred.home_score;
  const A_p = pred.away_score;
  const H_r = match.home_score;
  const A_r = match.away_score;
  
  let regularPoints = 0;
  let diffPoints = 0;
  let isExact = false;
  
  if (H_p === H_r && A_p === A_r) {
    regularPoints = 6;
    isExact = true;
  } else {
    const r_winner = H_r > A_r ? 'home' : (H_r < A_r ? 'away' : 'draw');
    const p_winner = H_p > A_p ? 'home' : (H_p < A_p ? 'away' : 'draw');
    
    if (r_winner === p_winner) {
      regularPoints = 3;
      if (H_r !== A_r && (H_r - A_r) === (H_p - A_p)) {
        diffPoints = 2;
      }
    }
  }
  
  // Extra knockout points for draw
  let extraPoints = 0;
  if (H_p === A_p && H_r === A_r) {
    const actualAdvancing = match.extra_time_winner || match.penalties_winner;
    if (pred.extra_time_winner && pred.extra_time_winner === actualAdvancing) {
      extraPoints = 1;
    }
  }
  
  let earned = regularPoints + diffPoints + extraPoints;
  
  if (pred.wildcard) {
    earned *= 2;
  }
  
  const mult = pred.wildcard ? 2 : 1;
  const regVal = regularPoints * mult;
  const diffVal = diffPoints * mult;
  const extVal = extraPoints * mult;
  
  let text = "";
  let breakdown = "";
  
  if (isExact) {
    text = `⭐ EXACTO (+${earned})`;
    if (extraPoints > 0) {
      breakdown = `(+${regVal} Reg / +${extVal} Av)`;
    } else if (H_p === A_p && H_r === A_r) {
      breakdown = `(+${regVal} Reg / +0 Av)`;
    }
    return { class: "exact", text, breakdown };
  } else if (earned > 0) {
    text = `✓ ACIERTO (+${earned})`;
    if (extraPoints > 0) {
      breakdown = `(+${regVal} Reg / +${extVal} Av)`;
    } else if (H_p === A_p && H_r === A_r) {
      breakdown = `(+${regVal} Reg / +0 Av)`;
    } else if (diffPoints > 0) {
      breakdown = `(+${regVal} Reg / +${diffVal} Dif)`;
    }
    return { class: "correct", text, breakdown };
  } else {
    return { class: "wrong", text: "✕ ERRADO (0)", breakdown: "" };
  }
}

// Head-to-Head Compare Controller
async function openVSModal(cedulaB) {
  if (!STATE.currentUser) {
    showToast("INICIA SESIÓN PARA COMPARAR PREDICCIONES.", "error");
    return;
  }
  
  const userA = STATE.users.find(u => u.cedula === STATE.currentUser.cedula);
  const userB = STATE.users.find(u => u.cedula === cedulaB);
  
  if (!userA || !userB) return;

  // Load predictions and specials on-demand
  let loadedAny = false;
  if (!userA.predictionsLoaded && !userA.is_mock) {
    try {
      const loadedDataA = await loadUserData(userA.id);
      if (loadedDataA) {
        Object.assign(userA, loadedDataA);
        loadedAny = true;
      }
    } catch (err) {
      console.error("Error loading user data A for compare modal:", err);
      showToast("ERROR AL CARGAR TUS DATOS DE PRONÓSTICOS.", "error");
      closeVSModal();
      return;
    }
  }

  if (!userB.predictionsLoaded && !userB.is_mock) {
    try {
      const loadedDataB = await loadUserData(userB.id);
      if (loadedDataB) {
        Object.assign(userB, loadedDataB);
        loadedAny = true;
      }
    } catch (err) {
      console.error("Error loading user data B for compare modal:", err);
      showToast("ERROR AL CARGAR DATOS DEL USUARIO A COMPARAR.", "error");
      closeVSModal();
      return;
    }
  }
  
  // ponytail: ensure local calculations are fully completed for comparison
  recalculateAllPoints();
  
  document.getElementById('vs-name-a').innerText = userA.name;
  document.getElementById('vs-name-b').innerText = userB.name;
  updatePointsWithAnimation('vs-pts-a', `${userA.points} pts`);
  updatePointsWithAnimation('vs-pts-b', `${userB.points} pts`);
  
  // Render badges for User A (Tú)
  const badgesAContainer = document.getElementById('vs-badges-a');
  if (badgesAContainer) {
    badgesAContainer.innerHTML = "";
    const badgesListA = userA.badges || [];
    let totalBadgePtsA = 0;
    
    const wrapper = document.createElement('div');
    wrapper.className = 'vs-badges-container';
    
    badgesListA.forEach(bName => {
      const details = getBadgeDetails(bName);
      totalBadgePtsA += details.points;
      const chip = document.createElement('div');
      chip.className = 'vs-badge-chip';
      chip.innerHTML = `<span>${details.icon}</span> ${bName} (+${details.points})`;
      wrapper.appendChild(chip);
    });
    
    if (badgesListA.length === 0) {
      const emptyLabel = document.createElement('div');
      emptyLabel.style.color = 'var(--text-muted)';
      emptyLabel.style.fontSize = '11px';
      emptyLabel.innerText = "Sin insignias (0 pts)";
      wrapper.appendChild(emptyLabel);
    } else {
      const totalLabel = document.createElement('div');
      totalLabel.style.fontSize = '10px';
      totalLabel.style.color = 'var(--accent)';
      totalLabel.style.fontWeight = 'bold';
      totalLabel.style.width = '100%';
      totalLabel.innerText = `Total Insignias: +${totalBadgePtsA} pts`;
      wrapper.appendChild(totalLabel);
    }
    badgesAContainer.appendChild(wrapper);
  }

  // Render badges for User B (Rival)
  const badgesBContainer = document.getElementById('vs-badges-b');
  if (badgesBContainer) {
    badgesBContainer.innerHTML = "";
    const badgesListB = userB.badges || [];
    let totalBadgePtsB = 0;
    
    const wrapper = document.createElement('div');
    wrapper.className = 'vs-badges-container';
    
    badgesListB.forEach(bName => {
      const details = getBadgeDetails(bName);
      totalBadgePtsB += details.points;
      const chip = document.createElement('div');
      chip.className = 'vs-badge-chip';
      chip.innerHTML = `<span>${details.icon}</span> ${bName} (+${details.points})`;
      wrapper.appendChild(chip);
    });
    
    if (badgesListB.length === 0) {
      const emptyLabel = document.createElement('div');
      emptyLabel.style.color = 'var(--text-muted)';
      emptyLabel.style.fontSize = '11px';
      emptyLabel.innerText = "Sin insignias (0 pts)";
      wrapper.appendChild(emptyLabel);
    } else {
      const totalLabel = document.createElement('div');
      totalLabel.style.fontSize = '10px';
      totalLabel.style.color = 'var(--accent)';
      totalLabel.style.fontWeight = 'bold';
      totalLabel.style.width = '100%';
      totalLabel.innerText = `Total Insignias: +${totalBadgePtsB} pts`;
      wrapper.appendChild(totalLabel);
    }
    badgesBContainer.appendChild(wrapper);
  }
  
  // Compare row render
  const container = document.getElementById('vs-comparisons-container');
  container.innerHTML = "";
  
  const isAdminUser = STATE.currentUser && STATE.currentUser.is_admin;
  const visibleMatches = STATE.matches.filter(m => !m.hidden && (isAdminUser || (m.match_no >= 89 && m.match_no <= 104)));
  visibleMatches.forEach((m, index) => {
    const predA = userA.predictions[m.match_no];
    const predB = userB.predictions[m.match_no];
    const locked = isMatchLocked(m);
    
    // Grade predictions
    const gradeA = gradePrediction(predA, m);
    let gradeB = { class: "neutral", text: "OCULTO" };
    
    // Formatting predictions displays
    let displayA = "S/P";
    if (predA && predA.home_score !== null && predA.away_score !== null) {
      displayA = `${predA.home_score} - ${predA.away_score}`;
      if (predA.wildcard) displayA += ' <span class="vs-wildcard-star">🚨</span>';
    }
    
    let displayB = "🔒 OCULTO";
    
    if (locked) {
      if (predB && predB.home_score !== null && predB.away_score !== null) {
        displayB = `${predB.home_score} - ${predB.away_score}`;
        if (predB.wildcard) displayB += ' <span class="vs-wildcard-star">🚨</span>';
        gradeB = gradePrediction(predB, m);
      } else {
        displayB = "S/P";
        gradeB = { class: "wrong", text: "✕ SIN PRED" };
      }
    } else {
      // El partido no ha comenzado (no está bloqueado)
      if (userB.cedula === userA.cedula) {
        // Si somos nosotros mismos (Tú), mostramos nuestra predicción o S/P
        if (predB && predB.home_score !== null && predB.away_score !== null) {
          displayB = `${predB.home_score} - ${predB.away_score}`;
          if (predB.wildcard) displayB += ' <span class="vs-wildcard-star">🚨</span>';
          gradeB = gradePrediction(predB, m);
        } else {
          displayB = "S/P";
          gradeB = { class: "neutral", text: "PENDIENTE" };
        }
      } else {
        // Si es el rival, ocultamos totalmente su estado
        displayB = "🔒 OCULTO";
        gradeB = { class: "neutral", text: "OCULTO" };
      }
    }
    
    // Row elements
    const item = document.createElement('div');
    item.className = 'vs-compare-card';
    item.style.animationDelay = `${index * 0.02}s`;
    
    // Teams labels
    const homeFlag = getFlagHTML(m.home_name);
    const awayFlag = getFlagHTML(m.away_name);
    
    let realScoreText = "-";
    if (m.home_score !== null && m.away_score !== null) {
      realScoreText = `${m.home_score} - ${m.away_score}`;
    }
    
    item.innerHTML = `
      <div class="vs-match-info">
        <span>Partido ${m.match_no} (${m.stage.toUpperCase()})</span>
        <span style="color:var(--text-muted); font-weight:normal;">Grupo ${m.group}</span>
      </div>
      <div class="vs-teams-row">
        <div class="vs-team-display home">
          <span class="vs-country">${m.home_name.toUpperCase()}</span>
          ${homeFlag}
        </div>
        <div class="vs-real-badge">${realScoreText}</div>
        <div class="vs-team-display away">
          ${awayFlag}
          <span class="vs-country">${m.away_name.toUpperCase()}</span>
        </div>
      </div>
      <div class="vs-compare-predictions" style="display: grid; grid-template-columns: 1fr 40px 1fr; align-items: center; gap: 4px 12px; padding: 10px; border-radius: var(--radius-sm); background: rgba(0, 0, 0, 0.2);">
        <!-- Row 1: Users labels -->
        <span class="vs-pred-user-label" style="grid-column: 1; text-align: right; margin: 0; font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Tú</span>
        <span style="grid-column: 2;"></span>
        <span class="vs-pred-user-label" style="grid-column: 3; text-align: left; margin: 0; font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">${userB.name.split(' ')[0]}</span>
        
        <!-- Row 2: Prediction values -->
        <span class="vs-pred-val" style="grid-column: 1; justify-content: flex-end; margin: 0;">${displayA}</span>
        <span class="vs-compare-vs-text" style="grid-column: 2; text-align: center; margin: 0; padding: 0; font-size: 10px; font-weight: 900; color: var(--accent); text-shadow: 0 0 8px var(--accent-glow);">VS</span>
        <span class="vs-pred-val" style="grid-column: 3; justify-content: flex-start; margin: 0;">${displayB}</span>
        
        <!-- Row 3: Grade Tags -->
        <div style="grid-column: 1; display: flex; justify-content: flex-end; width: 100%;">
          ${gradeA.text ? `<span class="vs-grade-tag ${gradeA.class}" style="margin: 0; font-size: 8px; padding: 1.5px 4px;">${gradeA.text}</span>` : ''}
        </div>
        <div style="grid-column: 2;"></div>
        <div style="grid-column: 3; display: flex; justify-content: flex-start; width: 100%;">
          ${gradeB.text ? `<span class="vs-grade-tag ${gradeB.class}" style="margin: 0; font-size: 8px; padding: 1.5px 4px;">${gradeB.text}</span>` : ''}
        </div>
        
        <!-- Row 4: Breakdowns -->
        <div style="grid-column: 1; display: flex; justify-content: flex-end; width: 100%; min-height: ${gradeA.breakdown || gradeB.breakdown ? '12px' : '0px'};">
          ${gradeA.breakdown ? `<span class="vs-grade-breakdown" style="display: block; font-size: 8px; color: var(--text-secondary); font-weight: 700; white-space: nowrap; margin-top: 2px;">${gradeA.breakdown}</span>` : ''}
        </div>
        <div style="grid-column: 2;"></div>
        <div style="grid-column: 3; display: flex; justify-content: flex-start; width: 100%; min-height: ${gradeA.breakdown || gradeB.breakdown ? '12px' : '0px'};">
          ${gradeB.breakdown ? `<span class="vs-grade-breakdown" style="display: block; font-size: 8px; color: var(--text-secondary); font-weight: 700; white-space: nowrap; margin-top: 2px;">${gradeB.breakdown}</span>` : ''}
        </div>
      </div>
    `;
    container.appendChild(item);
  });
  
  document.getElementById('vs-modal').classList.add('active');
}

function closeVSModal() {
  document.getElementById('vs-modal').classList.remove('active');
}

// ponytail: helper to get badge icon and point value
function getBadgeDetails(badgeName) {
  switch (badgeName) {
    case "Ojo Clínico":
      return { icon: "👁️", points: 15 };
    case "Ganador Frecuente":
      return { icon: "🏆", points: 10 };
    case "Pronosticador Activo":
      return { icon: "⚡", points: 5 };
    case "El Vidente":
      return { icon: "🧙", points: 20 };
    case "HAT-TRICK VIP":
      return { icon: "👑", points: 20 };
    default:
      return { icon: "🏅", points: 0 };
  }
}

// ponytail: score update animation visual feedback
function updatePointsWithAnimation(elementId, newText) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const oldText = el.innerText;
  if (oldText !== String(newText)) {
    el.innerText = newText;
    el.classList.remove('animate-pulse-points');
    void el.offsetWidth; // force reflow
    el.classList.add('animate-pulse-points');
    setTimeout(() => {
      el.classList.remove('animate-pulse-points');
    }, 800);
  }
}

function getCurrentTime() {
  return Date.now();
}

// Navigation Controller
function navigateTo(sectionId) {
  if (sectionId !== 'shared-ticket-section') {
    sessionStorage.setItem('active_section', sectionId);
  }
  const sections = document.querySelectorAll('.app-section');
  sections.forEach(s => s.classList.remove('active'));
  
  const target = document.getElementById(sectionId);
  if (target) {
    target.classList.add('active');
  }
  
  const navItems = document.querySelectorAll('.mobile-nav-bar .nav-item');
  navItems.forEach(item => {
    item.classList.remove('active');
    const onClickAttr = item.getAttribute('onclick');
    if (onClickAttr && onClickAttr.includes(sectionId)) {
      item.classList.add('active');
    }
  });
  
  const navBar = document.querySelector('.mobile-nav-bar');
  if (navBar) {
    navBar.style.display = (sectionId === 'shared-ticket-section') ? 'none' : 'flex';
  }
  
  // Load view content dynamically
  if (sectionId === 'inicio') renderDashboardView();
  else if (sectionId === 'pronosticos') renderMatchesView();
  else if (sectionId === 'clasificacion') renderLeaguesView();
  else if (sectionId === 'grupos') renderBracketTreeView();
  else if (sectionId === 'admin') renderAdminView();
  
  // Close any open slide panel/overlays
  closeAuthModal();
}

// View Renderer: Dashboard
function renderDashboardView() {
  if (!STATE.currentUser) {
    document.getElementById('logged-out-hero').style.display = 'flex';
    document.getElementById('logged-in-dashboard').style.display = 'none';
    return;
  }
  
  document.getElementById('logged-out-hero').style.display = 'none';
  document.getElementById('logged-in-dashboard').style.display = 'block';
  
  // ponytail: Fallback to STATE.currentUser if user is not in the top 50 (Page 1 of leaderboard)
  const user = STATE.users.find(u => u.cedula === STATE.currentUser.cedula) || STATE.currentUser;
  
  // Clear any existing celebration card
  const existingCelebration = document.getElementById('dashboard-celebration-card');
  if (existingCelebration) {
    existingCelebration.remove();
  }
  
  if (checkTournamentFinished()) {
    // Calculate rank (excluding the administrator, fallback to local sort if rank is missing)
    const sorted = sortUsersLeaderboard(STATE.users.filter(u => u.cedula !== "V-12345678"));
    const rank = user.rank || (sorted.findIndex(u => u.cedula === user.cedula) + 1);
    
    const card = document.createElement('div');
    card.id = 'dashboard-celebration-card';
    
    if (rank === 1) {
      card.className = 'winner-card gold-theme';
      card.innerHTML = `
        <span class="winner-trophy">🏆</span>
        <div class="winner-title">¡1ER LUGAR - CAMPEÓN GLOBAL!</div>
        <p style="font-size:14px; color:#FFF; font-weight:700; text-transform:uppercase;">¡FELICITACIONES CAMPEÓN! HAS CONQUISTADO LA POLLA MUNDIALISTA PARLEY 2026 CON UNA PREDICCIÓN EXCEPCIONAL.</p>
        <p style="font-size:12px; color:var(--accent); margin-top:10px; font-weight:bold;">PUNTAJE: ${user.points} PTS</p>
      `;
    } else if (rank === 2) {
      card.className = 'winner-card silver-theme';
      card.innerHTML = `
        <span class="winner-trophy">🥈</span>
        <div class="winner-title">¡2DO LUGAR - SUBCAMPEÓN!</div>
        <p style="font-size:14px; color:#FFF; font-weight:700; text-transform:uppercase;">¡INCREÍBLE DESEMPEÑO! TE HAS LLEVADO EL SEGUNDO PUESTO EN EL PODIO DE GANADORES.</p>
        <p style="font-size:12px; color:#E2E8F0; margin-top:10px; font-weight:bold;">PUNTAJE: ${user.points} PTS</p>
      `;
    } else if (rank === 3) {
      card.className = 'winner-card bronze-theme';
      card.innerHTML = `
        <span class="winner-trophy">🥉</span>
        <div class="winner-title">¡3ER LUGAR - PODIO COMPLETO!</div>
        <p style="font-size:14px; color:#FFF; font-weight:700; text-transform:uppercase;">¡GRAN CAMPAÑA! TE SUBES AL PODIO NACIONAL EN EL TERCER PUESTO DE HONOR.</p>
        <p style="font-size:12px; color:var(--accent-orange); margin-top:10px; font-weight:bold;">PUNTAJE: ${user.points} PTS</p>
      `;
    } else {
      card.className = 'winner-card';
      card.style.background = 'rgba(255, 255, 255, 0.03)';
      card.style.borderColor = 'var(--border-sutil)';
      card.innerHTML = `
        <span style="font-size:40px;">👏</span>
        <div class="winner-title" style="color:#FFF;">¡GRACIAS POR PARTICIPAR!</div>
        <p style="font-size:13px; color:var(--text-secondary); text-transform:uppercase; line-height:1.4;">Felicitaciones por tu esfuerzo, constancia y gran ánimo deportivo a lo largo de todo el Torneo de la Polla.</p>
        <p style="font-size:12px; color:var(--text-muted); margin-top:10px; font-weight:bold;">TU POSICIÓN FINAL: #${rank} | PUNTAJE: ${user.points} PTS</p>
      `;
    }
    
    // Prepend to dashboard element
    const dashEl = document.getElementById('logged-in-dashboard');
    dashEl.insertBefore(card, dashEl.firstChild);
  }
  
  document.getElementById('dash-user-name').innerText = user.name;
  document.getElementById('dash-user-points').innerText = `${user.points} PUNTOS`;
  
  // Stats
  const exacts = user.exacts_count || 0;
  const correct1x2 = (user.outcomes_count || 0) - exacts;
  
  document.getElementById('stat-exacts').innerText = exacts;
  document.getElementById('stat-1x2').innerText = correct1x2;
  
  // Streak calculations and rendering
  const streakData = calculateUserStreak(user);
  document.getElementById('dash-current-streak').innerText = `${streakData.currentStreak} PARTIDO${streakData.currentStreak === 1 ? '' : 'S'} CONSECUTIVO${streakData.currentStreak === 1 ? '' : 'S'}`;
  document.getElementById('dash-max-streak').innerText = `${streakData.maxStreak} 🔥`;
  
  // Render badges
  const badgesContainer = document.getElementById('dash-badges-container');
  const allAvailableBadges = [
    { id: "Ojo Clínico", icon: "👁️", desc: "Acertar 3 marcadores exactos" },
    { id: "Ganador Frecuente", icon: "🏆", desc: "Acertar más de 6 ganadores simples (1X2)" },
    { id: "Pronosticador Activo", icon: "⚡", desc: "Pronosticar más de 12 juegos" },
    { id: "El Vidente", icon: "🧙", desc: "Acertar el podio exacto: Campeón, Subcampeón y Tercero de la Copa" },
    { id: "HAT-TRICK VIP", icon: "👑", desc: "Requisitos: 3 tickets en Parley VIP de al menos 3 jugadas cada ticket y sin repetir los logros (TODOS DEBEN SER JUEGOS DEL MUNDIAL)" }
  ];
  
  badgesContainer.innerHTML = "";
  allAvailableBadges.forEach(b => {
    const hasBadge = user.badges ? user.badges.includes(b.id) : false;
    const item = document.createElement('div');
    item.className = `badge-item ${hasBadge ? 'active' : ''}`;
    item.title = b.desc;
    item.innerHTML = `
      <div class="badge-icon">${b.icon}</div>
      <div class="badge-name">${b.id}</div>
    `;
    item.onclick = () => openBadgeModal(b.id, b.icon, b.desc, hasBadge);
    badgesContainer.appendChild(item);
  });
}

// View Renderer: Matches Predictions
let activeMatchSubTab = 'group'; // default sub-tab
function setMatchSubTab(tabName) {
  activeMatchSubTab = tabName;
  const buttons = document.querySelectorAll('.toggle-tab-sub-btn');
  buttons.forEach(b => b.classList.remove('active'));
  
  event.target.classList.add('active');
  renderMatchesView();
}

function onKnockoutSubOptionChange(matchNo) {
  const radios = document.getElementsByName(`et-winner-${matchNo}`);
  let etWinner = null;
  for (const r of radios) {
    if (r.checked) {
      etWinner = r.value;
      break;
    }
  }
  
  const labelHome = document.getElementById(`label-et-home-${matchNo}`);
  const labelAway = document.getElementById(`label-et-away-${matchNo}`);
  if (labelHome && labelAway) {
    if (etWinner === 'home') {
      labelHome.classList.add('selected');
      labelHome.classList.remove('negado');
      labelAway.classList.add('negado');
      labelAway.classList.remove('selected');
    } else if (etWinner === 'away') {
      labelAway.classList.add('selected');
      labelAway.classList.remove('negado');
      labelHome.classList.add('negado');
      labelHome.classList.remove('selected');
    } else {
      labelHome.classList.remove('selected', 'negado');
      labelAway.classList.remove('selected', 'negado');
    }
  }
  
  const homeScore = document.getElementById(`home-score-${matchNo}`).value;
  const awayScore = document.getElementById(`away-score-${matchNo}`).value;
  
  saveUserPrediction(
    matchNo,
    homeScore,
    awayScore,
    etWinner || null,
    null,
    null,
    null
  );
}

function renderMatchesView() {
  const container = document.getElementById('matches-scroller');
  container.innerHTML = "";
  
  const dateFilterWrapper = document.getElementById('match-date-filter-container');
  if (activeMatchSubTab === 'specials') {
    if (dateFilterWrapper) dateFilterWrapper.style.display = 'none';
    renderSpecialPredictionsView();
    return;
  }
  
  if (activeMatchSubTab === 'group') {
    if (dateFilterWrapper) dateFilterWrapper.style.display = 'flex';
    if (!STATE.dateFilterPopulated && STATE.matches.length > 0) {
      populateMatchDateFilter();
      STATE.dateFilterPopulated = true;
    }
  } else {
    if (dateFilterWrapper) dateFilterWrapper.style.display = 'none';
  }
  
  // Filter matches
  let filtered = STATE.matches;
  
  // Hide hidden matches for non-admin users and restrict user predictions list to range 73-104
  const isAdminUser = STATE.currentUser && STATE.currentUser.is_admin;
  if (!isAdminUser) {
    filtered = filtered.filter(m => !m.hidden && m.match_no >= 89 && m.match_no <= 104);
  }

  if (activeMatchSubTab === 'group') {
    filtered = filtered.filter(m => m.stage !== 'group');
    if (STATE.matchDateFilter && STATE.matchDateFilter !== 'all') {
      filtered = filtered.filter(m => m.date && m.date.startsWith(STATE.matchDateFilter));
    }
  } else if (activeMatchSubTab === 'knockouts') {
    filtered = filtered.filter(m => m.stage !== 'group');
  }
  
  // Resolve Brackets dynamic outcomes (advances team names)
  resolveBrackets(STATE.matches);
  
  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-secondary);">No hay partidos en esta etapa.</div>`;
    return;
  }
  
  const stageNames = {
    'group': 'FASE DE GRUPOS',
    'R32': 'DIECISEISAVOS DE FINAL',
    'R16': 'OCTAVOS DE FINAL',
    'QF': 'CUARTOS DE FINAL',
    'SF': 'SEMIFINAL',
    'third': 'TERCER LUGAR',
    'final': 'GRAN FINAL'
  };

  // Generate HTML for each card
  filtered.forEach(m => {
    const locked = isMatchLocked(m);
    
    // User prediction values
    let predHomeVal = "";
    let predAwayVal = "";
    let wildcardActive = false;
    let etWinner = "";
    
    if (STATE.currentUser) {
      const pred = STATE.currentUser.predictions[m.match_no];
      if (pred) {
        predHomeVal = pred.home_score !== null ? pred.home_score : "";
        predAwayVal = pred.away_score !== null ? pred.away_score : "";
        wildcardActive = pred.wildcard || false;
        etWinner = pred.extra_time_winner || "";
      }
    }
    
    // Check if predictions are filled and page editing should lock automatically.
    // If it's a draw, only lock if who advances has also been selected (etWinner is filled).
    const isDraw = (predHomeVal !== "" && predAwayVal !== "" && parseInt(predHomeVal, 10) === parseInt(predAwayVal, 10));
    const isEditLocked = (predHomeVal !== "" && predAwayVal !== "" && (!isDraw || etWinner !== ""));
    const isAdmin = STATE.currentUser && STATE.currentUser.is_admin;
    const isConfirmed = m.stage === 'group' || (m.resolved_home_code && m.resolved_away_code);
    const isDisabled = locked || isEditLocked || (!isConfirmed && !isAdmin);
    
    const card = document.createElement('div');
    card.className = `match-card ${locked ? 'locked' : ''} ${!isConfirmed ? 'unconfirmed' : ''}`;
    
    const homeFlag = getFlagHTML(m.home_name);
    const awayFlag = getFlagHTML(m.away_name);
    
    // Score display for locked matches / real outcomes
    let realScoreHTML = `
      <div class="score-inputs-wrapper" id="score-wrapper-${m.match_no}">
        <input type="number" min="0" inputmode="numeric" autocomplete="off" class="score-input" value="${predHomeVal}"
          onchange="saveUserPrediction(${m.match_no}, this.value, document.getElementById('away-score-${m.match_no}').value)"
          id="home-score-${m.match_no}" ${isDisabled ? 'disabled' : ''}>
        <span class="score-separator">-</span>
        <input type="number" min="0" inputmode="numeric" autocomplete="off" class="score-input" value="${predAwayVal}"
          onchange="saveUserPrediction(${m.match_no}, document.getElementById('home-score-${m.match_no}').value, this.value)"
          id="away-score-${m.match_no}" ${isDisabled ? 'disabled' : ''}>
      </div>
    `;
    
    const formatted = formatDateVZLA(m.date);
    
    // Status label: only shown for blocked state; saved state is handled by chip-row
    let statusLabelHTML = "";
    if (m.home_score !== null && m.away_score !== null) {
      statusLabelHTML = `<span class="card-lock-status blocked" style="color:var(--accent); font-weight:800;">🏆 ${m.home_score} - ${m.away_score}</span>`;
    } else if (locked) {
      statusLabelHTML = `<span class="card-lock-status blocked">🔒 BLOQUEADO</span>`;
    } else if (!isConfirmed) {
      statusLabelHTML = `<span class="card-lock-status blocked" style="background: rgba(245, 158, 11, 0.15); color: #F59E0B; border: 1.5px solid rgba(245, 158, 11, 0.3);">⚠️ POR CONFIRMAR</span>`;
    }
    
    // Calculate user points and reason details for completed or locked matches
    let pointsBadgeHTML = "";
    if (m.home_score !== null && m.away_score !== null) {
      if (predHomeVal !== "" && predAwayVal !== "") {
        const predObj = {
          home_score: parseInt(predHomeVal),
          away_score: parseInt(predAwayVal),
          wildcard: wildcardActive,
          extra_time_winner: STATE.currentUser ? (STATE.currentUser.predictions[m.match_no] ? STATE.currentUser.predictions[m.match_no].extra_time_winner : null) : null,
          penalties_winner: STATE.currentUser ? (STATE.currentUser.predictions[m.match_no] ? STATE.currentUser.predictions[m.match_no].penalties_winner : null) : null,
          penalties_home_score: STATE.currentUser ? (STATE.currentUser.predictions[m.match_no] ? STATE.currentUser.predictions[m.match_no].penalties_home_score : null) : null,
          penalties_away_score: STATE.currentUser ? (STATE.currentUser.predictions[m.match_no] ? STATE.currentUser.predictions[m.match_no].penalties_away_score : null) : null
        };
        const grade = gradePrediction(predObj, m);
        pointsBadgeHTML = `
          <span class="user-points-badge ${grade.class}" style="display: inline-flex; flex-direction: column; align-items: center; gap: 2px;">
            <span>${grade.text}</span>
            ${grade.breakdown ? `<span style="font-size: 8.5px; opacity: 0.85; font-weight: normal; white-space: nowrap;">${grade.breakdown}</span>` : ''}
          </span>
        `;
      } else {
        pointsBadgeHTML = `<span class="user-points-badge wrong">✕ SIN PRONÓSTICO (0 PTS)</span>`;
      }
    } else if (locked) {
      pointsBadgeHTML = `<span class="user-points-badge pending">⏳ PUNTUACIÓN PENDIENTE</span>`;
    }

    // Knockout draw sub-options UI
    let subOptionsHTML = "";
    if (m.stage !== 'group' && predHomeVal !== "" && predAwayVal !== "" && parseInt(predHomeVal, 10) === parseInt(predAwayVal, 10)) {
      const pred = STATE.currentUser ? STATE.currentUser.predictions[m.match_no] : null;
      const etWinner = pred ? (pred.extra_time_winner || "") : "";
      const disabledStr = (locked || isEditLocked) ? 'disabled' : '';
      
      const hasSelected = etWinner === 'home' || etWinner === 'away';
      const homeClass = etWinner === 'home' ? 'selected' : (hasSelected ? 'negado' : '');
      const awayClass = etWinner === 'away' ? 'selected' : (hasSelected ? 'negado' : '');

      subOptionsHTML = `
        <div class="knockout-sub-options" style="margin: 12px 0 4px; padding: 12px; background: rgba(255,255,255,0.02); border-radius: var(--radius-md); border: 1px dashed rgba(255,255,255,0.08); display: flex; flex-direction: column; gap: 8px;">
          <div style="font-size: 11px; font-weight: 700; color: var(--accent); letter-spacing: 0.5px; text-transform: uppercase;">¿Quién supera la ronda?</div>
          <div style="display: flex; gap: 16px; align-items: center; justify-content: flex-start; margin-top: 4px;">
            <label class="advancing-option-label ${homeClass}" id="label-et-home-${m.match_no}">
              <input type="radio" name="et-winner-${m.match_no}" value="home" ${etWinner === 'home' ? 'checked' : ''} 
                onchange="onKnockoutSubOptionChange(${m.match_no})" ${disabledStr}>
              <span class="custom-radio-circle"></span>
              ${getFlagHTML(m.home_name)}
            </label>
            <label class="advancing-option-label ${awayClass}" id="label-et-away-${m.match_no}">
              <input type="radio" name="et-winner-${m.match_no}" value="away" ${etWinner === 'away' ? 'checked' : ''} 
                onchange="onKnockoutSubOptionChange(${m.match_no})" ${disabledStr}>
              <span class="custom-radio-circle"></span>
              ${getFlagHTML(m.away_name)}
            </label>
          </div>
        </div>
      `;
    }

    const stageLabel = stageNames[m.stage] || m.stage;

    card.innerHTML = `
      <div class="match-meta">
        <span style="font-weight:800; font-size:11px; color:var(--accent); letter-spacing: 0.5px;">#${m.match_no} - ${stageLabel}</span>
        <div style="display:flex; align-items:center; gap:8px;">
          ${statusLabelHTML}
          <span style="font-size:12px; font-weight:600; color:#FFF;">${formatted.date} • ${formatted.time}</span>
        </div>
      </div>
      <div class="match-teams-grid">
        <div class="team-container home">
          <span class="team-name-label">${m.home_name}</span>
          ${homeFlag}
        </div>
        ${realScoreHTML}
        <div class="team-container away">
          ${awayFlag}
          <span class="team-name-label">${m.away_name}</span>
        </div>
      </div>
      ${subOptionsHTML}
      <div class="chip-row" id="chip-row-${m.match_no}">
        ${locked ? pointsBadgeHTML : (!isConfirmed && !isAdmin) ? `
          <span class="card-lock-status blocked" style="font-size:10px; background: rgba(255,255,255,0.05); color: var(--text-muted); border-color: rgba(255,255,255,0.1);">🔒 BLOQUEADO</span>
        ` : (isEditLocked) ? `
          <button class="lock-saved-chip" id="lock-btn-${m.match_no}" onclick="toggleEditLock(${m.match_no})" title="Toca para editar">
            <span class="lock-saved-icon">🔒</span>
            <span class="lock-saved-label">Guardado · <em>Editar</em></span>
          </button>
        ` : `
          <span class="card-lock-status pending" style="font-size:10px;">🔓 PENDIENTE</span>
        `}
      </div>
      <div class="match-card-footer">
        <button class="wildcard-btn ${wildcardActive ? 'active' : ''}" onclick="toggleWildcard(${m.match_no})" title="Comodín Parley (Puntos Dobles)" ${locked ? 'disabled style="cursor:not-allowed"' : ''}>
          <span class="wildcard-alarm">🚨</span><span style="font-size:11px; font-weight:700; letter-spacing: 0.03em;">COMODÍN</span>
        </button>
        <span class="match-venue">📍 ${m.venue}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

// ponytail: helper to look up team name by its ID/code
function getTeamNameById(teamId) {
  if (!teamId) return "";
  for (const teams of Object.values(STATE.groups)) {
    const found = teams.find(t => t.id === teamId);
    if (found) return found.name;
  }
  return teamId;
}

function renderSpecialPredictionsView() {
  const container = document.getElementById('matches-scroller');
  container.innerHTML = "";
  
  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.gap = '20px';
  
  // Card 1: El Vidente de la Copa
  const videnteCard = document.createElement('div');
  videnteCard.className = "glass-card";
  
  const videnteLocked = isVidentePredictionsLocked();
  
  // Get the 16 qualified teams from the R16 matches (to restrict selection options for El Vidente)
  const activeTeamCodes = new Set();
  STATE.matches.forEach(m => {
    if (m.stage === 'R16') {
      if (m.home_code) activeTeamCodes.add(m.home_code);
      if (m.away_code) activeTeamCodes.add(m.away_code);
    }
  });

  const allTeamsList = [];
  Object.values(STATE.groups).forEach(teamList => {
    teamList.forEach(t => {
      if (activeTeamCodes.has(t.id)) {
        allTeamsList.push(t);
      }
    });
  });
  allTeamsList.sort((a, b) => a.name.localeCompare(b.name));
  
  const getOptionsHTML = (selectedVal) => {
    let opts = `<option value="">Seleccionar país...</option>`;
    allTeamsList.forEach(t => {
      opts += `<option value="${t.id}" ${selectedVal === t.id ? 'selected' : ''}>${t.name}</option>`;
    });
    return opts;
  };
  
  const savedChamp = STATE.currentUser && STATE.currentUser.special_predictions ? (STATE.currentUser.special_predictions.champion || "") : "";
  const savedSubchamp = STATE.currentUser && STATE.currentUser.special_predictions ? (STATE.currentUser.special_predictions.subchampion || "") : "";
  const savedThird = STATE.currentUser && STATE.currentUser.special_predictions ? (STATE.currentUser.special_predictions.third_place || "") : "";
  
  const m104 = STATE.matches.find(m => m.match_no === 104);
  const m103 = STATE.matches.find(m => m.match_no === 103);
  let videntePointsHTML = "";
  
  if (m104 && m104.home_score !== null && m104.away_score !== null &&
      m103 && m103.home_score !== null && m103.away_score !== null) {
    const actChamp = m104.home_score > m104.away_score ? m104.resolved_home_code : (m104.home_score < m104.away_score ? m104.resolved_away_code : (m104.extra_time_winner === 'home' || m104.penalties_winner === 'home' ? m104.resolved_home_code : m104.resolved_away_code));
    const actSubchamp = m104.home_score > m104.away_score ? m104.resolved_away_code : (m104.home_score < m104.away_score ? m104.resolved_home_code : (m104.extra_time_winner === 'home' || m104.penalties_winner === 'home' ? m104.resolved_away_code : m104.resolved_home_code));
    const actThird = m103.home_score > m103.away_score ? m103.resolved_home_code : (m103.home_score < m103.away_score ? m103.resolved_away_code : (m103.extra_time_winner === 'home' || m103.penalties_winner === 'home' ? m103.resolved_home_code : m103.resolved_away_code));

    const isAllCorrect = (savedChamp === actChamp && savedSubchamp === actSubchamp && savedThird === actThird);
    
    if (isAllCorrect) {
      videntePointsHTML = `
        <div class="special-points-badge exact" style="margin-top: 12px; padding: 8px 12px; background: rgba(76,175,80,0.15); border: 1px solid rgba(76,175,80,0.3); border-radius: 6px;">
          🧙 EL VIDENTE: ¡ACIERTO COMPLETO! (+20 PTS)
        </div>
      `;
    } else {
      videntePointsHTML = `
        <div class="special-points-badge wrong" style="margin-top: 12px; padding: 8px 12px; background: rgba(244,67,54,0.15); border: 1px solid rgba(244,67,54,0.3); border-radius: 6px;">
          ✕ PODIO ERRADO (0 PTS)
          <div style="font-size: 11px; margin-top: 4px; color: #aaa;">Real: 1° ${getTeamNameById(actChamp)}, 2° ${getTeamNameById(actSubchamp)}, 3° ${getTeamNameById(actThird)}</div>
        </div>
      `;
    }
  } else if (videnteLocked) {
    videntePointsHTML = `<div class="special-points-badge pending" style="margin-top: 12px; padding: 8px 12px; background: rgba(255,235,59,0.15); border: 1px solid rgba(255,235,59,0.3); border-radius: 6px;">⏳ PENDIENTE (En juego)</div>`;
  }
  
  videnteCard.innerHTML = `
    <h3 style="margin-bottom:12px; color:var(--accent);">CUADRO DE HONOR: EL VIDENTE DE LA COPA</h3>
    <p style="font-size:13px; color:var(--text-secondary); margin-bottom:20px; line-height: 1.6;">
      Pronostica los tres primeros lugares de la Copa del Mundo 2026 antes del inicio de los Cuartos de Final.
      <br><br>
      🎯 <strong>¿Cómo sumas puntos?</strong>
      <br>• <strong>Insignia El Vidente:</strong> Si aciertas los tres puestos exactamente (Campeón, Subcampeón y Tercer Puesto) consigues <strong>+20 PTS</strong>.
      <br><br>
      🔒 <strong>Cierre de Predicciones:</strong> Esta sección se bloqueará estrictamente el <strong>9 de julio de 2026 a las 4:00 PM (Hora de Venezuela)</strong> (kickoff del primer partido de cuartos).
      ${videnteLocked ? '<br><span class="lockout-badge" style="margin-top:6px; display:inline-block; padding:3px 8px; background:rgba(244,67,54,0.2); border:1px solid #f44336; border-radius:4px; font-size:10px; color:#f44336; font-weight:800;">🔒 PREDICCIONES CERRADAS</span>' : ''}
    </p>
    <div class="special-pred-card" style="margin-bottom:0">
      <div class="special-pred-title">🧙 EL VIDENTE DE LA COPA (+20 PTS POR INSIGNIA)</div>
      <div class="special-pred-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: 12px;">
        <div class="special-select-group" style="display: flex; flex-direction: column; gap: 4px;">
          <span class="special-select-label" style="font-size: 11px; font-weight: 700; color: var(--accent-light);">🥇 CAMPEÓN</span>
          <select class="special-select-input" onchange="saveTournamentSpecials('champion', this.value)" ${videnteLocked ? 'disabled' : ''} style="width: 100%; background: #1a1a1a; color: #fff; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; padding: 6px 12px; font-size: 13px; outline: none; cursor: pointer;">
            ${getOptionsHTML(savedChamp)}
          </select>
        </div>
        <div class="special-select-group" style="display: flex; flex-direction: column; gap: 4px;">
          <span class="special-select-label" style="font-size: 11px; font-weight: 700; color: var(--accent-light);">🥈 SUBCAMPEÓN</span>
          <select class="special-select-input" onchange="saveTournamentSpecials('subchampion', this.value)" ${videnteLocked ? 'disabled' : ''} style="width: 100%; background: #1a1a1a; color: #fff; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; padding: 6px 12px; font-size: 13px; outline: none; cursor: pointer;">
            ${getOptionsHTML(savedSubchamp)}
          </select>
        </div>
        <div class="special-select-group" style="display: flex; flex-direction: column; gap: 4px;">
          <span class="special-select-label" style="font-size: 11px; font-weight: 700; color: var(--accent-light);">🥉 TERCER PUESTO</span>
          <select class="special-select-input" onchange="saveTournamentSpecials('third_place', this.value)" ${videnteLocked ? 'disabled' : ''} style="width: 100%; background: #1a1a1a; color: #fff; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; padding: 6px 12px; font-size: 13px; outline: none; cursor: pointer;">
            ${getOptionsHTML(savedThird)}
          </select>
        </div>
      </div>
      ${videntePointsHTML}
    </div>
  `;
  wrapper.appendChild(videnteCard);
  container.appendChild(wrapper);
}

// View Renderer: Leagues and Global Leaderboard
let activeLeagueTab = 'global'; // default league tab
function setLeagueTab(tabName) {
  activeLeagueTab = tabName;
  const buttons = document.querySelectorAll('.league-tab-btn');
  buttons.forEach(b => b.classList.remove('active'));
  
  event.target.classList.add('active');
  renderLeaguesView();
}

// Simplify long names for display
function simplifyName(name) {
  if (!name) return "";
  if (name.length <= 20) return name;
  
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name.slice(0, 20);
  
  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  
  const firstLast = `${firstName} ${lastName}`;
  if (firstLast.length <= 20) return firstLast;
  
  const abbreviatedLast = `${firstName} ${lastName.charAt(0)}.`;
  if (abbreviatedLast.length <= 20) return abbreviatedLast;
  
  return firstName.slice(0, 18) + "..";
}

function renderLeaguesView() {
  const publicPanel = document.getElementById('public-league-panel');
  const privatePanel = document.getElementById('private-league-panel');
  
  // Run points recalculation to make sure ratings are 100% correct
  recalculateAllPoints();
  
  // Sort users (excluding the administrator) for private leagues
  const sortedUsers = sortUsersLeaderboard(STATE.users.filter(u => u.cedula !== "V-12345678"));
  
  if (activeLeagueTab === 'global') {
    publicPanel.style.display = 'block';
    privatePanel.style.display = 'none';
    
    // Render Podium (only visible on page 1)
    const podiumEl = document.querySelector('.podium-container');
    if (STATE.leaderboardPage === 1) {
      if (podiumEl) podiumEl.style.display = 'flex';
      
      const pod1 = STATE.leaderboardData[0];
      const pod2 = STATE.leaderboardData[1];
      const pod3 = STATE.leaderboardData[2];
      
      document.getElementById('pod-name-1').innerText = pod1 ? simplifyName(pod1.name) : "-";
      document.getElementById('pod-pts-1').innerText = pod1 ? `${pod1.total_points} pts` : "0 pts";
      document.getElementById('pod-avatar-1').innerText = pod1 ? pod1.name.slice(0, 2).toUpperCase() : "?";
      
      document.getElementById('pod-name-2').innerText = pod2 ? simplifyName(pod2.name) : "-";
      document.getElementById('pod-pts-2').innerText = pod2 ? `${pod2.total_points} pts` : "0 pts";
      document.getElementById('pod-avatar-2').innerText = pod2 ? pod2.name.slice(0, 2).toUpperCase() : "?";
      
      document.getElementById('pod-name-3').innerText = pod3 ? simplifyName(pod3.name) : "-";
      document.getElementById('pod-pts-3').innerText = pod3 ? `${pod3.total_points} pts` : "0 pts";
      document.getElementById('pod-avatar-3').innerText = pod3 ? pod3.name.slice(0, 2).toUpperCase() : "?";
      
      // Click listeners
      document.getElementById('pod-spot-1').onclick = () => { if (pod1) openVSModal(pod1.cedula); };
      document.getElementById('pod-spot-2').onclick = () => { if (pod2) openVSModal(pod2.cedula); };
      document.getElementById('pod-spot-3').onclick = () => { if (pod3) openVSModal(pod3.cedula); };
      
      const finished = checkTournamentFinished();
      if (finished) {
        if (podiumEl) podiumEl.classList.add('finished');
        document.getElementById('pod-spot-1').classList.add('celebrate');
        document.getElementById('pod-spot-2').classList.add('celebrate');
        document.getElementById('pod-spot-3').classList.add('celebrate');
      } else {
        if (podiumEl) podiumEl.classList.remove('finished');
        document.getElementById('pod-spot-1').classList.remove('celebrate');
        document.getElementById('pod-spot-2').classList.remove('celebrate');
        document.getElementById('pod-spot-3').classList.remove('celebrate');
      }
    } else {
      if (podiumEl) podiumEl.style.display = 'none';
    }
    
    // Render ranking list
    const tbody = document.getElementById('global-leaderboard-body');
    tbody.innerHTML = "";
    
    // Slice out the top 3 podium spots only on Page 1
    const displayList = STATE.leaderboardPage === 1 
      ? STATE.leaderboardData.slice(3) 
      : STATE.leaderboardData;
    
    displayList.forEach(user => {
      const position = user.rank;
      const tr = document.createElement('tr');
      
      const isCurrentUser = STATE.currentUser && user.cedula === STATE.currentUser.cedula;
      if (isCurrentUser) {
        tr.className = "leaderboard-row user-row-highlight";
      } else {
        tr.className = "leaderboard-row";
      }
      tr.onclick = () => openVSModal(user.cedula);
      
      const badgeCount = user.calculated_badges ? user.calculated_badges.length : 0;
      
      const badgeBg = isCurrentUser ? "var(--accent)" : "rgba(255,255,255,0.05)";
      const badgeColor = isCurrentUser ? "#000" : "var(--text-primary)";
      const badgeWeight = isCurrentUser ? "800" : "normal";
      
      const nameHtml = isCurrentUser 
        ? `<span style="color:var(--accent);">${user.name}</span> <span style="font-size:11px; color:#FFF; font-weight:normal; background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:10px; margin-left:4px;">Tú</span>`
        : `${user.name}`;
      
      const subHtml = isCurrentUser
        ? `<div style="font-size:11px; color:rgba(255,255,255,0.75);">${badgeCount} insignias</div>`
        : `<div style="font-size:11px; color:var(--text-secondary);">${badgeCount} insignias</div>`;
      
      const ptsHtml = isCurrentUser
        ? `<td style="text-align:right; font-weight:800; color:var(--accent); font-size:16px;">${user.total_points} pts</td>`
        : `<td style="text-align:right; font-weight:800; color:var(--accent); font-size:15px;">${user.total_points} pts</td>`;

      tr.innerHTML = `
        <td style="width:50px;"><div class="rank-badge" style="background:${badgeBg}; color:${badgeColor}; font-weight:${badgeWeight};">${position}</div></td>
        <td>
          <div style="font-weight:700;">${nameHtml}</div>
          ${subHtml}
        </td>
        ${ptsHtml}
      `;
      tbody.appendChild(tr);
    });

    // Special user row if not on the current page
    if (STATE.currentUser) {
      const userOnPage = STATE.leaderboardData.some(u => u.cedula === STATE.currentUser.cedula);
      if (!userOnPage && STATE.currentUser.rank) {
        const trEllipsis = document.createElement('tr');
        trEllipsis.style.pointerEvents = 'none';
        trEllipsis.innerHTML = `
          <td colspan="3" style="text-align:center; padding:12px 0; color:var(--text-muted); font-weight:bold; letter-spacing:4px;">•••</td>
        `;
        tbody.appendChild(trEllipsis);

        const userRank = STATE.currentUser.rank;
        const u = STATE.currentUser;
        const trUser = document.createElement('tr');
        trUser.className = "leaderboard-row user-row-highlight";
        trUser.onclick = () => openVSModal(u.cedula);
        
        const badgeCount = u.badges ? u.badges.length : 0;
        const fontSz = userRank > 999 ? '10px' : (userRank > 99 ? '11px' : '12px');
        
        trUser.innerHTML = `
          <td style="width:50px;"><div class="rank-badge" style="background:var(--accent); color:#000; font-weight:800; font-size:${fontSz};">${userRank}</div></td>
          <td>
            <div style="font-weight:700; color:var(--accent);">${u.name} <span style="font-size:11px; color:#FFF; font-weight:normal; background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:10px; margin-left:4px;">Tú</span></div>
            <div style="font-size:11px; color:rgba(255,255,255,0.75);">${badgeCount} insignias</div>
          </td>
          <td style="text-align:right; font-weight:800; color:var(--accent); font-size:16px;">${u.points} pts</td>
        `;
        tbody.appendChild(trUser);
      }
    }
    
    // Update pagination controls UI
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    const currentPageNum = document.getElementById('current-page-num');
    const totalPagesNum = document.getElementById('total-pages-num');
    const totalPlayersCount = document.getElementById('total-players-count');
    
    const totalPages = Math.ceil(STATE.leaderboardTotalCount / STATE.leaderboardPageSize) || 1;
    
    if (currentPageNum) currentPageNum.innerText = STATE.leaderboardPage;
    if (totalPagesNum) totalPagesNum.innerText = totalPages;
    if (totalPlayersCount) totalPlayersCount.innerText = STATE.leaderboardTotalCount;
    
    if (prevBtn) prevBtn.disabled = (STATE.leaderboardPage <= 1);
    if (nextBtn) nextBtn.disabled = (STATE.leaderboardPage >= totalPages);
  } else {
    // Private Leagues Mode
    publicPanel.style.display = 'none';
    privatePanel.style.display = 'block';
    
    const container = document.getElementById('private-leagues-list');
    container.innerHTML = "";
    
    if (!STATE.currentUser) {
      container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-secondary);">INICIA SESIÓN PARA CREAR O UNIRSE A LIGAS PRIVADAS.</div>`;
      return;
    }
    
    // Get leagues this user is member of
    const userLeagues = STATE.leagues.filter(l => l.members.includes(STATE.currentUser.cedula));
    
    if (userLeagues.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:30px; color:var(--text-secondary); line-height:1.6;">
          NO FORMAS PARTE DE NINGUNA LIGA PRIVADA.
          <br>¡CREA TU PROPIA LIGA O ÚNETE A UNA INGRESANDO EL CÓDIGO!
        </div>
      `;
      return;
    }
    
    userLeagues.forEach(league => {
      const card = document.createElement('div');
      card.className = "glass-card";
      
      // Get member profiles & sort by score
      const membersData = sortUsersLeaderboard(STATE.users.filter(u => league.members.includes(u.cedula)));
                                     
      // Render members list
      let rowsHTML = "";
      membersData.forEach((member, mIdx) => {
        const medal = mIdx === 0 ? "🥇" : (mIdx === 1 ? "🥈" : (mIdx === 2 ? "🥉" : `${mIdx + 1}`));
        rowsHTML += `
          <tr class="leaderboard-row" onclick="openVSModal('${member.cedula}')">
            <td style="width:30px; font-weight:bold; font-size:13px;">${medal}</td>
            <td>
              <div style="font-weight:700;">${member.name}</div>
            </td>
            <td style="text-align:right; font-weight:800; color:var(--accent);">${member.points} pts</td>
          </tr>
        `;
      });
      
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-sutil); padding-bottom:10px; margin-bottom:12px;">
          <div>
            <h3 style="color:var(--accent); font-size:18px;">${league.name}</h3>
            <span style="font-size:11px; color:var(--text-secondary);">CÓDIGO ÚNICO: <strong style="color:#FFF; cursor:pointer;" onclick="shareLeagueCode('${league.code}', '${league.name.replace(/'/g, "\\'")}')" title="Copiar/Compartir código">${league.code} 📋</strong></span>
          </div>
          <button class="btn-sim-action" onclick="shareLeagueCode('${league.code}', '${league.name.replace(/'/g, "\\'")}')" style="padding:6px 12px; font-size:11px; border: 1.5px solid #FFFFFF;">COMPARTIR CÓDIGO</button>
        </div>
        <table class="leaderboard-table">
          <thead>
            <tr>
              <th style="width:30px;">Pos</th>
              <th>Jugador</th>
              <th style="text-align:right;">Puntos</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
      `;
      container.appendChild(card);
    });
  }
}

async function changeLeaderboardPage(page) {
  // Disable buttons during load
  const prevBtn = document.getElementById('prev-page-btn');
  const nextBtn = document.getElementById('next-page-btn');
  if (prevBtn) prevBtn.disabled = true;
  if (nextBtn) nextBtn.disabled = true;
  
  STATE.leaderboardPage = page;
  
  const { data, count } = await fetchPaginatedLeaderboard(page);
  STATE.leaderboardData = data || [];
  STATE.leaderboardTotalCount = count || 0;
  
  // Merge newly fetched profiles into STATE.users so modals can locate them
  if (data) {
    data.forEach(p => {
      const existing = STATE.users.find(u => u.cedula === p.cedula);
      if (!existing) {
        STATE.users.push({
          id: p.user_id,
          cedula: p.cedula,
          name: p.name,
          points: p.total_points,
          badges: p.calculated_badges || [],
          exacts_count: p.exacts_count || 0,
          outcomes_count: p.outcomes_count || 0,
          successful_wildcards_count: p.successful_wildcards_count || 0,
          predictions: {},
          special_predictions: { group_leaders: {} },
          predictionsLoaded: false
        });
      } else {
        existing.points = p.total_points;
        existing.badges = p.calculated_badges || [];
        existing.exacts_count = p.exacts_count || 0;
        existing.outcomes_count = p.outcomes_count || 0;
        existing.successful_wildcards_count = p.successful_wildcards_count || 0;
      }
    });
  }
  
  renderLeaguesView();
}

async function handlePrevPage() {
  if (STATE.leaderboardPage > 1) {
    await changeLeaderboardPage(STATE.leaderboardPage - 1);
  }
}

async function handleNextPage() {
  const totalPages = Math.ceil(STATE.leaderboardTotalCount / STATE.leaderboardPageSize) || 1;
  if (STATE.leaderboardPage < totalPages) {
    await changeLeaderboardPage(STATE.leaderboardPage + 1);
  }
}

// Helper: Share Private League Code (Web Share API on Mobile, clipboard on desktop)
function shareLeagueCode(code, name) {
  const shareText = `¡Únete a mi liga privada "${name}" en la Polla Mundialista usando el código: ${code}! Juega gratis y demuestra tus conocimientos aquí: ${window.location.origin}`;
  
  if (navigator.share && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
    navigator.share({
      title: `Invitación a Liga ${name}`,
      text: shareText,
      url: window.location.origin
    }).then(() => {
      showToast("¡ENLACE DE INVITACIÓN COMPARTIDO! 🚀");
    }).catch((err) => {
      if (err && err.name === 'AbortError') return;
      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          navigator.clipboard.writeText(code)
            .then(() => showToast("CÓDIGO DE LIGA COPIADO AL PORTAPAPELES. ¡COMPÁRTELO CON TUS AMIGOS! 🚀"))
            .catch(() => showToast("ERROR AL COPIAR EL CÓDIGO.", "error"));
        } else {
          showToast("COMPARTIR NO COMPATIBLE EN ESTE NAVEGADOR.", "error");
        }
      } catch (clipErr) {
        console.error("Clipboard fallback failed:", clipErr);
        showToast("ERROR AL COPIAR EL CÓDIGO.", "error");
      }
    });
  } else {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(code)
          .then(() => showToast("CÓDIGO DE LIGA COPIADO AL PORTAPAPELES. ¡COMPÁRTELO CON TUS AMIGOS! 🚀"))
          .catch(() => showToast("ERROR AL COPIAR EL CÓDIGO.", "error"));
      } else {
        showToast("COMPARTIR NO COMPATIBLE EN ESTE NAVEGADOR.", "error");
      }
    } catch (clipErr) {
      console.error("Clipboard write failed:", clipErr);
      showToast("ERROR AL COPIAR EL CÓDIGO.", "error");
    }
  }
}

// View Renderer: Groups standings
function focusMatchInPredictions(matchNo) {
  // 1. Set sub tab to knockouts
  activeMatchSubTab = 'knockouts';
  
  // Highlight predictions tab in sub-menu
  const subBtns = document.querySelectorAll('.toggle-tabs-sub .toggle-tab-sub-btn');
  subBtns.forEach(btn => {
    if (btn.innerText.includes('FASE') || btn.innerText.includes('FINAL') || btn.innerText.includes('PRONÓSTICOS')) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // 2. Navigate to predictions tab
  navigateTo('pronosticos');
  
  // 3. Wait for DOM render, scroll to match and highlight
  setTimeout(() => {
    const cardEl = document.getElementById(`home-score-${matchNo}`);
    if (cardEl) {
      const matchCard = cardEl.closest('.match-card');
      if (matchCard) {
        matchCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Visual cue highlight animation
        matchCard.style.outline = '2.5px dashed var(--accent)';
        matchCard.style.boxShadow = '0 0 20px rgba(239,68,68,0.5)';
        matchCard.style.transform = 'scale(1.02)';
        matchCard.style.transition = 'all 0.3s ease';
        
        setTimeout(() => {
          matchCard.style.outline = '';
          matchCard.style.boxShadow = '';
          matchCard.style.transform = '';
        }, 2200);
      }
    }
  }, 150);
}

// View Renderer: Interactive Bracket Tree (Cuadro)
let activeBracketFilter = 'all';

function setBracketFilter(filter) {
  activeBracketFilter = filter;
  applyBracketFilterEffects();
}

function applyBracketFilterEffects() {
  const columns = {
    'R16': document.getElementById('col-R16'),
    'QF': document.getElementById('col-QF'),
    'SF': document.getElementById('col-SF'),
    'final': document.getElementById('col-final')
  };
  
  const buttons = document.querySelectorAll('.btn-bracket-filter');
  buttons.forEach(btn => {
    btn.classList.remove('active');
    if (btn.id === `btn-bracket-${activeBracketFilter}`) {
      btn.classList.add('active');
    }
  });

  Object.entries(columns).forEach(([stage, colEl]) => {
    if (!colEl) return;
    if (activeBracketFilter === 'all' || activeBracketFilter === stage) {
      colEl.style.display = 'flex';
    } else {
      colEl.style.display = 'none';
    }
  });

  const treeContainer = document.querySelector('.bracket-tree-container');
  if (treeContainer) {
    if (activeBracketFilter !== 'all') {
      treeContainer.classList.add('filtered');
    } else {
      treeContainer.classList.remove('filtered');
    }
  }

  // Schedule drawing of lines after the DOM display changes are painted
  setTimeout(drawBracketLines, 50);
}

const bracketConnections = [
  // R16 -> QF
  { from: 90, to: 97 },
  { from: 89, to: 97 },
  { from: 94, to: 98 },
  { from: 93, to: 98 },
  { from: 91, to: 99 },
  { from: 92, to: 99 },
  { from: 96, to: 100 },
  { from: 95, to: 100 },

  // QF -> SF
  { from: 97, to: 101 },
  { from: 98, to: 101 },
  { from: 99, to: 102 },
  { from: 100, to: 102 },

  // SF -> Final
  { from: 101, to: 104 },
  { from: 102, to: 104 }
];

function drawBracketLines() {
  const container = document.querySelector('.bracket-tree-container');
  if (!container) return;
  
  let svg = container.querySelector('.bracket-svg-canvas');
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'bracket-svg-canvas');
    container.appendChild(svg);
  } else {
    svg.innerHTML = ''; // Clear existing paths
  }
  
  // If a single round filter is active on mobile, hide the connecting canvas
  if (activeBracketFilter !== 'all') {
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    return;
  }
  
  const containerRect = container.getBoundingClientRect();
  
  svg.setAttribute('width', container.scrollWidth);
  svg.setAttribute('height', container.scrollHeight);
  
  bracketConnections.forEach(({ from, to }) => {
    const fromEl = container.querySelector(`[data-match-no="${from}"]`);
    const toEl = container.querySelector(`[data-match-no="${to}"]`);
    
    if (!fromEl || !toEl) return;
    if (fromEl.offsetParent === null || toEl.offsetParent === null) return;
    
    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    
    // Start from center-right of the source match card
    const startX = fromRect.right - containerRect.left + container.scrollLeft;
    const startY = fromRect.top + fromRect.height / 2 - containerRect.top + container.scrollTop;
    
    // End at center-left of the destination match card
    const endX = toRect.left - containerRect.left + container.scrollLeft;
    const endY = toRect.top + toRect.height / 2 - containerRect.top + container.scrollTop;
    
    // Dynamic highlighting logic: check if this source match has progressed to the destination match
    let isPathActive = false;
    const fromMatch = STATE.matches.find(m => m.match_no === from);
    const toMatch = STATE.matches.find(m => m.match_no === to);
    
    if (fromMatch && toMatch && fromMatch.home_score !== null && fromMatch.away_score !== null) {
      let winnerCode = null;
      if (fromMatch.home_score > fromMatch.away_score) {
        winnerCode = fromMatch.resolved_home_code;
      } else if (fromMatch.home_score < fromMatch.away_score) {
        winnerCode = fromMatch.resolved_away_code;
      } else if (fromMatch.extra_time_winner === 'home' || fromMatch.penalties_winner === 'home') {
        winnerCode = fromMatch.resolved_home_code;
      } else if (fromMatch.extra_time_winner === 'away' || fromMatch.penalties_winner === 'away') {
        winnerCode = fromMatch.resolved_away_code;
      }
      
      if (winnerCode && (toMatch.resolved_home_code === winnerCode || toMatch.resolved_away_code === winnerCode)) {
        isPathActive = true;
      }
    }
    
    // Calculate intermediate midpoint for orthogonal orthogonal connector
    const midX = startX + (endX - startX) / 2;
    
    // Path string: Move to start -> horizontal to midX -> vertical to target Y -> horizontal to end X
    const pathD = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathD);
    path.setAttribute('fill', 'none');
    
    if (isPathActive) {
      path.setAttribute('stroke', 'var(--accent)');
      path.setAttribute('stroke-width', '2');
      path.setAttribute('opacity', '0.95');
      path.style.filter = 'drop-shadow(0px 0px 3.5px rgba(255, 223, 0, 0.65))';
    } else {
      path.setAttribute('stroke', 'rgba(255, 255, 255, 0.12)');
      path.setAttribute('stroke-width', '1.5');
      path.setAttribute('opacity', '0.5');
    }
    
    svg.appendChild(path);
  });
}

// Window resize listener
window.addEventListener('resize', () => {
  if (document.querySelector('.bracket-tree-container')) {
    drawBracketLines();
  }
});

function renderBracketTreeView() {
  activeBracketFilter = 'all';
  const container = document.getElementById('groups-grid-container');
  container.innerHTML = "";
  
  // Outer container setup
  const treeContainer = document.createElement('div');
  treeContainer.className = "bracket-tree-container";
  
  // Resolve Brackets dynamic outcomes (flows team names)
  resolveBrackets(STATE.matches);
  
  // Visually sort matches to make the tree layout symmetric and without line crossings
  const r16Order = [89, 90, 93, 94, 91, 92, 95, 96];
  const r16 = STATE.matches
    .filter(m => m.stage === 'R16')
    .sort((a, b) => r16Order.indexOf(a.match_no) - r16Order.indexOf(b.match_no));
    
  const qfOrder = [97, 98, 99, 100];
  const qf = STATE.matches
    .filter(m => m.stage === 'QF')
    .sort((a, b) => qfOrder.indexOf(a.match_no) - qfOrder.indexOf(b.match_no));
    
  const sfOrder = [101, 102];
  const sf = STATE.matches
    .filter(m => m.stage === 'SF')
    .sort((a, b) => sfOrder.indexOf(a.match_no) - sfOrder.indexOf(b.match_no));
    
  const finalMatch = STATE.matches.find(m => m.stage === 'final');
  const thirdMatch = STATE.matches.find(m => m.stage === 'third');
  
  const buildMatchNode = (m) => {
    const homeVal = m.home_score !== null ? m.home_score : "-";
    const awayVal = m.away_score !== null ? m.away_score : "-";
    const homeFlag = getFlagHTML(m.home_name);
    const awayFlag = getFlagHTML(m.away_name);
    
    // Determine winner to highlight
    let homeClass = "";
    let awayClass = "";
    if (m.home_score !== null && m.away_score !== null) {
      let winnerCode = null;
      if (m.home_score > m.away_score) {
        winnerCode = m.resolved_home_code;
      } else if (m.home_score < m.away_score) {
        winnerCode = m.resolved_away_code;
      } else if (m.extra_time_winner === 'home' || m.penalties_winner === 'home') {
        winnerCode = m.resolved_home_code;
      } else if (m.extra_time_winner === 'away' || m.penalties_winner === 'away') {
        winnerCode = m.resolved_away_code;
      }
      
      if (winnerCode) {
        if (winnerCode === m.resolved_home_code) {
          homeClass = "bracket-winner";
          awayClass = "bracket-loser";
        } else if (winnerCode === m.resolved_away_code) {
          homeClass = "bracket-loser";
          awayClass = "bracket-winner";
        }
      }
    }
    
    let etPenBadge = "";
    if (m.home_score !== null && m.away_score !== null && m.home_score === m.away_score) {
      const hasEt = (m.extra_time_home_score !== null && m.extra_time_home_score !== undefined) || (m.extra_time_away_score !== null && m.extra_time_away_score !== undefined);
      const hasPen = m.penalties_winner !== null && m.penalties_winner !== undefined;
      
      let etPart = "";
      if (hasEt) {
        etPart = `<span class="bracket-sub-badge et">PRÓRROGA (${m.extra_time_home_score}-${m.extra_time_away_score})</span>`;
      }
      
      let penPart = "";
      if (hasPen) {
        penPart = `<span class="bracket-sub-badge pen">PEN (${m.penalties_home_score}-${m.penalties_away_score})</span>`;
      }
      
      if (hasEt && hasPen) {
        etPenBadge = `
          <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-end; width: 100%;">
            ${etPart}
            ${penPart}
          </div>
        `;
      } else if (hasEt) {
        etPenBadge = etPart;
      } else if (hasPen) {
        etPenBadge = penPart;
      }
    }
    
    const formatted = formatDateVZLA(m.date);
    
    return `
      <div class="bracket-match-node" data-match-no="${m.match_no}" onclick="focusMatchInPredictions(${m.match_no})" title="Toca para ir a pronosticar">
        <div class="bracket-match-header">
          <span>#${m.match_no}</span>
          <span>${formatted.date}</span>
        </div>
        <div class="bracket-match-teams">
          <div class="bracket-team-row ${homeClass}">
            <div style="display:flex; align-items:center; gap:6px;">
              ${homeFlag}
              <span class="bracket-team-name">${m.home_name}</span>
            </div>
            <span class="bracket-team-score">${homeVal}</span>
          </div>
          <div class="bracket-team-row ${awayClass}">
            <div style="display:flex; align-items:center; gap:6px;">
              ${awayFlag}
              <span class="bracket-team-name">${m.away_name}</span>
            </div>
            <span class="bracket-team-score">${awayVal}</span>
          </div>
        </div>
        ${etPenBadge ? `<div class="bracket-match-footer">${etPenBadge}</div>` : ''}
      </div>
    `;
  };
  
  
  
  const colR16 = document.createElement('div');
  colR16.className = "bracket-column";
  colR16.id = "col-R16";
  colR16.innerHTML = `<div class="bracket-column-header">Octavos</div><div class="bracket-column-matches">` + r16.map(buildMatchNode).join('') + `</div>`;
  
  const colQF = document.createElement('div');
  colQF.className = "bracket-column";
  colQF.id = "col-QF";
  colQF.innerHTML = `<div class="bracket-column-header">Cuartos</div><div class="bracket-column-matches">` + qf.map(buildMatchNode).join('') + `</div>`;
  
  const colSF = document.createElement('div');
  colSF.className = "bracket-column";
  colSF.id = "col-SF";
  colSF.innerHTML = `<div class="bracket-column-header">Semifinales</div><div class="bracket-column-matches">` + sf.map(buildMatchNode).join('') + `</div>`;
  
  const colFinal = document.createElement('div');
  colFinal.className = "bracket-column final-col";
  colFinal.id = "col-final";
  
  let finalHTML = `<div class="bracket-column-header">Finales</div>`;
  
  // Grand Final inside the matches wrapper
  finalHTML += `<div class="bracket-column-matches">`;
  if (finalMatch) {
    finalHTML += `
      <div style="width: 100%;">
        <div style="font-size: 11px; font-weight: 800; color: #ffeb3b; margin-bottom: 6px; text-align: center; text-transform: uppercase; letter-spacing: 0.5px;">🏆 Gran Final</div>
        ${buildMatchNode(finalMatch)}
      </div>
    `;
  }
  finalHTML += `</div>`;
  
  // Third place outside the matches wrapper, absolutely positioned
  if (thirdMatch) {
    finalHTML += `
      <div class="bracket-third-place-wrapper">
        <div style="font-size: 11px; font-weight: 800; color: var(--accent-light); margin-bottom: 6px; text-align: center; text-transform: uppercase; letter-spacing: 0.5px;">🥉 Tercer Lugar</div>
        ${buildMatchNode(thirdMatch)}
      </div>
    `;
  }
  colFinal.innerHTML = finalHTML;
  
  treeContainer.appendChild(colR16);
  treeContainer.appendChild(colQF);
  treeContainer.appendChild(colSF);
  treeContainer.appendChild(colFinal);
  container.appendChild(treeContainer);
  
  // Apply active stage filter (this will trigger drawBracketLines inside it)
  applyBracketFilterEffects();
}

let savedBracketFilter = null;

function toggleFullscreenBracket() {
  const gruposEl = document.getElementById('grupos');
  if (!gruposEl) return;
  
  const isFullscreen = gruposEl.classList.toggle('groups-section-fullscreen');
  const btn = document.getElementById('btn-fullscreen-bracket');
  
  if (isFullscreen) {
    // Save current filter and force show everything for the full view
    savedBracketFilter = activeBracketFilter;
    if (typeof setBracketFilter === 'function') {
      setBracketFilter('all');
    }
    
    if (btn) {
      btn.innerHTML = `
        <svg style="width:14px; height:14px; fill:currentColor;" viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
        SALIR VISTA
      `;
    }
    
    // Optional native fullscreen request (graceful enhancement, ponytail: try-catch wrapper)
    try {
      if (gruposEl.requestFullscreen) {
        gruposEl.requestFullscreen().catch(() => {});
      } else if (gruposEl.webkitRequestFullscreen) {
        gruposEl.webkitRequestFullscreen();
      }
    } catch (e) {
      console.warn("Fullscreen API not fully supported:", e);
    }
    
    showToast("VISTA HORIZONTAL ACTIVA: Gira tu mente para ver el cuadro. 🔄");
  } else {
    // Restore previous filter if saved
    if (savedBracketFilter && typeof setBracketFilter === 'function') {
      setBracketFilter(savedBracketFilter);
      savedBracketFilter = null;
    }
    
    if (btn) {
      btn.innerHTML = `
        <svg style="width:14px; height:14px; fill:currentColor;" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
        VISTA HORIZONTAL
      `;
    }
    
    try {
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen && document.webkitFullscreenElement) {
        document.webkitExitFullscreen();
      }
    } catch (e) {
      console.warn("Error exiting fullscreen:", e);
    }
  }
  
  // Re-draw SVG lines since dimensions changed (ponytail: timeout resize line redraw)
  setTimeout(() => {
    if (typeof drawBracketLines === 'function') {
      drawBracketLines();
    }
  }, 100);
}

// Sync fullscreen state if exited using browser/native controls (ponytail: global change listener)
function syncNativeFullscreenExit() {
  const gruposEl = document.getElementById('grupos');
  if (!gruposEl) return;
  const isNativeFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
  const isCSSFullscreen = gruposEl.classList.contains('groups-section-fullscreen');
  
  if (isCSSFullscreen && !isNativeFullscreen) {
    gruposEl.classList.remove('groups-section-fullscreen');
    
    const btn = document.getElementById('btn-fullscreen-bracket');
    if (btn) {
      btn.innerHTML = `
        <svg style="width:14px; height:14px; fill:currentColor;" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
        VISTA HORIZONTAL
      `;
    }
    
    if (savedBracketFilter && typeof setBracketFilter === 'function') {
      setBracketFilter(savedBracketFilter);
      savedBracketFilter = null;
    }
    
    setTimeout(() => {
      if (typeof drawBracketLines === 'function') {
        drawBracketLines();
      }
    }, 100);
  }
}

document.addEventListener('fullscreenchange', syncNativeFullscreenExit);
document.addEventListener('webkitfullscreenchange', syncNativeFullscreenExit);

// Search matches in admin panel
function filterAdminMatches(query) {
  renderAdminMatches(query.trim().toLowerCase());
}

function onAdminRegularScoreChange(matchNo) {
  const homeVal = document.getElementById(`admin-home-score-${matchNo}`).value.trim();
  const awayVal = document.getElementById(`admin-away-score-${matchNo}`).value.trim();
  const match = STATE.matches.find(m => m.match_no === matchNo);
  if (!match) return;
  
  const subOptionsContainer = document.getElementById(`admin-draw-sub-options-${matchNo}`);
  if (subOptionsContainer) {
    if (match.stage !== 'group' && homeVal !== "" && awayVal !== "" && parseInt(homeVal, 10) === parseInt(awayVal, 10)) {
      subOptionsContainer.style.display = "flex";
      evaluateAdminPenSectionVisibility(matchNo);
    } else {
      subOptionsContainer.style.display = "none";
    }
  }
}

function toggleAdminDrawET(matchNo, checked) {
  const etInputsContainer = document.getElementById(`admin-et-score-inputs-${matchNo}`);
  if (etInputsContainer) {
    etInputsContainer.style.display = checked ? "flex" : "none";
  }
  evaluateAdminPenSectionVisibility(matchNo);
}

function onAdminETInputChange(matchNo) {
  evaluateAdminPenSectionVisibility(matchNo);
}

function evaluateAdminPenSectionVisibility(matchNo) {
  const hasEtCheckbox = document.getElementById(`admin-has-et-${matchNo}`);
  const isEtChecked = hasEtCheckbox ? hasEtCheckbox.checked : false;
  
  const etHomeVal = document.getElementById(`admin-et-home-${matchNo}`).value;
  const etAwayVal = document.getElementById(`admin-et-away-${matchNo}`).value;
  const penSection = document.getElementById(`admin-pen-section-${matchNo}`);
  
  if (penSection) {
    if (!isEtChecked) {
      penSection.style.display = "block";
    } else {
      if (etHomeVal !== "" && etAwayVal !== "" && parseInt(etHomeVal, 10) === parseInt(etAwayVal, 10)) {
        penSection.style.display = "block";
      } else {
        penSection.style.display = "none";
      }
    }
  }
}

async function saveAdminMatchScoreFromUI(matchNo) {
  const regularHomeVal = document.getElementById(`admin-home-score-${matchNo}`).value.trim();
  const regularAwayVal = document.getElementById(`admin-away-score-${matchNo}`).value.trim();
  
  if (regularHomeVal === "" || regularAwayVal === "") {
    showToast("POR FAVOR COLOQUE EL MARCADOR DEL TIEMPO REGULAR.", "error");
    return;
  }
  
  const regularHome = parseInt(regularHomeVal, 10);
  const regularAway = parseInt(regularAwayVal, 10);
  
  const match = STATE.matches.find(m => m.match_no === matchNo);
  if (!match) return;
  
  let etWinner = null;
  let penaltiesWinner = null;
  let penaltiesHomeScore = null;
  let penaltiesAwayScore = null;
  let etHome = null;
  let etAway = null;
  
  if (match.stage !== 'group' && regularHome === regularAway) {
    const hasEtCheckbox = document.getElementById(`admin-has-et-${matchNo}`);
    const isEtChecked = hasEtCheckbox ? hasEtCheckbox.checked : false;
    
    if (isEtChecked) {
      const etHomeVal = document.getElementById(`admin-et-home-${matchNo}`).value.trim();
      const etAwayVal = document.getElementById(`admin-et-away-${matchNo}`).value.trim();
      
      if (etHomeVal === "" || etAwayVal === "") {
        showToast("FALTA COMPLETAR EL MARCADOR DE LA PRÓRROGA.", "error");
        return;
      }
      
      etHome = parseInt(etHomeVal, 10);
      etAway = parseInt(etAwayVal, 10);
      
      if (etHome > etAway) {
        etWinner = 'home';
      } else if (etHome < etAway) {
        etWinner = 'away';
      } else {
        const penHomeVal = document.getElementById(`admin-pen-home-${matchNo}`).value.trim();
        const penAwayVal = document.getElementById(`admin-pen-away-${matchNo}`).value.trim();
        
        if (penHomeVal === "" || penAwayVal === "") {
          showToast("EMPATÓ LA PRÓRROGA. COLOQUE EL MARCADOR DE PENALTIS.", "error");
          return;
        }
        
        const radios = document.getElementsByName(`admin-pen-winner-${matchNo}`);
        for (const r of radios) {
          if (r.checked) {
            penaltiesWinner = r.value;
            break;
          }
        }
        
        if (!penaltiesWinner) {
          showToast("DEBES SELECCIONAR EL GANADOR DE LOS PENALTIS.", "error");
          return;
        }
        
        penaltiesHomeScore = parseInt(penHomeVal, 10);
        penaltiesAwayScore = parseInt(penAwayVal, 10);
      }
    } else {
      const penHomeVal = document.getElementById(`admin-pen-home-${matchNo}`).value.trim();
      const penAwayVal = document.getElementById(`admin-pen-away-${matchNo}`).value.trim();
      
      if (penHomeVal === "" || penAwayVal === "") {
        showToast("FALTA COMPLETAR EL MARCADOR DE PENALTIS.", "error");
        return;
      }
      
      const radios = document.getElementsByName(`admin-pen-winner-${matchNo}`);
      for (const r of radios) {
        if (r.checked) {
          penaltiesWinner = r.value;
          break;
        }
      }
      
      if (!penaltiesWinner) {
        showToast("DEBES SELECCIONAR EL GANADOR DE LOS PENALTIS.", "error");
        return;
      }
      
      penaltiesHomeScore = parseInt(penHomeVal, 10);
      penaltiesAwayScore = parseInt(penAwayVal, 10);
    }
  }
  
  await saveAdminMatchScore(
    matchNo,
    regularHomeVal,
    regularAwayVal,
    etWinner,
    penaltiesWinner,
    penaltiesHomeScore,
    penaltiesAwayScore,
    etHome,
    etAway
  );
}

function renderAdminMatches(searchQuery = "") {
  const container = document.getElementById('admin-matches-list');
  container.innerHTML = "";
  
  // Resolve Brackets standings and leader outcomes
  resolveBrackets(STATE.matches);
  
  let filtered = STATE.matches;
  if (searchQuery) {
    filtered = STATE.matches.filter(m => 
      m.home_name.toLowerCase().includes(searchQuery) ||
      m.away_name.toLowerCase().includes(searchQuery) ||
      String(m.match_no) === searchQuery ||
      m.stage.toLowerCase().includes(searchQuery)
    );
  }
  
  filtered.forEach(m => {
    const card = document.createElement('div');
    card.className = "match-card";
    card.style.padding = "12px";
    card.style.marginBottom = "10px";
    
    const homeVal = m.home_score !== null ? m.home_score : "";
    const awayVal = m.away_score !== null ? m.away_score : "";
    const formatted = formatDateVZLA(m.date);
    
    let subOptionsHTML = "";
    if (m.stage !== 'group') {
      const isDraw = homeVal !== "" && awayVal !== "" && parseInt(homeVal, 10) === parseInt(awayVal, 10);
      const hasEt = (m.extra_time_home_score !== null && m.extra_time_home_score !== undefined) || (m.extra_time_away_score !== null && m.extra_time_away_score !== undefined) || m.extra_time_winner !== null;
      const etHomeVal = m.extra_time_home_score !== null && m.extra_time_home_score !== undefined ? m.extra_time_home_score : "";
      const etAwayVal = m.extra_time_away_score !== null && m.extra_time_away_score !== undefined ? m.extra_time_away_score : "";
      
      const showPens = !hasEt || (m.extra_time_home_score !== null && m.extra_time_home_score === m.extra_time_away_score);
      const penWinner = m.penalties_winner || "";
      const penHomeVal = m.penalties_home_score !== null && m.penalties_home_score !== undefined ? m.penalties_home_score : "";
      const penAwayVal = m.penalties_away_score !== null && m.penalties_away_score !== undefined ? m.penalties_away_score : "";

      subOptionsHTML = `
        <div id="admin-draw-sub-options-${m.match_no}" style="grid-column: 1 / -1; margin-top: 10px; padding: 12px; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.12); border-radius: var(--radius-md); display: ${isDraw ? 'flex' : 'none'}; flex-direction: column; gap: 10px;">
          <!-- 1. Preguntar si hubo prórroga -->
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" id="admin-has-et-${m.match_no}" ${hasEt ? 'checked' : ''} onchange="toggleAdminDrawET(${m.match_no}, this.checked)" style="cursor: pointer; accent-color: var(--accent);">
            <label for="admin-has-et-${m.match_no}" style="font-size: 11px; font-weight: 700; color: var(--accent); letter-spacing: 0.5px; text-transform: uppercase; cursor: pointer; user-select: none;">¿Se jugó Prórroga?</label>
          </div>

          <!-- Marcador de Prórroga -->
          <div id="admin-et-score-inputs-${m.match_no}" style="display: ${hasEt ? 'flex' : 'none'}; align-items: center; gap: 8px; margin-top: 2px;">
            <span style="font-size: 12px; color: var(--text-muted);">Marcador T.E.:</span>
            <input type="number" min="0" id="admin-et-home-${m.match_no}" placeholder="L" style="width:36px; height:28px; text-align:center; background:#070C14; border:1px solid var(--border-sutil); color:#FFF; font-size: 12px;"
              value="${etHomeVal}" onchange="onAdminETInputChange(${m.match_no})">
            <span style="color: var(--text-muted);">-</span>
            <input type="number" min="0" id="admin-et-away-${m.match_no}" placeholder="V" style="width:36px; height:28px; text-align:center; background:#070C14; border:1px solid var(--border-sutil); color:#FFF; font-size: 12px;"
              value="${etAwayVal}" onchange="onAdminETInputChange(${m.match_no})">
          </div>

          <!-- Sección de Penaltis -->
          <div id="admin-pen-section-${m.match_no}" style="display: ${showPens ? 'block' : 'none'}; margin-top: 4px; padding-top: 8px; border-top: 1px dashed rgba(255,255,255,0.06);">
            <div style="font-size: 11px; font-weight: 700; color: var(--accent); letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 6px;">Tanda de Penaltis:</div>
            
            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
              <span style="font-size: 12px; color: var(--text-muted);">Marcador Penales:</span>
              <input type="number" min="0" id="admin-pen-home-${m.match_no}" placeholder="L" style="width:36px; height:28px; text-align:center; background:#070C14; border:1px solid var(--border-sutil); color:#FFF; font-size: 12px;"
                value="${penHomeVal}">
              <span style="color: var(--text-muted);">-</span>
              <input type="number" min="0" id="admin-pen-away-${m.match_no}" placeholder="V" style="width:36px; height:28px; text-align:center; background:#070C14; border:1px solid var(--border-sutil); color:#FFF; font-size: 12px;"
                value="${penAwayVal}">
            </div>

            <div style="display: flex; gap: 16px; align-items: center; margin-top: 8px;">
              <span style="font-size: 12px; color: var(--text-muted);">Ganador Penales:</span>
              <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #fff; cursor: pointer; user-select: none;">
                <input type="radio" name="admin-pen-winner-${m.match_no}" value="home" ${penWinner === 'home' ? 'checked' : ''} style="cursor: pointer; accent-color: var(--accent);">
                <span>${m.home_name}</span>
              </label>
              <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #fff; cursor: pointer; user-select: none;">
                <input type="radio" name="admin-pen-winner-${m.match_no}" value="away" ${penWinner === 'away' ? 'checked' : ''} style="cursor: pointer; accent-color: var(--accent);">
                <span>${m.away_name}</span>
              </label>
            </div>
          </div>
        </div>
      `;
    }

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-secondary); margin-bottom:8px;">
        <span>Partido #${m.match_no} (${m.stage.toUpperCase()})</span>
        <span>${formatted.date} • ${formatted.time}</span>
      </div>
      <div style="display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:10px;">
        <span style="text-align:right; font-weight:bold; font-size:13px;">${m.home_name}</span>
        <div style="display:flex; gap:6px; align-items:center;">
          <input type="number" min="0" style="width:36px; height:36px; text-align:center; background:#070C14; border:1px solid var(--border-sutil); color:#FFF; font-weight:bold;"
            value="${homeVal}" oninput="onAdminRegularScoreChange(${m.match_no})"
            id="admin-home-score-${m.match_no}">
          <span>-</span>
          <input type="number" min="0" style="width:36px; height:36px; text-align:center; background:#070C14; border:1px solid var(--border-sutil); color:#FFF; font-weight:bold;"
            value="${awayVal}" oninput="onAdminRegularScoreChange(${m.match_no})"
            id="admin-away-score-${m.match_no}">
        </div>
        <span style="text-align:left; font-weight:bold; font-size:13px;">${m.away_name}</span>
        ${subOptionsHTML}
        <div style="grid-column: 1 / -1; width: 100%;">
          <button class="btn-save-match-score" onclick="saveAdminMatchScoreFromUI(${m.match_no})">Actualizar Marcador</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function getResultNotificationPayload(user, match, matchNo, ptsEarned) {
  const H_r = match.home_score;
  const A_r = match.away_score;
  const pred = user.predictions[matchNo];
  if (!pred) return null;
  
  const H_p = pred.home_score;
  const A_p = pred.away_score;
  if (H_p === null || H_p === undefined) return null;
  
  const isExact = (H_p === H_r && A_p === A_r);
  const r_winner = H_r > A_r ? 'home' : (H_r < A_r ? 'away' : 'draw');
  const p_winner = H_p > A_p ? 'home' : (H_p < A_p ? 'away' : 'draw');
  const isWinner = (r_winner === p_winner);
  
  const partidoText = `${match.home_name} vs ${match.away_name}`;
  
  // Count remaining matches today
  const matchDateStr = new Date(match.match_date).toDateString();
  const remainingToday = STATE.matches.filter(m => {
    return new Date(m.match_date).toDateString() === matchDateStr && 
           m.home_score === null && 
           m.match_no !== matchNo;
  }).length;
  
  const isKnockout = match.stage !== 'group';
  
  if (isExact) {
    const pools = [
      `🎯 ¡Marcador Exacto! Final: ${partidoText}. Sumas ${ptsEarned} PTS a tu cuenta. ${remainingToday > 0 ? `Prepárate, que hoy aún nos quedan ${remainingToday} partidos.` : '¡Sigue sumando!' }`,
      `🔮 ¡Lo viste en tu bola de cristal! ${partidoText} terminó sumando ${ptsEarned} PTS. La jornada sigue encendida.`,
      `🔥 ¡Predicción impecable! Clavaste el resultado en ${partidoText}. Sumas ${ptsEarned} PTS cruciales para la tabla.`
    ];
    return {
      title: isKnockout ? "🔥 ¡Clase magistral en Eliminatorias!" : "🎯 ¡Marcador Exacto!",
      body: pools[Math.floor(Math.random() * pools.length)],
      type: "result",
      tag: `result-${matchNo}`,
      url: "./#pronosticos"
    };
  } else if (isWinner) {
    const pools = [
      `⚽ ¡Sumando puntos! Final: ${partidoText}. Has acertado al ganador (+${ptsEarned} PTS). ${remainingToday > 0 ? `Hoy aún nos quedan ${remainingToday} partidos.` : 'Mañana te esperan más partidos. ¡Prepara tu estrategia!' }`,
      `🏃‍♂️ ¡Puntos al bolsillo! Pronosticaste correctamente el rumbo del ${partidoText}. A paso firme hacia la cima.`
    ];
    return {
      title: "⚽ ¡Sumando puntos!",
      body: pools[Math.floor(Math.random() * pools.length)],
      type: "result",
      tag: `result-${matchNo}`,
      url: "./#pronosticos"
    };
  } else {
    const pools = [
      `🏁 Fin del partido. El encuentro ${partidoText} ha concluido. No sumamos esta vez, pero ${remainingToday > 0 ? `nos quedan ${remainingToday} partidos hoy para recuperarnos.` : 'mañana traemos nuevas oportunidades de revancha. ¡A pensar en el siguiente!' }`,
      `⚽ Balón al poste. ${partidoText} no terminó a nuestro favor. ¡A sacudirse el polvo, que la quiniela da revanchas rápido!`
    ];
    return {
      title: "🥅 El balón sigue rodando",
      body: pools[Math.floor(Math.random() * pools.length)],
      type: "result",
      tag: `result-${matchNo}`,
      url: "./#pronosticos"
    };
  }
}

async function saveAdminMatchScore(
  matchNo, 
  hsVal, 
  asVal, 
  extraTimeWinner = null, 
  penaltiesWinner = null, 
  penaltiesHomeScoreVal = null, 
  penaltiesAwayScoreVal = null,
  extraTimeHomeScoreVal = null,
  extraTimeAwayScoreVal = null
) {
  const match = STATE.matches.find(m => m.match_no === matchNo);
  if (!match) return;
  
  match.home_score = hsVal === "" ? null : parseInt(hsVal, 10);
  match.away_score = asVal === "" ? null : parseInt(asVal, 10);
  
  if (match.stage === 'group' || match.home_score !== match.away_score || match.home_score === null) {
    match.extra_time_winner = null;
    match.extra_time_home_score = null;
    match.extra_time_away_score = null;
    match.penalties_winner = null;
    match.penalties_home_score = null;
    match.penalties_away_score = null;
  } else {
    match.extra_time_winner = extraTimeWinner || null;
    match.extra_time_home_score = extraTimeHomeScoreVal === null || extraTimeHomeScoreVal === "" || extraTimeHomeScoreVal === undefined ? null : parseInt(extraTimeHomeScoreVal, 10);
    match.extra_time_away_score = extraTimeAwayScoreVal === null || extraTimeAwayScoreVal === "" || extraTimeAwayScoreVal === undefined ? null : parseInt(extraTimeAwayScoreVal, 10);
    match.penalties_winner = penaltiesWinner || null;
    match.penalties_home_score = penaltiesHomeScoreVal === null || penaltiesHomeScoreVal === "" || penaltiesHomeScoreVal === undefined ? null : parseInt(penaltiesHomeScoreVal, 10);
    match.penalties_away_score = penaltiesAwayScoreVal === null || penaltiesAwayScoreVal === "" || penaltiesAwayScoreVal === undefined ? null : parseInt(penaltiesAwayScoreVal, 10);
  }

  if (supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from('matches')
        .update({
          home_score: match.home_score,
          away_score: match.away_score,
          extra_time_winner: match.extra_time_winner,
          extra_time_home_score: match.extra_time_home_score,
          extra_time_away_score: match.extra_time_away_score,
          penalties_winner: match.penalties_winner,
          penalties_home_score: match.penalties_home_score,
          penalties_away_score: match.penalties_away_score
        })
        .eq('match_no', matchNo);
        
      if (error) {
        console.error("Error saving match score in Supabase", error);
        showToast("ERROR AL GUARDAR EL MARCADOR EN EL SERVIDOR.", "error");
      } else {
        showToast("MARCADOR ACTUALIZADO CON ÉXITO.");

        let oldState = new Map();
        try {
          // 1. Temporarily fetch all predictions to calculate old streaks & points accurately
          const { data: allPreds, error: predsErr } = await supabaseClient.from('predictions').select('*');
          if (!predsErr && allPreds) {
            const predsByUser = {};
            allPreds.forEach(p => {
              if (!predsByUser[p.user_id]) predsByUser[p.user_id] = {};
              predsByUser[p.user_id][p.match_no] = p;
            });
            STATE.users.forEach(u => {
              u.predictions = predsByUser[u.id] || {};
              u.predictionsLoaded = true;
            });
          }

          // 2. Ensure current stats are calculated before match scores reload
          recalculateAllPoints();

          // 3. Capture old state of all users
          const oldSorted = sortUsersLeaderboard(STATE.users);
          oldSorted.forEach((u, idx) => {
            const streakData = calculateUserStreak(u);
            oldState.set(u.cedula, {
              rank: idx + 1,
              points: u.points || 0,
              winnerCount: u.outcomes_count || 0,
              streak: streakData.currentStreak,
              badges: [...(u.badges || [])]
            });
          });
        } catch (stateErr) {
          console.error("Error capturing old states for notifications:", stateErr);
        }

        // 4. Load matches & new configs from database
        await syncFromSupabase();

        // 5. Re-fetch all predictions to calculate new values
        try {
          const { data: allPredsNew, error: predsErrNew } = await supabaseClient.from('predictions').select('*');
          if (!predsErrNew && allPredsNew) {
            const predsByUserNew = {};
            allPredsNew.forEach(p => {
              if (!predsByUserNew[p.user_id]) predsByUserNew[p.user_id] = {};
              predsByUserNew[p.user_id][p.match_no] = p;
            });
            STATE.users.forEach(u => {
              u.predictions = predsByUserNew[u.id] || {};
              u.predictionsLoaded = true;
            });
          }
        } catch (stateErrNew) {
          console.error("Error fetching predictions for new state:", stateErrNew);
        }

        recalculateAllPoints();
        const sortedUsersNew = sortUsersLeaderboard(STATE.users);

        // Map users by cedula for rank index lookup
        const newRanksMap = new Map();
        sortedUsersNew.forEach((u, idx) => {
          newRanksMap.set(u.cedula, idx + 1);
        });

        syncUsersToGoogleSheets(true);

        // 6. Delta Engine — compare old and new state to build notifications
        if (match.home_score !== null && match.away_score !== null) {
          const pushQueue = [];

          STATE.users.forEach(u => {
            if (u.is_mock) return; // Do not send push to mock users

            const old = oldState.get(u.cedula);
            if (!old) return;

            const newRank = newRanksMap.get(u.cedula) || 9999;
            const newStreakData = calculateUserStreak(u);
            const newStreak = newStreakData.currentStreak;
            const newWinnerCount = u.outcomes_count || 0;
            const newBadges = u.badges || [];

            // Calculate match score points earned for this user
            let ptsEarned = 0;
            const pred = u.predictions[matchNo];
            if (pred && pred.home_score !== null && pred.away_score !== null) {
              const H_p = pred.home_score;
              const A_p = pred.away_score;
              const H_r = match.home_score;
              const A_r = match.away_score;
              if (H_p === H_r && A_p === A_r) {
                ptsEarned = 6;
              } else {
                const r_win = H_r > A_r ? 'home' : (H_r < A_r ? 'away' : 'draw');
                const p_win = H_p > A_p ? 'home' : (H_p < A_p ? 'away' : 'draw');
                if (r_win === p_win) {
                  ptsEarned += 3;
                  if (H_r !== A_r && (H_r - A_r) === (H_p - A_p)) {
                    ptsEarned += 2;
                  }
                }
              }
              if (H_p === A_p && H_r === A_r) {
                const actualAdvancing = match.extra_time_winner || match.penalties_winner;
                if (pred.extra_time_winner && pred.extra_time_winner === actualAdvancing) {
                  ptsEarned += 1;
                }
              }
              if (pred.wildcard) ptsEarned *= 2;
            }

            const userNotifications = [];

            // A. Insignia Desbloqueada (Prioridad 1)
            const newlyUnlockedBadges = newBadges.filter(b => !old.badges.includes(b));
            newlyUnlockedBadges.forEach(b => {
              userNotifications.push({
                cedula: u.cedula,
                type: "badge",
                title: "🏅 ¡Nuevo Logro Desbloqueado!",
                body: `Has obtenido la insignia "${b}" por tu excelente desempeño. ¡Entra a presumirla en tu perfil!`,
                tag: `badge-unlocked-${b.replace(/\s+/g, '-').toLowerCase()}`,
                url: "./#perfil",
                priority: 1
              });
            });

            // B. Podio / Clasificación (Prioridad 2)
            if (newRank !== old.rank) {
              if (newRank <= 3 && newRank < old.rank) {
                let title = "👑 ¡Líder absoluto de la Quiniela!";
                let body = "Estás en la cima del ranking. ¡Tienes la corona, ahora te toca defenderla de tus perseguidores!";
                if (newRank === 2) {
                  title = "🥈 ¡Estás en el segundo lugar!";
                  body = "El líder te siente los pasos. Estás a muy pocos puntos de la cima. ¡Sigue presionando!";
                } else if (newRank === 3) {
                  title = "🥉 ¡Entraste al podio!";
                  body = "Te posicionaste en el tercer lugar del torneo. Estás en zona de trofeos. ¡Mantén el ritmo!";
                }
                userNotifications.push({
                  cedula: u.cedula,
                  type: "ranking",
                  title,
                  body,
                  tag: `ranking-podium-${newRank}`,
                  url: "./#clasificacion",
                  priority: 2
                });
              } else if (newRank > old.rank) {
                userNotifications.push({
                  cedula: u.cedula,
                  type: "ranking",
                  title: "📉 ¡La tabla se está moviendo!",
                  body: "Has bajado de posición en la clasificación. ¡La jornada no ha terminado, entra a ajustar tu estrategia para el próximo partido!",
                  tag: "ranking-drop",
                  url: "./#clasificacion",
                  priority: 3
                });
              }
            }

            // C. Rachas e Hitos (Prioridad 3)
            if (newStreak > old.streak && newStreak % 2 === 0) {
              userNotifications.push({
                cedula: u.cedula,
                type: "result",
                title: "🔥 ¡Tu racha sigue creciendo!",
                body: `¡Increíble! Llevas ${newStreak} aciertos seguidos en tus predicciones. ¿Lograrás duplicarla en el siguiente juego?`,
                tag: `streak-consecutive-${newStreak}`,
                url: "./#pronosticos",
                priority: 3
              });
            }

            // D. Acercamiento a Ganador Frecuente (Prioridad 3)
            if (newWinnerCount === 6 && old.winnerCount < 6) {
              userNotifications.push({
                cedula: u.cedula,
                type: "result",
                title: "⚡ ¡A solo un paso de la insignia!",
                body: "Tienes 6 aciertos en tu cuenta. Solo necesitas un pronóstico acertado más para desbloquear la insignia de 'Ganador Frecuente'. ¡Elige con sabiduría!",
                tag: "badge-approach-ganador-frecuente",
                url: "./#pronosticos",
                priority: 3
              });
            }

            // E. Resultado del partido (Prioridad 3)
            if (pred && pred.home_score !== null && pred.away_score !== null) {
              const resPayload = getResultNotificationPayload(u, match, matchNo, ptsEarned);
              if (resPayload) {
                userNotifications.push({
                  cedula: u.cedula,
                  type: resPayload.type,
                  title: resPayload.title,
                  body: resPayload.body,
                  tag: resPayload.tag,
                  url: resPayload.url,
                  priority: 3
                });
              }
            }

            // 7. Consolidador de Notificaciones (Anti-Aglomeración)
            if (userNotifications.length > 0) {
              userNotifications.sort((a, b) => a.priority - b.priority);
              const selectedNotif = userNotifications[0];
              
              if (userNotifications.length > 1) {
                const resultsNotif = userNotifications.find(n => n.tag.startsWith("result-"));
                const rankingNotif = userNotifications.find(n => n.type === "ranking");
                const badgeNotif = userNotifications.find(n => n.type === "badge");
                
                if (badgeNotif && rankingNotif && selectedNotif.type === "badge") {
                  selectedNotif.body = `¡Felicidades! Desbloqueaste la insignia "${newlyUnlockedBadges[0]}" y subiste al puesto ${newRank}. ¡Entra a ver!`;
                } else if (rankingNotif && resultsNotif && selectedNotif.type === "ranking") {
                  selectedNotif.body = `Sumaste ${ptsEarned} PTS en el partido y lograste escalar al puesto ${newRank} en la tabla. ¡Entra ya!`;
                }
              }
              
              pushQueue.push(selectedNotif);
            }
          });

          // Write queue to Supabase and trigger process-queue
          if (pushQueue.length > 0) {
            supabaseClient
              .from('notification_queue')
              .insert(pushQueue.map(q => ({
                cedula: q.cedula,
                type: q.type,
                title: q.title,
                body: q.body,
                tag: q.tag,
                url: q.url,
                priority: q.priority
              })))
              .then(({ error: insertErr }) => {
                if (insertErr) {
                  console.error("Error inserting notifications into queue:", insertErr);
                } else {
                  console.log(`Successfully enqueued ${pushQueue.length} notifications.`);
                  const pushBase = `${supabaseUrl}/functions/v1`;
                  const pushHeaders = { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` };
                  fetch(`${pushBase}/send-push`, {
                    method: "POST",
                    headers: pushHeaders,
                    body: JSON.stringify({ action: "process-queue" })
                  })
                  .then(res => res.json())
                  .then(d => console.log("Process queue response:", d))
                  .catch(e => console.warn("Failed to trigger process queue edge function:", e));
                }
              });
          }
        }
      }
    } catch (err) {
      console.error("Exception in saveAdminMatchScore", err);
      showToast("ERROR AL GUARDAR EL MARCADOR EN EL SERVIDOR.", "error");
    }
  } else {
    recalculateAllPoints();
  }
  
  // Re-render views
  renderAdminMatches(document.getElementById('admin-search-input').value);
}

// Render Admin Control Dashboard
function renderAdminView() {
  if (!STATE.adminMode) {
    document.getElementById('admin-auth-panel').style.display = 'block';
    document.getElementById('admin-dashboard-panel').style.display = 'none';
    return;
  }
  
  document.getElementById('admin-auth-panel').style.display = 'none';
  document.getElementById('admin-dashboard-panel').style.display = 'block';
  
  // Handle tournament finished visual status
  const finished = checkTournamentFinished();
  const toggleBtn = document.getElementById('admin-toggle-finished-btn');
  if (toggleBtn) {
    toggleBtn.innerText = finished ? "🏆 REABRIR TORNEO" : "🏆 DECLARAR FINAL DEL TORNEO";
  }
  
  const existingBanner = document.getElementById('admin-finished-banner');
  if (existingBanner) existingBanner.remove();
  
  if (finished) {
    const banner = document.createElement('div');
    banner.id = 'admin-finished-banner';
    banner.className = 'glass-card';
    banner.style.borderColor = 'var(--accent)';
    banner.style.background = 'rgba(255, 223, 0, 0.05)';
    banner.style.marginBottom = '20px';
    banner.innerHTML = `
      <h4 style="color:var(--accent); font-size:16px; margin-bottom:6px;">🏆 TORNEO FINALIZADO</h4>
      <p style="font-size:12px; color:var(--text-secondary); line-height:1.4;">EL TORNEO HA CONCLUIDO. LAS APUESTAS Y RESULTADOS HAN SIDO CONSOLIDADOS CON ÉXITO.</p>
    `;
    const adminDash = document.getElementById('admin-dashboard-panel');
    adminDash.insertBefore(banner, adminDash.firstChild);
  }
  
  // Render lists
  renderAdminMatches();
  renderAdminUsersList();
  
  // Lock inputs if finished
  if (finished) {
    const matchInputs = document.querySelectorAll('#admin-matches-list input');
    matchInputs.forEach(input => input.disabled = true);
    
    const simActions = document.querySelectorAll('.btn-sim-action:not(#admin-toggle-finished-btn)');
    simActions.forEach(btn => btn.disabled = true);
  }
}

// Export user database to CSV
function exportUserDataToCSV() {
  if (!STATE.users || STATE.users.length === 0) {
    showToast("NO HAY USUARIOS PARA EXPORTAR.", "error");
    return;
  }
  
  const headers = ["Cedula", "Nombre", "Usuario Parley", "ID Unico", "Correo", "Telefono", "Fecha de Nacimiento", "Puntos Totales", "Exactos (Cant)", "1X2 Simples (Cant)", "Insignias"];
  
  const rows = STATE.users.map(u => {
    return [
      u.cedula,
      u.name,
      u.parley_username || "",
      u.id || "",
      u.email || "",
      u.phone || "",
      u.dob || "",
      u.points,
      u.exacts_count || 0,
      u.outcomes_count || 0,
      u.badges ? u.badges.join("; ") : ""
    ];
  });
  
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(val => {
      const stringVal = String(val);
      if (stringVal.includes(",") || stringVal.includes('"') || stringVal.includes("\n")) {
        return `"${stringVal.replace(/"/g, '""')}"`;
      }
      return stringVal;
    }).join(","))
  ].join("\n");
  
  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "Polla_Mundial_2026_Data.csv");
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast("DATA EXPORTADA EXITOSAMENTE A CSV.");
}



// User List renderers in Admin panel
function filterAdminUsers(query) {
  renderAdminUsersList(query.trim().toLowerCase());
}

function renderAdminUsersList(searchQuery = "") {
  const tbody = document.getElementById('admin-users-list-tbody');
  tbody.innerHTML = "";
  
  let filtered = STATE.users;
  if (searchQuery) {
    filtered = STATE.users.filter(u => 
      u.name.toLowerCase().includes(searchQuery) ||
      u.cedula.toLowerCase().includes(searchQuery) ||
      (u.email && u.email.toLowerCase().includes(searchQuery))
    );
  }
  
  filtered.forEach(u => {
    // Skip logged-in admin from deletion/reset lists
    if (STATE.currentUser && u.cedula === STATE.currentUser.cedula) return;
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="cursor:pointer;" onclick="openAdminUserModal('${u.cedula}')">
        <div style="font-weight:700; color:var(--accent);">${u.name} ${u.is_mock ? '<span style="font-size:10px; color:var(--text-muted);">(Mock)</span>' : ''}</div>
        <div style="font-size:11px; color:var(--text-secondary);">Cédula: ${u.cedula}</div>
      </td>
      <td style="text-align:right; white-space:nowrap;">
        <button class="btn-admin-action" onclick="openAdminUserModal('${u.cedula}')" style="padding:4px 8px; font-size:10px; margin-right:4px; border-color:var(--text-secondary); color:var(--text-secondary);">Detalles</button>
        <button class="btn-admin-action" onclick="adminResetUserPassword('${u.cedula}')" style="padding:4px 8px; font-size:10px; margin-right:4px;">Reset Clave</button>
        <button class="btn-admin-action" onclick="adminDeleteUser('${u.cedula}')" style="padding:4px 8px; font-size:10px; border-color:var(--alert); color:var(--alert);">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ============================================================
// SECCIÓN: MÓDULO M2 — RESET DE CLAVE Y CAMBIO FORZADO
// ============================================================

// Abrir el sub-modal de reset de clave en el panel admin
function adminOpenResetPasswordModal() {
  const cedula = STATE.inspectedUserCedula;
  const user = STATE.users.find(u => u.cedula === cedula);
  if (!user) return;

  const infoEl = document.getElementById('admin-reset-pass-user-info');
  if (infoEl) {
    infoEl.innerHTML = `
      <div style="margin-bottom:4px;"><strong style="color:#FFF;">${user.name}</strong></div>
      <div style="color:var(--text-muted); font-size:12px;">Cédula: ${user.cedula} &nbsp;|&nbsp; Email: ${user.email || 'N/A'}</div>
    `;
  }

  // Pre-fill with default generic password
  const passInput = document.getElementById('admin-reset-pass-input');
  if (passInput) passInput.value = 'Parley2026';

  document.getElementById('admin-reset-pass-modal').classList.add('active');
}

// Toggle visibility del campo de nueva clave en el sub-modal admin
function toggleAdminResetPassVisibility() {
  const input = document.getElementById('admin-reset-pass-input');
  const eye = document.getElementById('admin-reset-pass-eye');
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    if (eye) eye.textContent = '🙈';
  } else {
    input.type = 'password';
    if (eye) eye.textContent = '👁';
  }
}

// Confirmar el reset de clave — llama a la Supabase Edge Function
async function adminConfirmResetPassword() {
  const cedula = STATE.inspectedUserCedula;
  const user = STATE.users.find(u => u.cedula === cedula);
  if (!user) return;

  const newPass = document.getElementById('admin-reset-pass-input').value.trim();
  if (!newPass || newPass.length < 6) {
    showToast('LA CONTRASEÑA DEBE TENER AL MENOS 6 CARACTERES.', 'error');
    return;
  }

  const btn = document.getElementById('btn-confirm-reset-pass');
  if (btn) { btn.disabled = true; btn.textContent = 'PROCESANDO...'; }

  try {
    // Llamada a la Edge Function que usa el Service Role Key de forma segura
    const { data: { session } } = await supabaseClient.auth.getSession();
    const token = session ? session.access_token : null;
    if (!token) throw new Error('No hay sesión activa de admin');

    const response = await fetch(`${supabaseUrl}/functions/v1/reset-user-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ cedula: cedula, new_password: newPass })
    });

    const result = await response.json();

    if (!response.ok || result.error) {
      throw new Error(result.error || 'Error desconocido en el servidor');
    }

    document.getElementById('admin-reset-pass-modal').classList.remove('active');
    showToast(`✅ CLAVE DE ${user.name.toUpperCase()} RESTABLECIDA. COMUNÍCALA AL USUARIO.`);

  } catch (err) {
    console.error('Error resetting password via Edge Function:', err);
    showToast('ERROR AL RESTABLECER LA CLAVE: ' + (err.message || 'Error de servidor'), 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '✅ RESETEAR'; }
  }
}

// Mostrar el overlay de cambio forzado de contraseña (inescapable)
function showForcedPasswordChangeOverlay() {
  const overlay = document.getElementById('forced-pass-change-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column'; // ensure layout
  }
  // Limpiar campos
  const np = document.getElementById('forced-new-pass');
  const cp = document.getElementById('forced-confirm-pass');
  if (np) np.value = '';
  if (cp) cp.value = '';
}

// Manejar el cambio forzado de contraseña por el propio usuario
async function handleForcedPasswordChange() {
  const newPass = (document.getElementById('forced-new-pass').value || '').trim();
  const confirmPass = (document.getElementById('forced-confirm-pass').value || '').trim();

  if (!newPass || newPass.length < 6) {
    showToast('LA CONTRASEÑA DEBE TENER AL MENOS 6 CARACTERES.', 'error');
    return;
  }
  if (newPass !== confirmPass) {
    showToast('LAS CONTRASEÑAS NO COINCIDEN.', 'error');
    return;
  }

  const btn = document.getElementById('btn-forced-pass-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'GUARDANDO...'; }

  try {
    // 1. Cambiar la contraseña en Supabase Auth
    const { error: passError } = await supabaseClient.auth.updateUser({ password: newPass });
    if (passError) throw passError;

    // 2. Limpiar el flag must_change_password en el perfil
    if (STATE.currentUser) {
      const { error: flagError } = await supabaseClient
        .from('profiles')
        .update({ must_change_password: false })
        .eq('id', STATE.currentUser.id);
      if (flagError) console.warn('Error clearing must_change_password flag:', flagError);
      STATE.currentUser.must_change_password = false;
    }

    // 3. Ocultar overlay y navegar a la app
    const overlay = document.getElementById('forced-pass-change-overlay');
    if (overlay) overlay.style.display = 'none';

    showToast('✅ ¡CONTRASEÑA ACTUALIZADA! BIENVENIDO A LA POLLA MUNDIALISTA.');
    renderApp();
    navigateTo('inicio');

  } catch (err) {
    console.error('Error changing password:', err);
    showToast('ERROR AL CAMBIAR LA CONTRASEÑA. INTENTA DE NUEVO.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'GUARDAR MI CONTRASEÑA'; }
  }
}



// Sincronizar usuarios con Google Sheets via Apps Script Web App
// NOTA TÉCNICA: Usamos GET + Base64 en lugar de POST+JSON para evitar bloqueos CORS.
// Google Apps Script NO responde a peticiones POST desde navegadores externos (error CORS).
// La solución definitiva es codificar los datos en Base64 y enviarlos como query parameter.
async function syncUsersToGoogleSheets(isSilent = false) {
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxq_xzdaINn6XFQEgf-fgGaWBaK84CaP26z8rTB0y5dJ0jZV2yUiZsdtLOM7y4x4dKQ8g/exec';

  if (APPS_SCRIPT_URL.includes('REEMPLAZAR')) {
    if (!isSilent) showToast('⚠️ CONFIGURA PRIMERO LA URL DEL APPS SCRIPT EN app.js', 'error');
    return;
  }

  if (!supabaseClient) {
    if (!isSilent) showToast('ERROR DE CONEXIÓN CON EL SERVIDOR.', 'error');
    return;
  }

  const btn = document.getElementById('admin-sync-sheets-btn');
  if (!isSilent && btn) { btn.disabled = true; btn.textContent = '⏳ SINCRONIZANDO...'; }

  // Opción C: Consulta directa a profiles para obtener TODOS los campos personales,
  // y al leaderboard para estadísticas. Esto evita depender de STATE.users que
  // solo contiene los campos reducidos del leaderboard paginado.
  let payload;
  try {
    const [profilesResult, statsResult] = await Promise.all([
      supabaseClient.from('profiles').select('cedula, name, parley_username, email, phone, dob'),
      supabaseClient.from('leaderboard').select('cedula, total_points, exacts_count, outcomes_count, calculated_badges')
    ]);

    if (profilesResult.error) throw new Error(profilesResult.error.message);
    const profiles = profilesResult.data || [];

    if (profiles.length === 0) {
      if (!isSilent) showToast('NO HAY USUARIOS PARA SINCRONIZAR.', 'error');
      if (!isSilent && btn) { btn.disabled = false; btn.textContent = '🔄 SINCRONIZAR CON GOOGLE SHEETS'; }
      return;
    }

    // Mapa de estadísticas por cédula (del leaderboard)
    const statsMap = {};
    if (statsResult.data) {
      statsResult.data.forEach(s => {
        statsMap[s.cedula] = s;
      });
    }

    payload = profiles.map(p => {
      const stats = statsMap[p.cedula] || {};
      return {
        cedula: p.cedula,
        nombre: p.name,
        parley_username: p.parley_username || '',
        correo: p.email || '',
        telefono: p.phone || '',
        fecha_nacimiento: p.dob || '',
        puntos: stats.total_points || 0,
        exactos: stats.exacts_count || 0,
        aciertos_1x2: stats.outcomes_count || 0,
        insignias: stats.calculated_badges ? stats.calculated_badges.join('; ') : ''
      };
    });
  } catch (err) {
    console.error('Error fetching profiles for sync:', err);
    if (!isSilent) showToast('ERROR AL OBTENER DATOS DE USUARIOS PARA SINCRONIZAR.', 'error');
    if (!isSilent && btn) { btn.disabled = false; btn.textContent = '🔄 SINCRONIZAR CON GOOGLE SHEETS'; }
    return;
  }

  try {
    // Codificar el payload en Base64 para enviarlo como parámetro GET (evita CORS)
    const jsonString = JSON.stringify({ action: 'sync', users: payload });
    const base64Data = btoa(unescape(encodeURIComponent(jsonString)));
    const urlWithData = `${APPS_SCRIPT_URL}?data=${encodeURIComponent(base64Data)}`;

    const response = await fetch(urlWithData, {
      method: 'GET',
      redirect: 'follow'
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error);
    }

    if (!isSilent) {
      showToast(`✅ ${payload.length} USUARIOS SINCRONIZADOS CON GOOGLE SHEETS. (${result.updated || 0} actualizados, ${result.inserted || 0} nuevos)`);
    } else {
      console.log(`[Silent Sheets Sync] Success: ${payload.length} users synced.`);
    }
  } catch (err) {
    console.error('Error syncing to Google Sheets:', err);
    if (!isSilent) {
      showToast('ERROR AL SINCRONIZAR CON GOOGLE SHEETS. VERIFICA LA URL DEL APPS SCRIPT.', 'error');
    }
  } finally {
    if (!isSilent && btn) { btn.disabled = false; btn.textContent = '🔄 SINCRONIZAR CON GOOGLE SHEETS'; }
  }
}


async function adminDeleteUser(cedula) {
  if (!supabaseClient) {
    showToast("ERROR DE CONEXIÓN CON EL SERVIDOR.", "error");
    return;
  }
  const user = STATE.users.find(u => u.cedula === cedula);
  if (!user) return;
  
  if (confirm(`¿ESTÁS SEGURO DE QUE DESEAS ELIMINAR AL USUARIO CON CÉDULA ${cedula}? SE PERDERÁN TODAS SUS PREDICCIONES.`)) {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .delete()
        .eq('id', user.id)
        .select();
        
      if (error) throw error;
      
      if (!data || data.length === 0) {
        showToast("NO SE PUDO ELIMINAR EL USUARIO. VERIFICA TUS PERMISOS DE ADMINISTRADOR.", "error");
        return;
      }
      
      showToast("USUARIO ELIMINADO EN LA BASE DE DATOS. RECUERDA ELIMINARLO EN EL PANEL DE SUPABASE SI DESEAS LIBERAR SU CORREO.");
      
      await syncFromSupabase();
      
      renderAdminUsersList(document.getElementById('admin-user-search-input').value);
      renderLeaguesView();
    } catch (err) {
      console.error("Error deleting user", err);
      showToast("ERROR AL ELIMINAR EL USUARIO DEL SERVIDOR.", "error");
    }
  }
}

// Dialog sliding panels utilities
function openAuthModal(tabName = 'login') {
  document.getElementById('auth-overlay').classList.add('active');
  switchAuthTab(tabName);
  
  // Clear inputs
  document.getElementById('reg-name').value = "";
  document.getElementById('reg-parley-username').value = "";
  document.getElementById('reg-cedula').value = "";
  document.getElementById('reg-dob').value = "";
  document.getElementById('reg-email').value = "";
  document.getElementById('reg-phone').value = "";
  document.getElementById('reg-password').value = "";
  document.getElementById('reg-password-confirm').value = "";
  
  document.getElementById('login-cedula').value = "";
  document.getElementById('login-password').value = "";
  document.getElementById('age-gate-error').style.display = 'none';
  
  tempRecoveryData = null;
  recoveryCode = null;
}

function closeAuthModal() {
  document.getElementById('auth-overlay').classList.remove('active');
  document.getElementById('age-gate-error').style.display = 'none';
}

function switchAuthTab(tabName) {
  const tabs = document.querySelectorAll('.auth-tab');
  tabs.forEach(t => t.classList.remove('active'));
  
  // Reset headers
  document.getElementById('auth-nav-tabs').style.display = 'flex';
  document.getElementById('auth-panel-title').innerText = "ACCESO QUINIELA";
  
  if (tabName === 'login') {
    document.getElementById('tab-login-btn').classList.add('active');
    document.getElementById('form-login-container').style.display = 'block';
    document.getElementById('form-register-container').style.display = 'none';
    document.getElementById('form-recover-container').style.display = 'none';
  } else if (tabName === 'register') {
    document.getElementById('tab-register-btn').classList.add('active');
    document.getElementById('form-login-container').style.display = 'none';
    document.getElementById('form-register-container').style.display = 'block';
    document.getElementById('form-recover-container').style.display = 'none';
  } else if (tabName === 'recover') {
    document.getElementById('auth-nav-tabs').style.display = 'none';
    document.getElementById('auth-panel-title').innerText = "RECUPERACIÓN";
    document.getElementById('form-login-container').style.display = 'none';
    document.getElementById('form-register-container').style.display = 'none';
    document.getElementById('form-recover-container').style.display = 'block';
  }
}

// Init App Core
function renderApp() {
  const headerUser = document.getElementById('header-user-profile');
  if (STATE.currentUser) {
    headerUser.style.display = 'flex';
    const initials = STATE.currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    document.getElementById('user-avatar-initials').innerText = initials;
    document.getElementById('header-points-value').innerText = STATE.currentUser.points;
  } else {
    headerUser.style.display = 'none';
  }
  
  // Conditionally render ADMIN button on floating bottom bar
  const navAdmin = document.getElementById('nav-item-admin');
  if (navAdmin) {
    navAdmin.style.display = STATE.adminMode ? 'flex' : 'none';
  }
  
  // Refresh views
  renderDashboardView();
}

async function initSessionShell() {
  const loggedOutHero = document.getElementById('logged-out-hero');
  const loggedInDashboard = document.getElementById('logged-in-dashboard');
  
  let hasSession = false;
  if (supabaseClient && supabaseClient.auth) {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        hasSession = true;
      }
    } catch (e) {
      console.error("Error retrieving Supabase user in initSessionShell:", e);
    }
  }
  
  if (hasSession) {
    if (loggedOutHero) loggedOutHero.style.display = 'none';
    if (loggedInDashboard) loggedInDashboard.style.display = 'block';
  } else {
    if (loggedOutHero) loggedOutHero.style.display = 'flex';
    if (loggedInDashboard) loggedInDashboard.style.display = 'none';
  }
}

window.onload = async () => {
  await initSessionShell();
  initPwaInstallHandlers();
  checkIosPwaInstallTip();
  await initDatabase();
  syncOfflineQueue();
  recalculateAllPoints();
  renderApp();
  if (STATE.adminMode) {
    renderAdminView();
  }
  
  // Auto-format Cédula digits on user input
  document.getElementById('reg-cedula').addEventListener('input', function() {
    this.value = this.value.replace(/\D/g, ''); // strip letters
  });
  document.getElementById('login-cedula').addEventListener('input', function() {
    this.value = this.value.replace(/\D/g, ''); // strip letters
  });
  
  // Enter key press triggers login or registration
  const loginInputs = ['login-cedula', 'login-password'];
  loginInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const prefix = document.getElementById('login-cedula-prefix').value;
          const num = document.getElementById('login-cedula').value;
          const pass = document.getElementById('login-password').value;
          if (num.trim() && pass) {
            handleLogin(prefix, num, pass);
          }
        }
      });
    }
  });

  const regInputs = ['reg-name', 'reg-parley-username', 'reg-cedula', 'reg-dob', 'reg-email', 'reg-phone', 'reg-password', 'reg-password-confirm'];
  regInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const nameVal = document.getElementById('reg-name').value;
          const parleyUserVal = document.getElementById('reg-parley-username').value;
          const num = document.getElementById('reg-cedula').value;
          const dobVal = document.getElementById('reg-dob').value;
          const emailVal = document.getElementById('reg-email').value;
          const phoneVal = document.getElementById('reg-phone').value;
          const passVal = document.getElementById('reg-password').value;
          const passConfVal = document.getElementById('reg-password-confirm').value;
          
          if (nameVal.trim() && parleyUserVal.trim() && num.trim() && dobVal.trim() && emailVal.trim() && phoneVal.trim() && passVal && passConfVal) {
            handleRegister();
          }
        }
      });
    }
  });
  
  // Si viene con el hash #register, abrimos el modal de registro automáticamente
  if (window.location.hash === '#register') {
    window.history.replaceState("", document.title, window.location.pathname + window.location.search);
    openAuthModal('register');
  }
  
  renderApp();
  
  // Check if viewing a shared ticket in URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const ticketParam = urlParams.get('ticket');
  let loadedShared = false;
  if (ticketParam) {
    try {
      const decodedCedula = atob(ticketParam);
      const sharedUser = STATE.users.find(u => u.cedula === decodedCedula);
      if (sharedUser) {
        renderSharedTicketView(sharedUser);
        navigateTo('shared-ticket-section');
        loadedShared = true;
      }
    } catch (e) {
      console.error("Invalid ticket parameter", e);
    }
  }
  
  if (!loadedShared) {
    const activeSection = sessionStorage.getItem('active_section') || 'inicio';
    navigateTo(activeSection);
    // Onboarding gate checks only for active players
    checkOnboardingTutorial();
  }
};

function openBadgeModal(badgeId, badgeIcon, badgeDesc, hasBadge) {
  let points = 0;
  switch (badgeId) {
    case "Pronosticador Activo":
      points = 5;
      break;
    case "Ganador Frecuente":
      points = 10;
      break;
    case "Ojo Clínico":
      points = 15;
      break;
    case "El Vidente":
      points = 20;
      break;
    case "HAT-TRICK VIP":
      points = 20;
      break;
    default:
      points = 0;
  }

  const emojiEl = document.getElementById("badge-modal-emoji");
  const titleEl = document.getElementById("badge-modal-title");
  const statusEl = document.getElementById("badge-modal-status");
  const descEl = document.getElementById("badge-modal-description");

  if (emojiEl) emojiEl.innerText = badgeIcon;
  if (titleEl) titleEl.innerText = badgeId;
  if (descEl) descEl.innerText = badgeDesc;

  if (statusEl) {
    statusEl.className = "badge-modal-status " + (hasBadge ? "conseguida" : "pendiente");
    statusEl.innerText = (hasBadge ? "CONSEGUIDA" : "PENDIENTE") + ` (+${points} PTS)`;
  }

  const modal = document.getElementById("badge-modal");
  if (modal) {
    modal.classList.add("active");
  }
}

function closeBadgeModal() {
  const modal = document.getElementById("badge-modal");
  if (modal) {
    modal.classList.remove("active");
  }
}

// -------------------------------------------------------------------------
// FASE 2: VISTA DE COMPARTIR TICKET DE INVITADO (MODO LECTURA)
// -------------------------------------------------------------------------
function renderSharedTicketView(user) {
  const container = document.getElementById('shared-ticket-view');
  container.innerHTML = "";
  
  // 1. Banner Publicitario Promocional Animado
  const bannerDiv = document.createElement('div');
  bannerDiv.className = 'promo-share-banner';
  bannerDiv.innerHTML = `
    <div class="promo-title">⚽ LA POLLA MUNDIALISTA 🏆</div>
    <p class="promo-subtext">¿Crees que puedes superar los <strong>${user.points} PTS</strong> de <strong>${user.name}</strong>? Registra tu Quiniela <strong>totalmente GRATIS</strong> y demuestra tu nivel. Patrocinado por <strong>Parley.com.ve</strong></p>
    <button class="btn-promo-cta" onclick="openRegisterFromPromo()">¡JUGAR AHORA! 🚀</button>
  `;
  container.appendChild(bannerDiv);
  
  // 2. Card de Resumen del Ticket
  const summaryCard = document.createElement('div');
  summaryCard.className = 'glass-card';
  summaryCard.style.padding = '20px';
  summaryCard.style.marginBottom = '20px';
  summaryCard.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-sutil); padding-bottom:12px; margin-bottom:16px;">
      <h3 style="color:var(--accent); font-size:18px; margin:0;">TICKET DE JUGADOR</h3>
      <div style="background:rgba(255,223,0,0.1); color:var(--accent); font-size:11px; font-weight:800; padding:4px 8px; border-radius:10px; border:1px solid var(--accent);">MODO LECTURA</div>
    </div>
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <div>
        <div style="font-size:13px; color:var(--text-secondary); font-weight:700;">Nombre: <strong style="color:#FFF;">${user.name}</strong></div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:22px; font-weight:900; color:var(--accent);">${user.points} PTS</div>
        <div style="font-size:10px; color:var(--text-secondary); font-weight:700;">Puntaje Acumulado</div>
      </div>
    </div>
  `;
  container.appendChild(summaryCard);
  
  // 3. Contenedor de predicciones
  const listCard = document.createElement('div');
  listCard.className = 'glass-card';
  listCard.style.padding = '20px';
  listCard.innerHTML = `
    <h4 style="color:#FFF; font-size:15px; margin-bottom:16px; border-bottom:1px solid var(--border-sutil); padding-bottom:8px;">PRONÓSTICOS DE LA FASE FINAL</h4>
    <div id="shared-predictions-list" style="display:flex; flex-direction:column; gap:4px;"></div>
  `;
  container.appendChild(listCard);
  
  const listContainer = listCard.querySelector('#shared-predictions-list');
  const visibleMatches = STATE.matches.filter(m => !m.hidden && m.match_no >= 89 && m.match_no <= 104);
  
  visibleMatches.forEach(m => {
    const pred = user.predictions[m.match_no];
    let predText = "Sin pronóstico";
    let wildcardHTML = "";
    let ptsEarned = 0;
    
    if (pred && pred.home_score !== null && pred.away_score !== null) {
      predText = `${pred.home_score} - ${pred.away_score}`;
      if (pred.wildcard) wildcardHTML = ' <span class="vs-wildcard-star">🚨</span>';
      
      if (m.home_score !== null && m.away_score !== null) {
        let matchPoints = 0;
        if (pred.home_score === m.home_score && pred.away_score === m.away_score) {
          matchPoints = 6;
        } else {
          const r_win = m.home_score > m.away_score ? 'home' : (m.home_score < m.away_score ? 'away' : 'draw');
          const p_win = pred.home_score > pred.away_score ? 'home' : (pred.home_score < pred.away_score ? 'away' : 'draw');
          if (r_win === p_win) {
            matchPoints += 3;
            if (m.home_score !== m.away_score && (m.home_score - m.away_score) === (pred.home_score - pred.away_score)) {
              matchPoints += 2;
            }
          }
        }
        
        // Extra knockout points for draw
        if (pred.home_score === pred.away_score && m.home_score === m.away_score) {
          const actualAdvancing = m.extra_time_winner || m.penalties_winner;
          if (pred.extra_time_winner && pred.extra_time_winner === actualAdvancing) {
            matchPoints += 1;
          }
        }
        
        if (pred.wildcard) matchPoints *= 2;
        ptsEarned = matchPoints;
      }
    }
    
    const realText = m.home_score !== null && m.away_score !== null ? `${m.home_score} - ${m.away_score}` : "Por jugar";
    
    const item = document.createElement('div');
    item.className = "ticket-row-item";
    item.innerHTML = `
      <div class="ticket-team-row">
        <div class="ticket-team-col home" style="flex: 1; justify-content: flex-end; text-align: right; min-width: 0; display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600;">
          ${getFlagHTML(m.home_name)}
          <span style="margin-left: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.home_name}</span>
        </div>
        <span class="ticket-score-badge" style="font-weight: 800; font-size: 13px; color: var(--accent); margin: 0 10px; min-width: 60px; text-align: center; white-space: nowrap; flex-shrink: 0;">${predText}${wildcardHTML}</span>
        <div class="ticket-team-col away" style="flex: 1; justify-content: flex-start; text-align: left; min-width: 0; display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600;">
          <span style="margin-right: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.away_name}</span>
          ${getFlagHTML(m.away_name)}
        </div>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 10px; color: var(--text-muted); margin-top: 4px; flex-wrap: wrap; gap: 4px;">
        <span>Partido #${m.match_no} (${m.group ? `Grupo ${m.group}` : ''})</span>
        <span>Real: <strong style="color: #FFF;">${realText}</strong> | Ganado: <strong style="color: var(--accent);">${ptsEarned} PTS</strong></span>
      </div>
    `;
    listContainer.appendChild(item);
  });
}

function openRegisterFromPromo() {
  navigateTo('inicio');
  openAuthModal('register');
}

// ==========================================
// SECTION: ADVANCED ADMIN USER EDIT LOGIC
// ==========================================

function adminEnableEditUser() {
  const cedula = STATE.inspectedUserCedula;
  const user = STATE.users.find(u => u.cedula === cedula);
  if (!user) return;
  
  // Fill input values
  document.getElementById('admin-edit-name').value = user.name || "";
  document.getElementById('admin-edit-cedula').value = user.cedula || "";
  document.getElementById('admin-edit-phone').value = user.phone || "";
  document.getElementById('admin-edit-email').value = user.email || "";
  document.getElementById('admin-edit-dob').value = user.dob || "";
  
  const parleyUsernameEl = document.getElementById('admin-edit-parley-username');
  if (parleyUsernameEl) {
    parleyUsernameEl.value = user.parley_username || "";
  }
  
  // Hide view mode, show edit mode
  document.getElementById('admin-inspect-data-view').style.display = 'none';
  document.getElementById('admin-inspect-edit-form').style.display = 'grid';
  
  // Toggle buttons
  document.getElementById('btn-admin-edit-user').style.display = 'none';
  document.getElementById('btn-admin-save-user').style.display = 'inline-block';
  document.getElementById('btn-admin-cancel-user').style.display = 'inline-block';
}

function adminCancelUserEdit() {
  document.getElementById('admin-inspect-data-view').style.display = 'grid';
  document.getElementById('admin-inspect-edit-form').style.display = 'none';
  
  document.getElementById('btn-admin-edit-user').style.display = 'inline-block';
  document.getElementById('btn-admin-save-user').style.display = 'none';
  document.getElementById('btn-admin-cancel-user').style.display = 'none';
}

async function adminSaveUserChanges() {
  if (!supabaseClient) {
    showToast("ERROR DE CONEXIÓN CON EL SERVIDOR.", "error");
    return;
  }
  const oldCedula = STATE.inspectedUserCedula;
  const user = STATE.users.find(u => u.cedula === oldCedula);
  if (!user) return;
  
  const newName = document.getElementById('admin-edit-name').value.trim();
  const newCedula = document.getElementById('admin-edit-cedula').value.trim().toUpperCase();
  const newPhone = document.getElementById('admin-edit-phone').value.trim();
  const newEmail = document.getElementById('admin-edit-email').value.trim();
  const newDob = document.getElementById('admin-edit-dob').value;
  
  let newParleyUsername = "";
  const parleyUsernameEl = document.getElementById('admin-edit-parley-username');
  if (parleyUsernameEl) {
    newParleyUsername = parleyUsernameEl.value.trim();
  }
  
  if (!newName || !newCedula || !newEmail) {
    showToast("Por favor complete los campos obligatorios (Nombre, Cédula y Correo).", "error");
    return;
  }
  
  // Validate Cédula format V-12345678 or E-12345678
  const cedulaRegex = /^[VvEe]-\d+$/;
  if (!cedulaRegex.test(newCedula)) {
    showToast("Formato de Cédula inválido. Debe ser V-12345678 o E-12345678.", "error");
    return;
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    showToast("Formato de correo electrónico inválido.", "error");
    return;
  }
  
  // Check Cédula uniqueness if changed
  if (newCedula !== oldCedula) {
    const exists = STATE.users.some(u => u.cedula === newCedula);
    if (exists) {
      showToast("La Cédula ingresada ya está registrada por otro usuario.", "error");
      return;
    }
  }
  
  try {
    const { data, error } = await supabaseClient
      .from('profiles')
      .update({
        name: newName,
        cedula: newCedula,
        phone: newPhone,
        email: newEmail,
        dob: newDob,
        parley_username: newParleyUsername
      })
      .eq('id', user.id)
      .select();
      
    if (error) throw error;
    
    if (!data || data.length === 0) {
      showToast("NO SE PUDIERON GUARDAR LOS CAMBIOS. VERIFICA TUS PERMISOS DE ADMINISTRADOR.", "error");
      return;
    }
    
    await syncFromSupabase();
    
    adminCancelUserEdit();
    
    STATE.inspectedUserCedula = newCedula;
    openAdminUserModal(newCedula);
    
    const searchInput = document.getElementById('admin-user-search-input');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
    renderAdminUsersList(query);
    
    showToast("Datos del usuario actualizados correctamente. ✅", "success");
  } catch (err) {
    console.error("Error updating user profile in Supabase", err);
    showToast("ERROR AL GUARDAR CAMBIOS EN EL SERVIDOR.", "error");
  }
}

// ==========================================
// SECTION: DETAILED SCORE AUDITING LOGIC
// ==========================================

function adminToggleAuditLog() {
  const panel = document.getElementById('admin-inspect-audit-panel');
  if (panel.style.display === 'none') {
    const cedula = STATE.inspectedUserCedula;
    const user = STATE.users.find(u => u.cedula === cedula);
    if (!user) return;
    
    const auditText = generateUserAuditText(user);
    document.getElementById('admin-inspect-audit-text').textContent = auditText;
    
    panel.style.display = 'block';
    document.getElementById('btn-show-audit-log').innerText = "🔍 OCULTAR AUDITORÍA DE PUNTOS";
  } else {
    panel.style.display = 'none';
    document.getElementById('btn-show-audit-log').innerText = "🔍 VER AUDITORÍA DETALLADA DE PUNTOS";
  }
}

function adminCopyAuditReport() {
  const text = document.getElementById('admin-inspect-audit-text').textContent;
  if (!text) return;
  
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text).then(() => {
        showToast("Informe probatorio copiado al portapapeles. 📋", "success");
      }).catch(err => {
        fallbackCopyAuditText(text);
      });
    } else {
      fallbackCopyAuditText(text);
    }
  } catch (err) {
    console.error("Clipboard write failed:", err);
    fallbackCopyAuditText(text);
  }
}

function fallbackCopyAuditText(text) {
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.top = '-9999px';
    document.body.appendChild(el);
    el.select();
    const success = document.execCommand('copy');
    document.body.removeChild(el);
    if (success) {
      showToast("Informe probatorio copiado al portapapeles. 📋", "success");
    } else {
      showToast("Error al copiar al portapapeles.", "error");
    }
  } catch (err) {
    console.error("Legacy copy failed:", err);
    showToast("Error al copiar al portapapeles.", "error");
  }
}

function generateUserAuditText(user) {
  let text = `=========================================\n`;
  text += `   INFORME OFICIAL DE AUDITORÍA DE PUNTOS\n`;
  text += `=========================================\n`;
  text += `Usuario: ${user.name.toUpperCase()}\n`;
  text += `Cédula: ${user.cedula}\n`;
  text += `Fecha de Auditoría: ${new Date().toLocaleString()}\n`;
  text += `-----------------------------------------\n\n`;
  
  let totalPoints = 0;
  let exactsCount = 0;
  let winnerCount = 0;
  let predictionsCount = 0;
  let successfulWildcardsCount = 0;
  let groupLeadersPoints = 0;
  
  let matchReport = `--- 1. PARTIDOS INDIVIDUALES ---\n`;
  
  STATE.matches.forEach(match => {
    const pred = user.predictions[match.match_no];
    const hasPred = pred && pred.home_score !== null && pred.away_score !== null;
    
    if (hasPred) {
      predictionsCount++;
    }
    
    const isPlayed = match.home_score !== null && match.away_score !== null;
    
    if (!isPlayed) {
      if (hasPred) {
        matchReport += `Partido #${match.match_no} (${match.home_name} vs ${match.away_name}):\n`;
        matchReport += `  - Pronóstico: [${pred.home_score} - ${pred.away_score}]${pred.wildcard ? ' 🚨' : ''}\n`;
        matchReport += `  - Estado: Pendiente por jugar (0 PTS)\n\n`;
      }
      return;
    }
    
    if (!hasPred) {
      matchReport += `Partido #${match.match_no} (${match.home_name} vs ${match.away_name}):\n`;
      matchReport += `  - Estado: Sin pronóstico registrado (0 PTS)\n\n`;
      return;
    }
    
    const H_p = pred.home_score;
    const A_p = pred.away_score;
    const H_r = match.home_score;
    const A_r = match.away_score;
    
    let matchPoints = 0;
    let detail = "";
    
    if (H_p === H_r && A_p === A_r) {
      matchPoints = 6;
      detail = "Marcador Exacto (+6 PTS)";
      exactsCount++;
      winnerCount++;
    } else {
      const r_win = H_r > A_r ? 'home' : (H_r < A_r ? 'away' : 'draw');
      const p_win = H_p > A_p ? 'home' : (H_p < A_p ? 'away' : 'draw');
      if (r_win === p_win) {
        matchPoints += 3;
        detail = "Ganador/Empate Simple (+3 PTS)";
        winnerCount++;
        
        if (H_r !== A_r && (H_r - A_r) === (H_p - A_p)) {
          matchPoints += 2;
          detail += " + Diferencia de Goles (+2 PTS)";
        }
      } else {
        matchPoints = 0;
        detail = "Sin aciertos (0 PTS)";
      }
    }
    let extraPoints = 0;
    if (H_p === A_p && H_r === A_r) {
      const actualAdvancing = match.extra_time_winner || match.penalties_winner;
      if (pred.extra_time_winner && pred.extra_time_winner === actualAdvancing) {
        extraPoints += 1;
        detail += " + Ganador de Ronda (+1 PT)";
      }
    }
    matchPoints += extraPoints;

    let wildcardText = "";
    if (pred.wildcard) {
      wildcardText = ` * Comodín 🚨 (x2)`;
      matchPoints *= 2;
      if (matchPoints > 0) {
        successfulWildcardsCount++;
      }
    }
    
    totalPoints += matchPoints;
    
    matchReport += `Partido #${match.match_no} (${match.home_name} vs ${match.away_name}):\n`;
    matchReport += `  - Pronóstico: [${H_p} - ${A_p}], Real: [${H_r} - ${A_r}]\n`;
    matchReport += `  - Calificación: ${detail}${wildcardText} = ${matchPoints} PTS\n\n`;
  });
  
  text += matchReport;
  
  // Check El Vidente
  const userChamp = user.special_predictions && user.special_predictions.champion;
  const userSubchamp = user.special_predictions && user.special_predictions.subchampion;
  const userThird = user.special_predictions && user.special_predictions.third_place;

  const m104 = STATE.matches.find(m => m.match_no === 104);
  const m103 = STATE.matches.find(m => m.match_no === 103);
  let actualChamp = null;
  let actualSubchamp = null;
  let actualThird = null;

  if (m104 && m104.home_score !== null && m104.away_score !== null) {
    if (m104.home_score > m104.away_score) {
      actualChamp = m104.resolved_home_code;
      actualSubchamp = m104.resolved_away_code;
    } else if (m104.home_score < m104.away_score) {
      actualChamp = m104.resolved_away_code;
      actualSubchamp = m104.resolved_home_code;
    } else {
      if (m104.extra_time_winner === 'home' || m104.penalties_winner === 'home') {
        actualChamp = m104.resolved_home_code;
        actualSubchamp = m104.resolved_away_code;
      } else if (m104.extra_time_winner === 'away' || m104.penalties_winner === 'away') {
        actualChamp = m104.resolved_away_code;
        actualSubchamp = m104.resolved_home_code;
      }
    }
  }
  if (m103 && m103.home_score !== null && m103.away_score !== null) {
    if (m103.home_score > m103.away_score) {
      actualThird = m103.resolved_home_code;
    } else if (m103.home_score < m103.away_score) {
      actualThird = m103.resolved_away_code;
    } else {
      if (m103.extra_time_winner === 'home' || m103.penalties_winner === 'home') {
        actualThird = m103.resolved_home_code;
      } else if (m103.extra_time_winner === 'away' || m103.penalties_winner === 'away') {
        actualThird = m103.resolved_away_code;
      }
    }
  }

  const hasVidente = actualChamp && actualSubchamp && actualThird &&
                     userChamp && userChamp === actualChamp &&
                     userSubchamp && userSubchamp === actualSubchamp &&
                     userThird && userThird === actualThird;

  // B. Special Predictions / Honor Roll (Podium)
  const champName = userChamp ? getTeamNameById(userChamp) : "Sin selección";
  const subchampName = userSubchamp ? getTeamNameById(userSubchamp) : "Sin selección";
  const thirdName = userThird ? getTeamNameById(userThird) : "Sin selección";

  let groupReport = `--- 2. CUADRO DE HONOR (EL VIDENTE) ---\n`;
  groupReport += `  - Campeón Pronosticado: ${champName}\n`;
  groupReport += `  - Subcampeón Pronosticado: ${subchampName}\n`;
  groupReport += `  - 3er Lugar Pronosticado: ${thirdName}\n`;
  
  const realChampName = actualChamp ? getTeamNameById(actualChamp) : null;
  const realSubchampName = actualSubchamp ? getTeamNameById(actualSubchamp) : null;
  const realThirdName = actualThird ? getTeamNameById(actualThird) : null;

  if (realChampName && realSubchampName && realThirdName) {
    groupReport += `  - Podio Real: 1° ${realChampName}, 2° ${realSubchampName}, 3° ${realThirdName}\n`;
    groupReport += `  - Estado: ${hasVidente ? '¡Acertado completo! 🎉' : 'No acertado'}\n\n`;
  } else {
    groupReport += `  - Estado: Pendiente por jugar (en juego)\n\n`;
  }
  text += groupReport;
  
  // C. Badges
  let badgesReport = `--- 3. INSIGNIAS (BADGES) ---\n`;
  let badgesPoints = 0;
  
  if (exactsCount >= 3) {
    badgesReport += `  - OJO CLÍNICO (+15 PTS) [Activo: ${exactsCount} exactos (Requisito: 3+)]\n`;
    badgesPoints += 15;
  } else {
    badgesReport += `  - OJO CLÍNICO (0 PTS) [Inactivo: ${exactsCount} exactos (Requisito: 3+)]\n`;
  }
  
  if (winnerCount >= 7) {
    badgesReport += `  - GANADOR FRECUENTE (+10 PTS) [Activo: ${winnerCount} aciertos (Requisito: 7+)]\n`;
    badgesPoints += 10;
  } else {
    badgesReport += `  - GANADOR FRECUENTE (0 PTS) [Inactivo: ${winnerCount} aciertos (Requisito: 7+)]\n`;
  }
  
  if (predictionsCount >= 12) {
    badgesReport += `  - PRONOSTICADOR ACTIVO (+5 PTS) [Activo: ${predictionsCount} pronósticos (Requisito: 12+)]\n`;
    badgesPoints += 5;
  } else {
    badgesReport += `  - PRONOSTICADOR ACTIVO (0 PTS) [Inactivo: ${predictionsCount} pronósticos (Requisito: 12+)]\n`;
  }
  
  if (hasVidente) {
    badgesReport += `  - EL VIDENTE (+20 PTS) [Activo: Podio Completo Acertado]\n`;
    badgesPoints += 20;
  } else {
    badgesReport += `  - EL VIDENTE (0 PTS) [Inactivo: Podio Incompleto o En Juego]\n`;
  }
  
  if (user.badges && user.badges.includes("HAT-TRICK VIP")) {
    badgesReport += `  - HAT-TRICK VIP (+20 PTS) [Activo: Otorgado manualmente por Admin]\n`;
    badgesPoints += 20;
  }
  
  totalPoints += badgesPoints;
  text += badgesReport + `\n`;
  
  text += `=========================================\n`;
  text += `   RESUMEN TOTAL DE CÓMPUTO AUDITABLE\n`;
  text += `=========================================\n`;
  text += `PUNTOS ACUMULADOS EN PARTIDOS:  ${totalPoints - groupLeadersPoints - badgesPoints} PTS\n`;
  text += `PUNTOS ACUMULADOS EN LÍDERES:   0 PTS (Sección Desactivada)\n`;
  text += `PUNTOS ACUMULADOS EN INSIGNIAS:  ${badgesPoints} PTS\n`;
  text += `-----------------------------------------\n`;
  text += `PUNTAJE GENERAL CALCULADO:      ${totalPoints} PTS\n`;
  text += `PUNTAJE REGISTRADO EN PERFIL:   ${user.points || 0} PTS\n`;
  text += `ESTADO DE CONSISTENCIA:        ${totalPoints === (user.points || 0) ? '✅ CONSISTENTE' : '⚠️ DISCREPANCIA RECALCULAR'}\n`;
  text += `=========================================\n`;
  
  return text;
}

// Push Notifications Setup & Subscription Handler
async function togglePushNotifications(checked) {
  const subpanel = document.getElementById('notification-preferences-subpanel');
  
  if (checked) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    if (isIOS && !isStandalone) {
      document.getElementById('ios-pwa-modal').classList.add('active');
      const toggle = document.getElementById('push-notifications-toggle');
      if (toggle) toggle.checked = false;
      if (subpanel) subpanel.style.display = 'none';
      return;
    }
  }

  if (!checked) {
    if (subpanel) subpanel.style.display = 'none';
    sessionStorage.setItem('parley_wc_push_enabled', 'false');
    if ('serviceWorker' in navigator && supabaseClient) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
        }
        if (STATE.currentUser) {
          const { error } = await supabaseClient
            .from('push_subscriptions')
            .delete()
            .eq('cedula', STATE.currentUser.cedula);
          if (error) {
            console.error("Error deleting subscription from Supabase:", error);
          }
        }
        showToast("Notificaciones desactivadas.");
      } catch (err) {
        console.error("Error al desactivar notificaciones", err);
        showToast("Error al desactivar notificaciones en el servidor.", "error");
      }
    } else {
      showToast("Notificaciones desactivadas localmente.");
    }
    return;
  }
  
  if (typeof Notification === 'undefined') {
    showToast("Este navegador no soporta notificaciones.", "error");
    const toggle = document.getElementById('push-notifications-toggle');
    if (toggle) toggle.checked = false;
    if (subpanel) subpanel.style.display = 'none';
    return;
  }
  
  // Request permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    showToast("Permiso de notificaciones denegado o no habilitado en el sistema.", "error");
    const toggle = document.getElementById('push-notifications-toggle');
    if (toggle) toggle.checked = false;
    if (subpanel) subpanel.style.display = 'none';
    return;
  }
  
  // Register push subscription in Supabase if service worker is active
  if ('serviceWorker' in navigator && supabaseClient) {
    try {
      const reg = await navigator.serviceWorker.ready;
      
      if (!reg.pushManager) {
        showToast("Este navegador no soporta notificaciones push nativas.", "error");
        const toggle = document.getElementById('push-notifications-toggle');
        if (toggle) toggle.checked = false;
        if (subpanel) subpanel.style.display = 'none';
        return;
      }
      
      // Esperar brevemente para que la actualización de permisos se propague en el Service Worker
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const vapidPublicKey = 'BAiYzUZig1AQ6z_S6KVOB8iHcOUq1oCcx9pd-IC3e5HECAeu88XqYMtQxu1B9HNHkszk7rE3qTsB3MX-AsRiB6s';
        let retries = 3;
        while (retries > 0) {
          try {
            sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            });
            break; // Exito
          } catch (subErr) {
            retries--;
            if (retries === 0) {
              console.error("No se pudo suscribir a Web Push (VAPID) tras 3 intentos:", subErr);
              showToast("Error al activar notificaciones. Asegúrate de permitirlas en los ajustes de tu teléfono/navegador.", "error");
              const toggle = document.getElementById('push-notifications-toggle');
              if (toggle) toggle.checked = false;
              if (subpanel) subpanel.style.display = 'none';
              return;
            }
            console.warn(`Error al suscribirse (intentos restantes: ${retries}). Reintentando en 800ms...`, subErr);
            await new Promise(resolve => setTimeout(resolve, 800));
          }
        }
      }
      
      // Save subscription in Supabase
      if (sub && STATE.currentUser) {
        const { error } = await supabaseClient
          .from('push_subscriptions')
          .upsert({
            cedula: STATE.currentUser.cedula,
            subscription: sub.toJSON()
          }, { onConflict: 'cedula' });
          
        if (error) {
          console.error("Error al guardar suscripción en Supabase", error);
          showToast("Suscripción guardada localmente, pero no sincronizada en servidor.", "info");
        }
      }
      
      sessionStorage.setItem('parley_wc_push_enabled', 'true');
      if (subpanel) subpanel.style.display = 'flex';
      showToast("¡Notificaciones activadas con éxito!");
      
    } catch (err) {
      console.error("Error en el registro de notificaciones", err);
      showToast("Error en el registro de notificaciones.", "error");
      const toggle = document.getElementById('push-notifications-toggle');
      if (toggle) toggle.checked = false;
      if (subpanel) subpanel.style.display = 'none';
    }
  } else {
    showToast("Las notificaciones requieren conexión con el servidor.", "error");
    const toggle = document.getElementById('push-notifications-toggle');
    if (toggle) toggle.checked = false;
    if (subpanel) subpanel.style.display = 'none';
  }
}

// Save dynamic granular user notification preferences in profiles
async function saveNotificationPreferences() {
  if (!supabaseClient || !STATE.currentUser) return;
  
  const prefs = {
    reminder: document.getElementById('pref-reminder').checked,
    result: document.getElementById('pref-result').checked,
    ranking: document.getElementById('pref-ranking').checked,
    leagues: document.getElementById('pref-leagues').checked
  };
  
  STATE.currentUser.notification_preferences = prefs;
  
  const { error } = await supabaseClient
    .from('profiles')
    .update({ notification_preferences: prefs })
    .eq('id', STATE.currentUser.id);
    
  if (error) {
    console.error("Error saving notification preferences in Supabase:", error);
    showToast("ERROR AL GUARDAR PREFERENCIAS EN EL SERVIDOR.", "error");
  } else {
    console.log("Notification preferences saved successfully.");
  }
}

// Utility function to convert base64 VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
 
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
 
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}



// Populate Match Date Filter Dropdown Options dynamically from matches dates
function populateMatchDateFilter() {
  const select = document.getElementById('match-date-filter');
  if (!select) return;
  
  const currentVal = STATE.matchDateFilter;
  select.innerHTML = '<option value="all">📅 Mostrar todos los partidos</option>';
  
  const uniqueDates = [];
  const isAdmin = STATE.currentUser && STATE.currentUser.is_admin;
  
  STATE.matches.forEach(m => {
    if (m.stage !== 'group' && m.date) {
      const datePart = m.date.split(' ')[0]; // YYYY-MM-DD
      if (!uniqueDates.includes(datePart)) {
        uniqueDates.push(datePart);
      }
    }
  });
  
  uniqueDates.sort();
  
  uniqueDates.forEach(dateStr => {
    const formatted = formatDateVZLA(dateStr + " 00:00:00");
    const option = document.createElement('option');
    option.value = dateStr;
    option.innerText = `📅 ${formatted.date}`;
    select.appendChild(option);
  });
  
  if (uniqueDates.includes(currentVal)) {
    select.value = currentVal;
  } else {
    select.value = 'all';
    STATE.matchDateFilter = 'all';
  }
}

// Handle Match Date Filter selection change
function handleMatchDateFilterChange(val) {
  STATE.matchDateFilter = val;
  renderMatchesView();
}
