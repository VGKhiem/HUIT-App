const fs = require('fs');
let lines = fs.readFileSync('renderer.js', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  // 1. scrapeDashboardData
  if (i >= 39 && i <= 200) {
    lines[i] = lines[i].replace(/webview\./g, 'webviewDashboard.');
  }
  // 2. scrapeTimetableData
  if (i >= 200 && i <= 510) {
    lines[i] = lines[i].replace(/webview\./g, 'webviewTimetable.');
  }
  // 3. Theme
  if (i >= 1050 && i <= 1065) {
    lines[i] = lines[i].replace(/webview\.insertCSS\((.*?)\)/g, 'webviewDashboard.insertCSS($1); webviewTimetable.insertCSS($1)');
  }
  // 4. Reload theme
  if (i >= 1090 && i <= 1105) {
    lines[i] = lines[i].replace(/webview\.reload\(\)/g, 'webviewDashboard.reload(); webviewTimetable.reload()');
  }
  // 5. safeLoadURL
  if (i >= 1115 && i <= 1145) {
    if (lines[i].includes('function safeLoadURL(url)')) {
      lines[i] = 'function safeLoadURL(url, wv = webviewDashboard) {';
    }
    lines[i] = lines[i].replace(/webview\./g, 'wv.');
  }
  
  // 6. Navigation Tabs
  if (i >= 1155 && i <= 1170) { // btnHome
    lines[i] = lines[i].replace(/webviewWrapper\.classList\.add\('headless'\);/, '');
    lines[i] = lines[i].replace(/cancelPendingNavigation\(\);/, '');
    lines[i] = lines[i].replace(/if \(!webview\.getURL\(\)\.includes\('dashboard'\)\) \{/, 'if (false) {');
  }
  if (i >= 1170 && i <= 1195) { // btnTimetable
    lines[i] = lines[i].replace(/webviewWrapper\.classList\.add\('headless'\);/, '');
    lines[i] = lines[i].replace(/cancelPendingNavigation\(\);/, '');
    lines[i] = lines[i].replace(/if \(!webview\.getURL\(\)\.includes\('lich-theo-tuan'\)\) \{/, 'if (false) {');
    if (lines[i].includes('timetableGrid.innerHTML =')) {
      lines[i] = ''; 
    }
    lines[i] = lines[i].replace(/webview\.getURL\(\)/g, 'webviewTimetable.getURL()');
  }
  
  // 7. Webview Events
  if (lines[i].includes("webview.addEventListener('dom-ready'")) { 
    lines[i] = "function setupWebviewEvents(wv, wrapper, type) {\n" + lines[i].replace(/webview\./g, 'wv.');
  }
  else if (i > 1220 && i <= 1380) { // <=== CHANGED THIS TO 1380
    lines[i] = lines[i].replace(/webview\./g, 'wv.');
    lines[i] = lines[i].replace(/webviewWrapper\./g, 'wrapper.');
    
    // Fix did-finish-load
    if (lines[i].includes("if (wv.getURL().includes('lich-theo-tuan') || wv.getURL().includes('thoi-khoa-bieu')) {")) {
       lines[i] = lines[i].replace("if (wv.getURL().includes('lich-theo-tuan')", "if (type === 'timetable' && (wv.getURL().includes('lich-theo-tuan')");
       lines[i] = lines[i] + ")) {";
       // Quick regex replace for the line
       lines[i] = lines[i].replace(/\)\) \{\)\) \{/, ')) {');
    }
    if (lines[i].includes("} else if (wv.getURL().includes('dashboard')) {")) {
       lines[i] = lines[i].replace("} else if (wv.getURL().includes('dashboard')) {", "} else if (type === 'dashboard' && wv.getURL().includes('dashboard')) {");
    }
    if (lines[i].includes("safeLoadURL('https://sinhvien.huit.edu.vn/lich-theo-tuan.html');")) {
       lines[i] = "              webviewTimetable.loadURL('https://sinhvien.huit.edu.vn/lich-theo-tuan.html');";
    }
    if (lines[i].includes("showNativeScreen('native-timetable');")) {
       lines[i] = lines[i].replace("showNativeScreen('native-timetable');", "// Do not auto-switch tab");
    }
    if (lines[i].includes("setActiveNav(btnTimetable);")) {
       lines[i] = lines[i].replace("setActiveNav(btnTimetable);", "");
    }
    
    // End of events
    if (i === 1380) {
      lines[i] += "\n}\nsetupWebviewEvents(webviewDashboard, webviewWrapperDashboard, 'dashboard');\nsetupWebviewEvents(webviewTimetable, webviewWrapperTimetable, 'timetable');\n";
    }
  }
  
  // 7.5 Fix Keyboard Shortcuts which were broken
  if (i > 1380 && i <= 1435) {
     lines[i] = lines[i].replace(/webview\./g, 'webviewDashboard.');
  }

  // 8. Captcha and Login
  if (i >= 1480 && i <= 1550) {
    lines[i] = lines[i].replace(/webview\./g, 'webviewDashboard.');
  }
  
  // 9. triggerWebviewAction
  if (i >= 1570 && i <= 1585) {
    lines[i] = lines[i].replace(/webview\./g, 'webviewTimetable.');
  }
}

// Ensure the first regex replacements were exact
for (let i = 0; i < lines.length; i++) {
   if (lines[i].includes("if (type === 'timetable' && (wv.getURL().includes('lich-theo-tuan') || wv.getURL().includes('thoi-khoa-bieu')))) {")) {
       lines[i] = lines[i].replace(")))) {", "))) {");
   }
}

fs.writeFileSync('renderer_fixed.js', lines.join('\n'));
console.log('Done');
