document.addEventListener('DOMContentLoaded', function() {
    // 後端 API 網址 (Apps Script 發布的網址)
    const API_URL = 'https://script.google.com/macros/s/AKfycbwCjELScYntx661Zw_1sV8SzR7XrbS1f2myK0TyTCFxP8IMENAgG68JmOgJ3mFoG9E5/exec';
    
    // 資料儲存
    let entries = [];
    let currentSort = 'newest';
    
    // 收藏功能
    let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    
    // 分頁相關變數
    let currentPage = 1;
    let pageSize = 10;
    let totalPages = 1;
    let displayedEntries = [];
    
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
            setupPagination(); // 設置分頁功能
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
            setupScoreCalculator(); // 設置積分計算器
            setupThemeToggle(); // 設置深淺色主題
            setupExportFeature(); // 設置匯出功能
            setupFavoritesSystem(); // 設置收藏功能
            setupUtilityButtons(); // 設置功能按鈕
            initializeOptimizations();
        });
    
    // 表單提交處理
    document.getElementById('score-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const hCaptchaResponse = hcaptcha.getResponse();
        if (!hCaptchaResponse) {
            document.getElementById('captcha-error').style.display = 'block';
            return;
        } else {
            document.getElementById('captcha-error').style.display = 'none';
        }
        
        const submitButton = this.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        submitButton.disabled = true;
        submitButton.innerHTML = '<div class="spinner-border spinner-border-sm text-light me-2" role="status"></div> 提交中...';
        this.classList.add('submitting');
        
        setTimeout(() => {
            this.classList.remove('submitting');
            
            const newEntry = {
                id: Date.now(),
                date: new Date().toISOString(),
                year: document.getElementById('year').value,
                school: document.getElementById('school').value,
                department: document.getElementById('department').value || '普通班',
                region: document.getElementById('region').value, 
                scores: {
                    chinese: document.getElementById('chinese').value,
                    english: document.getElementById('english').value,
                    math: document.getElementById('math').value,
                    science: document.getElementById('science').value,
                    social: document.getElementById('social').value
                },
                composition: document.getElementById('composition').value || '0',
                total: document.getElementById('total').value || calculateApproximateScore(),
                totalPoints: document.getElementById('totalPoints').value || calculateTotalPoints(),
                comment: document.getElementById('comment').value,
                captchaResponse: hCaptchaResponse
            };
            
            showLoading();
            const formData = new FormData();
            formData.append('action', 'addEntry');
            formData.append('entry', JSON.stringify(newEntry));
            
            fetch(API_URL, {
                method: 'POST',
                body: formData,
                mode: 'no-cors'
            })
                .then(() => {
                    entries.unshift(newEntry);
                    updateStatistics();
                    displayEntries();
                    document.getElementById('score-form').reset();
                    hcaptcha.reset();
                    showApiMessage('success', '感謝您的分享！您的錄取資訊已成功提交。');
                    if (window.innerWidth < 768) {
                        document.querySelector('.card.mb-4:last-of-type').scrollIntoView({ behavior: 'smooth' });
                    }
                })
                .catch(error => {
                    showApiMessage('error', '提交失敗: ' + error.message);
                })
                .finally(() => {
                    hideLoading();
                    setTimeout(() => {
                        submitButton.disabled = false;
                        submitButton.innerHTML = originalText;
                    }, 1000);
                });
        }, 800);
    });
    
    // API 相關功能
    async function fetchEntries() {
        try {
            const response = await fetch(`${API_URL}?action=getEntries&page=${currentPage}&pageSize=${pageSize}`);
            if (!response.ok) throw new Error('網路回應不正常');
            
            const data = await response.json();
            if (data.success) {
                entries = data.entries; // 儲存當前頁資料
                totalPages = data.totalPages || Math.ceil(data.total / pageSize) || 1; // 更新總頁數
                displayedEntries = data.entries; // 直接使用後端返回的資料
                return data.entries;
            } else {
                throw new Error(data.message || '獲取資料失敗');
            }
        } catch (error) {
            console.error('獲取資料錯誤:', error);
            throw error;
        }
    }
    
    // UI 顯示相關功能
    function showLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.style.display = 'flex';
        
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
                <div class="loading-progress glass-effect">
                    <div class="progress-bar shimmer-effect"></div>
                </div>
            `;
            const spinner = document.querySelector('#loading-overlay .spinner-border');
            if (spinner) {
                spinner.parentNode.replaceChild(loadingAnimation, spinner);
            } else {
                loadingOverlay.appendChild(loadingAnimation);
            }
            simulateProgress();
        }
    }
    
    function hideLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        const progressBar = document.querySelector('#loading-overlay .progress-bar');
        if (progressBar) {
            progressBar.style.width = '100%';
            setTimeout(() => {
                const loadingAnimation = document.querySelector('#loading-overlay .loading-animation');
                if (loadingAnimation) {
                    loadingAnimation.classList.add('completed');
                    setTimeout(() => {
                        loadingOverlay.style.opacity = '0';
                        setTimeout(() => {
                            loadingOverlay.style.display = 'none';
                            loadingOverlay.style.opacity = '1';
                            setTimeout(() => {
                                progressBar.style.width = '0%';
                                loadingAnimation.classList.remove('completed');
                            }, 500);
                        }, 600);
                    }, 300);
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
        const maxWidth = 90;
        const interval = setInterval(() => {
            if (width >= maxWidth) {
                clearInterval(interval);
                return;
            }
            if (width < 30) width += 1;
            else if (width < 60) width += 0.5;
            else width += 0.2;
            progressBar.style.width = width + '%';
        }, 50);
    }
    
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
        setTimeout(() => {
            alertDiv.classList.add('fade');
            setTimeout(() => alertDiv.remove(), 300);
        }, 3000);
    };
    
    function showApiMessage(type, message) {
        originalShowApiMessage(type, message);
        const alertDiv = document.querySelector('.api-alert:last-child');
        if (alertDiv) {
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
    
    function displayEntries() {
        const activeRegion = document.querySelector('.region-btn.active');
        const regionValue = activeRegion ? activeRegion.getAttribute('data-region') : 'all';
        
        if (regionValue !== 'all') {
            filterByRegion(regionValue);
            return;
        }
        
        const resultsContainer = document.getElementById('results-container');
        resultsContainer.innerHTML = '';
        
        if (displayedEntries.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-data-message">
                    <i class="bi bi-info-circle mb-3"></i>
                    <p>尚無符合條件的資料，請嘗試其他關鍵字或分享你的資訊！</p>
                </div>
            `;
            return;
        }
        
        // Group entries by school
        let schoolGroups = {};
        displayedEntries.forEach(entry => {
            if (!schoolGroups[entry.school]) {
                schoolGroups[entry.school] = [];
            }
            schoolGroups[entry.school].push(entry);
        });
        
        // Create table for each school
        Object.keys(schoolGroups).forEach(schoolName => {
            const schoolSection = document.createElement('div');
            schoolSection.className = 'school-section mb-4';
            
            const schoolHeader = document.createElement('div');
            schoolHeader.className = 'school-header';
            schoolHeader.innerHTML = `
                <div class="school-name">
                    <i class="bi bi-building me-2"></i>${schoolName}
                </div>
                <div class="badge bg-primary entry-count">${schoolGroups[schoolName].length}筆</div>
            `;
            schoolSection.appendChild(schoolHeader);
            
            // Check if mobile view is active
            if (window.innerWidth < 576) {
                renderMobileView(schoolSection, schoolGroups[schoolName]);
            } else {
                renderTableView(schoolSection, schoolGroups[schoolName]);
            }
            
            resultsContainer.appendChild(schoolSection);
        });
    }

    function renderMobileView(container, entries) {
        const entriesContainer = document.createElement('div');
        entriesContainer.className = 'mobile-entries-container p-3';
        
        entries.forEach(entry => {
            const entryCard = document.createElement('div');
            entryCard.className = 'mobile-entry-card';
            
            // Card header
            const cardHeader = document.createElement('div');
            cardHeader.className = 'mobile-header';
            cardHeader.innerHTML = `
                <div class="department-name">${entry.department || "普通班"}</div>
                <div class="d-flex align-items-center">
                    <div class="school-year me-2">${entry.year}年</div>
                    <i class="bi bi-bookmark-heart favorite-btn ${isFavorite(entry) ? 'active' : ''}" 
                       title="收藏" data-entry-id="${entry.id}"></i>
                </div>
            `;
            
            // Card body
            const cardBody = document.createElement('div');
            cardBody.className = 'mobile-body';
            
            // Scores grid
            const scoresGrid = document.createElement('div');
            scoresGrid.className = 'mobile-score-grid';
            
            // Add score items
            const scoreItems = [
                { label: '國文', score: entry.scores.chinese },
                { label: '英文', score: entry.scores.english },
                { label: '數學', score: entry.scores.math },
                { label: '自然', score: entry.scores.science },
                { label: '社會', score: entry.scores.social },
                { label: '作文', score: entry.composition + '級' }
            ];
            
            scoreItems.forEach(item => {
                const scoreItem = document.createElement('div');
                scoreItem.className = 'mobile-score-item';
                scoreItem.innerHTML = `
                    <div class="mobile-score-label">${item.label}</div>
                    <div class="mobile-score-value">
                        <span class="${item.label === '作文' ? 'composition-badge' : 'score-badge'} 
                               ${item.label === '作文' ? 'composition-' + entry.composition : 'score-' + item.score}">
                            ${item.score}
                        </span>
                    </div>
                `;
                scoresGrid.appendChild(scoreItem);
            });
            
            // Total scores
            const totalBox = document.createElement('div');
            totalBox.className = 'mobile-total-box';
            totalBox.innerHTML = `
                <div class="mobile-total-item">
                    <div class="mobile-total-label">總積分</div>
                    <div class="mobile-total-value">${entry.total || "未提供"}</div>
                </div>
                <div class="mobile-total-item">
                    <div class="mobile-total-label">總積點</div>
                    <div class="mobile-total-value">${entry.totalPoints || "未提供"}</div>
                </div>
            `;
            
            // Comment if exists
            let commentHtml = '';
            if (entry.comment) {
                commentHtml = `
                    <div class="mt-3 pt-2 border-top">
                        <small class="text-muted"><i class="bi bi-chat-text me-1"></i>備註</small>
                        <div class="mt-1">${entry.comment}</div>
                    </div>
                `;
            }
            
            // Assemble card
            cardBody.appendChild(scoresGrid);
            cardBody.appendChild(totalBox);
            if (commentHtml) {
                const commentDiv = document.createElement('div');
                commentDiv.innerHTML = commentHtml;
                cardBody.appendChild(commentDiv);
            }
            
            entryCard.appendChild(cardHeader);
            entryCard.appendChild(cardBody);
            entriesContainer.appendChild(entryCard);
        });
        
        container.appendChild(entriesContainer);
    }

    function renderTableView(container, entries) {
        // Create table as before
        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-responsive';
        
        const table = document.createElement('table');
        table.className = 'table table-hover score-table';
        
        // Table header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>年份</th>
                <th>科系/班別</th>
                <th>國文</th>
                <th>英文</th>
                <th>數學</th>
                <th>自然</th>
                <th>社會</th>
                <th>作文</th>
                <th>總積分</th>
                <th>總積點</th>
                <th>備註</th>
                <th>動作</th>
            </tr>
        `;
        table.appendChild(thead);
        
        // Table body
        const tbody = document.createElement('tbody');
        entries.forEach(entry => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${entry.year}年</td>
                <td>${entry.department || "普通班"}</td>
                <td><span class="score-badge score-${entry.scores.chinese}">${entry.scores.chinese}</span></td>
                <td><span class="score-badge score-${entry.scores.english}">${entry.scores.english}</span></td>
                <td><span class="score-badge score-${entry.scores.math}">${entry.scores.math}</span></td>
                <td><span class="score-badge score-${entry.scores.science}">${entry.scores.science}</span></td>
                <td><span class="score-badge score-${entry.scores.social}">${entry.scores.social}</span></td>
                <td><span class="composition-badge composition-${entry.composition}">${entry.composition}級</span></td>
                <td class="text-primary fw-bold">${entry.total || "未提供"}</td>
                <td>${entry.totalPoints || "未提供"}</td>
                <td>${entry.comment ? `<i class="bi bi-chat-text me-1"></i>${entry.comment}` : ""}</td>
                <td>
                    <i class="bi bi-bookmark-heart favorite-btn fs-5 ${isFavorite(entry) ? 'active' : ''}" 
                       title="收藏" data-entry-id="${entry.id}"></i>
                </td>
            `;
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        
        tableContainer.appendChild(table);
        container.appendChild(tableContainer);
    }
    
    function updateStatistics() {
        document.getElementById('total-entries').textContent = entries.length;
        
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
            createChart(schoolCounts);
        }
    }
    
    function createChart(schoolCounts) {
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
            
        g.append('rect')
            .attr('width', width)
            .attr('height', height)
            .attr('fill', 'rgba(255,255,255,0.5)')
            .attr('rx', 10)
            .attr('ry', 10);
        
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
        
        g.select('.domain').style('display', 'none');
        
        g.append('g')
            .call(d3.axisLeft(y)
                .ticks(5)
                .tickSize(0))
            .selectAll('text')
            .style('font-size', '11px');
        
        g.selectAll('.domain').style('display', 'none');
        
        const colorScale = d3.scaleSequential()
            .domain([0, chartData.length])
            .interpolator(d3.interpolateRainbow);
        
        g.selectAll('.bar')
            .data(chartData)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d[0]))
            .attr('y', height)
            .attr('width', x.bandwidth())
            .attr('height', 0)
            .attr('rx', 5)
            .attr('ry', 5)
            .attr('fill', (d, i) => colorScale(i))
            .transition()
            .duration(1200)
            .delay((d, i) => i * 150)
            .ease(d3.easeBounceOut)
            .attr('y', d => y(d[1]))
            .attr('height', d => height - y(d[1]));
        
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
            .style('opacity', 0)
            .text(d => d[1])
            .transition()
            .duration(800)
            .delay((d, i) => i * 150 + 500)
            .style('opacity', 1);
        
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
        
        g.append('text')
            .attr('x', width / 2)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .style('fill', '#495057')
            .text('最熱門分享學校');
    }
    
    function calculateApproximateScore() {
        const compositionPoints = { 0: 0, 1: 1, 2: 2, 3: 2, 4: 3, 5: 3, 6: 3 };
        const scorePoints = { 'A++': 6, 'A+': 6, 'A': 6, 'B++': 4, 'B+': 4, 'B': 4, 'C': 2 };
        
        const chinese = document.getElementById('chinese').value;
        const english = document.getElementById('english').value;
        const math = document.getElementById('math').value;
        const science = document.getElementById('science').value;
        const social = document.getElementById('social').value;
        const composition = parseInt(document.getElementById('composition').value) || 0;
        
        const totalPoints = scorePoints[chinese] + scorePoints[english] +
                           scorePoints[math] + scorePoints[science] +
                           scorePoints[social] + compositionPoints[composition];
        return totalPoints.toString();
    }
    
    function calculateTotalPoints() {
        const creditPoints = { 'A++': 7, 'A+': 6, 'A': 5, 'B++': 4, 'B+': 3, 'B': 2, 'C': 1 };
        
        const chinese = document.getElementById('chinese').value;
        const english = document.getElementById('english').value;
        const math = document.getElementById('math').value;
        const science = document.getElementById('science').value;
        const social = document.getElementById('social').value;
        
        const totalCredits = creditPoints[chinese] + creditPoints[english] +
                            creditPoints[math] + creditPoints[science] +
                            creditPoints[social];
        return totalCredits.toString();
    }
    
    function updateScoreFields() {
        const score = calculateApproximateScore();
        const points = calculateTotalPoints();
        document.getElementById('total').value = score;
        document.getElementById('totalPoints').value = points;
    }
    
    document.querySelectorAll('#chinese, #english, #math, #science, #social, #composition').forEach(select => {
        select.addEventListener('change', updateScoreFields);
    });
    
    function setupMobileOptimizations() {
        function checkMobileView() {
            if (window.innerWidth < 576) {
                document.body.classList.add('mobile-view');
                // Prevent full re-rendering when not needed
                if (!document.body.classList.contains('mobile-rendered')) {
                    displayEntries();
                    document.body.classList.add('mobile-rendered');
                }
            } else {
                document.body.classList.remove('mobile-view');
                if (document.body.classList.contains('mobile-rendered')) {
                    displayEntries();
                    document.body.classList.remove('mobile-rendered');
                }
            }
        }
        
        checkMobileView();
        window.addEventListener('resize', checkMobileView);
        
        const backToTopBtn = document.createElement('button');
        backToTopBtn.className = 'floating-btn';
        backToTopBtn.innerHTML = '<i class="bi bi-arrow-up"></i>';
        backToTopBtn.addEventListener('click', function() {
            window.scrollTo({top: 0, behavior: 'smooth'});
        });
        document.body.appendChild(backToTopBtn);
        
        window.addEventListener('scroll', function() {
            if (window.scrollY > 300) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        });
        
        // Add mobile filter toggle button if on mobile
        if (window.innerWidth < 576) {
            const filterToggleBtn = document.createElement('button');
            filterToggleBtn.className = 'mobile-filter-toggle';
            filterToggleBtn.innerHTML = '<i class="bi bi-funnel"></i>';
            filterToggleBtn.addEventListener('click', function() {
                this.classList.toggle('active');
                const advancedFilters = document.getElementById('advancedFilters');
                if (advancedFilters) {
                    if (advancedFilters.classList.contains('show')) {
                        new bootstrap.Collapse(advancedFilters).hide();
                    } else {
                        new bootstrap.Collapse(advancedFilters).show();
                        advancedFilters.scrollIntoView({behavior: 'smooth'});
                    }
                }
            });
            document.body.appendChild(filterToggleBtn);
        }
    }
    
    function setupSidebarMenu() {
        const menuToggleBtn = document.getElementById('menu-toggle-btn');
        const sidebarMenu = document.getElementById('sidebar-menu');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        const closeBtn = document.getElementById('close-menu-btn');
        
        function toggleSidebar() {
            sidebarMenu.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
            document.body.style.overflow = sidebarMenu.classList.contains('active') ? 'hidden' : '';
        }
        
        menuToggleBtn.addEventListener('click', toggleSidebar);
        closeBtn.addEventListener('click', toggleSidebar);
        sidebarOverlay.addEventListener('click', toggleSidebar);
        
        document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
            item.addEventListener('click', function(e) {
                if (this.getAttribute('href').startsWith('#')) {
                    e.preventDefault();
                    toggleSidebar();
                    const targetId = this.getAttribute('href');
                    if (targetId === '#') {
                        window.scrollTo({top: 0, behavior: 'smooth'});
                    } else {
                        const targetElement = document.querySelector(targetId);
                        if (targetElement) {
                            const navbarHeight = document.querySelector('.navbar').offsetHeight;
                            const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navbarHeight - 10;
                            window.scrollTo({top: targetPosition, behavior: 'smooth'});
                        }
                    }
                    document.querySelectorAll('.sidebar-menu .menu-item').forEach(navItem => {
                        navItem.classList.remove('active');
                    });
                    this.classList.add('active');
                }
            });
        });
        
        function updateActiveSidebarItem() {
            const sections = ['share-section', 'search-section', 'stats-section', 'results-section'];
            const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
            const navbarHeight = document.querySelector('.navbar').offsetHeight;
            
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
        
        window.addEventListener('scroll', updateActiveSidebarItem);
        updateActiveSidebarItem();
    }
    
    function setupHelpModal() {
        document.querySelectorAll('.help-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const helpModal = new bootstrap.Modal(document.getElementById('helpModal'));
                helpModal.show();
            });
        });
        
        const stepButtons = document.querySelectorAll('.guide-step-btn');
        const stepContents = document.querySelectorAll('.guide-step-content');
        
        stepButtons.forEach((button, index) => {
            button.addEventListener('click', () => {
                stepButtons.forEach(btn => btn.classList.remove('active'));
                stepContents.forEach(content => content.classList.remove('active'));
                button.classList.add('active');
                stepContents[index].classList.add('active');
                stepContents[index].style.opacity = 0;
                setTimeout(() => stepContents[index].style.opacity = 1, 50);
            });
        });
    }
    
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            navbar.classList.add('navbar-scroll');
        } else {
            navbar.classList.remove('navbar-scroll');
        }
    });
    
    document.body.classList.add('page-loaded');
    initializeTooltips();
    initializeScrollAnimations();
    setRandomBackgroundPattern();
    
    function setupRegionFilter() {
        const regionFilterContainer = document.getElementById('region-filter');
        document.getElementById('region-all').classList.add('active');
        
        regionFilterContainer.addEventListener('click', function(e) {
            if (e.target.classList.contains('region-btn') || e.target.parentElement.classList.contains('region-btn')) {
                const button = e.target.classList.contains('region-btn') ? e.target : e.target.parentElement;
                const region = button.getAttribute('data-region');
                document.querySelectorAll('.region-btn').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                filterByRegion(region);
            }
        });
    }
    
    function setupAdvancedFilters() {
        const yearFilterContainer = document.getElementById('year-filter');
        if (yearFilterContainer) {
            yearFilterContainer.addEventListener('click', function(e) {
                if (e.target.classList.contains('filter-chip') || e.target.parentElement.classList.contains('filter-chip')) {
                    const chip = e.target.classList.contains('filter-chip') ? e.target : e.target.parentElement;
                    const year = chip.getAttribute('data-year');
                    if (chip.classList.contains('active')) {
                        chip.classList.remove('active');
                        activeFilters.year = null;
                    } else {
                        document.querySelectorAll('#year-filter .filter-chip').forEach(c => c.classList.remove('active'));
                        chip.classList.add('active');
                        activeFilters.year = year;
                    }
                    applyFilters();
                }
            });
        }
        
        const scoreFilterContainer = document.getElementById('score-range-filter');
        if (scoreFilterContainer) {
            scoreFilterContainer.addEventListener('click', function(e) {
                if (e.target.classList.contains('score-filter-btn') || e.target.parentElement.classList.contains('score-filter-btn')) {
                    const btn = e.target.classList.contains('score-filter-btn') ? e.target : e.target.parentElement;
                    const min = btn.getAttribute('data-min');
                    const max = btn.getAttribute('data-max');
                    if (btn.classList.contains('active')) {
                        btn.classList.remove('active');
                        activeFilters.scoreMin = null;
                        activeFilters.scoreMax = null;
                    } else {
                        document.querySelectorAll('#score-range-filter .score-filter-btn').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        activeFilters.scoreMin = min;
                        activeFilters.scoreMax = max;
                    }
                    applyFilters();
                }
            });
        }
        
        const subjectFilters = document.querySelectorAll('.subject-filter');
        subjectFilters.forEach(container => {
            const subject = container.getAttribute('data-subject');
            container.addEventListener('click', function(e) {
                if (e.target.classList.contains('filter-chip') || e.target.parentElement.classList.contains('filter-chip')) {
                    const chip = e.target.classList.contains('filter-chip') ? e.target : e.target.parentElement;
                    const grade = chip.getAttribute('data-grade');
                    if (chip.classList.contains('active')) {
                        chip.classList.remove('active');
                        delete activeFilters.subjects[subject];
                    } else {
                        container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                        chip.classList.add('active');
                        activeFilters.subjects[subject] = grade;
                    }
                    applyFilters();
                }
            });
        });
        
        const compositionFilter = document.getElementById('composition-filter');
        if (compositionFilter) {
            compositionFilter.addEventListener('click', function(e) {
                if (e.target.classList.contains('filter-chip') || e.target.parentElement.classList.contains('filter-chip')) {
                    const chip = e.target.classList.contains('filter-chip') ? e.target : e.target.parentElement;
                    const level = chip.getAttribute('data-level');
                    if (chip.classList.contains('active')) {
                        chip.classList.remove('active');
                        activeFilters.composition = null;
                    } else {
                        compositionFilter.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                        chip.classList.add('active');
                        activeFilters.composition = level;
                    }
                    applyFilters();
                }
            });
        }
        
        const clearFiltersBtn = document.getElementById('clear-filters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', function() {
                activeFilters = {
                    region: 'all',
                    scoreMin: null,
                    scoreMax: null,
                    year: null,
                    subjects: {},
                    composition: null
                };
                document.querySelectorAll('.filter-chip, .score-filter-btn').forEach(el => el.classList.remove('active'));
                document.querySelectorAll('.region-btn').forEach(btn => btn.classList.remove('active'));
                document.getElementById('region-all').classList.add('active');
                applyFilters();
            });
        }
    }
    
    function applyFilters() {
        const searchKeyword = document.getElementById('search-input').value.trim().toLowerCase();
        
        let filteredEntries = entries.filter(entry => {
            const matchesKeyword = searchKeyword === '' || 
                                entry.school.toLowerCase().includes(searchKeyword) || 
                                (entry.department && entry.department.toLowerCase().includes(searchKeyword));
            const matchesRegion = activeFilters.region === 'all' || entry.region === activeFilters.region;
            const matchesYear = activeFilters.year === null || entry.year === activeFilters.year;
            const matchesScoreRange = (activeFilters.scoreMin === null || activeFilters.scoreMax === null) || 
                                   (parseFloat(entry.total) >= parseFloat(activeFilters.scoreMin) && 
                                    parseFloat(entry.total) <= parseFloat(activeFilters.scoreMax));
            let matchesSubjects = true;
            for (const subject in activeFilters.subjects) {
                if (entry.scores[subject] !== activeFilters.subjects[subject]) {
                    matchesSubjects = false;
                    break;
                }
            }
            const matchesComposition = activeFilters.composition === null || 
                                    entry.composition === activeFilters.composition;
            return matchesKeyword && matchesRegion && matchesYear && matchesScoreRange && 
                   matchesSubjects && matchesComposition;
        });
        
        displayedEntries = filteredEntries;
        displayFilteredEntries(filteredEntries);
        updatePaginationControls();
        updateFilterResultCount(filteredEntries.length);
    }
    
    function displayFilteredEntries(filteredEntries) {
        const resultsContainer = document.getElementById('results-container');
        resultsContainer.innerHTML = '';
        
        if (filteredEntries.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-data-message">
                    <i class="bi bi-info-circle mb-3"></i>
                    <p>尚無符合條件的資料，請嘗試其他區域或關鍵字，或分享你的資訊！</p>
                </div>
            `;
            return;
        }
        
        // Group entries by school
        let schoolGroups = {};
        filteredEntries.forEach(entry => {
            if (!schoolGroups[entry.school]) {
                schoolGroups[entry.school] = [];
            }
            schoolGroups[entry.school].push(entry);
        });
        
        // Create table for each school
        Object.keys(schoolGroups).forEach(schoolName => {
            const schoolSection = document.createElement('div');
            schoolSection.className = 'school-section mb-4';
            
            const schoolHeader = document.createElement('div');
            schoolHeader.className = 'school-header';
            schoolHeader.innerHTML = `
                <div class="school-name">
                    <i class="bi bi-building me-2"></i>${schoolName}
                </div>
                <div class="badge bg-primary entry-count">${schoolGroups[schoolName].length}筆</div>
            `;
            schoolSection.appendChild(schoolHeader);
            
            // Check if mobile view is active
            if (window.innerWidth < 576) {
                renderMobileView(schoolSection, schoolGroups[schoolName]);
            } else {
                renderTableView(schoolSection, schoolGroups[schoolName]);
            }
            
            resultsContainer.appendChild(schoolSection);
        });
    }
    
    function updateFilterResultCount(count) {
        const resultCountEl = document.getElementById('filter-result-count');
        if (resultCountEl) {
            resultCountEl.textContent = count;
            if (count < entries.length) {
                resultCountEl.classList.add('text-primary', 'fw-bold');
            } else {
                resultCountEl.classList.remove('text-primary', 'fw-bold');
            }
        }
    }
    
    document.getElementById('search-form').addEventListener('submit', function(e) {
        e.preventDefault();
        applyFilters();
    });
    
    document.getElementById('search-input').addEventListener('input', function() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            applyFilters();
        }, 300);
    });
    
    function filterByRegion(region) {
        activeFilters.region = region;
        applyFilters();
    }
    
    function initializeTooltips() {
        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl, {
            trigger: 'hover focus',
            delay: { show: 300, hide: 100 }
        }));
        
        document.querySelectorAll('form input, form select, form textarea').forEach(element => {
            element.addEventListener('focus', function() {
                const tooltip = bootstrap.Tooltip.getInstance(this);
                if (tooltip) tooltip.show();
            });
            element.addEventListener('blur', function() {
                const tooltip = bootstrap.Tooltip.getInstance(this);
                if (tooltip) setTimeout(() => tooltip.hide(), 1000);
            });
        });
        
        document.querySelectorAll('.score-badge, .composition-badge').forEach(badge => {
            new bootstrap.Tooltip(badge);
        });
    }
    
    function initializeScrollAnimations() {
        const animatedElements = document.querySelectorAll('.card, .school-tag, .btn, header h1, header p');
        
        function checkIfInView() {
            const windowHeight = window.innerHeight;
            const windowTopPosition = window.scrollY;
            const windowBottomPosition = windowTopPosition + windowHeight;
            
            animatedElements.forEach(element => {
                const elementHeight = element.offsetHeight;
                const elementTopPosition = element.getBoundingClientRect().top + windowTopPosition;
                const elementBottomPosition = elementTopPosition + elementHeight;
                if (elementBottomPosition >= windowTopPosition && elementTopPosition <= windowBottomPosition) {
                    element.classList.add('in-view');
                }
            });
        }
        
        window.addEventListener('scroll', checkIfInView);
        checkIfInView();
    }
    
    function setupSchoolTags() {
        const schoolTags = document.querySelectorAll('.school-tag');
        schoolTags.forEach(tag => {
            tag.addEventListener('click', function() {
                const schoolName = this.textContent.trim();
                const searchInput = document.getElementById('search-input');
                searchInput.value = schoolName;
                applyFilters();
                schoolTags.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                document.getElementById('results-section').scrollIntoView({behavior: 'smooth'});
            });
        });
    }
    
    function enhanceVisualElements() {
        document.querySelectorAll('header h1, .card-header h3').forEach(element => {
            element.classList.add('floating-element');
        });
        document.querySelectorAll('.card').forEach(card => {
            card.classList.add('card-3d');
            card.classList.add('glass-effect');
        });
        document.querySelectorAll('button[type="submit"]').forEach(button => {
            button.classList.add('pulse-effect');
        });
        document.querySelectorAll('.score-badge, .composition-badge').forEach(badge => {
            badge.style.backdropFilter = 'blur(4px)';
            badge.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.15)';
            badge.classList.add('hover-lift');
        });
        
        // Add smooth scrolling to all links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                if(this.getAttribute('href') !== '#') {
                    e.preventDefault();
                    const target = document.querySelector(this.getAttribute('href'));
                    if(target) {
                        window.scrollTo({
                            top: target.offsetTop - 80,
                            behavior: 'smooth'
                        });
                    }
                }
            });
        });
        
        // Add glass effect to specific elements
        document.querySelectorAll('.form-control, .form-select, .card-body').forEach(element => {
            element.classList.add('smooth-transition');
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
        document.querySelectorAll('.gradient-card-header, .success-gradient-header, .info-gradient-header').forEach(header => {
            let hue = 0;
            setInterval(() => {
                hue = (hue + 1) % 360;
                header.style.filter = `hue-rotate(${hue}deg)`;
            }, 100);
        });
    }
    
    function setupPagination() {
        updatePaginationControls();
        
        document.querySelector('.pagination').addEventListener('click', function(e) {
            e.preventDefault();
            if (e.target.hasAttribute('data-page')) {
                const page = parseInt(e.target.getAttribute('data-page'));
                if (page !== currentPage) goToPage(page);
            } else if (e.target.closest('#prevPage') && !document.getElementById('prevPage').classList.contains('disabled')) {
                goToPage(currentPage - 1);
            } else if (e.target.closest('#nextPage') && !document.getElementById('nextPage').classList.contains('disabled')) {
                goToPage(currentPage + 1);
            }
        });
        
        document.querySelectorAll('.page-size-option').forEach(option => {
            option.addEventListener('click', function(e) {
                e.preventDefault();
                const newPageSize = parseInt(this.getAttribute('data-size'));
                if (newPageSize !== pageSize) {
                    pageSize = newPageSize;
                    document.getElementById('currentPageSize').textContent = newPageSize;
                    goToPage(1);
                }
            });
        });
    }
    
    function updatePaginationControls() {
        document.getElementById('currentPage').textContent = currentPage;
        document.getElementById('totalPages').textContent = totalPages;
        
        const paginationContainer = document.querySelector('.pagination');
        paginationContainer.innerHTML = '';
        
        const prevPageLi = document.createElement('li');
        prevPageLi.id = 'prevPage';
        prevPageLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        prevPageLi.innerHTML = `
            <a class="page-link" href="#" aria-label="Previous">
                <span aria-hidden="true">«</span>
            </a>
        `;
        paginationContainer.appendChild(prevPageLi);
        
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        if (endPage - startPage + 1 < maxVisiblePages && startPage > 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        if (startPage > 1) {
            const firstPageLi = document.createElement('li');
            firstPageLi.className = 'page-item';
            firstPageLi.innerHTML = `<a class="page-link" href="#" data-page="1">1</a>`;
            paginationContainer.appendChild(firstPageLi);
            if (startPage > 2) {
                const ellipsisLi = document.createElement('li');
                ellipsisLi.className = 'page-item disabled';
                ellipsisLi.innerHTML = `<a class="page-link" href="#">...</a>`;
                paginationContainer.appendChild(ellipsisLi);
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageLi = document.createElement('li');
            pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
            pageLi.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
            paginationContainer.appendChild(pageLi);
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsisLi = document.createElement('li');
                ellipsisLi.className = 'page-item disabled';
                ellipsisLi.innerHTML = `<a class="page-link" href="#">...</a>`;
                paginationContainer.appendChild(ellipsisLi);
            }
            const lastPageLi = document.createElement('li');
            lastPageLi.className = 'page-item';
            lastPageLi.innerHTML = `<a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>`;
            paginationContainer.appendChild(lastPageLi);
        }
        
        const nextPageLi = document.createElement('li');
        nextPageLi.id = 'nextPage';
        nextPageLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
        nextPageLi.innerHTML = `
            <a class="page-link" href="#" aria-label="Next">
                <span aria-hidden="true">»</span>
            </a>
        `;
        paginationContainer.appendChild(nextPageLi);
    }
    
    function goToPage(page) {
        showLoading();
        currentPage = page;
        fetchEntries()
            .then(() => {
                displayEntries();
                updatePaginationControls();
                document.getElementById('results-section').scrollIntoView({ behavior: 'smooth' });
            })
            .catch(error => {
                showApiMessage('error', '載入頁面失敗: ' + error.message);
            })
            .finally(() => {
                hideLoading();
            });
    }
    
    function populateDepartmentGroups() {
        const departmentSelect = document.getElementById('department');
        if (!departmentSelect) return;
        
        departmentSelect.innerHTML = '';
        
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '請選擇科系';
        departmentSelect.appendChild(defaultOption);
        
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
        
        for (const group in departmentGroups) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = group;
            
            departmentGroups[group].forEach(dept => {
                const option = document.createElement('option');
                option.value = dept;
                option.textContent = dept;
                optgroup.appendChild(option);
            });
            
            departmentSelect.appendChild(optgroup);
        }
    }
    
    function setupPerformanceOptimizations() {
        let resizeTimeout;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(function() {
                if (window.innerWidth < 576 && !document.body.classList.contains('mobile-rendered')) {
                    displayEntries();
                    document.body.classList.add('mobile-rendered');
                } else if (window.innerWidth >= 576 && document.body.classList.contains('mobile-rendered')) {
                    displayEntries();
                    document.body.classList.remove('mobile-rendered');
                }
            }, 250);
        });
        
        // Add lazy loading to improve initial page load
        document.querySelectorAll('img').forEach(img => {
            img.setAttribute('loading', 'lazy');
        });
    }
    
    function initializeOptimizations() {
        enhanceVisualElements();
        setupPerformanceOptimizations();
        document.body.classList.add('optimized');
    }
    
    // Setup score calculator
    function setupScoreCalculator() {
        const calculatorModal = new bootstrap.Modal(document.getElementById('calculatorModal'));
        
        document.querySelectorAll('.calc-subject').forEach(select => {
            select.addEventListener('change', updateCalculatorResults);
        });
        
        function updateCalculatorResults() {
            // Get values from the calculator form
            const chinese = parseInt(document.querySelector('.calc-subject[data-subject="chinese"]').value) || 0;
            const english = parseInt(document.querySelector('.calc-subject[data-subject="english"]').value) || 0;
            const math = parseInt(document.querySelector('.calc-subject[data-subject="math"]').value) || 0;
            const science = parseInt(document.querySelector('.calc-subject[data-subject="science"]').value) || 0;
            const social = parseInt(document.querySelector('.calc-subject[data-subject="social"]').value) || 0;
            const composition = parseInt(document.querySelector('.calc-subject[data-subject="composition"]').value) || 0;
            
            // Calculate total points and score
            const totalPoints = chinese + english + math + science + social;
            const totalScore = (totalPoints * 3) + (composition * 2);
            
            // Update display
            document.getElementById('calc-total-points').textContent = totalPoints;
            document.getElementById('calc-total-score').textContent = totalScore;
        }
        
        // Initialize with default values
        updateCalculatorResults();
    }
    
    // Setup theme toggle
    function setupThemeToggle() {
        const themeBtn = document.getElementById('theme-toggle');
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        
        // Apply saved theme preference
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            themeBtn.innerHTML = '<i class="bi bi-sun"></i>';
            themeBtn.setAttribute('data-bs-original-title', '切換淺色模式');
        }
        
        themeBtn.addEventListener('click', function() {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            
            if (isDark) {
                this.innerHTML = '<i class="bi bi-sun"></i>';
                this.setAttribute('data-bs-original-title', '切換淺色模式');
            } else {
                this.innerHTML = '<i class="bi bi-moon"></i>';
                this.setAttribute('data-bs-original-title', '切換深色模式');
            }
            
            localStorage.setItem('darkMode', isDark);
            
            // Update tooltip
            const tooltip = bootstrap.Tooltip.getInstance(themeBtn);
            if (tooltip) {
                tooltip.hide();
                setTimeout(() => tooltip.show(), 100);
            }
        });
    }
    
    // Setup utility buttons (calculator, favorites, export)
    function setupUtilityButtons() {
        // Create utility buttons container if it doesn't exist
        if (!document.querySelector('.utility-buttons')) {
            const utilityContainer = document.createElement('div');
            utilityContainer.className = 'utility-buttons';
            utilityContainer.innerHTML = `
                <button class="utility-btn calculator-modal-btn" id="calculator-btn" title="積分計算器">
                    <i class="bi bi-calculator"></i>
                </button>
                <button class="utility-btn favorite-list-btn" id="favorites-btn" title="我的收藏">
                    <i class="bi bi-bookmark-heart"></i>
                </button>
                <button class="utility-btn export-btn" id="export-btn" title="匯出資料">
                    <i class="bi bi-download"></i>
                </button>
            `;
            document.body.appendChild(utilityContainer);
            
            // Add event listeners
            document.getElementById('calculator-btn').addEventListener('click', function() {
                const calculatorModal = new bootstrap.Modal(document.getElementById('calculatorModal'));
                calculatorModal.show();
            });
            
            document.getElementById('favorites-btn').addEventListener('click', function() {
                showFavorites();
            });
            
            document.getElementById('export-btn').addEventListener('click', function() {
                const exportModal = new bootstrap.Modal(document.getElementById('exportModal'));
                exportModal.show();
            });
        }
        
        // Show buttons after page loads
        setTimeout(() => {
            document.querySelectorAll('.utility-btn').forEach((btn, index) => {
                setTimeout(() => {
                    btn.classList.add('visible');
                }, index * 100);
            });
        }, 1000);
        
        // Show/hide buttons on scroll
        window.addEventListener('scroll', function() {
            const scrolled = window.scrollY > 300;
            document.querySelectorAll('.utility-btn').forEach(btn => {
                if (scrolled) {
                    btn.classList.add('visible');
                } else {
                    btn.classList.remove('visible');
                }
            });
        });
    }
    
    // Favorites system
    function setupFavoritesSystem() {
        // Add click event delegation for favorite buttons
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('favorite-btn') || e.target.closest('.favorite-btn')) {
                const target = e.target.classList.contains('favorite-btn') ? e.target : e.target.closest('.favorite-btn');
                const entryId = target.getAttribute('data-entry-id');
                toggleFavorite(entryId, target);
            }
        });
        
        // Setup clear favorites button
        document.getElementById('clear-favorites').addEventListener('click', function() {
            if (confirm('確定要清空所有收藏嗎？此操作無法復原。')) {
                localStorage.removeItem('favorites');
                favorites = [];
                showApiMessage('success', '已清空所有收藏');
                
                // Update UI
                document.querySelectorAll('.favorite-btn.active').forEach(btn => {
                    btn.classList.remove('active');
                });
                
                updateFavoritesModal();
            }
        });
    }
    
    function isFavorite(entry) {
        return favorites.some(f => f.id === entry.id);
    }
    
    function toggleFavorite(entryId, buttonElement) {
        const entryIndex = entries.findIndex(e => e.id == entryId);
        if (entryIndex === -1) return;
        
        const entry = entries[entryIndex];
        const favoriteIndex = favorites.findIndex(f => f.id == entryId);
        
        if (favoriteIndex === -1) {
            // Add to favorites
            favorites.push(entry);
            buttonElement.classList.add('active');
            showApiMessage('success', `已將 ${entry.school} ${entry.department || '普通班'} 加入收藏`);
        } else {
            // Remove from favorites
            favorites.splice(favoriteIndex, 1);
            buttonElement.classList.remove('active');
            showApiMessage('success', `已將 ${entry.school} ${entry.department || '普通班'} 移除收藏`);
        }
        
        // Save to localStorage
        localStorage.setItem('favorites', JSON.stringify(favorites));
        
        // Update favorites modal if open
        updateFavoritesModal();
    }
    
    function updateFavoritesModal() {
        const favoritesList = document.getElementById('favorites-list');
        const noFavorites = document.getElementById('no-favorites');
        
        if (!favoritesList) return;
        
        if (favorites.length === 0) {
            favoritesList.innerHTML = '';
            noFavorites.style.display = 'block';
            return;
        }
        
        noFavorites.style.display = 'none';
        favoritesList.innerHTML = '';
        
        favorites.forEach(entry => {
            const item = document.createElement('div');
            item.className = 'list-group-item';
            item.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <div class="fw-bold">${entry.school} - ${entry.department || '普通班'}</div>
                        <div class="small text-muted">${entry.year}年 | 總積分: ${entry.total}</div>
                        <div class="mt-1">
                            <span class="score-badge score-${entry.scores.chinese}">${entry.scores.chinese}</span>
                            <span class="score-badge score-${entry.scores.english}">${entry.scores.english}</span>
                            <span class="score-badge score-${entry.scores.math}">${entry.scores.math}</span>
                            <span class="score-badge score-${entry.scores.science}">${entry.scores.science}</span>
                            <span class="score-badge score-${entry.scores.social}">${entry.scores.social}</span>
                            <span class="composition-badge composition-${entry.composition}">${entry.composition}級</span>
                        </div>
                    </div>
                    <button class="btn btn-sm btn-outline-danger remove-favorite" data-entry-id="${entry.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
            favoritesList.appendChild(item);
        });
        
        // Add event listeners for remove buttons
        document.querySelectorAll('.remove-favorite').forEach(btn => {
            btn.addEventListener('click', function() {
                const entryId = this.getAttribute('data-entry-id');
                const favoriteIndex = favorites.findIndex(f => f.id == entryId);
                
                if (favoriteIndex !== -1) {
                    const entry = favorites[favoriteIndex];
                    favorites.splice(favoriteIndex, 1);
                    localStorage.setItem('favorites', JSON.stringify(favorites));
                    
                    // Update UI
                    document.querySelectorAll(`.favorite-btn[data-entry-id="${entryId}"]`).forEach(btn => {
                        btn.classList.remove('active');
                    });
                    
                    showApiMessage('success', `已將 ${entry.school} ${entry.department || '普通班'} 移除收藏`);
                    updateFavoritesModal();
                }
            });
        });
    }
    
    function showFavorites() {
        updateFavoritesModal();
        const favoritesModal = new bootstrap.Modal(document.getElementById('favoritesModal'));
        favoritesModal.show();
    }
    
    // Setup export feature
    function setupExportFeature() {
        document.getElementById('export-csv').addEventListener('click', function() {
            exportToCSV();
        });
        
        document.getElementById('export-json').addEventListener('click', function() {
            exportToJSON();
        });
        
        document.getElementById('export-print').addEventListener('click', function() {
            printResults();
        });
    }
    
    function exportToCSV() {
        const headers = [
            '年份', '學校', '科系/班別', '區域', 
            '國文', '英文', '數學', '自然', '社會', '作文', 
            '總積分', '總積點', '備註'
        ];
        
        const csvRows = [];
        // Add header row
        csvRows.push(headers.join(','));
        
        // Add data rows
        displayedEntries.forEach(entry => {
            const row = [
                entry.year,
                '"' + entry.school + '"',
                '"' + (entry.department || '普通班') + '"',
                entry.region,
                entry.scores.chinese,
                entry.scores.english,
                entry.scores.math,
                entry.scores.science,
                entry.scores.social,
                entry.composition,
                entry.total,
                entry.totalPoints,
                '"' + (entry.comment || '') + '"'
            ];
            csvRows.push(row.join(','));
        });
        
        // Create and download file
        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', '高中錄取分數_' + new Date().toLocaleDateString() + '.csv');
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showApiMessage('success', '已匯出CSV檔案');
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('exportModal')).hide();
    }
    
    function exportToJSON() {
        const data = JSON.stringify(displayedEntries, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', '高中錄取分數_' + new Date().toLocaleDateString() + '.json');
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showApiMessage('success', '已匯出JSON檔案');
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('exportModal')).hide();
    }
    
    function printResults() {
        // Close modal before printing
        bootstrap.Modal.getInstance(document.getElementById('exportModal')).hide();
        
        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        
        // Generate a table of current results
        let tableHTML = `
            <html>
            <head>
                <title>高中錄取分數列表</title>
                <style>
                    body { font-family: Arial, sans-serif; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>高中錄取分數列表</h1>
                    <p>匯出日期：${new Date().toLocaleDateString()}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>年份</th>
                            <th>學校</th>
                            <th>科系/班別</th>
                            <th>區域</th>
                            <th>國文</th>
                            <th>英文</th>
                            <th>數學</th>
                            <th>自然</th>
                            <th>社會</th>
                            <th>作文</th>
                            <th>總積分</th>
                            <th>總積點</th>
                            <th>備註</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        displayedEntries.forEach(entry => {
            tableHTML += `
                <tr>
                    <td>${entry.year}年</td>
                    <td>${entry.school}</td>
                    <td>${entry.department || '普通班'}</td>
                    <td>${entry.region}</td>
                    <td>${entry.scores.chinese}</td>
                    <td>${entry.scores.english}</td>
                    <td>${entry.scores.math}</td>
                    <td>${entry.scores.science}</td>
                    <td>${entry.scores.social}</td>
                    <td>${entry.composition}級</td>
                    <td>${entry.total || '未提供'}</td>
                    <td>${entry.totalPoints || '未提供'}</td>
                    <td>${entry.comment || ''}</td>
                </tr>
            `;
        });
        
        tableHTML += `
                    </tbody>
                </table>
                <div class="footer">
                    <p>本資料來自高中錄取分數分享平台，僅供參考。</p>
                </div>
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;
        
        printWindow.document.open();
        printWindow.document.write(tableHTML);
        printWindow.document.close();
        
        showApiMessage('success', '已開啟列印視窗');
    }
});
