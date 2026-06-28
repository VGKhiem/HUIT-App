// Renderer process - handles UI interactions and webview management

const webviewDashboard = document.getElementById('webview-dashboard');
const webviewTimetable = document.getElementById('webview-timetable');
const overlay = document.getElementById('welcome-overlay');
const loadingIndicator = document.getElementById('loading-indicator');

// Navigation buttons
const btnHome = document.getElementById('btn-home');
const btnTimetable = document.getElementById('btn-timetable');
const btnBack = document.getElementById('btn-back');
const btnForward = document.getElementById('btn-forward');
const btnRefresh = document.getElementById('btn-refresh');

// Native UI Containers
const webviewWrapperDashboard = document.getElementById('webview-wrapper-dashboard');
const webviewWrapperTimetable = document.getElementById('webview-wrapper-timetable');
const nativeDashboard = document.getElementById('native-dashboard');
const nativeTimetable = document.getElementById('native-timetable');
const nativeLogin = document.getElementById('native-login');

function showNativeScreen(screenId) {
  nativeDashboard.classList.add('hidden');
  nativeTimetable.classList.add('hidden');
  nativeLogin.classList.add('hidden');
  if (screenId) {
    document.getElementById(screenId).classList.remove('hidden');
    if (screenId === 'native-login') {
      const btn = document.getElementById('btn-native-login');
      if (btn) {
        btn.innerText = 'ĐĂNG NHẬP';
        btn.style.opacity = '1';
      }
    }
  }
}

// Data Element References
const elNativeInfo = document.getElementById('native-student-info');

