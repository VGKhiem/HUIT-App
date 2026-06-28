const fs = require('fs');
let code = fs.readFileSync('renderer.js', 'utf8');

const targetCode = `    } else if (!isLoggedIn && appearsLoggedIn && !isLoginPage) {
      isLoggedIn = true;
      webviewWrapper.classList.add('headless');
      if (!isNavigating && !pendingNavUrl) {
        if (webview.getURL().includes('lich-theo-tuan') || webview.getURL().includes('thoi-khoa-bieu')) {
          showNativeScreen('native-timetable');
          scrapeTimetableData();
        } else {
          showNativeScreen('native-dashboard');
          if (webview.getURL().includes('dashboard')) scrapeDashboardData();
        }
      } else { isNavigating = false; pendingNavUrl = ''; }
      showToast('Đăng nhập thành công!');
    } else if (isLoggedIn && !isLoginPage) {
      webviewWrapper.classList.add('headless');
      if (!isNavigating && !pendingNavUrl) {
        if (webview.getURL().includes('lich-theo-tuan') || webview.getURL().includes('thoi-khoa-bieu')) {
          showNativeScreen('native-timetable');
          scrapeTimetableData();
        } else {
          showNativeScreen('native-dashboard');
          if (webview.getURL().includes('dashboard')) scrapeDashboardData();
        }
      } else { isNavigating = false; pendingNavUrl = ''; }
    }`;

const replaceCode = `    } else if (!isLoggedIn && appearsLoggedIn && !isLoginPage) {
      isLoggedIn = true;
      webviewWrapper.classList.add('headless');
      if (!isNavigating && !pendingNavUrl) {
        if (webview.getURL().includes('lich-theo-tuan') || webview.getURL().includes('thoi-khoa-bieu')) {
          showNativeScreen('native-timetable');
          scrapeTimetableData();
        } else {
          showNativeScreen('native-dashboard');
          if (webview.getURL().includes('dashboard')) {
            scrapeDashboardData();
            // Preload timetable in background after a short delay
            setTimeout(() => {
              if (isLoggedIn && webview.getURL().includes('dashboard')) {
                safeLoadURL('https://sinhvien.huit.edu.vn/lich-theo-tuan.html');
              }
            }, 1000);
          }
        }
      } else { isNavigating = false; pendingNavUrl = ''; }
      showToast('Đăng nhập thành công!');
    } else if (isLoggedIn && !isLoginPage) {
      webviewWrapper.classList.add('headless');
      if (!isNavigating && !pendingNavUrl) {
        if (webview.getURL().includes('lich-theo-tuan') || webview.getURL().includes('thoi-khoa-bieu')) {
          // Do not force showNativeScreen here to avoid suddenly switching user's tab
          scrapeTimetableData();
        } else {
          if (webview.getURL().includes('dashboard')) {
            scrapeDashboardData();
          }
        }
      } else { isNavigating = false; pendingNavUrl = ''; }
    }`;

if (code.includes(targetCode)) {
  code = code.replace(targetCode, replaceCode);
  fs.writeFileSync('renderer.js', code);
  console.log('Successfully injected preloading logic.');
} else {
  console.log('Failed to find target code. Please check manually.');
}
