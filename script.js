document.addEventListener('DOMContentLoaded', function() {
    // 後端 API 網址 (Apps Script 發布的網址)
    const API_URL = 'https://script.google.com/macros/s/AKfycbwCjELScYntx661Zw_1sV8SzR7XrbS1f2myK0TyTCFxP8IMENAgG68JmOgJ3mFoG9E5/exec';
    
    // 資料儲存
    let entries = [];
    let currentSort = 'newest';
    let compareMode = false;
    let schoolsToCompare = [];
    
    // 過濾器狀態
    let activeFilters = {
        region: 'all',
        scoreMin: null,
        scoreMax: null,
        year: null,
        subjects: {},
        composition: null
    };
    
    // 初始化頁面
    showLoading();
    fetchEntries()
        .then(() => {
            updateStatistics();
            displayEntries();
        })
        .catch(error => {
            showApiMessage('error', '無法載入資料: ' + error.message);
        })
        .finally(() => {
            hideLoading();
            setupMobileOptimizations();
            setupSidebarMenu(); // 初始化側邊欄選單
            setupHelpModal(); // 初始化使用說明模態框
            setupRegionFilter();
            setupAdvancedFilters(); // 設置進階篩選功能
            populateDepartmentGroups();
            setupSchoolTags(); // 設置學校快速選擇功能
            enhanceVisualElements();
            addParallaxEffect();
            setupGradientAnimations();
            setupCompareMode(); // 設置比較模式功能
        });
    
    // API 相關功能
    // 獲取所有項目
    async function fetchEntries() {
        try {
            const response = await fetch(`${API_URL}?action=getEntries`);
            if (!response.ok) throw new Error('網路回應不正常');
            
            const data = await response.json();
            if (data.success) {
                entries = data.entries;
                return data.entries;
            } else {
                throw new Error(data.message || '獲取資料失敗');
            }
        } catch (error) {
            console.error('獲取資料錯誤:', error);
            throw error;
        }
    }
    
    // 新增項目 - 這個方法不再使用，改用直接fetch
    async function addEntry(entry) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'addEntry',
                    entry: entry
                }),
                mode: 'cors'
            });
            
            if (!response.ok) throw new Error('網路回應不正常');
            
            const data = await response.json();
            if (data.success) {
                return data;
            } else {
                throw new Error(data.message || '新增資料失敗');
            }
        } catch (error) {
            console.error('新增資料錯誤:', error);
            throw error;
        }
    }
    
    // UI 顯示相關功能
    // 顯示/隱藏載入中狀態
    function showLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.style.display = 'flex';
        
        // 添加進度動畫
        if (!document.querySelector('#loading-overlay .loading-animation')) {
            const loadingAnimation = document.createElement('div');
            loadingAnimation.className = 'loading-animation';
            loadingAnimation.innerHTML = `
                <div class="loading-circles">
                    <div class="circle"></div>
                    <div class="circle"></div>
                    <div class="circle"></div>
                </div>
                <div class="loading-text">資料載入中</div>
                <div class="loading-progress">
                    <div class="progress-bar"></div>
                </div>
            `;
            
            // 替換原有的spinner
            const spinner = document.querySelector('#loading-overlay .spinner-border');
            if (spinner) {
                spinner.parentNode.replaceChild(loadingAnimation, spinner);
            } else {
                loadingOverlay.appendChild(loadingAnimation);
            }
            
            // 模擬進度條
            simulateProgress();
        }
    }
    
    function hideLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        
        // 進度條完成動畫
        const progressBar = document.querySelector('#loading-overlay .progress-bar');
        if (progressBar) {
            progressBar.style.width = '100%';
            
            // 添加完成動畫
            setTimeout(() => {
                const loadingAnimation = document.querySelector('#loading-overlay .loading-animation');
                if (loadingAnimation) {
                    loadingAnimation.classList.add('completed');
                    
                    setTimeout(() => {
                        loadingOverlay.style.display = 'none';
                        
                        // 重置進度條
                        setTimeout(() => {
                            progressBar.style.width = '0%';
                            loadingAnimation.classList.remove('completed');
                        }, 500);
                    }, 600);
                } else {
                    loadingOverlay.style.display = 'none';
                }
            }, 300);
        } else {
            loadingOverlay.style.display = 'none';
        }
    }
    
    function simulateProgress() {
        const progressBar = document.querySelector('#loading-overlay .progress-bar');
        if (!progressBar) return;
        
        let width = 0;
        const maxWidth = 90; // 最大進度為90%，留下10%在數據加載完成時填滿
        
        // 模擬不同階段的加載速度
        const interval = setInterval(() => {
            if (width >= maxWidth) {
                clearInterval(interval);
                return;
            }
            
            if (width < 30) {
                width += 1;
            } else if (width < 60) {
                width += 0.5;
            } else {
                width += 0.2;
            }
            
            progressBar.style.width = width + '%';
        }, 50);
    }
    
    // 顯示 API 相關訊息
    const originalShowApiMessage = function(type, message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type === 'success' ? 'success' : 'danger'} api-alert ${type}`;
        alertDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-circle'}-fill me-2"></i>
                <div>${message}</div>
                <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        document.body.appendChild(alertDiv);
        
        // 自動關閉
        setTimeout(() => {
            alertDiv.classList.add('fade');
            setTimeout(() => alertDiv.remove(), 300);
        }, 3000);
    };
    
    function showApiMessage(type, message) {
        originalShowApiMessage(type, message);
        
        // 查找最後添加的提示框
        const alertDiv = document.querySelector('.api-alert:last-child');
        if (alertDiv) {
            // 添加圖標和更美觀的樣式
            const icon = type === 'success' ? 
                '<i class="bi bi-check-circle-fill me-2 fs-4"></i>' : 
                '<i class="bi bi-exclamation-circle-fill me-2 fs-4"></i>';
            
            alertDiv.innerHTML = `
                <div class="d-flex align-items-center p-2">
                    ${icon}
                    <div>${message}</div>
                    <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            `;
        }
    }
    
    // 根據目前設定的排序顯示項目
    const originalDisplayEntries = function(searchKeyword = '') {
        let filteredEntries = entries;
        
        // 搜尋過濾
        if (searchKeyword) {
            filteredEntries = entries.filter(entry => {
                return entry.school.toLowerCase().includes(searchKeyword) || 
                       entry.department.toLowerCase().includes(searchKeyword);
            });
        }
        
        // 排序
        filteredEntries = sortEntries(filteredEntries, currentSort);
        
        // 顯示結果
        const resultsTable = document.getElementById('results-table');
        resultsTable.innerHTML = '';
        
        if (filteredEntries.length === 0) {
            resultsTable.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-5">
                        <div class="d-flex flex-column align-items-center">
                            <i class="bi bi-info-circle mb-3" style="font-size: 2rem; color: #6c757d;"></i>
                            <p class="mb-0">尚無符合條件的資料，請嘗試其他關鍵字或分享你的資訊！</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        // 檢查是否需要使用移動版卡片布局
        const useCardView = window.innerWidth < 576 && document.querySelector('.table-responsive').classList.contains('mobile-card-view');
        
        if (useCardView) {
            // 移動版卡片布局
            filteredEntries.forEach(entry => {
                const cardRow = document.createElement('div');
                cardRow.className = 'mobile-row';
                
                // 格式化分數顯示
                const scoreDisplay = Object.entries(entry.scores).map(([subject, grade]) => {
                    const subjectNames = {
                        chinese: '國文',
                        english: '英文',
                        math: '數學',
                        science: '自然',
                        social: '社會'
                    };
                    
                    const subjectIcons = {
                        chinese: '<i class="bi bi-book"></i>',
                        english: '<i class="bi bi-translate"></i>',
                        math: '<i class="bi bi-calculator"></i>',
                        science: '<i class="bi bi-moisture"></i>',
                        social: '<i class="bi bi-globe"></i>'
                    };
                    
                    return `<span class="score-badge score-${grade}" title="${getSubjectName(subject)}">${subjectIcons[subject]} ${subjectNames[subject]}: ${grade}</span>`;
                }).join('');
                
                // 添加作文級分顯示
                const compositionDisplay = entry.composition ? 
                    `<span class="composition-badge composition-${entry.composition}" title="作文級分">
                        <i class="bi bi-pencil-square"></i> 作文: ${entry.composition}級
                    </span>` : '';
                
                cardRow.innerHTML = `
                    <div class="mobile-cell">
                        <span class="mobile-label">學校/科系:</span>
                        <div class="fw-bold">${entry.school}</div>
                        <div class="small text-muted">${entry.department}</div>
                    </div>
                    <div class="mobile-cell">
                        <span class="mobile-label">會考成績:</span>
                        <div>${scoreDisplay} ${compositionDisplay}</div>
                    </div>
                    <div class="mobile-cell">
                        <span class="mobile-label">總分:</span>
                        <div>
                            <span class="fw-bold">積分: ${entry.total || "未提供"}</span>
                            <span class="ms-2">積點: ${entry.totalPoints || "未提供"}</span>
                        </div>
                    </div>
                    <div class="mobile-cell">
                        <span class="mobile-label">年份:</span>
                        <span>${entry.year}</span>
                    </div>
                    <div class="mobile-cell">
                        <span class="mobile-label">說明:</span>
                        <span>${entry.comment ? `<i class="bi bi-chat-text me-1"></i>${entry.comment}` : '-'}</span>
                    </div>
                `;
                
                resultsTable.appendChild(cardRow);
                
                // 新增項目的淡入效果
                cardRow.style.opacity = '0';
                cardRow.style.transition = 'opacity 0.5s';
                setTimeout(() => cardRow.style.opacity = '1', 10);
            });
        } else {
            // 桌面版表格布局
            filteredEntries.forEach(entry => {
                const row = document.createElement('tr');
                
                // 格式化分數顯示
                const scoreDisplay = Object.entries(entry.scores).map(([subject, grade]) => {
                    const subjectNames = {
                        chinese: '國文',
                        english: '英文',
                        math: '數學',
                        science: '自然',
                        social: '社會'
                    };
                    
                    const subjectIcons = {
                        chinese: '<i class="bi bi-book"></i>',
                        english: '<i class="bi bi-translate"></i>',
                        math: '<i class="bi bi-calculator"></i>',
                        science: '<i class="bi bi-moisture"></i>',
                        social: '<i class="bi bi-globe"></i>'
                    };
                    
                    return `<span class="score-badge score-${grade}" title="${getSubjectName(subject)}">${subjectIcons[subject]} ${subjectNames[subject]}: ${grade}</span>`;
                }).join('');
                
                // 添加作文級分顯示
                const compositionDisplay = entry.composition ? 
                    `<span class="composition-badge composition-${entry.composition}" title="作文級分">
                        <i class="bi bi-pencil-square"></i> 作文: ${entry.composition}級
                    </span>` : '';
                
                row.innerHTML = `
                    <td>
                        <div class="fw-bold">${entry.school}</div>
                        <div class="small text-muted">${entry.department}</div>
                    </td>
                    <td>${scoreDisplay} ${compositionDisplay}</td>
                    <td>
                        <div class="fw-bold">積分: ${entry.total || "未提供"}</div>
                        <div>積點: ${entry.totalPoints || "未提供"}</div>
                    </td>
                    <td>${entry.year}</td>
                    <td>${entry.comment ? `<i class="bi bi-chat-text me-1"></i>${entry.comment}` : '-'}</td>
                `;
                
                resultsTable.appendChild(row);
                
                // 新增項目的淡入效果
                row.style.opacity = '0';
                row.style.transition = 'opacity 0.5s';
                setTimeout(() => row.style.opacity = '1', 10);
            });
        }
    };
    
    function displayEntries(searchKeyword = '') {
        // 檢查目前選中的區域
        const activeRegion = document.querySelector('.region-btn.active');
        const regionValue = activeRegion ? activeRegion.getAttribute('data-region') : 'all';
        
        // 如果不是"全部"區域，使用區域過濾
        if (regionValue !== 'all') {
            filterByRegion(regionValue);
            return;
        }
        
        originalDisplayEntries(searchKeyword);
        
        // 添加項目進入動畫
        const tableRows = document.querySelectorAll('#results-table tr, #results-table .mobile-row');
        tableRows.forEach((row, index) => {
            row.style.opacity = '0';
            row.style.transform = 'translateY(20px)';
            row.style.transition = `opacity 0.5s ease, transform 0.5s ease ${index * 0.05}s`;
            
            setTimeout(() => {
                row.style.opacity = '1';
                row.style.transform = 'translateY(0)';
            }, 50);
        });
    }
    
    function getSubjectName(subject) {
        const subjectNames = {
            chinese: '國文',
            english: '英文',
            math: '數學',
            science: '自然',
            social: '社會'
        };
        return subjectNames[subject] || subject;
    }
    
    // 排序邏輯
    function sortEntries(entries, sortMethod) {
        const sorted = [...entries];
        
        switch (sortMethod) {
            case 'highest':
                return sorted.sort((a, b) => parseFloat(b.total) - parseFloat(a.total));
            case 'lowest':
                return sorted.sort((a, b) => parseFloat(a.total) - parseFloat(b.total));
            case 'newest':
            default:
                return sorted; // 已按最新排序（新增時放在前面）
        }
    }
    
    // 更新統計資訊
    function updateStatistics() {
        document.getElementById('total-entries').textContent = entries.length;
        
        // 計算最熱門學校
        if (entries.length > 0) {
            const schoolCounts = {};
            entries.forEach(entry => {
                schoolCounts[entry.school] = (schoolCounts[entry.school] || 0) + 1;
            });
            
            let popularSchool = Object.keys(schoolCounts).reduce((a, b) => 
                schoolCounts[a] > schoolCounts[b] ? a : b
            );
            
            document.getElementById('popular-school').textContent = 
                `${popularSchool} (${schoolCounts[popularSchool]}筆)`;
                
            // 生成簡單圖表
            createChart(schoolCounts);
        }
    }
    
    // 使用D3.js繪製簡單統計圖表
    function createChart(schoolCounts) {
        // 使用現有代碼的前5名資料
        const chartData = Object.entries(schoolCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
            
        const svg = d3.select('#stats-chart');
        svg.selectAll('*').remove();
        
        const margin = {top: 30, right: 30, bottom: 70, left: 60};
        const width = svg.node().clientWidth - margin.left - margin.right;
        const height = svg.node().clientHeight - margin.top - margin.bottom;
        
        const x = d3.scaleBand()
            .domain(chartData.map(d => d[0]))
            .range([0, width])
            .padding(0.4);
            
        const y = d3.scaleLinear()
            .domain([0, d3.max(chartData, d => d[1]) * 1.2])
            .nice()
            .range([height, 0]);
            
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
            
        // 增強圖表背景
        g.append('rect')
            .attr('width', width)
            .attr('height', height)
            .attr('fill', 'rgba(255,255,255,0.5)')
            .attr('rx', 10)
            .attr('ry', 10);
        
        // 添加網格線
        g.append('g')
            .attr('class', 'grid')
            .call(d3.axisLeft(y)
                .ticks(5)
                .tickSize(-width)
                .tickFormat('')
            )
            .selectAll('line')
            .style('stroke', '#e9ecef')
            .style('stroke-opacity', 0.7)
            .style('stroke-dasharray', '3,3');
            
        // 添加x軸
        g.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x)
                .tickSize(0))
            .selectAll('text')
            .attr('transform', 'rotate(-30)')
            .style('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em')
            .style('font-size', '11px')
            .style('font-weight', '500');
        
        // 隱藏x軸線條
        g.select('.domain').style('display', 'none');
        
        // 添加y軸
        g.append('g')
            .call(d3.axisLeft(y)
                .ticks(5)
                .tickSize(0))
            .selectAll('text')
            .style('font-size', '11px');
        
        // 隱藏y軸線條
        g.selectAll('.domain').style('display', 'none');
        
        // 使用更美觀的漸變色彩
        const colorScale = d3.scaleSequential()
            .domain([0, chartData.length])
            .interpolator(d3.interpolateRainbow);
        
        // 添加更美觀的柱狀圖
        g.selectAll('.bar')
            .data(chartData)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d[0]))
            .attr('y', height)  // 動畫起點
            .attr('width', x.bandwidth())
            .attr('height', 0)  // 動畫起點高度
            .attr('rx', 5)      // 圓角
            .attr('ry', 5)      // 圓角
            .attr('fill', (d, i) => colorScale(i))
            .transition()
            .duration(1200)
            .delay((d, i) => i * 150)
            .ease(d3.easeBounceOut)
            .attr('y', d => y(d[1]))
            .attr('height', d => height - y(d[1]));
        
        // 添加數值標籤
        g.selectAll('.label')
            .data(chartData)
            .enter().append('text')
            .attr('class', 'label')
            .attr('x', d => x(d[0]) + x.bandwidth() / 2)
            .attr('y', d => y(d[1]) - 10)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .style('fill', '#495057')
            .style('opacity', 0)  // 初始透明
            .text(d => d[1])
            .transition()
            .duration(800)
            .delay((d, i) => i * 150 + 500)
            .style('opacity', 1);  // 淡入
        
        // 為柱狀圖添加懸停效果
        g.selectAll('.bar-group')
            .data(chartData)
            .enter().append('rect')
            .attr('class', 'bar-hover')
            .attr('x', d => x(d[0]))
            .attr('y', 0)
            .attr('width', x.bandwidth())
            .attr('height', height)
            .attr('fill', 'transparent')
            .on('mouseover', function(event, d) {
                d3.select(this.parentNode).selectAll('.bar')
                    .filter((bar, i) => bar[0] === d[0])
                    .transition()
                    .duration(300)
                    .attr('opacity', 0.8)
                    .attr('y', y => y - 5);
                    
                d3.select(this.parentNode).selectAll('.label')
                    .filter((label, i) => label[0] === d[0])
                    .transition()
                    .duration(300)
                    .attr('y', y => y - 5)
                    .style('font-size', '14px');
            })
            .on('mouseout', function(event, d) {
                d3.select(this.parentNode).selectAll('.bar')
                    .filter((bar, i) => bar[0] === d[0])
                    .transition()
                    .duration(300)
                    .attr('opacity', 1)
                    .attr('y', y => y + 5);
                    
                d3.select(this.parentNode).selectAll('.label')
                    .filter((label, i) => label[0] === d[0])
                    .transition()
                    .duration(300)
                    .attr('y', y => y + 5)
                    .style('font-size', '12px');
            });
        
        // 添加標題
        g.append('text')
            .attr('x', width / 2)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .style('fill', '#495057')
            .text('最熱門分享學校');
    }
    
    // 根據五科成績和作文級分估算約略總分
    function calculateApproximateScore() {
        const compositionPoints = { 0: 0, 1: 1, 2: 2, 3: 2, 4: 3, 5: 3, 6: 3 };
        const scorePoints = { 'A++': 6, 'A+': 6, 'A': 6, 'B++': 4, 'B+': 4, 'B': 4, 'C': 2 };
        
        const chinese = document.getElementById('chinese').value;
        const english = document.getElementById('english').value;
        const math = document.getElementById('math').value;
        const science = document.getElementById('science').value;
        const social = document.getElementById('social').value;
        const composition = parseInt(document.getElementById('composition').value) || 0;
        
        // 使用新的計算公式
        const totalPoints = scorePoints[chinese] + scorePoints[english] +
                           scorePoints[math] + scorePoints[science] +
                           scorePoints[social] + compositionPoints[composition];
        
        return totalPoints.toString();
    }
    
    // 計算總積點 (新增)
    function calculateTotalPoints() {
        const creditPoints = { 'A++': 7, 'A+': 6, 'A': 5, 'B++': 4, 'B+': 3, 'B': 2, 'C': 1 };
        
        const chinese = document.getElementById('chinese').value;
        const english = document.getElementById('english').value;
        const math = document.getElementById('math').value;
        const science = document.getElementById('science').value;
        const social = document.getElementById('social').value;
        
        // 總積點為五科的積點總和
        const totalCredits = creditPoints[chinese] + creditPoints[english] +
                            creditPoints[math] + creditPoints[science] +
                            creditPoints[social];
        
        return totalCredits.toString();
    }
    
    // 自動更新總積分和總積點
    function updateScoreFields() {
        const score = calculateApproximateScore();
        const points = calculateTotalPoints();
        
        document.getElementById('total').value = score;
        document.getElementById('totalPoints').value = points;
    }
    
    // 監聽分數改變自動更新總分
    document.querySelectorAll('#chinese, #english, #math, #science, #social, #composition').forEach(select => {
        select.addEventListener('change', updateScoreFields);
    });
    
    // 設置移動端優化功能
    function setupMobileOptimizations() {
        // 檢查螢幕寬度，在小螢幕上啟用卡片式顯示
        function checkMobileView() {
            const tableResponsive = document.querySelector('.table-responsive');
            if (window.innerWidth < 576) {
                tableResponsive.classList.add('mobile-card-view');
            } else {
                tableResponsive.classList.remove('mobile-card-view');
            }
            // 重新顯示條目以適應新的佈局
            displayEntries(document.getElementById('search-input').value.trim().toLowerCase());
        }
        
        // 初始檢查
        checkMobileView();
        
        // 視窗大小變化時重新檢查
        window.addEventListener('resize', checkMobileView);
        
        // 新增回到頂部按鈕
        const backToTopBtn = document.createElement('button');
        backToTopBtn.className = 'floating-btn';
        backToTopBtn.innerHTML = '<i class="bi bi-arrow-up"></i>';
        backToTopBtn.addEventListener('click', function() {
            window.scrollTo({top: 0, behavior: 'smooth'});
        });
        document.body.appendChild(backToTopBtn);
        
        // 監聽滾動事件，顯示/隱藏回到頂部按鈕
        window.addEventListener('scroll', function() {
            if (window.scrollY > 300) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        });
        
        // 手動觸發一次滾動事件檢查
        window.dispatchEvent(new Event('scroll'));
    }
    
    // 設置側邊欄菜單
    function setupSidebarMenu() {
        const menuToggleBtn = document.getElementById('menu-toggle-btn');
        const sidebarMenu = document.getElementById('sidebar-menu');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        const closeBtn = document.getElementById('close-menu-btn');
        
        // 切換側邊欄顯示狀態
        function toggleSidebar() {
            sidebarMenu.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
            document.body.style.overflow = sidebarMenu.classList.contains('active') ? 'hidden' : '';
        }
        
        // 打開側邊欄
        menuToggleBtn.addEventListener('click', toggleSidebar);
        
        // 關閉側邊欄
        closeBtn.addEventListener('click', toggleSidebar);
        sidebarOverlay.addEventListener('click', toggleSidebar);
        
        // 側邊欄菜單項點擊
        document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
            item.addEventListener('click', function(e) {
                // 如果是錨點鏈接，進行平滑滾動
                if (this.getAttribute('href').startsWith('#')) {
                    e.preventDefault();
                    
                    // 關閉側邊欄
                    toggleSidebar();
                    
                    // 滾動到目標區域
                    const targetId = this.getAttribute('href');
                    if (targetId === '#') {
                        // 首頁鏈接 - 滾動到頂部
                        window.scrollTo({top: 0, behavior: 'smooth'});
                    } else {
                        const targetElement = document.querySelector(targetId);
                        if (targetElement) {
                            // 考慮導航欄高度
                            const navbarHeight = document.querySelector('.navbar').offsetHeight;
                            const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navbarHeight - 10;
                            
                            window.scrollTo({
                                top: targetPosition,
                                behavior: 'smooth'
                            });
                        }
                    }
                    
                    // 更新活動項目
                    document.querySelectorAll('.sidebar-menu .menu-item').forEach(navItem => {
                        navItem.classList.remove('active');
                    });
                    this.classList.add('active');
                }
            });
        });
        
        // 頁面滾動時更新活動菜單項
        function updateActiveSidebarItem() {
            const sections = ['share-section', 'search-section', 'stats-section', 'results-section'];
            const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
            const navbarHeight = document.querySelector('.navbar').offsetHeight;
            
            // 檢查當前滾動位置
            let currentSection = '';
            sections.forEach(sectionId => {
                const section = document.getElementById(sectionId);
                if (section) {
                    const sectionTop = section.getBoundingClientRect().top + window.pageYOffset;
                    const sectionBottom = sectionTop + section.offsetHeight;
                    
                    if (window.pageYOffset >= sectionTop - navbarHeight - 50 && 
                        window.pageYOffset < sectionBottom - navbarHeight) {
                        currentSection = sectionId;
                    }
                }
            });
            
            // 更新活動菜單項
            menuItems.forEach(item => {
                item.classList.remove('active');
                const href = item.getAttribute('href');
                if (href === '#' && (currentSection === '' || window.pageYOffset < 100)) {
                    item.classList.add('active');
                } else if (href === `#${currentSection}`) {
                    item.classList.add('active');
                }
            });
        }
        
        // 頁面滾動時更新活動菜單項
        window.addEventListener('scroll', updateActiveSidebarItem);
        
        // 初次加載時執行
        updateActiveSidebarItem();
    }
    
    // 設置使用說明模態框
    function setupHelpModal() {
        // 監聽所有開啟使用說明的按鈕
        document.querySelectorAll('.help-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const helpModal = new bootstrap.Modal(document.getElementById('helpModal'));
                helpModal.show();
            });
        });
        
        // 設置引導步驟切換
        const stepButtons = document.querySelectorAll('.guide-step-btn');
        const stepContents = document.querySelectorAll('.guide-step-content');
        
        stepButtons.forEach((button, index) => {
            button.addEventListener('click', () => {
                // 移除所有活動類
                stepButtons.forEach(btn => btn.classList.remove('active'));
                stepContents.forEach(content => content.classList.remove('active'));
                
                // 添加當前活動類
                button.classList.add('active');
                stepContents[index].classList.add('active');
                
                // 動畫效果
                stepContents[index].style.opacity = 0;
                setTimeout(() => {
                    stepContents[index].style.opacity = 1;
                }, 50);
            });
        });
    }
    
    // 導航欄滾動效果
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            navbar.classList.add('navbar-scroll');
        } else {
            navbar.classList.remove('navbar-scroll');
        }
    });
    
    // 添加頁面載入動畫
    document.body.classList.add('page-loaded');
    
    // 為分數徽章添加工具提示
    initializeTooltips();
    
    // 滾動動畫效果
    initializeScrollAnimations();
    
    // 設置 背景圖案顏色
    setRandomBackgroundPattern();
    
    // 設置區域過濾功能
    function setupRegionFilter() {
        // 初始化區域過濾按鈕
        const regionFilterContainer = document.getElementById('region-filter');
        
        // 設置全部區域按鈕狀態為活躍
        document.getElementById('region-all').classList.add('active');
        
        // 監聽區域按鈕點擊事件
        regionFilterContainer.addEventListener('click', function(e) {
            // 檢查是否點擊了區域按鈕
            if (e.target.classList.contains('region-btn') || e.target.parentElement.classList.contains('region-btn')) {
                const button = e.target.classList.contains('region-btn') ? e.target : e.target.parentElement;
                const region = button.getAttribute('data-region');
                
                // 更新按鈕狀態
                document.querySelectorAll('.region-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                button.classList.add('active');
                
                // 更新過濾器狀態
                activeFilters.region = region;
                
                // 根據選擇的區域過濾資料
                applyFilters();
            }
        });
    }
    
    // 設置進階篩選功能
    function setupAdvancedFilters() {
        // 設置年份過濾
        const yearFilterContainer = document.getElementById('year-filter');
        if (yearFilterContainer) {
            yearFilterContainer.addEventListener('click', function(e) {
                if (e.target.classList.contains('filter-chip') || e.target.parentElement.classList.contains('filter-chip')) {
                    const chip = e.target.classList.contains('filter-chip') ? e.target : e.target.parentElement;
                    const year = chip.getAttribute('data-year');
                    
                    // 切換狀態
                    if (chip.classList.contains('active')) {
                        chip.classList.remove('active');
                        activeFilters.year = null;
                    } else {
                        document.querySelectorAll('#year-filter .filter-chip').forEach(c => {
                            c.classList.remove('active');
                        });
                        chip.classList.add('active');
                        activeFilters.year = year;
                    }
                    
                    applyFilters();
                }
            });
        }
        
        // 設置積分範圍過濾
        const scoreFilterContainer = document.getElementById('score-range-filter');
        if (scoreFilterContainer) {
            scoreFilterContainer.addEventListener('click', function(e) {
                if (e.target.classList.contains('score-filter-btn') || e.target.parentElement.classList.contains('score-filter-btn')) {
                    const btn = e.target.classList.contains('score-filter-btn') ? e.target : e.target.parentElement;
                    const min = btn.getAttribute('data-min');
                    const max = btn.getAttribute('data-max');
                    
                    // 切換狀態
                    if (btn.classList.contains('active')) {
                        btn.classList.remove('active');
                        activeFilters.scoreMin = null;
                        activeFilters.scoreMax = null;
                    } else {
                        document.querySelectorAll('#score-range-filter .score-filter-btn').forEach(b => {
                            b.classList.remove('active');
                        });
                        btn.classList.add('active');
                        activeFilters.scoreMin = min;
                        activeFilters.scoreMax = max;
                    }
                    
                    applyFilters();
                }
            });
        }
        
        // 設置科目成績過濾
        const subjectFilters = document.querySelectorAll('.subject-filter');
        subjectFilters.forEach(container => {
            const subject = container.getAttribute('data-subject');
            
            container.addEventListener('click', function(e) {
                if (e.target.classList.contains('filter-chip') || e.target.parentElement.classList.contains('filter-chip')) {
                    const chip = e.target.classList.contains('filter-chip') ? e.target : e.target.parentElement;
                    const grade = chip.getAttribute('data-grade');
                    
                    // 切換狀態
                    if (chip.classList.contains('active')) {
                        chip.classList.remove('active');
                        delete activeFilters.subjects[subject];
                    } else {
                        container.querySelectorAll('.filter-chip').forEach(c => {
                            c.classList.remove('active');
                        });
                        chip.classList.add('active');
                        activeFilters.subjects[subject] = grade;
                    }
                    
                    applyFilters();
                }
            });
        });
        
        // 設置作文級分過濾
        const compositionFilter = document.getElementById('composition-filter');
        if (compositionFilter) {
            compositionFilter.addEventListener('click', function(e) {
                if (e.target.classList.contains('filter-chip') || e.target.parentElement.classList.contains('filter-chip')) {
                    const chip = e.target.classList.contains('filter-chip') ? e.target : e.target.parentElement;
                    const level = chip.getAttribute('data-level');
                    
                    // 切換狀態
                    if (chip.classList.contains('active')) {
                        chip.classList.remove('active');
                        activeFilters.composition = null;
                    } else {
                        compositionFilter.querySelectorAll('.filter-chip').forEach(c => {
                            c.classList.remove('active');
                        });
                        chip.classList.add('active');
                        activeFilters.composition = level;
                    }
                    
                    applyFilters();
                }
            });
        }
        
        // 清除所有過濾條件
        const clearFiltersBtn = document.getElementById('clear-filters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', function() {
                // 重置過濾器狀態
                activeFilters = {
                    region: 'all',
                    scoreMin: null,
                    scoreMax: null,
                    year: null,
                    subjects: {},
                    composition: null
                };
                
                // 重置UI狀態
                document.querySelectorAll('.filter-chip, .score-filter-btn').forEach(el => {
                    el.classList.remove('active');
                });
                
                // 重置區域過濾器
                document.querySelectorAll('.region-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                document.getElementById('region-all').classList.add('active');
                
                // 應用過濾器（實際上是重置為所有數據）
                applyFilters();
            });
        }
    }
    
    // 應用所有過濾條件
    function applyFilters() {
        // 獲取搜尋關鍵字
        const searchKeyword = document.getElementById('search-input').value.trim().toLowerCase();
        
        // 過濾數據
        let filteredEntries = entries.filter(entry => {
            // 搜尋關鍵字過濾
            const matchesKeyword = searchKeyword === '' || 
                                entry.school.toLowerCase().includes(searchKeyword) || 
                                entry.department.toLowerCase().includes(searchKeyword);
            
            // 區域過濾
            const matchesRegion = activeFilters.region === 'all' || entry.region === activeFilters.region;
            
            // 年份過濾
            const matchesYear = activeFilters.year === null || entry.year === activeFilters.year;
            
            // 積分範圍過濾
            const matchesScoreRange = (activeFilters.scoreMin === null || activeFilters.scoreMax === null) || 
                                   (parseFloat(entry.total) >= parseFloat(activeFilters.scoreMin) && 
                                    parseFloat(entry.total) <= parseFloat(activeFilters.scoreMax));
            
            // 科目成績過濾
            let matchesSubjects = true;
            for (const subject in activeFilters.subjects) {
                if (entry.scores[subject] !== activeFilters.subjects[subject]) {
                    matchesSubjects = false;
                    break;
                }
            }
            
            // 作文級分過濾
            const matchesComposition = activeFilters.composition === null || 
                                    entry.composition === activeFilters.composition;
            
            return matchesKeyword && matchesRegion && matchesYear && matchesScoreRange && 
                   matchesSubjects && matchesComposition;
        });
        
        // 顯示過濾後的結果
        displayFilteredEntries(filteredEntries);
        
        // 更新過濾結果計數
        updateFilterResultCount(filteredEntries.length);
    }
    
    // 更新過濾結果計數
    function updateFilterResultCount(count) {
        const resultCountEl = document.getElementById('filter-result-count');
        if (resultCountEl) {
            resultCountEl.textContent = count;
            
            // 視覺反饋 - 如果結果變少，突出顯示
            if (count < entries.length) {
                resultCountEl.classList.add('text-primary', 'fw-bold');
            } else {
                resultCountEl.classList.remove('text-primary', 'fw-bold');
            }
        }
    }
    
    // 更改搜尋表單提交事件 - 整合進過濾系統
    document.getElementById('search-form').addEventListener('submit', function(e) {
        e.preventDefault();
        applyFilters();
    });
    
    // 監聽搜尋輸入框變化 - 實時過濾
    document.getElementById('search-input').addEventListener('input', function() {
        // 輕微延遲以減少高頻率過濾
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            applyFilters();
        }, 300);
    });
    
    // 顯示過濾後的資料
    function displayFilteredEntries(filteredEntries) {
        // 排序
        filteredEntries = sortEntries(filteredEntries, currentSort);
        
        // 顯示結果
        const resultsTable = document.getElementById('results-table');
        resultsTable.innerHTML = '';
        
        if (filteredEntries.length === 0) {
            resultsTable.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-5">
                        <div class="d-flex flex-column align-items-center">
                            <i class="bi bi-info-circle mb-3" style="font-size: 2rem; color: #6c757d;"></i>
                            <p class="mb-0">尚無符合條件的資料，請嘗試其他區域或關鍵字，或分享你的資訊！</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        // 對學校進行分組
        let schoolGroups = {};
        
        filteredEntries.forEach(entry => {
            if (!schoolGroups[entry.school]) {
                schoolGroups[entry.school] = [];
            }
            schoolGroups[entry.school].push(entry);
        });
        
        // 計數器用於交替顏色
        let rowCount = 0;
        
        // 檢查是否需要使用移動版卡片布局
        const useCardView = window.innerWidth < 576 && document.querySelector('.table-responsive').classList.contains('mobile-card-view');
        
        if (useCardView) {
            // 移動版卡片布局
            Object.keys(schoolGroups).forEach(schoolName => {
                // 學校標題
                const schoolHeader = document.createElement('div');
                schoolHeader.className = 'school-divider px-3 py-2 bg-light text-primary fw-bold';
                schoolHeader.innerHTML = `<i class="bi bi-building me-2"></i>${schoolName} <span class="badge bg-primary ms-2">${schoolGroups[schoolName].length}筆</span>`;
                resultsTable.appendChild(schoolHeader);
                
                // 學校的條目
                schoolGroups[schoolName].forEach(entry => {
                    rowCount++;
                    const cardRow = document.createElement('div');
                    cardRow.className = 'mobile-row' + (rowCount % 2 === 0 ? ' even-row' : ' odd-row');
                    
                    // 使用新的格式化函數
                    const scoreDisplay = formatScoreDisplay(entry.scores, entry.composition);
                    
                    cardRow.innerHTML = `
                        <div class="mobile-cell">
                            <span class="mobile-label">科系:</span>
                            <div class="fw-bold">${entry.department}</div>
                        </div>
                        <div class="mobile-cell">
                            <span class="mobile-label">會考成績:</span>
                            <div>${scoreDisplay}</div>
                        </div>
                        <div class="mobile-cell">
                            <span class="mobile-label">總分:</span>
                            <div>
                                <span class="fw-bold">積分: ${entry.total || "未提供"}</span>
                                <span class="ms-2">積點: ${entry.totalPoints || "未提供"}</span>
                            </div>
                        </div>
                        <div class="mobile-cell">
                            <span class="mobile-label">年份:</span>
                            <span>${entry.year}</span>
                        </div>
                        <div class="mobile-cell">
                            <span class="mobile-label">說明:</span>
                            <span>${entry.comment ? `<i class="bi bi-chat-text me-1"></i>${entry.comment}` : '-'}</span>
                        </div>
                    `;
                    
                    resultsTable.appendChild(cardRow);
                    
                    // 新增項目的淡入效果
                    cardRow.style.opacity = '0';
                    cardRow.style.transition = 'opacity 0.5s';
                    setTimeout(() => cardRow.style.opacity = '1', 10);
                });
            });
        } else {
            // 桌面版表格布局
            Object.keys(schoolGroups).forEach(schoolName => {
                // 學校標題行
                const headerRow = document.createElement('tr');
                headerRow.className = 'school-header bg-light';
                headerRow.innerHTML = `
                    <td colspan="5" class="text-primary fw-bold">
                        <i class="bi bi-building me-2"></i>${schoolName} 
                        <span class="badge bg-primary ms-2">${schoolGroups[schoolName].length}筆</span>
                    </td>
                `;
                resultsTable.appendChild(headerRow);
                
                // 學校條目
                schoolGroups[schoolName].forEach(entry => {
                    rowCount++;
                    const row = document.createElement('tr');
                    row.className = rowCount % 2 === 0 ? 'even-row' : 'odd-row';
                    
                    // 使用新的格式化函數
                    const scoreDisplay = formatScoreDisplay(entry.scores, entry.composition);
                    
                    row.innerHTML = `
                        <td>
                            <div class="fw-bold text-truncate">${entry.department}</div>
                        </td>
                        <td>${scoreDisplay}</td>
                        <td>
                            <div class="fw-bold">積分: ${entry.total || "未提供"}</div>
                            <div>積點: ${entry.totalPoints || "未提供"}</div>
                        </td>
                        <td>${entry.year}</td>
                        <td>${entry.comment ? `<i class="bi bi-chat-text me-1"></i>${entry.comment}` : '-'}</td>
                    `;
                    
                    resultsTable.appendChild(row);
                    
                    // 新增項目的淡入效果
                    row.style.opacity = '0';
                    row.style.transition = 'opacity 0.5s';
                    setTimeout(() => row.style.opacity = '1', 10);
                });
            });
        }
        
        // 添加項目進入動畫
        const tableItems = document.querySelectorAll('#results-table tr, #results-table .mobile-row, #results-table .school-divider, #results-table .school-header');
        tableItems.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(10px)';
            item.style.transition = `opacity 0.5s ease, transform 0.5s ease ${index * 0.05}s`;
            
            setTimeout(() => {
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, 50);
        });
    }
    
    // 新增：更好地顯示成績的函數
    function formatScoreDisplay(scores, composition) {
        // 將成績按科目分組顯示
        const scoreGroups = {
            languages: {
                chinese: scores.chinese,
                english: scores.english
            },
            math: {
                math: scores.math
            },
            sciences: {
                science: scores.science,
                social: scores.social
            }
        };
        
        // 科目顯示名稱和圖標
        const subjectNames = {
            chinese: '國文',
            english: '英文',
            math: '數學',
            science: '自然',
            social: '社會'
        };
        
        const subjectIcons = {
            chinese: '<i class="bi bi-book"></i>',
            english: '<i class="bi bi-translate"></i>',
            math: '<i class="bi bi-calculator"></i>',
            science: '<i class="bi bi-moisture"></i>',
            social: '<i class="bi bi-globe"></i>'
        };
        
        // 生成HTML
        let html = '<div class="score-display">';
        
        // 語文類
        html += '<div class="score-group languages">';
        Object.entries(scoreGroups.languages).forEach(([subject, grade]) => {
            html += `<span class="score-badge score-${grade}" title="${subjectNames[subject]}">${subjectIcons[subject]} ${subjectNames[subject]}: ${grade}</span>`;
        });
        html += '</div>';
        
        // 數學
        html += '<div class="score-group math">';
        Object.entries(scoreGroups.math).forEach(([subject, grade]) => {
            html += `<span class="score-badge score-${grade}" title="${subjectNames[subject]}">${subjectIcons[subject]} ${subjectNames[subject]}: ${grade}</span>`;
        });
        html += '</div>';
        
        // 自然社會
        html += '<div class="score-group sciences">';
        Object.entries(scoreGroups.sciences).forEach(([subject, grade]) => {
            html += `<span class="score-badge score-${grade}" title="${subjectNames[subject]}">${subjectIcons[subject]} ${subjectNames[subject]}: ${grade}</span>`;
        });
        html += '</div>';
        
        // 作文
        if (composition) {
            html += `<div class="score-group composition">
                <span class="composition-badge composition-${composition}" title="作文級分">
                    <i class="bi bi-pencil-square"></i> 作文: ${composition}級
                </span>
            </div>`;
        }
        
        html += '</div>';
        return html;
    }
    
    // 填入科系群組資料
    function populateDepartmentGroups() {
        const departmentSelect = document.getElementById('department');
        if (!departmentSelect) return;
        
        // 清空現有選項，保留預設提示選項
        const defaultOption = departmentSelect.querySelector('option[value=""]');
        departmentSelect.innerHTML = '';
        if (defaultOption) {
            departmentSelect.appendChild(defaultOption);
        }
        
        // 定義科系群組和科系
        const departmentGroups = {
            "普通科": ["普通班"],
            "機械群": ["機械科", "鑄造科", "板金科", "機械木模科", "配管科", "模具科", "機電科", "製圖科", "生物產業機電科", "電腦機械製圖科"],
            "動力機械群": ["汽車科", "重機科", "飛機修護科", "動力機械科", "農業機械科", "軌道車輛科"],
            "電機與電子群": ["資訊科", "電子科", "控制科", "電機科", "冷凍空調科", "航空電子科", "電機空調科"],
            "化工群": ["化工科", "紡織科", "染整科"],
            "土木與建築群": ["建築科", "土木科", "消防工程科", "空間測繪科"],
            "商業與管理群": ["商業經營科", "國際貿易科", "會計事務科", "資料處理科", "不動產事務科", "電子商務科", "流通管理科", "農產行銷科", "航運管理科"],
            "外語群": ["應用外語科（英文組）", "應用外語科（日文組）"],
            "設計群": ["家具木工科", "美工科", "陶瓷工程科", "室內空間設計科", "圖文傳播科", "金屬工藝科", "家具設計科", "廣告設計科", "多媒體設計科", "多媒體應用科", "室內設計科"],
            "農業群": ["農場經營科", "園藝科", "森林科", "野生動物保育科", "造園科", "畜產保健科"],
            "食品群": ["食品加工科", "食品科", "水產食品科", "烘焙科"],
            "家政群": ["家政科", "服裝科", "幼兒保育科", "美容科", "時尚模特兒科", "流行服飾科", "時尚造型科", "照顧服務科"],
            "餐旅群": ["觀光事業科", "餐飲管理科"],
            "水產群": ["漁業科", "水產養殖科"],
            "海事群": ["輪機科", "航海科"],
            "藝術群": ["戲劇科", "音樂科", "舞蹈科", "美術科", "影劇科", "西樂科", "國樂科", "電影電視科", "表演藝術科", "多媒體動畫科", "時尚工藝科"]
        };
        
        // 建立群組下拉選單
        for (const group in departmentGroups) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = group;
            
            // 添加該群組的科系選項
            departmentGroups[group].forEach(dept => {
                const option = document.createElement('option');
                option.value = dept;
                option.textContent = dept;
                optgroup.appendChild(option);
            });
            
            departmentSelect.appendChild(optgroup);
        }
    }
    
    // 初始化Bootstrap工具提示
    function initializeTooltips() {
        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl, {
            trigger: 'hover focus', // 滑鼠懸停和獲得焦點時顯示
            delay: { show: 300, hide: 100 } // 顯示和隱藏的延遲時間
        }));
        
        // 為表單欄位添加焦點事件 - 獲得焦點時自動顯示提示
        document.querySelectorAll('form input, form select, form textarea').forEach(element => {
            element.addEventListener('focus', function() {
                const tooltip = bootstrap.Tooltip.getInstance(this);
                if (tooltip) {
                    tooltip.show();
                }
            });
            
            // 失去焦點時隱藏提示
            element.addEventListener('blur', function() {
                const tooltip = bootstrap.Tooltip.getInstance(this);
                if (tooltip) {
                    setTimeout(() => tooltip.hide(), 1000); // 延遲隱藏以便用戶閱讀
                }
            });
        });
        
        // 為分數徽章添加工具提示
        document.querySelectorAll('.score-badge, .composition-badge').forEach(badge => {
            new bootstrap.Tooltip(badge);
        });
    }
    
    // 設置隨機背景圖案顏色
    function setRandomBackgroundPattern() {
        const colors = [
            'rgba(13, 110, 253, 0.03)', // 藍色
            'rgba(25, 135, 84, 0.03)',  // 綠色
            'rgba(255, 193, 7, 0.03)',  // 黃色
            'rgba(102, 16, 242, 0.03)'  // 紫色
        ];
        
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        document.documentElement.style.setProperty('--pattern-color', randomColor);
    }
    
    // 添加滾動動畫效果
    function initializeScrollAnimations() {
        const animatedElements = document.querySelectorAll('.card, .school-tag, .btn, header h1, header p');
        
        // 檢查元素是否在視口中
        function checkIfInView() {
            const windowHeight = window.innerHeight;
            const windowTopPosition = window.scrollY;
            const windowBottomPosition = windowTopPosition + windowHeight;
            
            animatedElements.forEach(element => {
                const elementHeight = element.offsetHeight;
                const elementTopPosition = element.getBoundingClientRect().top + windowTopPosition;
                const elementBottomPosition = elementTopPosition + elementHeight;
                
                // 元素進入視口
                if (elementBottomPosition >= windowTopPosition && elementTopPosition <= windowBottomPosition) {
                    element.classList.add('in-view');
                }
            });
        }
        
        // 監聽滾動事件
        window.addEventListener('scroll', checkIfInView);
        
        // 初始檢查
        checkIfInView();
    }
    
    // 設置學校快速選擇功能
    function setupSchoolTags() {
        const schoolTags = document.querySelectorAll('.school-tag');
        
        schoolTags.forEach(tag => {
            tag.addEventListener('click', function() {
                // 獲取學校名稱
                const schoolName = this.textContent.trim();
                
                // 設置搜尋框的值
                const searchInput = document.getElementById('search-input');
                searchInput.value = schoolName;
                
                // 觸發搜尋
                applyFilters();
                
                // 視覺反饋
                schoolTags.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                // 平滑滾動到結果區域
                document.getElementById('results-section').scrollIntoView({behavior: 'smooth'});
            });
        });
    }
    
    function enhanceVisualElements() {
        // Add floating animation to key elements
        document.querySelectorAll('header h1, .card-header h3').forEach(element => {
            element.classList.add('floating-element');
        });
        
        // Add 3D card effect
        document.querySelectorAll('.card').forEach(card => {
            card.classList.add('card-3d');
        });
        
        // Add pulse effect to submit buttons
        document.querySelectorAll('button[type="submit"]').forEach(button => {
            button.classList.add('pulse-effect');
        });
        
        // Enhance badges with glass morphism
        document.querySelectorAll('.score-badge, .composition-badge').forEach(badge => {
            badge.style.backdropFilter = 'blur(4px)';
            badge.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.15)';
        });
    }
    
    function addParallaxEffect() {
        document.addEventListener('mousemove', function(e) {
            const moveX = (e.clientX - window.innerWidth / 2) * 0.01;
            const moveY = (e.clientY - window.innerHeight / 2) * 0.01;
            
            document.body.style.backgroundPositionX = moveX + 'px';
            document.body.style.backgroundPositionY = moveY + 'px';
        });
    }
    
    function setupGradientAnimations() {
        // Create dynamic gradient transitions for card headers
        document.querySelectorAll('.gradient-card-header, .success-gradient-header, .info-gradient-header, .warning-gradient-header').forEach(header => {
            let hue = 0;
            setInterval(() => {
                hue = (hue + 1) % 360;
                header.style.filter = `hue-rotate(${hue}deg)`;
            }, 100);
        });
    }
    
    // 設置學校比較功能
    function setupCompareMode() {
        const compareBtn = document.getElementById('compare-btn');
        if (!compareBtn) return;
        
        // 當點擊比較按鈕時
        compareBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 切換比較模式
            compareMode = !compareMode;
            
            // 更新比較按鈕狀態
            if (compareMode) {
                this.innerHTML = '<i class="bi bi-x-circle"></i> 退出比較';
                this.classList.add('active');
                showApiMessage('success', '已啟用比較模式，點擊學校卡片選擇要比較的學校');
                document.body.classList.add('compare-mode-active');
            } else {
                this.innerHTML = '<i class="bi bi-bar-chart-steps"></i> 比較模式';
                this.classList.remove('active');
                schoolsToCompare = [];
                document.body.classList.remove('compare-mode-active');
                // 重新顯示所有學校
                applyFilters();
            }
            
            // 如果有已經選中的學校，顯示比較視窗
            if (schoolsToCompare.length > 0 && !compareMode) {
                showComparisonModal();
            }
        });
        
        // 在結果列表上添加點擊事件
        document.getElementById('results-table').addEventListener('click', function(e) {
            if (!compareMode) return;
            
            // 找出點擊的是哪個學校
            let schoolRow = e.target.closest('tr') || e.target.closest('.mobile-row');
            if (!schoolRow) return;
            
            // 找到學校名稱
            let schoolName = '';
            if (schoolRow.classList.contains('mobile-row')) {
                schoolName = schoolRow.querySelector('.fw-bold').textContent;
            } else {
                schoolName = schoolRow.querySelector('td:first-child .fw-bold').textContent;
            }
            
            // 檢查是否已在比較列表中
            const index = schoolsToCompare.findIndex(s => s.school === schoolName);
            
            if (index !== -1) {
                // 已在列表中，移除
                schoolsToCompare.splice(index, 1);
                schoolRow.classList.remove('selected-for-compare');
                showApiMessage('info', `已從比較列表移除 ${schoolName}`);
            } else {
                // 還沒加入，檢查是否超過4所
                if (schoolsToCompare.length >= 4) {
                    showApiMessage('error', '最多只能比較4所學校');
                    return;
                }
                
                // 取得該學校的所有數據
                const schoolData = getSchoolData(schoolName);
                if (schoolData.length === 0) {
                    showApiMessage('error', `沒有找到 ${schoolName} 的完整數據`);
                    return;
                }
                
                // 加入比較列表
                schoolsToCompare.push({
                    school: schoolName,
                    data: schoolData
                });
                
                schoolRow.classList.add('selected-for-compare');
                showApiMessage('success', `已將 ${schoolName} 加入比較列表`);
                
                // 如果已有2所以上學校，顯示比較按鈕
                if (schoolsToCompare.length >= 2) {
                    const compareNowBtn = document.getElementById('compare-now-btn') || createCompareNowButton();
                    compareNowBtn.style.display = 'block';
                }
            }
        });
        
        // 創建"立即比較"浮動按鈕
        function createCompareNowButton() {
            const btn = document.createElement('button');
            btn.id = 'compare-now-btn';
            btn.className = 'btn btn-primary position-fixed compare-now-btn';
            btn.innerHTML = '<i class="bi bi-bar-chart-steps me-2"></i>立即比較';
            btn.style.bottom = '20px';
            btn.style.right = '20px';
            btn.style.display = 'none';
            btn.style.zIndex = '1000';
            btn.style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)';
            
            btn.addEventListener('click', function() {
                showComparisonModal();
            });
            
            document.body.appendChild(btn);
            return btn;
        }
    }
    
    // 獲取特定學校的所有數據
    function getSchoolData(schoolName) {
        return entries.filter(entry => entry.school === schoolName);
    }
    
    // 顯示比較視窗
    function showComparisonModal() {
        // 如果只有一所或沒有學校，顯示提示
        if (schoolsToCompare.length < 2) {
            showApiMessage('info', '請至少選擇2所學校進行比較');
            return;
        }
        
        // 先檢查是否已存在比較視窗，存在則移除
        let existingModal = document.getElementById('compareModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // 創建模態框
        const modalHTML = `
        <div class="modal fade" id="compareModal" tabindex="-1" aria-labelledby="compareModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                <div class="modal-content">
                    <div class="modal-header gradient-card-header">
                        <h5 class="modal-title text-white" id="compareModalLabel">
                            <i class="bi bi-bar-chart-steps me-2"></i>學校錄取分數比較
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body" id="compare-content">
                        <div class="table-responsive">
                            <table class="table table-bordered">
                                <thead>
                                    <tr class="table-light">
                                        <th>比較項目</th>
                                        ${schoolsToCompare.map(school => 
                                            `<th class="text-center">${school.school}</th>`
                                        ).join('')}
                                    </tr>
                                </thead>
                                <tbody id="compare-table-body">
                                    <!-- 比較內容將在這裡動態生成 -->
                                </tbody>
                            </table>
                        </div>
                        <div id="compare-chart-container" class="mt-4" style="height: 400px;">
                            <canvas id="compare-chart"></canvas>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">關閉</button>
                        <button type="button" class="btn btn-primary" id="download-compare-btn">
                            <i class="bi bi-download me-1"></i>下載比較結果
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
        
        // 添加模態框到頁面
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // 顯示模態框
        const compareModal = new bootstrap.Modal(document.getElementById('compareModal'));
        compareModal.show();
        
        // 填充比較數據
        populateComparisonData();
    }
    
    // 填充比較數據
    function populateComparisonData() {
        const compareTableBody = document.getElementById('compare-table-body');
        if (!compareTableBody) return;
        
        // 計算每所學校的平均分數
        const schoolStats = schoolsToCompare.map(school => {
            const scores = school.data.map(entry => parseFloat(entry.total) || 0).filter(score => score > 0);
            const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
            
            // 計算各科成績分布
            const subjectDistribution = {
                chinese: calculateGradeDistribution(school.data, 'chinese'),
                english: calculateGradeDistribution(school.data, 'english'),
                math: calculateGradeDistribution(school.data, 'math'),
                science: calculateGradeDistribution(school.data, 'science'),
                social: calculateGradeDistribution(school.data, 'social')
            };
            
            // 計算作文分數分布
            const compositionDistribution = calculateCompositionDistribution(school.data);
            
            return {
                school: school.school,
                entryCount: school.data.length,
                avgScore: avgScore.toFixed(2),
                minScore: Math.min(...scores).toFixed(2),
                maxScore: Math.max(...scores).toFixed(2),
                subjectDistribution,
                compositionDistribution,
                recentYears: getRecentYearsData(school.data)
            };
        });
        
        // 生成表格行
        const rows = [
            // 1. 資料筆數
            `<tr>
                <td class="fw-bold"><i class="bi bi-file-earmark-text me-2"></i>資料筆數</td>
                ${schoolStats.map(stat => 
                    `<td class="text-center">${stat.entryCount} 筆</td>`
                ).join('')}
            </tr>`,
            
            // 2. 平均積分
            `<tr>
                <td class="fw-bold"><i class="bi bi-calculator me-2"></i>平均積分</td>
                ${schoolStats.map(stat => 
                    `<td class="text-center fw-bold fs-5">${stat.avgScore}</td>`
                ).join('')}
            </tr>`,
            
            // 3. 最高/最低積分
            `<tr>
                <td class="fw-bold"><i class="bi bi-graph-up-arrow me-2"></i>最高/最低積分</td>
                ${schoolStats.map(stat => 
                    `<td class="text-center">
                        <div class="text-success">最高: ${stat.maxScore}</div>
                        <div class="text-danger">最低: ${stat.minScore}</div>
                    </td>`
                ).join('')}
            </tr>`,
            
            // 4. 國文成績分布
            `<tr>
                <td class="fw-bold"><i class="bi bi-book me-2"></i>國文成績分布</td>
                ${schoolStats.map(stat => 
                    `<td class="text-center">
                        <div class="subject-distribution mb-2">
                            ${generateDistributionBars(stat.subjectDistribution.chinese)}
                        </div>
                        <div class="small text-muted">最常見: ${getMostCommonGrade(stat.subjectDistribution.chinese)}</div>
                    </td>`
                ).join('')}
            </tr>`,
            
            // 5. 英文成績分布
            `<tr>
                <td class="fw-bold"><i class="bi bi-translate me-2"></i>英文成績分布</td>
                ${schoolStats.map(stat => 
                    `<td class="text-center">
                        <div class="subject-distribution mb-2">
                            ${generateDistributionBars(stat.subjectDistribution.english)}
                        </div>
                        <div class="small text-muted">最常見: ${getMostCommonGrade(stat.subjectDistribution.english)}</div>
                    </td>`
                ).join('')}
            </tr>`,
            
            // 6. 數學成績分布
            `<tr>
                <td class="fw-bold"><i class="bi bi-calculator me-2"></i>數學成績分布</td>
                ${schoolStats.map(stat => 
                    `<td class="text-center">
                        <div class="subject-distribution mb-2">
                            ${generateDistributionBars(stat.subjectDistribution.math)}
                        </div>
                        <div class="small text-muted">最常見: ${getMostCommonGrade(stat.subjectDistribution.math)}</div>
                    </td>`
                ).join('')}
            </tr>`,
            
            // 7. 作文級分分布
            `<tr>
                <td class="fw-bold"><i class="bi bi-pencil-square me-2"></i>作文級分分布</td>
                ${schoolStats.map(stat => 
                    `<td class="text-center">
                        <div class="composition-distribution mb-2">
                            ${generateCompositionBars(stat.compositionDistribution)}
                        </div>
                        <div class="small text-muted">最常見: ${getMostCommonComposition(stat.compositionDistribution)}級</div>
                    </td>`
                ).join('')}
            </tr>`,
            
            // 8. 年度趨勢
            `<tr>
                <td class="fw-bold"><i class="bi bi-calendar me-2"></i>年度積分趨勢</td>
                ${schoolStats.map(stat => 
                    `<td class="text-center">
                        <div class="year-trend" style="height: 60px;">
                            ${generateYearTrendSpark(stat.recentYears)}
                        </div>
                    </td>`
                ).join('')}
            </tr>`
        ];
        
        // 填充表格
        compareTableBody.innerHTML = rows.join('');
        
        // 創建比較圖表
        createComparisonChart(schoolStats);
        
        // 設置下載功能
        document.getElementById('download-compare-btn').addEventListener('click', function() {
            downloadComparisonResult(schoolStats);
        });
    }
    
    // 計算特定科目的成績分布
    function calculateGradeDistribution(entries, subject) {
        const distribution = {
            'A++': 0, 'A+': 0, 'A': 0, 'B++': 0, 'B+': 0, 'B': 0, 'C': 0
        };
        
        entries.forEach(entry => {
            if (entry.scores && entry.scores[subject]) {
                distribution[entry.scores[subject]]++;
            }
        });
        
        return distribution;
    }
    
    // 計算作文級分分布
    function calculateCompositionDistribution(entries) {
        const distribution = {
            0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0
        };
        
        entries.forEach(entry => {
            if (entry.composition) {
                distribution[entry.composition]++;
            }
        });
        
        return distribution;
    }
    
    // 生成特定科目的分布長條圖
    function generateDistributionBars(distribution) {
        const grades = ['A++', 'A+', 'A', 'B++', 'B+', 'B', 'C'];
        const colors = {
            'A++': '#d32f2f',
            'A+': '#f44336',
            'A': '#ff5722',
            'B++': '#ff9800',
            'B+': '#ffb74d',
            'B': '#ffe0b2',
            'C': '#e0e0e0'
        };
        
        const total = Object.values(distribution).reduce((a, b) => a + b, 0);
        if (total === 0) return '<div class="text-muted">無數據</div>';
        
        let html = '<div class="d-flex justify-content-center align-items-end" style="height: 40px;">';
        
        grades.forEach(grade => {
            const percentage = total > 0 ? (distribution[grade] / total * 100) : 0;
            if (percentage > 0) {
                html += `<div class="mx-1" style="height: ${Math.max(5, percentage * 0.4)}px; width: 8px; background-color: ${colors[grade]};" 
                    data-bs-toggle="tooltip" title="${grade}: ${distribution[grade]}人 (${percentage.toFixed(1)}%)"></div>`;
            }
        });
        
        html += '</div>';
        return html;
    }
    
    // 生成作文級分分布長條圖
    function generateCompositionBars(distribution) {
        const levels = [6, 5, 4, 3, 2, 1, 0];
        const colors = {
            6: '#9c27b0', 5: '#4caf50', 4: '#8bc34a', 
            3: '#ffc107', 2: '#ff9800', 1: '#8d6e63', 0: '#9e9e9e'
        };
        
        const total = Object.values(distribution).reduce((a, b) => a + b, 0);
        if (total === 0) return '<div class="text-muted">無數據</div>';
        
        let html = '<div class="d-flex justify-content-center align-items-end" style="height: 40px;">';
        
        levels.forEach(level => {
            const percentage = total > 0 ? (distribution[level] / total * 100) : 0;
            if (percentage > 0) {
                html += `<div class="mx-1" style="height: ${Math.max(5, percentage * 0.4)}px; width: 8px; background-color: ${colors[level]};" 
                    data-bs-toggle="tooltip" title="${level}級: ${distribution[level]}人 (${percentage.toFixed(1)}%)"></div>`;
            }
        });
        
        html += '</div>';
        return html;
    }
    
    // 獲取最常見的成績
    function getMostCommonGrade(distribution) {
        let mostCommon = '';
        let maxCount = 0;
        
        for (const grade in distribution) {
            if (distribution[grade] > maxCount) {
                maxCount = distribution[grade];
                mostCommon = grade;
            }
        }
        
        return mostCommon;
    }
    
    // 獲取最常見的作文級分
    function getMostCommonComposition(distribution) {
        let mostCommon = '';
        let maxCount = 0;
        
        for (const level in distribution) {
            if (distribution[level] > maxCount) {
                maxCount = distribution[level];
                mostCommon = level;
            }
        }
        
        return mostCommon;
    }
    
    // 獲取近年數據
    function getRecentYearsData(entries) {
        const years = ['110', '111', '112', '113', '114'];
        const yearData = {};
        
        years.forEach(year => {
            const yearEntries = entries.filter(entry => entry.year === year);
            if (yearEntries.length > 0) {
                const scores = yearEntries.map(entry => parseFloat(entry.total) || 0).filter(score => score > 0);
                const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
                yearData[year] = avgScore ? avgScore.toFixed(2) : null;
            } else {
                yearData[year] = null;
            }
        });
        
        return yearData;
    }
    
    // 生成年度趨勢迷你圖
    function generateYearTrendSpark(yearData) {
        const years = ['110', '111', '112', '113', '114'];
        const hasData = Object.values(yearData).some(val => val !== null);
        
        if (!hasData) return '<div class="text-muted">無足夠資料</div>';
        
        // 找出最大最小值，用於縮放
        const values = Object.values(yearData).filter(val => val !== null).map(val => parseFloat(val));
        const max = Math.max(...values);
        const min = Math.min(...values);
        const range = max - min;
        
        // 生成SVG迷你圖
        let svg = `<svg width="100%" height="100%" viewBox="0 0 100 60" preserveAspectRatio="none">`;
        
        // 添加連接線
        let pathPoints = [];
        years.forEach((year, i) => {
            if (yearData[year] !== null) {
                const x = i * (100 / (years.length - 1));
                const y = 60 - ((parseFloat(yearData[year]) - min) / (range || 1) * 50);
                pathPoints.push(`${x},${y}`);
            }
        });
        
        if (pathPoints.length > 1) {
            svg += `<path d="M${pathPoints.join(' L')}" fill="none" stroke="#0d6efd" stroke-width="2" />`;
        }
        
        // 添加數據點
        years.forEach((year, i) => {
            if (yearData[year] !== null) {
                const x = i * (100 / (years.length - 1));
                const y = 60 - ((parseFloat(yearData[year]) - min) / (range || 1) * 50);
                svg += `<circle cx="${x}" cy="${y}" r="3" fill="#0d6efd" />`;
                svg += `<text x="${x}" y="${y - 5}" font-size="8" text-anchor="middle" fill="#495057">${yearData[year]}</text>`;
            }
        });
        
        svg += `</svg>`;
        return svg;
    }
    
    // 創建比較圖表
    function createComparisonChart(schoolStats) {
        // 使用Chart.js創建比較圖表
        const ctx = document.getElementById('compare-chart').getContext('2d');
        
        // 先檢查是否有Chart.js库
        if (typeof Chart === 'undefined') {
            // 動態加載Chart.js
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = function() {
                renderChart();
            };
            document.head.appendChild(script);
        } else {
            renderChart();
        }
        
        function renderChart() {
            // 準備數據
            const labels = schoolStats.map(stat => stat.school);
            const avgScores = schoolStats.map(stat => parseFloat(stat.avgScore));
            const minScores = schoolStats.map(stat => parseFloat(stat.minScore));
            const maxScores = schoolStats.map(stat => parseFloat(stat.maxScore));
            
            // 創建圖表
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: '平均積分',
                            data: avgScores,
                            backgroundColor: 'rgba(13, 110, 253, 0.7)',
                            borderColor: 'rgba(13, 110, 253, 1)',
                            borderWidth: 1
                        },
                        {
                            label: '最低積分',
                            data: minScores,
                            backgroundColor: 'rgba(220, 53, 69, 0.7)',
                            borderColor: 'rgba(220, 53, 69, 1)',
                            borderWidth: 1
                        },
                        {
                            label: '最高積分',
                            data: maxScores,
                            backgroundColor: 'rgba(25, 135, 84, 0.7)',
                            borderColor: 'rgba(25, 135, 84, 1)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: '學校錄取分數比較圖',
                            font: {
                                size: 16,
                                weight: 'bold'
                            }
                        },
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            title: {
                                display: true,
                                text: '積分'
                            }
                        }
                    }
                }
            });
        }
    }
    
    // 下載比較結果
    function downloadComparisonResult(schoolStats) {
        // 創建CSV內容
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";  // 添加BOM以支持中文
        
        // 添加標題行
        let headers = ["比較項目"];
        schoolStats.forEach(stat => {
            headers.push(stat.school);
        });
        csvContent += headers.join(",") + "\r\n";
        
        // 添加資料行
        // 1. 資料筆數
        let row1 = ["資料筆數"];
        schoolStats.forEach(stat => {
            row1.push(stat.entryCount);
        });
        csvContent += row1.join(",") + "\r\n";
        
        // 2. 平均積分
        let row2 = ["平均積分"];
        schoolStats.forEach(stat => {
            row2.push(stat.avgScore);
        });
        csvContent += row2.join(",") + "\r\n";
        
        // 3. 最高積分
        let row3 = ["最高積分"];
        schoolStats.forEach(stat => {
            row3.push(stat.maxScore);
        });
        csvContent += row3.join(",") + "\r\n";
        
        // 4. 最低積分
        let row4 = ["最低積分"];
        schoolStats.forEach(stat => {
            row4.push(stat.minScore);
        });
        csvContent += row4.join(",") + "\r\n";
        
        // 創建下載連結
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "學校比較報告.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});