// Headless Scraping for Dashboard
function scrapeDashboardData() {
  if (isScraping) return; // Prevent concurrent scrapes
  isScraping = true;
  const script = `
    (function() {
      try {
        let data = { name: '', id: '', info: '', avatar: '' };
        
        // 1. Get name (Xin chào, [Tên])
        let allTags = document.querySelectorAll('span, b, strong, p, div');
        for(let i=0; i<allTags.length; i++) {
           let txt = allTags[i].innerText || '';
           if (txt.includes('Xin chào') || txt.includes('Chào mừng')) {
              data.name = txt.replace(/Xin chào|Chào mừng|:|,/gi, '').trim();
              break;
           }
        }
        
        // Fallback name search
        if (!data.name) {
           let nameEl = document.querySelector('.user-info h5, .user-name, .profile-name, [class*="name"]');
           if (nameEl) data.name = nameEl.innerText.trim();
        }
        
        // 2. Get Student ID (usually 10 digits starting with 20)
        let match = document.body.innerText.match(/\\b(20\\d{8})\\b/);
        if (match) data.id = 'Mã SV: ' + match[1];
        else {
           let idEl = document.querySelector('.student-id, [class*="student-code"]');
           if (idEl) data.id = idEl.innerText.trim();
        }

        // 3. Get Avatar
        let avatarEl = document.querySelector('.user-info img, img.img-circle, img[src*="avatar"]');
        if (avatarEl) data.avatar = avatarEl.src;
        
        // 4. Get Extra Info (Lớp, Ngành, Bậc đào tạo, Giới tính, Ngày sinh...)
        let extraInfo = {};
        let keywords = [
           'Lớp', 'Lớp học', 'Lớp danh nghĩa', 'Lớp sinh viên',
           'Khóa', 'Khóa học', 'Khoá', 'Khoá học',
           'Ngành', 'Ngành học', 'Khoa', 
           'Hệ đào tạo', 'Bậc đào tạo', 'Trạng thái', 'Loại hình đào tạo', 
           'Nơi sinh', 'Giới tính', 'Ngày sinh', 'Chuyên ngành', 'Cơ sở', 'Chương trình đào tạo'
        ];
        
        let allEls = document.querySelectorAll('td, th, span, div, p, li, b');
        for (let i = 0; i < allEls.length; i++) {
           let text = allEls[i].innerText ? allEls[i].innerText.trim() : '';
           for (let k of keywords) {
              if (text === k || text === k + ':' || text === k + ' :') {
                 let nextEl = allEls[i].nextElementSibling;
                 if (nextEl && nextEl.innerText.trim() !== '') {
                    extraInfo[k] = nextEl.innerText.trim();
                 } else if (allEls[i].parentElement && allEls[i].parentElement.children.length > 1) {
                    let val = allEls[i].parentElement.children[1].innerText.trim();
                    if (val && val !== text) extraInfo[k] = val;
                 }
              } else if (text.startsWith(k + ':') || text.startsWith(k + ' :')) {
                 let val = text.substring(text.indexOf(':') + 1).trim();
                 if (val) extraInfo[k] = val;
              }
           }
        }
        // 5. Get Progress Data (Tiến độ học tập)
        let tcAccum = 0;
        let tcTotal = 0; // Default
        
        let progressMatch = document.body.innerText.match(/Tiến độ học tập\\s*(\\d+)\\s*\\/\\s*(\\d+)/i);
        if (progressMatch) {
            tcAccum = parseInt(progressMatch[1]);
            tcTotal = parseInt(progressMatch[2]);
        } else {
            // Fallback for other formats
            for (let i = 0; i < allEls.length; i++) {
               let txt = allEls[i].innerText ? allEls[i].innerText.trim() : '';
               let match1 = txt.match(/(?:tích lũy|đạt).*?(\\d+)\\s*\\/\\s*(\\d+)/i);
               if (match1) {
                  tcAccum = parseInt(match1[1]);
                  tcTotal = parseInt(match1[2]);
                  break;
               }
            }
        }
        
        // 6. Get Semesters
        let sems = [];
        let selects = document.querySelectorAll('select');
        for (let i = 0; i < selects.length; i++) {
           let s = selects[i];
           if (s.innerText && s.innerText.includes('Chọn học kỳ')) {
               let opts = s.querySelectorAll('option');
               for (let j = 0; j < opts.length; j++) {
                   let optText = opts[j].innerText.trim();
                   let optVal = opts[j].value;
                   if (optText && optText !== 'Chọn học kỳ' && !sems.find(s => s.text === optText)) {
                       sems.push({ val: optVal, text: optText });
                   }
               }
               break;
           }
        }
        
        data.extraInfo = extraInfo;
        data.progress = { accumulated: tcAccum, required: tcTotal };
        data.semesters = sems;
        data.debugText = document.body.innerText;
        
        let scriptContents = [];
        let scriptTags = document.querySelectorAll('script');
        for (let i = 0; i < scriptTags.length; i++) {
           if (scriptTags[i].innerText) {
               scriptContents.push(scriptTags[i].innerText);
           }
        }
        data.debugScripts = scriptContents.join('\\n\\n---NEXT SCRIPT---\\n\\n');
        
        return data;
      } catch(e) {
        return { error: e.message };
      }
    })();
  `;

  webviewDashboard.executeJavaScript(script).then(result => {
    if (result && !result.error) {
      let extra = result.extraInfo || {};
      
      // Cột Trái: MSSV, Họ tên, Giới tính, Ngày sinh, Nơi sinh
      let leftHtml = '';
      if (result.id) {
         let rawId = result.id.replace(/Mã SV:|Mã SV|MSSV:|MSSV/gi, '').trim();
         leftHtml += `<div>MSSV: <strong>${rawId}</strong></div>`;
      }
      if (result.name) {
         leftHtml += `<div>Họ tên: <strong class="student-name-highlight">${result.name}</strong></div>`;
      }
      
      if (extra['Giới tính']) leftHtml += `<div>Giới tính: <strong>${extra['Giới tính']}</strong></div>`;
      if (extra['Ngày sinh']) leftHtml += `<div>Ngày sinh: <strong>${extra['Ngày sinh']}</strong></div>`;
      if (extra['Nơi sinh']) leftHtml += `<div>Nơi sinh: <strong>${extra['Nơi sinh']}</strong></div>`;

      // Cột Phải: Lớp học, Khóa học, Bậc đào tạo, Loại hình đào tạo, Ngành...
      let rightHtml = '';
      
      let lop = extra['Lớp học'] || extra['Lớp'] || extra['Lớp danh nghĩa'] || extra['Lớp sinh viên'];
      if (lop) rightHtml += `<div>Lớp học: <strong>${lop}</strong></div>`;
      
      let khoa = extra['Khóa học'] || extra['Khóa'] || extra['Khoá học'] || extra['Khoá'];
      if (khoa) rightHtml += `<div>Khóa học: <strong>${khoa}</strong></div>`;
      
      if (extra['Bậc đào tạo']) rightHtml += `<div>Bậc đào tạo: <strong>${extra['Bậc đào tạo']}</strong></div>`;
      if (extra['Loại hình đào tạo']) rightHtml += `<div>Loại hình đào tạo: <strong>${extra['Loại hình đào tạo']}</strong></div>`;
      
      let nganh = extra['Ngành'] || extra['Ngành học'] || extra['Chuyên ngành'];
      if (nganh) rightHtml += `<div>Ngành: <strong>${nganh}</strong></div>`;
      
      if (extra['Trạng thái']) rightHtml += `<div>Trạng thái: <strong>${extra['Trạng thái']}</strong></div>`;
      if (extra['Cơ sở']) rightHtml += `<div>Cơ sở: <strong>${extra['Cơ sở']}</strong></div>`;
      
      if (leftHtml || rightHtml) {
        elNativeInfo.innerHTML = `
          <div class="profile-col">${leftHtml}</div>
          <div class="profile-col">${rightHtml}</div>
        `;
      } else {
        elNativeInfo.innerHTML = "<em>Không lấy được thông tin chi tiết</em>";
      }

      if (result.debugText && window.electronAPI.saveDebugHTML) {
        window.electronAPI.saveDebugHTML(result.debugText + '\\n\\n=== SCRIPTS ===\\n\\n' + (result.debugScripts || ''));
      }

      // Populate semesters dropdown
      if (result.semesters && result.semesters.length > 0) {
        let selectEl = document.getElementById('semester-select');
        if (selectEl) {
          // Clone and replace to remove ALL old event listeners (prevents stacking on reload)
          let newSelect = selectEl.cloneNode(false);
          selectEl.parentNode.replaceChild(newSelect, selectEl);
          selectEl = newSelect;
          
          // Clear previous options
          selectEl.innerHTML = '';
          result.semesters.forEach(sem => {
            let opt = document.createElement('option');
            opt.value = sem.val;
            opt.innerText = sem.text;
            selectEl.appendChild(opt);
          });
          // Select the last semester automatically (like the web does)
          selectEl.value = result.semesters[result.semesters.length - 1].val;
          
          // Create custom dropdown UI
          let customOptionsContainer = document.getElementById('custom-semester-options');
          let customLabel = document.getElementById('custom-semester-label');
          let customTrigger = document.getElementById('custom-semester-trigger');
          
          if (customOptionsContainer && customLabel && customTrigger) {
              customOptionsContainer.innerHTML = '';
              result.semesters.forEach(sem => {
                  let cOpt = document.createElement('div');
                  cOpt.className = 'custom-option';
                  cOpt.innerText = sem.text;
                  cOpt.dataset.value = sem.val;
                  cOpt.addEventListener('click', function(e) {
                      e.stopPropagation();
                      customLabel.innerText = sem.text;
                      selectEl.value = sem.val;
                      customOptionsContainer.classList.remove('open');
                      document.querySelectorAll('.custom-option').forEach(el => el.classList.remove('selected'));
                      cOpt.classList.add('selected');
                      selectEl.dispatchEvent(new Event('change'));
                  });
                  customOptionsContainer.appendChild(cOpt);
              });
              
              let lastSem = result.semesters[result.semesters.length - 1];
              customLabel.innerText = lastSem.text;
              
              // Handle trigger click
              let newTrigger = customTrigger.cloneNode(true);
              customTrigger.parentNode.replaceChild(newTrigger, customTrigger);
              newTrigger.addEventListener('click', function(e) {
                  e.stopPropagation();
                  let optsContainer = document.getElementById('custom-semester-options');
                  optsContainer.classList.toggle('open');
                  if (optsContainer.classList.contains('open')) {
                      let selectedOpt = optsContainer.querySelector('.selected');
                      if (selectedOpt) {
                          selectedOpt.scrollIntoView({ block: 'nearest' });
                      }
                  }
              });
              
              // Set initial selected visual state
              let lastOpt = document.querySelector(`.custom-option[data-value="${lastSem.val}"]`);
              if (lastOpt) lastOpt.classList.add('selected');
          }
          
          // Add change listener to fetch chart data
          selectEl.addEventListener('change', function() {
              let val = this.value;
              if (!val) return;
              
              let canvas = document.getElementById('results-chart');
              let overlay = document.getElementById('chart-overlay-text');
              if (canvas) canvas.style.filter = 'blur(8px)';
              if (overlay) {
                  overlay.style.display = 'block';
                  overlay.innerText = 'Đang tải dữ liệu...';
              }
              
              webviewTimetable.executeJavaScript(`
                  new Promise((resolve) => {
                      $.ajax({
                          url: "/SinhVien/ThongKeKetQuaHocTapTheoDot?pIDDot=" + "${val}",
                          type: 'GET',
                          success: function(html) {
                              let matchCat = html.match(/categories:\\s*\\[(.*?)\\]/);
                              let matchBar = html.match(/name:\\s*['"]Điểm của bạn.*?data:\\s*\\[(.*?)\\]/s);
                              let matchLine = html.match(/name:\\s*['"]Điểm TB lớp học phần.*?data:\\s*\\[(.*?)\\]/s);
                              
                              let categories = matchCat ? [...matchCat[1].matchAll(/['"](.*?)['"]/g)].map(m => m[1]) : [];
                              
                              let extractData = (match) => {
                                  if (!match) return [];
                                  let dataStr = match[1];
                                  let objs = [...dataStr.matchAll(/\\{([^\\}]+)\\}/g)];
                                  if (objs.length === 0) {
                                      return dataStr.split(',').map(s => {
                                          let n = parseFloat(s.replace(/['"]/g, '').trim());
                                          return isNaN(n) ? null : n;
                                      });
                                  }
                                  return objs.map(m => {
                                      let yMatch = m[1].match(/y:\\s*([\\d.]+)/);
                                      return yMatch ? parseFloat(yMatch[1]) : null;
                                  });
                              };
                              
                              let barData = extractData(matchBar);
                              let lineData = extractData(matchLine);
                              
                              // Sort data alphabetically by category to match web app
                              let zipped = categories.map((cat, i) => ({
                                  cat: cat,
                                  bar: barData[i] !== undefined ? barData[i] : null,
                                  line: lineData[i] !== undefined ? lineData[i] : null
                              }));
                              zipped.sort((a, b) => a.cat.localeCompare(b.cat, 'vi'));
                              
                              categories = zipped.map(d => d.cat);
                              barData = zipped.map(d => d.bar);
                              lineData = zipped.map(d => d.line);
                              
                              resolve({ rawHtml: html, categories, barData, lineData });
                          },
                          error: function() {
                              resolve(null);
                          }
                      });
                  })
              `).then(chartData => {
                  if (chartData && chartData.rawHtml && window.electronAPI && window.electronAPI.saveDebugHTML) {
                      window.electronAPI.saveDebugHTML(chartData.rawHtml);
                  }
                  window.drawGPAChart(chartData);
              });
          });
          
          // Trigger the initial load for the selected semester
          selectEl.dispatchEvent(new Event('change'));
        }
      }

      // 3. Update Progress Chart
      if (result.progress) {
         try {
           let existingChart = Chart.getChart("progress-chart");
           if (existingChart) existingChart.destroy();
           
           const progressCtx = document.getElementById('progress-chart');
           if (progressCtx) {
             let accum = result.progress.accumulated || 0;
             let req = result.progress.required || 150;
             let remain = req - accum;
             if (remain < 0) remain = 0;
             
             new Chart(progressCtx, {
               type: 'doughnut',
               data: {
                 labels: ['Đã tích lũy', 'Chưa tích lũy'],
                 datasets: [{
                   data: [accum, remain],
                   backgroundColor: ['#a78bfa', '#2a2a35'],
                   borderWidth: 0,
                   hoverOffset: 4
                 }]
               },
                options: {
                  responsive: true,
                  maintainAspectRatio: false,
                  layout: {
                    padding: { top: 15 }
                  },
                  plugins: {
                    legend: { position: 'bottom', labels: { color: '#9ca3af', font: { family: "'Inter', sans-serif" } } }
                  },
                  cutout: '75%'
                }
             });

              let accumEl = document.getElementById('progress-text-accum');
              let totalEl = document.getElementById('progress-text-total');
              if (accumEl && totalEl) {
                  accumEl.innerText = accum;
                  totalEl.innerText = '/ ' + (accum + remain);
              }
           }
         } catch(e) { console.log('Chart error:', e); }
      }
      // Mark real data as loaded
      isScraping = false;
      }
  }).catch(err => {
    console.log('Scrape error:', err);
    isScraping = false;
  });
}

