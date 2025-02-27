// Google Apps Script 後端代碼

// 處理 Web App 的 GET 和 POST 請求
function doGet(e) {
  try {
    // 解析請求參數
    const action = e.parameter.action;
    
    if (action === 'getEntries') {
      // 獲取所有項目
      const entries = getAllEntries();
      return sendResponse(true, '成功獲取資料', { entries });
    } else {
      return sendResponse(false, '未指定有效操作');
    }
  } catch (error) {
    return sendResponse(false, `處理請求時出錯: ${error.message}`);
  }
}

function doPost(e) {
  try {
    // 解析請求內容
    let requestData;
    let action;
    let entry;
    
    // 檢查請求是通過表單提交還是JSON
    if (e.postData && e.postData.type === "application/json") {
      // JSON格式
      requestData = JSON.parse(e.postData.contents);
      action = requestData.action;
      entry = requestData.entry;
    } else {
      // 表單格式
      action = e.parameter.action;
      
      if (e.parameter.entry) {
        entry = JSON.parse(e.parameter.entry);
      }
    }
    
    if (action === 'addEntry' && entry) {
      // 新增項目
      const result = addEntry(entry);
      return sendResponse(true, '成功新增資料', { entry: result });
    } else {
      return sendResponse(false, '未指定有效操作或缺少必要參數');
    }
  } catch (error) {
    return sendResponse(false, `處理請求時出錯: ${error.message}`);
  }
}

// 取得所有資料
function getAllEntries() {
  const sheet = getDataSheet();
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  // 排除標題行
  const headers = values[0];
  const entries = [];
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const entry = {
      id: row[0],
      date: row[1],
      year: row[2],
      school: row[3],
      department: row[4],
      region: row[5], 
      scores: JSON.parse(row[6]),
      composition: row[7],
      total: row[8],
      totalPoints: row[9],
      comment: row[10]
    };
    entries.push(entry);
  }
  
  // 按照日期排序 (最新在前)
  entries.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  return entries;
}

// 新增一筆資料
function addEntry(entry) {
  const sheet = getDataSheet();
  
  // 準備存入資料
  const rowData = [
    entry.id,
    entry.date,
    entry.year,
    entry.school,
    entry.department,
    entry.region, 
    JSON.stringify(entry.scores),  
    entry.composition,
    entry.total,
    entry.totalPoints,
    entry.comment
  ];
  
  // 加入到試算表中
  sheet.appendRow(rowData);
  
  return entry; 
}

// 取得或建立資料工作表
function getDataSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('ScoreEntries');
  
  // 如果工作表不存在，建立一個新的
  if (!sheet) {
    sheet = ss.insertSheet('ScoreEntries');
    // 設置表頭
    sheet.appendRow(['ID', '日期', '年份', '學校', '科系', '區域', '分數', '作文級分', '總積分', '總積點', '備註']);
    // 凍結表頭
    sheet.setFrozenRows(1);
  }
  
  return sheet;
}

// 發送標準格式的回應
function sendResponse(success, message, data = {}) {
  const response = {
    success: success,
    message: message,
    ...data
  };
  
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}