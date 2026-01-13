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
  
  if (action === 'updateOrder') {
    const orderKey = e.parameter.orderKey;
    const paymentStatus = e.parameter.paymentStatus;
    const adminNotes = e.parameter.adminNotes;
    const evidenceUrl = e.parameter.evidenceUrl;
    
    const result = updateOrder(orderKey, paymentStatus, adminNotes, evidenceUrl);
    const response = JSON.stringify(result);
    
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

function updateOrder(orderKey, paymentStatus, adminNotes, evidenceUrl) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    const [customerName, orderDate] = orderKey.split('_');
    
    let updated = false;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[1] === customerName && row[0] === orderDate) {
        if (paymentStatus) {
          sheet.getRange(i + 1, 6).setValue(paymentStatus);
        }
        if (evidenceUrl) {
          sheet.getRange(i + 1, 7).setValue(evidenceUrl);
        }
        if (adminNotes !== undefined && adminNotes !== '') {
          sheet.getRange(i + 1, 8).setValue(adminNotes);
        }
        updated = true;
      }
    }
    
    return {success: updated, message: updated ? 'อัพเดทสำเร็จ' : 'ไม่พบออเดอร์'};
    
  } catch (error) {
    return {success: false, message: error.toString()};
  }
}

function getOrders() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) return [];
    
    const orders = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      orders.push({
        orderDate: row[0] || '',
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
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
      const allData = sheet.getDataRange().getValues();
      
      const [customerName, orderDate] = data.orderKey.split('_');
      
      for (let i = 1; i < allData.length; i++) {
        const row = allData[i];
        if (row[1] === customerName && row[0] === orderDate) {
          if (data.paymentStatus) {
            sheet.getRange(i + 1, 6).setValue(data.paymentStatus);
          }
          if (data.evidenceUrl) {
            sheet.getRange(i + 1, 7).setValue(data.evidenceUrl);
          }
          if (data.adminNotes !== undefined) {
            sheet.getRange(i + 1, 8).setValue(data.adminNotes);
          }
          break;
        }
      }
    }
    
    return ContentService
      .createTextOutput('{"success": true}')
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput('{"success": false}')
      .setMimeType(ContentService.MimeType.JSON);
  }
}