// Headless Scraping for Timetable
function scrapeTimetableData() {
  if (window.isScrapingTimetable) return;
  window.isScrapingTimetable = true;
  
  const script = `
    new Promise((resolve) => {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        const container = document.querySelector('#viewLichTheoTuan');
        
        const emptyState = container ? container.querySelector('img[src*="tkkqht.png"]') : null;
        if (container && (container.querySelector('table') || emptyState) && !container.querySelector('.iframe-loading-overlay')) {
          clearInterval(interval);
          try {
            const table = container.querySelector('table');
            const rows = table.querySelectorAll('tr');
            
            // Extract header (days with dates)
            const headers = [];
            const headerCells = rows[0] ? rows[0].querySelectorAll('th') : [];
            for (let i = 0; i < headerCells.length; i++) {
              headers.push(headerCells[i].innerText.trim());
            }
            
            // Extract body rows (sessions and subjects)
            const bodyRows = [];
            for (let r = 1; r < rows.length; r++) {
              const cells = rows[r].querySelectorAll('td');
              const rowData = [];
              for (let c = 0; c < cells.length; c++) {
                const cell = cells[c];
                const divs = cell.querySelectorAll('div[class]');
                const subjects = [];
                
                if (divs.length > 0) {
                  divs.forEach(div => {
                    // Get computed background color for better accuracy
                    const bg = window.getComputedStyle(div).backgroundColor || div.style.backgroundColor || '';
                    const cls = div.className || '';
                    const text = div.innerText.trim();
                    if (text) {
                      subjects.push({ text: text, bg: bg, cls: cls });
                    }
                  });
                }
                
                const cellText = cell.innerText.trim();
                const rowspan = cell.getAttribute('rowspan') || '1';
                const colspan = cell.getAttribute('colspan') || '1';
                rowData.push({
                  text: cellText,
                  subjects: subjects,
                  rowspan: parseInt(rowspan),
                  colspan: parseInt(colspan),
                  html: cell.innerHTML
                });
              }
              bodyRows.push(rowData);
            }
            
            
            let rdoVal = "0";
            const checkedRdo = document.querySelector('input[name="rdoLoaiLich"]:checked');
            if (checkedRdo) rdoVal = checkedRdo.value;
            
            let dateVal = "";
            const dateInput = document.getElementById('dateNgayXemLich');
            if (dateInput) dateVal = dateInput.value;
            
            resolve({ headers: headers, bodyRows: bodyRows, controlsState: { rdo: rdoVal, date: dateVal } });
          } catch(e) {
            resolve({ error: e.message });
          }
        } else if (attempts > 150) { // 15 seconds timeout
          clearInterval(interval);
          resolve({ error: 'Timeout waiting for timetable AJAX' });
        }
      }, 100);
    });
  `;

  webviewTimetable.executeJavaScript(script).then(result => {
    window.isScrapingTimetable = false;
    
    if (result.error) {
      console.log('Timetable scrape error:', result.error);
      renderNativeTimetable({ headers: [], bodyRows: [] });
      return;
    }
    
    renderNativeTimetable(result);
  }).catch(err => {
    console.log('Scrape timetable error:', err);
    window.isScrapingTimetable = false;
    renderNativeTimetable({ headers: [], bodyRows: [] });
  });
}

function renderNativeTimetable(data) {
  const container = document.getElementById('timetable-grid-content');
  if (!container) return;
  
  if (!data.headers || data.headers.length === 0) {
    container.innerHTML = '<div style="width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; font-weight: 500; font-size: 15px; color: #a1a1aa; flex-direction: column; gap: 12px;"><i class="fa fa-calendar-times-o" style="font-size: 40px; opacity: 0.3;"></i><span>Chưa có dữ liệu thời khoá biểu cho thời gian này</span></div>';
    return;
  }
  
  // Build table HTML
  if (data.controlsState && window.syncNativeTimetableControls) {
    window.syncNativeTimetableControls(data.controlsState.date, data.controlsState.rdo);
  }
  let html = '<table class="tt-table">';
  
  // Header row
  html += '<thead><tr>';
  data.headers.forEach((h, i) => {
    const cls = i === 0 ? ' class="tt-col-ca"' : '';
    html += '<th' + cls + '>' + h.replace(/\n/g, '<br>') + '</th>';
  });
  html += '</tr></thead>';
  
  // Body rows
  html += '<tbody>';
  data.bodyRows.forEach(row => {
    html += '<tr>';
    row.forEach((cell, ci) => {
      // First column is session label (Sáng, Chiều, Tối)
      const isSessionLabel = ci === 0 && (cell.text === 'Sáng' || cell.text === 'Chiều' || cell.text === 'Tối');
      
      let attrs = '';
      if (cell.rowspan > 1) attrs += ' rowspan="' + cell.rowspan + '"';
      if (cell.colspan > 1) attrs += ' colspan="' + cell.colspan + '"';
      
      if (isSessionLabel) {
        html += '<td class="tt-session-label"' + attrs + '>' + cell.text + '</td>';
      } else if (cell.subjects && cell.subjects.length > 0) {
        html += '<td' + attrs + '>';
        cell.subjects.forEach(sub => {
          const typeClass = getSubjectTypeClass(sub.bg, sub.cls, sub.text);
          html += '<div class="tt-subject ' + typeClass + '">';
          let lines = sub.text.split('\n').filter(l => l.trim());
          
          // Format exam lines
          let startTimeLineIdx = lines.findIndex(l => l.includes('Giờ bắt đầu thi:'));
          if (startTimeLineIdx !== -1) {
            let startTimeLine = lines[startTimeLineIdx].replace('Giờ bắt đầu thi:', 'Giờ thi:');
            lines.splice(startTimeLineIdx, 1); // remove original
            
            let tietLineIdx = lines.findIndex(l => l.startsWith('Tiết:'));
            if (tietLineIdx !== -1) {
              lines[tietLineIdx] = startTimeLine; // replace "Tiết:" line
            } else {
              lines.splice(2, 0, startTimeLine); // fallback insertion
            }
          }
          
          if (lines.length > 0) {
            html += '<div class="tt-name">' + lines[0] + '</div>';
            for (let i = 1; i < lines.length; i++) {
              let detailText = lines[i].replace(/\s*-\s*\d{8,}/g, '');
              html += '<div class="tt-detail">' + detailText + '</div>';
            }
          }
          html += '</div>';
        });
        html += '</td>';
      } else {
        html += '<td' + attrs + '></td>';
      }
    });
    html += '</tr>';
  });
  html += '</tbody></table>';

  container.innerHTML = html;
}

