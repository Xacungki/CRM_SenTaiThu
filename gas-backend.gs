const SHEET_ID = "YOUR_SPREADSHEET_ID";
const SHEET_NAME = "ALL DATA";

// 1. HTTP GET: Trả dữ liệu về cho Web
function doGet(e) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    
    const headers = data[0];
    const rows = data.slice(1);
    
    // Convert to array of objects
    const result = rows.map((row, index) => {
      let obj = { _rowIndex: index + 2 }; // Giữ lại dòng thật trên sheet để update 2 chiều
      headers.forEach((header, i) => {
        if(header) obj[header.trim()] = row[i];
      });
      return obj;
    });

    return ContentService.createTextOutput(JSON.stringify({ status: "success", data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 2. HTTP POST: Nhận dữ liệu từ Web để Update/Insert vào Sheet
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    const body = JSON.parse(e.postData.contents);
    const action = body.action; // 'CREATE' or 'UPDATE'
    const payload = body.data; 
    
    if (action === 'CREATE') {
      // Logic appendRow
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const newRow = headers.map(h => payload[h] || "");
      
      // Auto-generate ID nếu thiếu
      if (!newRow[0]) newRow[0] = Utilities.getUuid(); 
      newRow[1] = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy"); // Auto Ngày
      
      sheet.appendRow(newRow);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "CREATE" }))
        .setMimeType(ContentService.MimeType.JSON);
        
    } else if (action === 'UPDATE') {
      // Logic update by RowIndex
      const rowIndex = payload._rowIndex;
      if(!rowIndex) throw new Error("Missing _rowIndex for update");
      
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const updateData = headers.map(h => payload[h] !== undefined ? payload[h] : "");
      
      // Ghi đè vào dòng tương ứng (chỉ ghi 1 dòng)
      sheet.getRange(rowIndex, 1, 1, headers.length).setValues([updateData]);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "UPDATE" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 3. ON EDIT: Bắt sự kiện sửa tay trên sheet (dùng cho webhook nếu cần realtime push về web)
function onEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.source.getActiveSheet();
  if (sheet.getName() !== SHEET_NAME) return;
  
  // Gắn Log: Ghi timestamp vào cột cuối cùng nếu có ai đó sửa tay
  const row = e.range.getRow();
  const col = e.range.getColumn();
  if (row > 1) {
    const lastCol = sheet.getLastColumn();
    // Giả sử ta thêm cột "Last updated" ở cuối cùng
    // sheet.getRange(row, lastCol).setValue(new Date());
  }
}
