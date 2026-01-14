// Google Apps Script - เวอร์ชันใหม่ที่ทำงานได้แน่นอน
const SPREADSHEET_ID = '1uyZUQBIDR_BRVJ6-ArBISmpvkvLtKWNiFBWsT3xQgF4';

function doGet(e) {
  const action = e.parameter.action;
  const callback = e.parameter.callback;
  
  if (action === 'getOrders') {
    const orders = getOrders();
    const response = JSON.stringify({success: true, orders: orders});
    
    if (callback) {
      return ContentService
        .createTextOutput(`${callback}(${response})`)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return ContentService
      .createTextOutput(response)
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService
    .createTextOutput('{"success": false, "message": "Invalid action"}')
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrders() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) return [];
    
    const orders = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const orderDate = row[0] instanceof Date ? Utilities.formatDate(row[0], Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss') : String(row[0]);
      
      orders.push({
        orderDate: orderDate,
        customerName: row[1] || '',
        shirtType: row[2] || '',
        size: row[3] || '',
        quantity: row[4] || 0,
        paymentStatus: row[5] || 'รอชำระเงิน',
        evidenceUrl: row[6] || '',
        adminNotes: row[7] || ''
      });
    }
    
    return orders;
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

function doPost(e) {
  try {
    let data;
    if (e.parameter && e.parameter.data) {
      data = JSON.parse(e.parameter.data);
    }
    
    if (data && data.action === 'updateOrder') {
      const result = updateOrder(data);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data && data.action === 'updateOrderItem') {
      const result = updateOrderItem(data);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService
      .createTextOutput('{"success": false, "message": "Invalid action"}')
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({success: false, message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function updateOrder(data) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    const allData = sheet.getDataRange().getValues();
    
    const [customerName, orderDate] = data.orderKey.split('_');
    
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      const rowDate = row[0] instanceof Date ? Utilities.formatDate(row[0], Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss') : String(row[0]);
      const rowCustomer = String(row[1]);
      
      if (rowCustomer === customerName && rowDate === orderDate) {
        if (data.paymentStatus) {
          sheet.getRange(i + 1, 6).setValue(data.paymentStatus);
        }
        if (data.evidenceUrl) {
          sheet.getRange(i + 1, 7).setValue(data.evidenceUrl);
        }
        if (data.adminNotes !== undefined) {
          sheet.getRange(i + 1, 8).setValue(data.adminNotes);
        }
      }
    }
    
    return {success: true, message: 'อัพเดทสำเร็จ'};
  } catch (error) {
    return {success: false, message: error.toString()};
  }
}

function updateOrderItem(data) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    const allData = sheet.getDataRange().getValues();
    
    const [customerName, orderDate] = data.orderKey.split('_');
    
    let matchCount = 0;
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      const rowDate = row[0] instanceof Date ? Utilities.formatDate(row[0], Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss') : String(row[0]);
      const rowCustomer = String(row[1]);
      
      if (rowCustomer === customerName && rowDate === orderDate) {
        if (matchCount === data.itemIndex) {
          sheet.getRange(i + 1, 4).setValue(data.newSize);
          sheet.getRange(i + 1, 5).setValue(data.newQuantity);
          return {success: true, message: 'แก้ไขสำเร็จ'};
        }
        matchCount++;
      }
    }
    
    return {success: false, message: 'ไม่พบรายการที่ต้องการแก้ไข'};
  } catch (error) {
    return {success: false, message: error.toString()};
  }
}