function getSubjectTypeClass(bg, cls, text) {
  const bgLower = (bg || '').toLowerCase();
  const clsLower = (cls || '').toLowerCase();
  const textLower = (text || '').toLowerCase();
  
  // Check background color patterns from the web
  if (bgLower.includes('0, 128, 255') || bgLower.includes('rgb(0, 128, 255)') || clsLower.includes('blue') || bgLower.includes('0,128,255')) return 'tt-tructuyen';
  if (bgLower.includes('255, 165, 0') || bgLower.includes('orange') || clsLower.includes('orange')) return 'tt-thi';
  if (bgLower.includes('255, 0, 0') || bgLower.includes('red') || clsLower.includes('red') || bgLower.includes('255,0,0')) return 'tt-tamngung';
  if (bgLower.includes('255, 255, 0') || bgLower.includes('yellow') || clsLower.includes('yellow') || bgLower.includes('255,255,0')) return 'tt-thuchanh';
  
  // Check text content
  if (textLower.includes('zoom') || textLower.includes('trực tuyến')) return 'tt-tructuyen';
  if (textLower.includes('thi')) return 'tt-thi';
  if (textLower.includes('tạm ngưng') || textLower.includes('tam ngung')) return 'tt-tamngung';
  if (textLower.includes('thực hành') || textLower.includes('thuc hanh') || textLower.includes('phòng máy')) return 'tt-thuchanh';
  
  return 'tt-lythuyet';
}

window.drawGPAChart = function(chartData) {
    let canvas = document.getElementById('results-chart');
    let overlay = document.getElementById('chart-overlay-text');
    
    let existingChart = Chart.getChart("results-chart");
    if (existingChart) existingChart.destroy();
    
    if (chartData && chartData.categories && chartData.categories.length > 0) {
        if (canvas) {
            canvas.style.filter = 'none';
            canvas.style.opacity = '1';
            canvas.style.pointerEvents = 'auto'; // Cho phép hover
        }
        if (overlay) overlay.style.display = 'none';
        
        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: chartData.categories,
                datasets: [
                    {
                        type: 'bar',
                        label: 'Điểm của bạn',
                        data: chartData.barData,
                        backgroundColor: '#a78bfa',
                        borderRadius: 4,
                        yAxisID: 'y',
                        order: 2
                    },
                    {
                        type: 'line',
                        label: 'Điểm TB lớp học phần',
                        data: chartData.lineData,
                        borderColor: '#ffd700',
                        backgroundColor: '#ffd700',
                        borderWidth: 2,
                        pointBackgroundColor: '#ffd700',
                        tension: 0.4,
                        yAxisID: 'y',
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    y: { beginAtZero: true, max: 10, ticks: { color: '#9ca3af' }, grid: { color: '#2a2a35' } },
                    x: { ticks: { color: '#9ca3af', display: false }, grid: { display: false } }
                },
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#9ca3af' } },
                    tooltip: {
                        backgroundColor: 'rgba(26, 26, 46, 0.95)',
                        titleColor: '#ffffff',
                        titleFont: { size: 12, weight: 'bold' },
                        bodyColor: '#e5e7eb',
                        bodyFont: { size: 11 },
                        padding: 10,
                        cornerRadius: 6,
                        borderColor: '#3f3f5a',
                        borderWidth: 1,
                        usePointStyle: true, // Biến ô vuông thành hình tròn giống web
                        boxWidth: 8,
                        boxHeight: 8,
                        boxPadding: 6
                    }
                }
            },
            plugins: [{
                id: 'barLabels',
                afterDatasetsDraw(chart) {
                    const ctx = chart.ctx;
                    chart.data.datasets.forEach((dataset, i) => {
                        if (dataset.type === 'bar') {
                            const meta = chart.getDatasetMeta(i);
                            if (!meta.hidden) {
                                meta.data.forEach((element, index) => {
                                    const dataVal = dataset.data[index];
                                    if (dataVal !== null && dataVal !== undefined) {
                                        ctx.save();
                                        const position = element.tooltipPosition();
                                        
                                        ctx.font = 'bold 12px sans-serif';
                                        ctx.textAlign = 'center';
                                        ctx.textBaseline = 'bottom';
                                        
                                        // Viền đen sắc nét để không bị chìm vào nền hay đường kẻ
                                        ctx.strokeStyle = '#000000';
                                        ctx.lineWidth = 3;
                                        ctx.strokeText(dataVal, position.x, position.y - 3);
                                        
                                        // Chữ trắng tinh
                                        ctx.fillStyle = '#ffffff';
                                        ctx.fillText(dataVal, position.x, position.y - 3);
                                        
                                        ctx.restore();
                                    }
                                });
                            }
                        }
                    });
                }
            }]
        });
    } else {
        if (canvas) canvas.style.filter = 'blur(8px)';
        if (overlay) {
            overlay.style.display = 'block';
            overlay.innerText = 'Chưa có dữ liệu hiển thị';
        }
    }
}

// Window controls
const btnMinimize = document.getElementById('btn-minimize');
const btnClose = document.getElementById('btn-close');

// Track if user has logged in
let isLoggedIn = false;
let isScraping = false;

