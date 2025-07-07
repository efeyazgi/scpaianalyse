// Hata Ayıklama Mesajı 1: Script dosyasının yüklendiğini kontrol et
console.log("script.js dosyası başarıyla yüklendi.");

// Tüm uygulama mantığını, DOM'un tamamen hazır olduğundan emin olmak için bu olayın içine alıyoruz.
document.addEventListener('DOMContentLoaded', function () {
    // Hata Ayıklama Mesajı 2: DOM'un hazır olduğunu kontrol et
    console.log("DOM (Sayfa Yapısı) tamamen yüklendi. Uygulama başlatılıyor.");

    // Tüm başlangıç kodunu bir try-catch bloğuna alarak herhangi bir hatayı yakalıyoruz.
    try {
        // --- GLOBAL DEĞİŞKENLER ---
        let appState = {
            currentAnalysis: null,
        };
        let promptTemplates = {};

        const tabs = {
            entry: { btn: document.getElementById('tab-btn-entry'), content: document.getElementById('tab-content-entry') },
            overview: { btn: document.getElementById('tab-btn-overview'), content: document.getElementById('tab-content-overview') },
            xr: { btn: document.getElementById('tab-btn-xr'), content: document.getElementById('tab-content-xr') },
            capability: { btn: document.getElementById('tab-btn-capability'), content: document.getElementById('tab-content-capability') },
            pareto: { btn: document.getElementById('tab-btn-pareto'), content: document.getElementById('tab-content-pareto') },
            history: { btn: document.getElementById('tab-btn-history'), content: document.getElementById('tab-content-history') },
        };
        
        // --- YARDIMCI FONKSİYONLAR ---
        function setupTabs() {
            Object.values(tabs).forEach(tab => {
                tab.btn.addEventListener('click', () => {
                    if (tab.btn.classList.contains('disabled-tab')) return;
                    switchTab(Object.keys(tabs).find(key => tabs[key].btn === tab.btn));
                });
            });
        }

        function calculateMean(arr) {
            if (!arr || arr.length === 0) return 0;
            return arr.reduce((a, b) => a + b, 0) / arr.length;
        }
        
        function calculateStdDev(arr, rBar, d2) {
            if (rBar && d2) { return rBar / d2; }
            const allValues = arr.flat();
            if (allValues.length < 2) return 0;
            const mean = calculateMean(allValues);
            const variance = allValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (allValues.length - 1);
            return Math.sqrt(variance);
        }
        
        function switchTab(tabKey) {
            if(tabs[tabKey].btn.classList.contains('disabled-tab')) return;
            Object.values(tabs).forEach(t => {
                t.content.classList.add('hidden');
                t.btn.classList.remove('active-tab-btn');
            });
            tabs[tabKey].content.classList.remove('hidden');
            tabs[tabKey].btn.classList.add('active-tab-btn');
        }

        // --- GRAFİK OLUŞTURMA FONKSİYONLARI ---
        function createControlChart(canvasId, labels, data, ucl, lcl, cl, label) {
            const chartInstance = Chart.getChart(canvasId);
            if (chartInstance) chartInstance.destroy();
            const ctx = document.getElementById(canvasId).getContext('2d');
            new Chart(ctx, { type: 'line', data: { labels, datasets: [ { label: 'ÜKL', data: Array(labels.length).fill(ucl), borderColor: '#16a34a', borderWidth: 2, pointRadius: 0, borderDash: [5, 5] }, { label: 'AKL', data: Array(labels.length).fill(lcl), borderColor: '#dc2626', borderWidth: 2, pointRadius: 0, borderDash: [5, 5] }, { label: 'CL', data: Array(labels.length).fill(cl), borderColor: '#6b7280', borderWidth: 2, pointRadius: 0 }, { label, data, borderColor: '#0ea5e9', backgroundColor: '#0ea5e9', tension: 0.1, pointRadius: 5 } ] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } });
        }

        function createParetoChart(data) {
            const chartInstance = Chart.getChart('paretoChart');
            if (chartInstance) chartInstance.destroy();
            const ctx = document.getElementById('paretoChart').getContext('2d');
            new Chart(ctx, { type: 'bar', data: { labels: data.map(d => d.type), datasets: [ { label: 'Hata Adedi', data: data.map(d => d.count), backgroundColor: '#38bdf8', yAxisID: 'y' }, { label: 'Kümülatif %', data: data.map(d => d.cumulative), type: 'line', borderColor: '#ef4444', tension: 0.1, yAxisID: 'y1' } ] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { position: 'left', title: { display: true, text: 'Hata Adedi' } }, y1: { position: 'right', min: 0, max: 100, title: { display: true, text: 'Kümülatif Yüzde (%)' }, grid: { drawOnChartArea: false } } }, plugins: { legend: { position: 'bottom' } } } });
        }
        
        // --- API FONKSİYONLARI ---
        function getApiKey() {
            return localStorage.getItem('geminiApiKey');
        }

        function saveApiKey(apiKey) {
            localStorage.setItem('geminiApiKey', apiKey);
        }

        function getUserName() {
            return localStorage.getItem('userName') || '';
        }

        function saveUserName(name) {
            localStorage.setItem('userName', name);
        }

        async function callGemini(prompt) {
            const apiKey = getApiKey();
            if (!apiKey) {
                throw new Error("API anahtarı bulunamadı. Lütfen ayarlardan anahtarınızı girin.");
            }
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] })
            });
            if (!response.ok) {
                 const errorBody = await response.json();
                 console.error("API Hata Detayı:", errorBody);
                 throw new Error(`API çağrısı başarısız: ${response.status} - ${errorBody.error?.message || 'Bilinmeyen hata'}`);
            }
            const result = await response.json();
            if (result.candidates && result.candidates.length > 0 && result.candidates[0].content.parts) {
                return result.candidates[0].content.parts[0].text;
            } else {
                console.warn("API'den beklenen formatta içerik alınamadı. Gelen yanıt:", result);
                if (result.candidates && result.candidates[0]?.finishReason) {
                    throw new Error(`API çağrısı içerik üretemedi. Neden: ${result.candidates[0].finishReason}`);
                }
                throw new Error("API'den geçerli bir içerik alınamadı.");
            }
        }

        async function callGeminiForParsing(prompt) {
            const text = await callGemini(prompt);
            const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonString);
        }
        
        async function callGeminiForInterpretation(prompt, targetElement, loadingElement, tabKey) {
            loadingElement.classList.remove('hidden');
            targetElement.classList.add('hidden');
            
            const userName = getUserName();
            const finalPrompt = userName ? `${prompt}\n\nNot: Bu raporu hazırlayan kişi ${userName}'dir. Raporda bu bilgiyi uygun bir şekilde belirt.` : prompt;

            try {
                const text = await callGemini(finalPrompt);
                const htmlContent = marked.parse(text);
                targetElement.innerHTML = htmlContent;
                targetElement.classList.remove('hidden');

                // AI çıktısını geçmişe kaydet
                const history = getHistory();
                if (history.length > 0) {
                    const latestAnalysis = history[0];
                    if (!latestAnalysis.data.aiOutputs) {
                        latestAnalysis.data.aiOutputs = {};
                    }
                    latestAnalysis.data.aiOutputs[tabKey] = htmlContent;
                    localStorage.setItem('analysisHistory', JSON.stringify(history));
                }

            } catch (error) {
                targetElement.innerHTML = `<p class="text-red-500"><strong>Hata:</strong> Analiz alınamadı. ${error.message}</p>`;
                targetElement.classList.remove('hidden');
            } finally {
                loadingElement.classList.add('hidden');
            }
        }

        // --- ARAYÜZ OLUŞTURMA FONKSİYONLARI ---
        function createParetoSummary(data, total) {
            const container = document.getElementById('pareto-summary');
            let tableHtml = `<div class="overflow-x-auto mb-6"><table class="w-full text-sm">...</table></div>`;
            let tbodyHtml = '';
            data.forEach(item => { tbodyHtml += `<tr class="bg-white border-b"><th class="px-6 py-4 font-medium">${item.type}</th><td class="px-6 py-4 text-right">${item.count}</td><td class="px-6 py-4 text-right">${item.percentage.toFixed(1)}</td><td class="px-6 py-4 text-right">${item.cumulative.toFixed(1)}</td></tr>`; });
            const vitalFew = data.filter(d => d.cumulative <= 80);
            const vitalFewCount = vitalFew.reduce((sum, item) => sum + item.count, 0);
            const vitalFewPercent = (total > 0) ? (vitalFewCount / total) * 100 : 0;
            tableHtml += `<div class="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg">...</div>`;
            container.innerHTML = tableHtml.replace('...', '<thead>...</thead><tbody>'+tbodyHtml+'</tbody>').replace('...', `<tr class="text-xs text-sky-800 uppercase bg-stone-50"><th class="px-6 py-3">Hata Türü</th><th class="px-6 py-3 text-right">Adet</th><th class="px-6 py-3 text-right">%</th><th class="px-6 py-3 text-right">Küm. %</th></tr>`).replace('...', `<h4 class="font-bold text-amber-800">Pareto Prensibi</h4><p class="text-amber-700 mt-2"><strong>${vitalFew.map(d => d.type).join(', ')}</strong> hataları, toplamın <strong>%${vitalFewPercent.toFixed(1)}</strong>'ini oluşturuyor. İyileştirme çabaları bu hatalara odaklanmalıdır.</p>`);
        }

        function renderOverviewTab(analysis) {
            const container = tabs.overview.content;
            const { measurementData } = analysis;
            if (!measurementData || measurementData.length === 0) {
                container.innerHTML = '<div class="bg-white rounded-xl shadow-md p-6 text-center"><p>Ölçüm verisi bulunamadı.</p></div>';
                return;
            }
            container.innerHTML = `<div class="bg-white rounded-xl shadow-md p-6"><h3 class="text-2xl font-semibold text-stone-800 mb-4">Ölçüm Verileri Genel Bakış</h3><div class="overflow-x-auto"><table id="overview-table" class="w-full text-sm"></table></div></div>`;
            const tbody = measurementData.map(d => {
                if(d.values.length === 0) return '';
                const mean = calculateMean(d.values);
                const stdDev = calculateStdDev([d.values]);
                const min = Math.min(...d.values);
                const max = Math.max(...d.values);
                const range = max - min;
                return `<tr class="bg-white border-b"><th class="px-6 py-4 font-medium">${d.group}</th><td class="px-6 py-4 text-right">${mean.toFixed(4)}</td><td class="px-6 py-4 text-right">${stdDev.toFixed(4)}</td><td class="px-6 py-4 text-right">${min.toFixed(4)}</td><td class="px-6 py-4 text-right">${max.toFixed(4)}</td><td class="px-6 py-4 text-right">${range.toFixed(4)}</td></tr>`;
            }).join('');
            container.querySelector('#overview-table').innerHTML = `<thead class="text-xs text-sky-800 uppercase bg-stone-50"><tr><th class="px-6 py-3">Grup</th><th class="px-6 py-3 text-right">Ortalama</th><th class="px-6 py-3 text-right">Std. Sapma</th><th class="px-6 py-3 text-right">Min</th><th class="px-6 py-3 text-right">Max</th><th class="px-6 py-3 text-right">Açıklık</th></tr></thead><tbody>${tbody}</tbody>`;
        }

        function renderXrTab(analysis) {
            const container = tabs.xr.content;
            const { measurementData, aiOutputs } = analysis;
            if (!measurementData || measurementData.length === 0 || measurementData[0].values.length < 2) {
                container.innerHTML = '<div class="bg-white rounded-xl shadow-md p-6 text-center"><p>XR Analizi için yeterli ölçüm verisi bulunamadı (en az 2 örneklemli gruplar gereklidir).</p></div>';
                return;
            }
            container.innerHTML = `<div class="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8"><div class="bg-white rounded-xl shadow-md p-4 sm:p-6"><h3 class="text-xl font-semibold text-stone-700 mb-4 text-center">X-Bar (Ortalama) Kontrol Grafiği</h3><div class="chart-container"><canvas id="xBarChart"></canvas></div></div><div class="bg-white rounded-xl shadow-md p-4 sm:p-6"><h3 class="text-xl font-semibold text-stone-700 mb-4 text-center">R (Açıklık) Kontrol Grafiği</h3><div class="chart-container"><canvas id="rChart"></canvas></div></div></div><div class="bg-white rounded-xl shadow-md p-6"><h3 class="text-2xl font-semibold text-stone-800 mb-4">XR Analizi Sonuçları</h3><div id="xr-summary"></div><div class="text-center mt-6"><button id="gemini-xr-btn" class="gemini-btn font-bold py-2 px-4 rounded-lg shadow-lg">✨ Analizi Yorumla ve Öneri Al</button></div><div id="gemini-xr-loader" class="text-center hidden"><div class="loader"></div></div><div id="gemini-xr-output" class="gemini-output hidden"></div></div>`;
            
            const aiOutputDiv = container.querySelector('#gemini-xr-output');
            if (aiOutputs && aiOutputs.xr) {
                aiOutputDiv.innerHTML = aiOutputs.xr;
                aiOutputDiv.classList.remove('hidden');
            }

            const n = measurementData[0].values.length;
            const controlChartFactors = { 2:{A2:1.880,D3:0,D4:3.267,d2:1.128}, 3:{A2:1.023,D3:0,D4:2.574,d2:1.693}, 4:{A2:0.729,D3:0,D4:2.282,d2:2.059}, 5:{A2:0.577,D3:0,D4:2.114,d2:2.326}, 6:{A2:0.483,D3:0,D4:2.004,d2:2.534}, 7:{A2:0.419,D3:0.076,D4:1.924,d2:2.704}, 8:{A2:0.373,D3:0.136,D4:1.864,d2:2.847}, 9:{A2:0.337,D3:0.184,D4:1.816,d2:2.970}, 10:{A2:0.308,D3:0.223,D4:1.777,d2:3.078} };
            const factors = controlChartFactors[n] || {A2:0,D3:0,D4:0,d2:1};
            const groupAverages = measurementData.map(d => calculateMean(d.values));
            const groupRanges = measurementData.map(d => Math.max(...d.values) - Math.min(...d.values));
            const xDoubleBar = calculateMean(groupAverages);
            const rBar = calculateMean(groupRanges);
            const uclX = xDoubleBar + (factors.A2 * rBar), lclX = xDoubleBar - (factors.A2 * rBar);
            const uclR = factors.D4 * rBar, lclR = factors.D3 * rBar;
            createControlChart('xBarChart', measurementData.map(d => d.group), groupAverages, uclX, lclX, xDoubleBar, 'Ortalamalar');
            createControlChart('rChart', measurementData.map(d => d.group), groupRanges, uclR, lclR, rBar, 'Açıklıklar');
            const xOutOfControl = groupAverages.some(p => p > uclX || p < lclX);
            const rOutOfControl = groupRanges.some(p => p > uclR || p < lclR);
            container.querySelector('#xr-summary').innerHTML = `<div class="p-4 rounded-r-lg ${!xOutOfControl && !rOutOfControl ? 'bg-green-50 border-l-4 border-green-500' : 'bg-red-50 border-l-4 border-red-500'}"><h4 class="font-bold ${!xOutOfControl && !rOutOfControl ? 'text-green-800' : 'text-red-800'}">Sonuç: Süreç ${!xOutOfControl && !rOutOfControl ? 'Kontrol Altında' : 'Kontrol Dışında'}</h4><p class="${!xOutOfControl && !rOutOfControl ? 'text-green-700' : 'text-red-700'}">${!xOutOfControl && !rOutOfControl ? 'Tüm noktalar kontrol limitleri içerisindedir. Süreç istatistiksel olarak stabildir.' : 'Kontrol limitleri dışına çıkan noktalar var. Süreçte özel nedenli değişkenlikler mevcut.'}</p></div>`;
            container.querySelector('#gemini-xr-btn').addEventListener('click', () => {
                const promptText = promptTemplates.analyzeXr
                    .replace('{currentDate}', new Date().toLocaleDateString('tr-TR'))
                    .replace('{groupAverages}', groupAverages.map(v => v.toFixed(4)).join(', '))
                    .replace('{uclX}', uclX.toFixed(4))
                    .replace('{lclX}', lclX.toFixed(4))
                    .replace('{groupRanges}', groupRanges.map(v => v.toFixed(4)).join(', '))
                    .replace('{uclR}', uclR.toFixed(4))
                    .replace('{lclR}', lclR.toFixed(4));
                callGeminiForInterpretation(promptText, container.querySelector('#gemini-xr-output'), container.querySelector('#gemini-xr-loader'), 'xr');
            });
            container.querySelectorAll('.export-btn').forEach(btn => btn.addEventListener('click', (e) => handleExport(e.target.dataset.type, e.target.dataset.tab)));
        }

        function renderCapabilityTab(analysis) {
            const container = tabs.capability.content;
            const { measurementData, specs, aiOutputs } = analysis;
            if (!specs || specs.lsl === null || specs.usl === null || !measurementData || measurementData.length === 0) {
                container.innerHTML = '<div class="bg-white rounded-xl shadow-md p-6 text-center"><p>Süreç Yeterlilik Analizi için ölçüm verileri ve spesifikasyon limitleri (ASL ve ÜSL) gereklidir.</p></div>';
                return;
            }
            container.innerHTML = `<div class="bg-white rounded-xl shadow-md p-6"><h3 class="text-2xl font-semibold text-stone-800 mb-4">Süreç Yeterlilik Analizi (Cp, Cpk)</h3><div id="capability-summary" class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"></div><div class="text-center mt-6"><button id="gemini-cpk-btn" class="gemini-btn font-bold py-2 px-4 rounded-lg shadow-lg">✨ Analizi Yorumla ve Öneri Al</button></div><div id="gemini-cpk-loader" class="text-center hidden"><div class="loader"></div></div><div id="gemini-cpk-output" class="gemini-output hidden"></div></div>`;
            
            const aiOutputDiv = container.querySelector('#gemini-cpk-output');
            if (aiOutputs && aiOutputs.capability) {
                aiOutputDiv.innerHTML = aiOutputs.capability;
                aiOutputDiv.classList.remove('hidden');
            }

            const n = measurementData[0].values.length;
            const controlChartFactors = { 2:{d2:1.128}, 3:{d2:1.693}, 4:{d2:2.059}, 5:{d2:2.326}, 6:{d2:2.534}, 7:{d2:2.704}, 8:{d2:2.847}, 9:{d2:2.970}, 10:{d2:3.078} };
            const d2 = controlChartFactors[n] ? controlChartFactors[n].d2 : calculateStdDev(measurementData.map(d => d.values));
            const groupRanges = measurementData.map(d => Math.max(...d.values) - Math.min(...d.values));
            const rBar = calculateMean(groupRanges);
            const stdDev = rBar / d2;
            const overallMean = calculateMean(measurementData.map(d => calculateMean(d.values)));
            const cp = (specs.usl - specs.lsl) / (6 * stdDev);
            const cpu = (specs.usl - overallMean) / (3 * stdDev);
            const cpl = (overallMean - specs.lsl) / (3 * stdDev);
            const cpk = Math.min(cpu, cpl);
            const summaryContainer = container.querySelector('#capability-summary');
            summaryContainer.innerHTML = `<div class="text-center"><h4 class="text-lg font-medium text-stone-600">Cp Değeri</h4><p class="text-5xl font-bold text-sky-700 my-2">${cp.toFixed(2)}</p><p class="text-sm text-stone-500">Sürecin potansiyel yeterliliğini gösterir.</p></div><div class="text-center"><h4 class="text-lg font-medium text-stone-600">Cpk Değeri</h4><p class="text-5xl font-bold ${cpk < 1.33 ? 'text-red-500' : 'text-green-600'} my-2">${cpk.toFixed(2)}</p><p class="text-sm text-stone-500">Sürecin mevcut performansını ve merkezliliğini gösterir.</p></div>`;
            container.querySelector('#gemini-cpk-btn').addEventListener('click', () => {
                const promptText = promptTemplates.analyzeCapability
                    .replace('{currentDate}', new Date().toLocaleDateString('tr-TR'))
                    .replace('{cp}', cpk.toFixed(3))
                    .replace('{cpk}', cpk.toFixed(3))
                    .replace('{overallMean}', overallMean.toFixed(3))
                    .replace('{usl}', specs.usl)
                    .replace('{lsl}', specs.lsl);
                callGeminiForInterpretation(promptText, container.querySelector('#gemini-cpk-output'), container.querySelector('#gemini-cpk-loader'), 'capability');
            });
            container.querySelectorAll('.export-btn').forEach(btn => btn.addEventListener('click', (e) => handleExport(e.target.dataset.type, e.target.dataset.tab)));
        }

        function renderParetoTab(analysis) {
            const container = tabs.pareto.content;
            const { paretoData, aiOutputs } = analysis;
            if (!paretoData || paretoData.length === 0) {
                container.innerHTML = '<div class="bg-white rounded-xl shadow-md p-6 text-center"><p>Pareto Analizi için hata verisi bulunamadı.</p></div>';
                return;
            }
            container.innerHTML = `<div class="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-8"><h3 class="text-xl font-semibold text-stone-700 mb-4 text-center">Pareto Analizi: Hata Türleri</h3><div class="chart-container"><canvas id="paretoChart"></canvas></div></div><div class="bg-white rounded-xl shadow-md p-6"><h3 class="text-2xl font-semibold text-stone-800 mb-4">Analiz Detayları ve Sonuç</h3><div id="pareto-summary"></div><div class="text-center mt-6"><button id="gemini-pareto-btn" class="gemini-btn font-bold py-2 px-4 rounded-lg shadow-lg">✨ Kök Neden Analizi Yap</button></div><div id="gemini-pareto-loader" class="text-center hidden"><div class="loader"></div></div><div id="gemini-pareto-output" class="gemini-output hidden"></div></div>`;
            
            const aiOutputDiv = container.querySelector('#gemini-pareto-output');
            if (aiOutputs && aiOutputs.pareto) {
                aiOutputDiv.innerHTML = aiOutputs.pareto;
                aiOutputDiv.classList.remove('hidden');
            }

            paretoData.sort((a, b) => b.count - a.count);
            const totalErrors = paretoData.reduce((sum, item) => sum + item.count, 0);
            let cumulative = 0;
            const processedData = paretoData.map(item => {
                const percentage = (totalErrors > 0) ? (item.count / totalErrors) * 100 : 0;
                cumulative += percentage;
                return { ...item, percentage, cumulative };
            });
            createParetoChart(processedData);
            createParetoSummary(processedData, totalErrors);
            container.querySelector('#gemini-pareto-btn').addEventListener('click', () => {
                const topErrors = processedData.slice(0, 2).map(d => d.type).join(' ve ');
                const promptText = promptTemplates.analyzePareto
                    .replace('{currentDate}', new Date().toLocaleDateString('tr-TR'))
                    .replace('{topErrors}', topErrors);
                callGeminiForInterpretation(promptText, container.querySelector('#gemini-pareto-output'), container.querySelector('#gemini-pareto-loader'), 'pareto');
            });
        }

        function renderAllAnalyses(sourceAnalysis = appState.currentAnalysis) {
            if (!sourceAnalysis) return;
            renderOverviewTab(sourceAnalysis);
            renderXrTab(sourceAnalysis);
            renderCapabilityTab(sourceAnalysis);
            renderParetoTab(sourceAnalysis);
        }
        
        // --- GEÇMİŞ ANALİZ FONKSİYONLARI ---
        function getHistory() {
            return JSON.parse(localStorage.getItem('analysisHistory')) || [];
        }

        function saveAnalysisToHistory(analysis) {
            const history = getHistory();
            history.unshift(analysis); // En yeni analizi başa ekle
            localStorage.setItem('analysisHistory', JSON.stringify(history.slice(0, 50))); // Son 50 analizi sakla
            renderHistoryTab(); // Geçmiş sekmesini güncelle
        }

        function loadAnalysisFromHistory(analysisId) {
            const history = getHistory();
            const analysis = history.find(a => a.id === analysisId);
            if (analysis) {
                appState.currentAnalysis = analysis.data;
                renderAllAnalyses(analysis.data);
                Object.values(tabs).forEach(tab => tab.btn.classList.remove('disabled-tab'));
                switchTab('overview');
            }
        }
        
        function deleteAnalysisFromHistory(analysisId) {
            let history = getHistory();
            history = history.filter(a => a.id !== analysisId);
            localStorage.setItem('analysisHistory', JSON.stringify(history));
            renderHistoryTab();
        }

        function renderHistoryTab() {
            const container = tabs.history.content;
            const history = getHistory();
            if (history.length === 0) {
                container.innerHTML = '<div class="bg-white rounded-xl shadow-md p-6 text-center"><p>Kaydedilmiş bir analiz bulunmuyor.</p></div>';
                return;
            }
            
            const listHtml = history.map(analysis => `
                <div class="history-item bg-white p-4 rounded-lg shadow-sm flex justify-between items-center">
                    <div>
                        <h4 class="font-semibold text-sky-800">${analysis.title}</h4>
                        <p class="text-sm text-stone-500">${new Date(analysis.date).toLocaleString('tr-TR')}</p>
                    </div>
                    <div class="space-x-2">
                        <button class="load-history-btn" data-id="${analysis.id}">Yükle</button>
                        <button class="delete-history-btn" data-id="${analysis.id}">Sil</button>
                    </div>
                </div>
            `).join('');

            container.innerHTML = `<div class="space-y-4">${listHtml}</div>`;

            container.querySelectorAll('.load-history-btn').forEach(btn => {
                btn.addEventListener('click', (e) => loadAnalysisFromHistory(e.target.dataset.id));
            });
            container.querySelectorAll('.delete-history-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    if(confirm('Bu analizi silmek istediğinizden emin misiniz?')) {
                        deleteAnalysisFromHistory(e.target.dataset.id);
                    }
                });
            });
        }


        async function handleAnalyzeData() {
            const rawData = document.getElementById('data-input-area').value.trim();
            const lsl = document.getElementById('lsl-input').value;
            const usl = document.getElementById('usl-input').value;
            const target = document.getElementById('target-input').value;

            if (!rawData) {
                alert('Lütfen analiz edilecek verileri girin.');
                return;
            }

            const loader = document.getElementById('analyze-loader');
            const button = document.getElementById('analyze-data-btn');
            loader.classList.remove('hidden');
            button.classList.add('hidden');

            const promptText = promptTemplates.parseData.replace('{rawData}', rawData);

            try {
                const parsedData = await callGeminiForParsing(promptText);
                if ((!parsedData.measurementData || parsedData.measurementData.length === 0) && (!parsedData.paretoData || parsedData.paretoData.length === 0)) {
                    throw new Error("Veri formatı anlaşılamadı. Lütfen verilerinizi kontrol edin.");
                }
                const analysisData = {
                    ...parsedData,
                    specs: {
                        lsl: lsl ? parseFloat(lsl) : null,
                        usl: usl ? parseFloat(usl) : null,
                        target: target ? parseFloat(target) : null
                    }
                };
                appState.currentAnalysis = analysisData;
                
                const analysisTitle = prompt("Bu analiz için bir başlık girin (örn: 'Haftalık Üretim Raporu'):", `Analiz - ${new Date().toLocaleDateString('tr-TR')}`);
                if (analysisTitle) {
                    saveAnalysisToHistory({
                        id: `analysis-${Date.now()}`,
                        title: analysisTitle,
                        date: new Date().toISOString(),
                        data: analysisData
                    });
                }

                renderAllAnalyses();
                Object.values(tabs).forEach(tab => tab.btn.classList.remove('disabled-tab'));
                switchTab('overview');
            } catch (error) {
                alert(`Veri yorumlanırken bir hata oluştu: ${error.message}`);
            } finally {
                loader.classList.add('hidden');
                button.classList.remove('hidden');
            }
        }

        function openSettingsModal() {
            const modal = document.getElementById('settings-modal');
            document.getElementById('api-key-input').value = getApiKey() || '';
            document.getElementById('user-name-input').value = getUserName() || '';
            modal.classList.remove('hidden');
        }

        function closeSettingsModal() {
            const modal = document.getElementById('settings-modal');
            modal.classList.add('hidden');
        }

        function createDataEntryView() {
            tabs.entry.content.innerHTML = `
            <div class="bg-white rounded-xl shadow-md p-6 mb-8">
                <h3 class="text-2xl font-semibold text-stone-800 mb-2">1. Veri Setini Yapıştırın</h3>
                <p class="text-sm text-stone-600 mb-4">Excel, CSV veya metin dosyasından kopyaladığınız verileri aşağıdaki alana yapıştırın. Hem ölçüm verilerini (gruplar halinde) hem de hata verilerini (tür ve adet) içerebilir.</p>
                <textarea id="data-input-area" class="w-full h-60 p-2 border border-stone-300 rounded-md shadow-sm" placeholder="Örnek Ölçüm Verisi:\nGrup1,4.01,3.99,4.02\nGrup2,3.98,4.00,3.99\n\nÖrnek Hata Verisi:\nÇizik,24\nKenar Kırığı,12"></textarea>
            </div>
            <div class="bg-white rounded-xl shadow-md p-6 mb-8">
                <h3 class="text-2xl font-semibold text-stone-800 mb-2">2. Süreç Spesifikasyonlarını Girin (Cp, Cpk için)</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                        <label for="lsl-input" class="block text-sm font-medium text-stone-700">Alt Spesifikasyon Limiti (ASL)</label>
                        <input type="number" id="lsl-input" class="mt-1 block w-full p-2 rounded-md border-stone-300 shadow-sm" placeholder="Örn: 3.95">
                    </div>
                    <div>
                        <label for="target-input" class="block text-sm font-medium text-stone-700">Hedef Değer (Opsiyonel)</label>
                        <input type="number" id="target-input" class="mt-1 block w-full p-2 rounded-md border-stone-300 shadow-sm" placeholder="Örn: 4.00">
                    </div>
                    <div>
                        <label for="usl-input" class="block text-sm font-medium text-stone-700">Üst Spesifikasyon Limiti (ÜSL)</label>
                        <input type="number" id="usl-input" class="mt-1 block w-full p-2 rounded-md border-stone-300 shadow-sm" placeholder="Örn: 4.05">
                    </div>
                </div>
            </div>
            <div id="analyze-loader" class="text-center hidden"><div class="loader"></div></div>
            <div class="text-center mt-8">
                <button id="analyze-data-btn" class="w-full md:w-1/2 bg-green-600 text-white text-xl font-bold py-4 px-6 rounded-lg shadow-lg hover:bg-green-700 transition transform hover:scale-105">
                    VERİYİ YORUMLA VE ANALİZ ET
                </button>
            </div>`;
            document.getElementById('analyze-data-btn').addEventListener('click', handleAnalyzeData);
        }
        

        // --- Main Initialization ---
        async function init() {
            console.log("init() fonksiyonu başlatılıyor.");
            
            try {
                const response = await fetch('prompts.json');
                if (!response.ok) throw new Error('Prompt dosyası yüklenemedi.');
                promptTemplates = await response.json();
                console.log("Promptlar başarıyla yüklendi.");
            } catch (error) {
                console.error("Promptlar yüklenirken hata oluştu:", error);
                alert("Uygulama başlatılamadı: Gerekli yapılandırma dosyaları (prompts.json) yüklenemedi.");
                return;
            }

            setupTabs();
            console.log("Sekmeler ayarlandı.");
            createDataEntryView();
            console.log("Veri giriş ekranı oluşturuldu.");
            renderHistoryTab();
            if (getHistory().length > 0) {
                tabs.history.btn.classList.remove('disabled-tab');
            }
            console.log("Geçmiş sekmesi oluşturuldu.");

            document.getElementById('settings-btn').addEventListener('click', openSettingsModal);
            document.getElementById('save-settings-btn').addEventListener('click', () => {
                const apiKey = document.getElementById('api-key-input').value.trim();
                const userName = document.getElementById('user-name-input').value.trim();
                
                if (apiKey) {
                    saveApiKey(apiKey);
                }
                saveUserName(userName);

                alert('Ayarlar kaydedildi.');
                closeSettingsModal();
            });
            document.getElementById('cancel-settings-btn').addEventListener('click', closeSettingsModal);
            
            // API anahtarı kontrolü
            if (!getApiKey()) {
                console.log("API anahtarı bulunamadı, ayarlar modal'ı açılıyor.");
                openSettingsModal();
            }

            console.log("init() fonksiyonu başarıyla tamamlandı.");
        }

        init();

    } catch (error) {
        console.error("KRİTİK BAŞLANGIÇ HATASI:", error);
        alert("Uygulama başlatılırken kritik bir hata oluştu. Lütfen Geliştirici Konsolunu (F12) kontrol edin ve sayfayı yenileyin. Hata: " + error.message);
    }
});
