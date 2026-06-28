const fs = require('fs');
let data = fs.readFileSync('renderer.js', 'utf8');

const normalizedData = data.replace(/\r\n/g, '\n');

const anchor1 = "// ===== WINDOW CONTROLS =====\nbtnMinimize.addEventListener('click', () => window.electronAPI.minimize());\nbtnMaximize.addEventListener('click', () => window.electronAPI.maximize());\nbtnClose.addEventListener('click', () => window.electronAPI.close());\n\n// ===== THEME TOGGLE =====";

const idx = normalizedData.indexOf(anchor1);
if (idx === -1) {
    console.error('Anchor 1 not found');
    process.exit(1);
}

const anchor2 = "// Toast notification";
const idx2 = normalizedData.indexOf(anchor2, idx);

if (idx2 === -1) {
    console.error('Anchor 2 not found');
    process.exit(1);
}

const replacement = `// ===== THEME TOGGLE =====
const btnTheme = document.getElementById('btn-theme');
const moonIcon = document.getElementById('theme-icon-moon');
const sunIcon = document.getElementById('theme-icon-sun');

btnTheme.addEventListener('click', () => {
  darkModeEnabled = !darkModeEnabled;
  
  if (darkModeEnabled) {
    moonIcon.style.display = '';
    sunIcon.style.display = 'none';
    injectThemeCSS();
    showToast('Đã bật Dark Mode');
  } else {
    moonIcon.style.display = 'none';
    sunIcon.style.display = '';
    // Remove injected CSS by reloading the webview
    webview.reload();
    showToast('Đã tắt Dark Mode');
  }
});

// ===== NAVIGATION =====
let pendingNavUrl = '';
function safeLoadURL(url) {
  if (pendingNavUrl === url || webview.getURL() === url) return;
  pendingNavUrl = url;
  
  if (webview.isLoading()) {
    webview.stop();
  }
  
  webview.loadURL(url).catch(e => {
    // Ignore expected ERR_ABORTED when we stop a load intentionally
    if (e.code !== 'ERR_ABORTED') console.log('Navigation error suppressed:', e.message);
  });
  
  setTimeout(() => { if (pendingNavUrl === url) pendingNavUrl = ''; }, 1000);
}

btnHome.addEventListener('click', () => {
  setActiveNav(btnHome);
  if (isLoggedIn) showNativeScreen('native-dashboard');
  if (!webview.getURL().includes('dashboard')) {
    safeLoadURL('https://sinhvien.huit.edu.vn/dashboard.html');
  }
});

btnTimetable.addEventListener('click', () => {
  setActiveNav(btnTimetable);
  if (isLoggedIn) showNativeScreen('native-timetable');
  if (!webview.getURL().includes('lich-theo-tuan')) {
    safeLoadURL('https://sinhvien.huit.edu.vn/lich-theo-tuan.html');
  }
});

`;

function getOriginalIndex(normIdx) {
    let originalIdx = 0;
    let normCount = 0;
    for (let i = 0; i < data.length; i++) {
        if (normCount === normIdx) return i;
        if (data[i] !== '\r') normCount++;
    }
    return data.length;
}

const origIdx = getOriginalIndex(idx);
const origIdx2 = getOriginalIndex(idx2);
const anchorLen = getOriginalIndex(idx + anchor1.length - "// ===== THEME TOGGLE =====".length) - origIdx;

const newData = data.substring(0, origIdx + anchorLen) + replacement.replace(/\n/g, '\r\n') + data.substring(origIdx2);
fs.writeFileSync('renderer.js', newData);
console.log('Safe Load logic injected correctly');