// ===== CUSTOM THEME SYSTEM =====
// Dark theme CSS to inject into the portal webview
const DARK_THEME_CSS = `
  /* === DARK MODE FOR HUIT PORTAL === */
  /* Universal background override for all containers */
  *, *::before, *::after {
    --dark-bg: #1a1a2e;
    --dark-card: #16213e;
    --dark-surface: #0f0f23;
    --dark-border: #2a2a5a;
    --dark-text: #e0e0ff;
    --dark-accent: #6c63ff;
  }

  body, html {
    background: var(--dark-bg) !important;
    color: var(--dark-text) !important;
  }

  /* ===== ALL CONTAINERS ===== */
  .wrapper, #wrapper, .main-content, .content-wrapper,
  .container-fluid, .container, #page-wrapper,
  .page-content, .content, .main-wrapper,
  [class*="wrapper"], [class*="content"], [class*="container"],
  [class*="page-"], #content, #main {
    background: var(--dark-bg) !important;
    color: var(--dark-text) !important;
  }

  /* ===== CARDS, PANELS, BOXES, WIDGETS ===== */
  .card, .panel, .panel-default, .box, .widget,
  .card-block, .card-container,
  [class*="card"], [class*="panel"], [class*="box"],
  [class*="widget"], [class*="tile"], [class*="shortcut"],
  [class*="dashboard"], [class*="stat"], [class*="info-box"] {
    background: var(--dark-card) !important;
    border-color: var(--dark-border) !important;
    color: var(--dark-text) !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
  }

  .card-header, .panel-heading, .card-title,
  [class*="card-header"], [class*="panel-heading"], [class*="card-title"] {
    background: #1a1a3e !important;
    border-color: var(--dark-border) !important;
    color: var(--dark-text) !important;
  }

  .card-body, .panel-body, .card-content,
  [class*="card-body"], [class*="panel-body"], [class*="card-content"] {
    background: transparent !important;
    color: var(--dark-text) !important;
  }

  .card-footer, .panel-footer,
  [class*="card-footer"], [class*="panel-footer"] {
    background: #12122a !important;
    border-color: var(--dark-border) !important;
  }

  /* ===== WHITE/LIGHT BACKGROUND ELEMENTS ===== */
  div[style*="background"], div[style*="background-color"],
  section[style*="background"], section[style*="background-color"] {
    background: var(--dark-card) !important;
  }

  /* Override white backgrounds specifically */
  [style*="background-color: white" i],
  [style*="background-color: #fff" i],
  [style*="background-color: #ffffff" i],
  [style*="background-color: rgb(255" i],
  [style*="background: white" i],
  [style*="background: #fff" i],
  [style*="background: #ffffff" i],
  .bg-white, .bg-light, [class*="bg-white"], [class*="bg-light"] {
    background: var(--dark-card) !important;
    background-color: var(--dark-card) !important;
    color: var(--dark-text) !important;
  }

  /* Target SVG chart backgrounds */
  .highcharts-background,
  svg rect[fill="#ffffff" i],
  svg rect[fill="#fff" i] {
    fill: var(--dark-card) !important;
  }

  /* ===== TABLES ===== */
  table, .table, [class*="table"] {
    color: var(--dark-text) !important;
    background: transparent !important;
  }

  table th, .table th, table thead th, thead {
    background: #1a1a3e !important;
    color: #a0a0ff !important;
    border-color: var(--dark-border) !important;
  }

  table td, .table td, table tr, tbody tr {
    border-color: var(--dark-border) !important;
    color: var(--dark-text) !important;
    background: transparent !important;
  }

  table tbody tr:nth-child(even),
  .table-striped tbody tr:nth-of-type(odd),
  .table-striped > tbody > tr:nth-of-type(odd) {
    background: rgba(255,255,255,0.02) !important;
  }

  table tbody tr:hover, .table-hover tbody tr:hover {
    background: rgba(108,99,255,0.1) !important;
  }

  /* ===== NAVBAR / HEADER ===== */
  .navbar, .header, nav, [class*="navbar"], [class*="header"],
  .top-nav, .sidebar, .main-header, .topbar,
  [class*="topbar"], [class*="nav-bar"] {
    background: var(--dark-surface) !important;
    border-color: var(--dark-border) !important;
    color: var(--dark-text) !important;
  }

  .navbar a, .header a, nav a, [class*="navbar"] a {
    color: #c0c0ff !important;
  }

  .navbar a:hover, .header a:hover, nav a:hover {
    color: var(--dark-accent) !important;
  }

  /* ===== SIDEBAR / MENU ===== */
  .sidebar, .nav-sidebar, [class*="sidebar"], [class*="side-nav"],
  [class*="left-menu"], [class*="side-menu"], [class*="nav-menu"],
  .menu, [class*="menu"] {
    background: var(--dark-surface) !important;
    color: var(--dark-text) !important;
  }

  .sidebar a, .nav-sidebar a, [class*="sidebar"] a,
  .menu a, [class*="menu"] a, .nav-link, [class*="nav-link"] {
    color: #c0c0ff !important;
  }

  .sidebar a:hover, .nav-sidebar a:hover, .sidebar .active,
  .menu a:hover, .nav-link:hover, .nav-link.active,
  [class*="menu"] a:hover, [class*="sidebar"] .active {
    background: rgba(108,99,255,0.15) !important;
    color: var(--dark-accent) !important;
  }

  .sidebar li, .menu li, [class*="menu"] li,
  .nav-item, [class*="nav-item"] {
    border-color: var(--dark-border) !important;
  }

  /* ===== DROPDOWNS ===== */
  .dropdown-menu, [class*="dropdown-menu"] {
    background: var(--dark-card) !important;
    border-color: var(--dark-border) !important;
  }

  .dropdown-item, .dropdown-menu a, .dropdown-menu li a {
    color: var(--dark-text) !important;
  }

  .dropdown-item:hover, .dropdown-menu a:hover {
    background: #1a1a3e !important;
    color: var(--dark-accent) !important;
  }

  /* ===== INPUTS & FORMS ===== */
  input, select, textarea, .form-control, [class*="form-control"],
  [class*="input"], [class*="select"] {
    background: var(--dark-surface) !important;
    border-color: var(--dark-border) !important;
    color: var(--dark-text) !important;
  }

  input:focus, select:focus, textarea:focus {
    border-color: var(--dark-accent) !important;
    box-shadow: 0 0 0 2px rgba(108,99,255,0.2) !important;
  }

  /* ===== BUTTONS ===== */
  .btn-default, .btn-secondary, [class*="btn-default"], [class*="btn-secondary"] {
    background: #2a2a5a !important;
    border-color: #3a3a6a !important;
    color: var(--dark-text) !important;
  }

  .btn-default:hover, .btn-secondary:hover {
    background: #3a3a6a !important;
  }

  .btn-primary, [class*="btn-primary"] {
    background: var(--dark-accent) !important;
    border-color: #5a52e0 !important;
  }

  /* ===== LABELS & BADGES ===== */
  .label, .badge, [class*="label"], [class*="badge"] {
    background: var(--dark-accent) !important;
  }

  /* ===== LIST GROUPS ===== */
  .list-group-item, [class*="list-group-item"] {
    background: var(--dark-card) !important;
    border-color: var(--dark-border) !important;
    color: var(--dark-text) !important;
  }

  /* ===== PROGRESS BARS & CHARTS ===== */
  .progress, [class*="progress"] {
    background: #0f0f23 !important;
  }

  /* ===== TABS ===== */
  .nav-tabs, .nav-pills, [class*="nav-tabs"], [class*="nav-pills"] {
    border-color: var(--dark-border) !important;
  }

  .nav-tabs .nav-link, .nav-pills .nav-link,
  [class*="nav-tabs"] a, [class*="nav-pills"] a {
    color: #c0c0ff !important;
    border-color: var(--dark-border) !important;
  }

  .nav-tabs .nav-link.active, .nav-pills .nav-link.active {
    background: var(--dark-accent) !important;
    border-color: var(--dark-accent) !important;
    color: white !important;
  }

  /* ===== FOOTER ===== */
  footer, .footer, [class*="footer"] {
    background: var(--dark-surface) !important;
    color: #8080aa !important;
    border-color: var(--dark-border) !important;
  }

  /* ===== LINKS ===== */
  a { color: #7c73ff !important; }
  a:hover { color: #9c93ff !important; }

  /* ===== TEXT COLORS ===== */
  h1, h2, h3, h4, h5, h6, .h1, .h2, .h3, .h4, .h5, .h6 {
    color: var(--dark-text) !important;
  }

  p, span, li, label, small, em, strong, b {
    color: inherit !important;
  }

  .text-muted, [class*="text-muted"] {
    color: #8080aa !important;
  }

  .text-primary, [class*="text-primary"] {
    color: var(--dark-accent) !important;
  }

  .text-dark, [class*="text-dark"] {
    color: var(--dark-text) !important;
  }

  .text-white, [class*="text-white"] {
    color: var(--dark-text) !important;
  }

  /* ===== ALERTS & NOTIFICATIONS ===== */
  .alert, .alert-info, .alert-warning, .alert-success, .alert-danger,
  [class*="alert"], [class*="notification"], [class*="notice"] {
    background: #1a1a3e !important;
    border-color: var(--dark-border) !important;
    color: var(--dark-text) !important;
  }

  /* ===== MODAL ===== */
  .modal-content, [class*="modal-content"] {
    background: var(--dark-card) !important;
    color: var(--dark-text) !important;
  }

  .modal-header, .modal-footer {
    background: #1a1a3e !important;
    border-color: var(--dark-border) !important;
  }

  .modal-body {
    color: var(--dark-text) !important;
  }

  /* ===== TOOLTIPS & POPOVERS ===== */
  .tooltip-inner, .popover, [class*="popover"], [class*="tooltip"] {
    background: var(--dark-card) !important;
    border-color: var(--dark-border) !important;
    color: var(--dark-text) !important;
  }
`;


let darkModeEnabled = false; // Default OFF

// Load custom CSS from file
let customCSS = '';

async function loadCustomCSS() {
  try {
    const response = await fetch('custom.css');
    customCSS = await response.text();
    console.log('Custom CSS loaded');
  } catch (err) {
    console.log('No custom.css or failed to load:', err.message);
    customCSS = '';
  }
}

// Inject custom CSS into webview
function injectThemeCSS() {
  if (darkModeEnabled) {
    webviewDashboard.insertCSS(DARK_THEME_CSS); webviewTimetable.insertCSS(DARK_THEME_CSS).catch(err => {
      console.log('Dark theme CSS injection failed:', err.message);
    });
  }
  
  // Always inject user custom CSS
  if (customCSS.trim()) {
    webviewDashboard.insertCSS(customCSS); webviewTimetable.insertCSS(customCSS).catch(err => {
      console.log('Custom CSS injection failed:', err.message);
    });
  }
}

// Reload just the CSS without reloading the page
async function reloadCustomCSS() {
  await loadCustomCSS();
  injectThemeCSS();
  showToast('Đã reload CSS custom');
}

// Load custom CSS on startup
loadCustomCSS();

// Active nav button tracking
function setActiveNav(btn) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ===== WINDOW CONTROLS =====
btnMinimize.addEventListener('click', () => window.electronAPI.minimize());
btnClose.addEventListener('click', () => window.electronAPI.close());

// ===== THEME TOGGLE =====
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
    webviewDashboard.reload(); webviewTimetable.reload();
    showToast('Đã tắt Dark Mode');
  }
});

// ===== NAVIGATION =====
let pendingNavUrl = '';
let navDebounceTimer = null;
let isNavigating = false;

// Cancel any pending or in-flight navigation
function cancelPendingNavigation() {
  if (navDebounceTimer) {
    clearTimeout(navDebounceTimer);
    navDebounceTimer = null;
  }
  if (isNavigating) {
    try { wv.stop(); } catch(e) { /* ignore */ }
    isNavigating = false;
  }
  pendingNavUrl = '';
}

function safeLoadURL(url, wv = webviewDashboard) {
  // Skip if already on that page and nothing pending
  try {
    if (wv.getURL() === url && !isNavigating && !pendingNavUrl) return;
  } catch(e) { /* webview not ready */ }
  
  // Cancel any existing pending/in-flight navigation first
  cancelPendingNavigation();
  pendingNavUrl = url;
  
  // Small delay to catch rapid clicks
  navDebounceTimer = setTimeout(() => {
    navDebounceTimer = null;
    
    isNavigating = true;
    wv.loadURL(url).then(() => {
      isNavigating = false;
      pendingNavUrl = '';
    }).catch(e => {
      isNavigating = false;
      pendingNavUrl = '';
      if (e.code !== 'ERR_ABORTED' && e.code !== 'ERR_FAILED' && e.code !== '') {
        console.log('Navigation error:', e.message);
      }
    });
  }, 150);
}

btnHome.addEventListener('click', () => {
  setActiveNav(btnHome);
  
  if (isLoggedIn) {
    showNativeScreen('native-dashboard');
  }
  // Always cancel pending nav (e.g. timetable was loading)
  // then only start new load if not already on dashboard
  
  if (false) {
    safeLoadURL('https://sinhvien.huit.edu.vn/dashboard.html');
  }
});

btnTimetable.addEventListener('click', () => {
  setActiveNav(btnTimetable);
  
  if (isLoggedIn) {
    showNativeScreen('native-timetable');
    

    const timetableGrid = document.getElementById('timetable-grid-content');
    if ((isNavigating || !webviewTimetable.getURL().includes('lich-theo-tuan')) && timetableGrid && timetableGrid.innerHTML.trim() === '') {

      const overlay = document.getElementById('native-timetable').querySelector('.empty-state-overlay');
      if (overlay) overlay.style.display = 'none';
    }
  }
  
  if (false) {
    safeLoadURL('https://sinhvien.huit.edu.vn/lich-theo-tuan.html');
  }
});

// Toast notification
function showToast(message) {
  var existing = document.getElementById('toast');
  if (existing) existing.remove();
  
  var toast = document.createElement('div');
  toast.id = 'toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: #333; color: white; padding: 12px 24px; border-radius: 8px;
    font-size: 13px; z-index: 9999; animation: fadeInUp 0.3s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-width: 80%; text-align: center;
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

btnBack.addEventListener('click', () => {
  if (webview.canGoBack()) webview.goBack();
});
btnForward.addEventListener('click', () => {
  if (webview.canGoForward()) webview.goForward();
});
btnRefresh.addEventListener('click', () => {
  webview.reload();
});

// ===== WEBVIEW EVENTS =====
function setupWebviewEvents(wv, wrapper, type) {
wv.addEventListener('dom-ready', () => {
  injectThemeCSS();
});

wv.addEventListener('did-finish-load', () => {
  injectThemeCSS();
  window.electronAPI.saveCookies();
  // Immediately hide webview if already logged in — prevents flash of raw web
  if (isLoggedIn) {
    wrapper.classList.add('headless');
  }
  
  wv.executeJavaScript(`
    (() => {
        let hasUI = document.querySelector('.user-info, .user-name, .profile, [class*="user"], [class*="student"]') !== null;
        let c = document.cookie.toLowerCase();
        let hasCookie = c.includes('token') || c.includes('session') || c.includes('auth') || c.includes('.aspxauth');
        let hasLoginForm = document.querySelector('input[type="password"]') !== null;
        let isLoginUrl = window.location.href.toLowerCase().includes('login') || window.location.href.toLowerCase().includes('dang-nhap');
        let bodyTxt = document.body ? document.body.innerText : '';
        let isWafBlocked = bodyTxt.includes('User validation required to continue') || bodyTxt.includes('error code : 338');
        return { appearsLoggedIn: hasUI || hasCookie, isLoginPage: hasLoginForm || isLoginUrl, isWafBlocked: isWafBlocked };
    })();
  `).then(function(result) {
    overlay.classList.add('hidden');
    loadingIndicator.classList.add('hidden');
    
    const appearsLoggedIn = result.appearsLoggedIn;
    const isLoginPage = result.isLoginPage;
    const isWafBlocked = result.isWafBlocked;
    
    if (isWafBlocked) {
      isLoggedIn = false;
      wrapper.classList.remove('headless');
      showNativeScreen('');
      showToast('Trường đang yêu cầu xác minh CAPTCHA! Vui lòng tự giải mã...');
      return;
    }
    
    if (isLoginPage && !appearsLoggedIn) {
      isLoggedIn = false;
      realDataLoaded = false;
      wrapper.classList.add('headless');
      showNativeScreen('native-login');
      extractCaptcha();
      
      wv.executeJavaScript(`
        (() => {
          const err = document.querySelector('.field-validation-error, #msg-login-fail, .alert-message');
          return err && err.innerText.trim() ? err.innerText.trim() : null;
        })();
      `).then(errMsg => {
        if (errMsg) showToast(errMsg);
      });
    } else if (isLoggedIn && isLoginPage) {
      isLoggedIn = false;
      realDataLoaded = false;
      wrapper.classList.add('headless');
      showNativeScreen('native-login');
      extractCaptcha();
    } else if (!isLoggedIn && appearsLoggedIn && !isLoginPage) {
      isLoggedIn = true;
      wrapper.classList.add('headless');
      
      if (type === 'timetable' && (wv.getURL().includes('lich-theo-tuan') || wv.getURL().includes('thoi-khoa-bieu'))) {
        // Do not auto-switch tab
        
        scrapeTimetableData();
      } else {
        showNativeScreen('native-dashboard');
        setActiveNav(btnHome);
        if (wv.getURL().includes('dashboard')) {
          scrapeDashboardData();
          // Preload timetable in background after a short delay
          setTimeout(() => {
            if (isLoggedIn && wv.getURL().includes('dashboard')) {
              webviewTimetable.loadURL('https://sinhvien.huit.edu.vn/lich-theo-tuan.html');
            }
          }, 1000);
        }
      }
      showToast('Đăng nhập thành công!');
    } else if (isLoggedIn && !isLoginPage) {
      wrapper.classList.add('headless');
      
      if (type === 'timetable' && (wv.getURL().includes('lich-theo-tuan') || wv.getURL().includes('thoi-khoa-bieu'))) {
        // Do not force showNativeScreen here to avoid suddenly switching user's tab
        scrapeTimetableData();
      } else if (type === 'dashboard' && wv.getURL().includes('dashboard')) {
        scrapeDashboardData();
      }
    }
  }).catch(() => {
    // If JS check fails, keep webview hidden if logged in
    if (isLoggedIn) {
      wrapper.classList.add('headless');
    }
  });
});

wv.addEventListener('did-start-loading', () => { if (!isLoggedIn) loadingIndicator.classList.remove('hidden'); });
wv.addEventListener('did-stop-loading', () => { loadingIndicator.classList.add('hidden'); });

wv.addEventListener('crashed', () => {
  console.error('Webview crashed, reloading...');
  loadingIndicator.classList.remove('hidden');
  setTimeout(() => { wv.reload(); }, 1000);
});

wv.addEventListener('gpu-process-crashed', () => {
  console.error('GPU process crashed, reloading...');
  loadingIndicator.classList.remove('hidden');
  setTimeout(() => { wv.reload(); }, 1000);
});

// Handle navigation errors
wv.addEventListener('did-fail-load', (event) => {
  if (event.errorCode === -3 || event.errorCode === -2) {
    console.log('Navigation aborted/failed:', event.errorCode);
    return;
  }
  console.error('Failed to load:', event.errorCode, event.errorDescription, event.validatedURL);
  if (event.errorCode === -100) return;
  
  overlay.classList.remove('hidden');
  const welcomeContent = overlay.querySelector('.welcome-content');
  if (welcomeContent) {
    welcomeContent.innerHTML = `
      <div class="welcome-logo">⚠️</div>
      <h1>Không thể kết nối</h1>
      <p>Lỗi: ${event.errorDescription || 'Không xác định'}</p>
      <button onclick="location.reload()" style="
        padding: 10px 24px; background: var(--accent); color: white;
        border: none; border-radius: 8px; font-size: 14px; cursor: pointer; margin-top: 12px;
      ">Thử lại</button>
    `;
  }
});

// Handle new window requests (open in webview instead of external browser)
wv.addEventListener('new-window', (event) => {
  event.preventDefault();
  wv.loadURL(event.url);
});

// Handle navigation within the webview
wv.addEventListener('will-navigate', (_event) => {
  loadingIndicator.classList.remove('hidden');
});

wv.addEventListener('did-navigate', () => {
  window.electronAPI.saveCookies();
});



// ===== LISTEN FOR NAVIGATION FROM MAIN PROCESS =====
}
setupWebviewEvents(webviewDashboard, webviewWrapperDashboard, 'dashboard');
setupWebviewEvents(webviewTimetable, webviewWrapperTimetable, 'timetable');

window.electronAPI.onNavigate((url) => {
  safeLoadURL(url);
});

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', (e) => {
  // Ctrl+R or F5 - Refresh
  if ((e.ctrlKey && e.key === 'r') || e.key === 'F5') {
    e.preventDefault();
    webviewDashboard.reload();
  }
  
  // Alt+Left - Back
  if (e.altKey && e.key === 'ArrowLeft') {
    e.preventDefault();
    if (webviewDashboard.canGoBack()) webviewDashboard.goBack();
  }
  
  // Alt+Right - Forward
  if (e.altKey && e.key === 'ArrowRight') {
    e.preventDefault();
    if (webviewDashboard.canGoForward()) webviewDashboard.goForward();
  }
  
  // Ctrl+1 - Home
  if (e.ctrlKey && e.key === '1') {
    e.preventDefault();
    btnHome.click();
  }
  
  // Ctrl+2 - Timetable
  if (e.ctrlKey && e.key === '2') {
    e.preventDefault();
    btnTimetable.click();
  }
  
  // Ctrl+D - Toggle dark mode
  if (e.ctrlKey && e.key === 'd') {
    e.preventDefault();
    btnTheme.click();
  }
  
  // Ctrl+Shift+I - Open DevTools on webview (inspect elements)
  if (e.ctrlKey && e.shiftKey && e.key === 'I') {
    e.preventDefault();
    if (webviewDashboard.isDevToolsOpened()) {
      webviewDashboard.closeDevTools();
    } else {
      webviewDashboard.openDevTools();
    }
  }
  
  // Ctrl+Shift+R - Reload custom CSS only (no page reload)
  if (e.ctrlKey && e.shiftKey && e.key === 'R') {
    e.preventDefault();
    reloadCustomCSS();
  }
});

// Auto-save cookies every 30 seconds
setInterval(() => {
  window.electronAPI.saveCookies();
}, 30000);

// ===== TOGGLE STUDENT INFO =====
const btnToggleStudentInfo = document.getElementById('toggle-student-info');
const iconEye = document.getElementById('icon-eye');
const iconEyeOff = document.getElementById('icon-eye-off');

if (btnToggleStudentInfo && elNativeInfo) {
  btnToggleStudentInfo.addEventListener('click', () => {
    elNativeInfo.classList.toggle('hide-values');
    if (elNativeInfo.classList.contains('hide-values')) {
      iconEye.style.display = 'none';
      iconEyeOff.style.display = '';
    } else {
      iconEye.style.display = '';
      iconEyeOff.style.display = 'none';
    }
  });
}

// Close custom dropdown when clicking outside
document.addEventListener('click', function() {
    let opts = document.getElementById('custom-semester-options');
    if (opts && opts.classList.contains('open')) {
        opts.classList.remove('open');
    }
});

// ===== NATIVE LOGIN LOGIC =====
function extractCaptcha() {
  const script = `
    new Promise((resolve) => {
      const img = document.getElementById('newcaptcha');
      if (!img) { resolve(null); return; }
      
      fetch(img.src)
        .then(res => res.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        })
        .catch(e => {
          resolve(null);
        });
    });
  `;
  webviewDashboard.executeJavaScript(script).then(dataUrl => {
    if (dataUrl) {
      const nativeImg = document.getElementById('native-captcha-img');
      nativeImg.src = dataUrl;
      nativeImg.style.display = 'block';
    }
  }).catch(e => console.error('Failed to extract captcha', e));
}

document.getElementById('btn-reload-captcha')?.addEventListener('click', () => {
  webviewDashboard.executeJavaScript("document.querySelector('.captcharefresh').click();").then(() => {
    setTimeout(() => { extractCaptcha(); }, 800); // wait for new image to load
  });
});

document.getElementById('btn-native-login')?.addEventListener('click', () => {
  const user = document.getElementById('native-username').value;
  const pass = document.getElementById('native-password').value;
  const cap = document.getElementById('native-captcha').value;
  const grad = document.getElementById('native-graduated').checked;
  
  if (!user || !pass || !cap) {
    showToast('Vui lòng nhập đầy đủ thông tin');
    return;
  }
  
  const script = `
    try { document.getElementById('UserName').value = '${user}'; } catch(e){}
    try { document.getElementById('Password').value = '${pass}'; } catch(e){}
    try { document.getElementById('Captcha').value = '${cap}'; } catch(e){}
    try { 
      const gradCb = document.getElementById('IsSinhVienDaTotNghiep') || document.querySelector('input[name="IsSinhVienDaTotNghiep"]');
      if (gradCb) gradCb.checked = ${grad};
    } catch(e){}
    try {
      const submitBtn = document.querySelector('.btn-submit, button[type="submit"], input[type="submit"], #btnSubmit');
      if (submitBtn) submitBtn.click();
      else document.querySelector('form').submit();
    } catch(e){}
  `;
  
  webviewDashboard.executeJavaScript(script).then(() => {
    document.getElementById('btn-native-login').innerText = 'ĐANG ĐĂNG NHẬP...';
    document.getElementById('btn-native-login').style.opacity = '0.7';
  });
});

const btnTogglePassword = document.getElementById('btn-toggle-password');
const inputPassword = document.getElementById('native-password');
const iconPwdEye = document.getElementById('icon-pwd-eye');
const iconPwdEyeOff = document.getElementById('icon-pwd-eye-off');

if (btnTogglePassword && inputPassword) {
  btnTogglePassword.addEventListener('click', () => {
    if (inputPassword.type === 'password') {
      inputPassword.type = 'text';
      iconPwdEye.style.display = 'none';
      iconPwdEyeOff.style.display = '';
    } else {
      inputPassword.type = 'password';
      iconPwdEye.style.display = '';
      iconPwdEyeOff.style.display = 'none';
    }
  });
}


// Timetable Native Controls Logic
document.addEventListener('DOMContentLoaded', () => {
  const rdoTatCa = document.querySelector('input[name="nativeRdoLoaiLich"][value="0"]');
  const rdoLichHoc = document.querySelector('input[name="nativeRdoLoaiLich"][value="1"]');
  const rdoLichThi = document.querySelector('input[name="nativeRdoLoaiLich"][value="2"]');
  const dateInput = document.getElementById('nativeDateNgayXemLich');
  const btnHienTai = document.getElementById('nativeBtnHienTai');
  const btnTroVe = document.getElementById('nativeBtnTroVe');
  const btnTiep = document.getElementById('nativeBtnTiep');
  const timetableGrid = document.getElementById('timetable-grid-content');

  function showTimetableLoading() {
    timetableGrid.innerHTML = '<div style="width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; font-weight: 600; font-size: 15px; color: #a1a1aa;"><i class="fa fa-circle-o-notch fa-spin fa-fw" style="margin-right: 8px;"></i> Đang tải dữ liệu...</div>';
  }

  function triggerWebviewAction(actionCode) {
    showTimetableLoading();
    webviewTimetable.executeJavaScript(actionCode).then(() => {
      // Wait a bit for ASP.NET to process and AJAX to start
      setTimeout(() => {
        scrapeTimetableData();
      }, 500);
    });
  }

  if (btnHienTai) {
    btnHienTai.addEventListener('click', () => {
      triggerWebviewAction("document.getElementById('btn_HienTai').click();");
    });
  }
  if (btnTroVe) {
    btnTroVe.addEventListener('click', () => {
      triggerWebviewAction("document.getElementById('btn_TroVe').click();");
    });
  }
  if (btnTiep) {
    btnTiep.addEventListener('click', () => {
      triggerWebviewAction("document.getElementById('btn_Tiep').click();");
    });
  }
  
  [rdoTatCa, rdoLichHoc, rdoLichThi].forEach(rdo => {
    if (rdo) {
      rdo.addEventListener('change', (e) => {
        if (e.target.checked) {
          triggerWebviewAction(`document.querySelector('input[name="rdoLoaiLich"][value="${e.target.value}"]').click();`);
        }
      });
    }
  });

  if (dateInput) {
    if (typeof flatpickr !== 'undefined') {
      flatpickr(dateInput, {
        dateFormat: "Y-m-d",
        locale: "vn",
        disableMobile: true,
        monthSelectorType: "static",
        onReady: function(selectedDates, dateStr, instance) {
          const currentMonthWrapper = instance.monthNav.querySelector('.flatpickr-current-month');
          if (currentMonthWrapper) {
            const customHeader = document.createElement('div');
            customHeader.className = 'custom-flatpickr-header';
            
            const textSpan = document.createElement('span');
            textSpan.className = 'custom-flatpickr-text';
            textSpan.textContent = `T${instance.currentMonth + 1}, ${instance.currentYear}`;
            
            const dropdown = document.createElement('div');
            dropdown.className = 'custom-year-dropdown';
            
            const currentYear = new Date().getFullYear();
            for (let y = currentYear - 5; y <= currentYear + 3; y++) {
              const item = document.createElement('div');
              item.className = 'custom-year-item';
              item.textContent = `Năm ${y}`;
              item.dataset.value = y;
              
              item.addEventListener('click', (e) => {
                e.stopPropagation();
                instance.changeYear(y);
                dropdown.classList.remove('show');
              });
              
              dropdown.appendChild(item);
            }
            
            customHeader.addEventListener('click', (e) => {
              e.stopPropagation();
              dropdown.classList.toggle('show');
              const selected = dropdown.querySelector('.selected');
              if (selected) {
                 dropdown.scrollTop = selected.offsetTop - dropdown.offsetHeight / 2;
              }
            });
            
            document.addEventListener('click', (e) => {
              if (!customHeader.contains(e.target)) {
                dropdown.classList.remove('show');
              }
            });
            
            customHeader.appendChild(textSpan);
            customHeader.appendChild(dropdown);
            currentMonthWrapper.appendChild(customHeader);
            
            instance.customTextSpan = textSpan;
            instance.customDropdown = dropdown;
            
            instance.updateYearDropdown = function() {
               const items = dropdown.querySelectorAll('.custom-year-item');
               items.forEach(it => {
                 if (parseInt(it.dataset.value) === instance.currentYear) {
                    it.classList.add('selected');
                 } else {
                    it.classList.remove('selected');
                 }
               });
            };
            instance.updateYearDropdown();
            
            // Allow scrolling to change month
            instance.calendarContainer.addEventListener('wheel', (e) => {
              e.preventDefault();
              if (e.deltaY > 0) {
                // Scroll down: next month
                instance.changeMonth(1, true);
              } else if (e.deltaY < 0) {
                // Scroll up: previous month
                instance.changeMonth(-1, true);
              }
            });
          }
        },
        onMonthChange: function(selectedDates, dateStr, instance) {
          if (instance.customTextSpan) {
            instance.customTextSpan.textContent = `T${instance.currentMonth + 1}, ${instance.currentYear}`;
            if (instance.updateYearDropdown) instance.updateYearDropdown();
          }
        },
        onYearChange: function(selectedDates, dateStr, instance) {
          if (instance.customTextSpan) {
            instance.customTextSpan.textContent = `T${instance.currentMonth + 1}, ${instance.currentYear}`;
            if (instance.updateYearDropdown) instance.updateYearDropdown();
          }
        }
      });
    }
    dateInput.addEventListener('change', (e) => {
      const val = e.target.value; // YYYY-MM-DD
      if (val) {
        const parts = val.split('-');
        const formatted = parts[2] + '/' + parts[1] + '/' + parts[0];
        const customText = document.getElementById('custom-date-text');
        if (customText) customText.textContent = formatted;
        
        showTimetableLoading();
        showTimetableLoading();
        webviewTimetable.executeJavaScript(`
          (function() {
            var d = new Date(${parts[0]}, ${parseInt(parts[1]) - 1}, ${parseInt(parts[2])});
            var dp = jQuery('#dateNgayXemLich').data('kendoDatePicker');
            if (dp) {
              dp.value(d);
            } else {
              var input = document.getElementById('dateNgayXemLich');
              if (input) input.value = '${formatted}';
            }
            
            // Call HUIT's global functions directly to load the timetable for the selected date
            if (typeof window.LoadLichTheoTuan === 'function') {
                window.LoadLichTheoTuan(d.toJSON());
            }
            if (typeof window.LoadDsCamThi === 'function') {
                window.LoadDsCamThi(d.toJSON());
            }
          })();
        `).then(() => {
          setTimeout(() => {
            scrapeTimetableData();
          }, 1500);
        });
      } else {
        const customText = document.getElementById('custom-date-text');
        if (customText) customText.textContent = '--/--/----';
      }
    });
  }
});

// Expose a way to sync native controls with web state
window.syncNativeTimetableControls = function(dateStr, rdoValue) {
  const customText = document.getElementById('custom-date-text');
  if (dateStr) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const dateInput = document.getElementById('nativeDateNgayXemLich');
      dateInput.value = parts[2] + '-' + parts[1] + '-' + parts[0];
      if (dateInput._flatpickr) {
        dateInput._flatpickr.setDate(dateInput.value, false);
      }
      if (customText) customText.textContent = dateStr;
    }
  } else {
    if (customText) customText.textContent = '--/--/----';
  }
  if (rdoValue !== undefined) {
    const rdo = document.querySelector(`input[name="nativeRdoLoaiLich"][value="${rdoValue}"]`);
    if (rdo) rdo.checked = true;
  }
};
