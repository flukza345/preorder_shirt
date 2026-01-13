// Google Apps Script Code
// คัดลอกโค้ดนี้ไปใส่ใน Google Apps Script

// ID ของ Google Sheets ที่ต้องการบันทึกข้อมูล
const SPREADSHEET_ID = '1uyZUQBIDR_BRVJ6-ArBISmpvkvLtKWNiFBWsT3xQgF4';

function doGet(e) {
  try {
    const action = e.parameter.action;
    
    if (action === 'getOrders') {
      return getOrdersFromSheet();
    }
    
    if (action === 'updateOrder') {
      return updateOrderStatus(e);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({success: false, message: 'Invalid action'}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in doGet:', error);
    return ContentService
      .createTextOutput(JSON.stringify({success: false, message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    console.log('Received POST request:', e);
    
    const action = e.parameter.action;
    
    if (action === 'updateOrder') {
      return updateOrderStatus(e);
    }
    
    if (action === 'uploadEvidence') {
      return uploadEvidence(e);
    }
    
    // สำหรับการสั่งซื้อใหม่
    let data;
    if (e && e.parameter && e.parameter.data) {
      data = JSON.parse(e.parameter.data);
    } else if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      throw new Error('No data received');
    }
    
    return saveOrderToSheet(data);
    
  } catch (error) {
    console.error('Error in doPost:', error);
    return ContentService
      .createTextOutput(JSON.stringify({success: false, message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
  }
}

function updateOrderStatus(e) {
  try {
    const customerName = e.parameter.customerName;
    const paymentStatus = e.parameter.paymentStatus;
    const adminNotes = e.parameter.adminNotes;
    const evidenceUrl = e.parameter.evidenceUrl;
    
    console.log('Updating order for customer:', customerName);
    
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      throw new Error('No orders found');
    }
    
    const headers = data[0];
    let paymentStatusCol = headers.indexOf('สถานะการชำระ');
    let adminNotesCol = headers.indexOf('หมายเหตุ');
    let evidenceCol = headers.indexOf('หลักฐานการชำระ');
    
    if (paymentStatusCol === -1) {
      paymentStatusCol = headers.length;
      sheet.getRange(1, paymentStatusCol + 1).setValue('สถานะการชำระ');
    }
    
    if (adminNotesCol === -1) {
      adminNotesCol = headers.length + (paymentStatusCol === headers.length ? 1 : 0);
      sheet.getRange(1, adminNotesCol + 1).setValue('หมายเหตุ');
    }
    
    if (evidenceCol === -1) {
      evidenceCol = headers.length + (paymentStatusCol === headers.length ? 1 : 0) + (adminNotesCol === headers.length + (paymentStatusCol === headers.length ? 1 : 0) ? 1 : 0);
      sheet.getRange(1, evidenceCol + 1).setValue('หลักฐานการชำระ');
    }
    
    let updated = false;
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowCustomer = String(row[1] || '').trim();
      
      if (rowCustomer === customerName) {
        if (paymentStatus) {
          sheet.getRange(i + 1, paymentStatusCol + 1).setValue(paymentStatus);
        }
        
        if (adminNotes) {
          sheet.getRange(i + 1, adminNotesCol + 1).setValue(adminNotes);
        }
        
        if (evidenceUrl) {
          sheet.getRange(i + 1, evidenceCol + 1).setValue(evidenceUrl);
        }
        
        updated = true;
      }
    }
    
    if (!updated) {
      throw new Error('ไม่พบออเดอร์');
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({success: true, message: 'อัพเดทสำเร็จ'}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error updating order:', error);
    return ContentService
      .createTextOutput(JSON.stringify({success: false, message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrdersFromSheet() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return ContentService
        .createTextOutput(JSON.stringify({success: true, orders: []}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const orders = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      orders.push({
        orderDate: row[0],
        customerName: row[1],
        shirtType: row[2],
        size: row[3],
        quantity: row[4],
        paymentStatus: row[5] || 'รอชำระเงิน',
        adminNotes: row[6] || '',
        evidenceUrl: row[7] || ''
      });
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({success: true, orders: orders}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting orders:', error);
    return ContentService
      .createTextOutput(JSON.stringify({success: false, message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function saveOrderToSheet(data) {
  try {
    console.log('Saving order data:', data);
    
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    
    // ตรวจสอบว่ามี header แล้วหรือยัง
    if (sheet.getLastRow() === 0) {
      const headers = [
        'วันที่สั่ง',
        'ชื่อผู้สั่ง',
        'แบบเสื้อ',
        'ขนาด',
        'จำนวน',
        'สถานะการชำระ',
        'หมายเหตุ',
        'หลักฐานการชำระ'
      ];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    
    // เพิ่มข้อมูลใหม่สำหรับแต่ละรายการเสื้อ
    if (data.items && Array.isArray(data.items)) {
      data.items.forEach(item => {
        const newRow = [
          data.orderDate,
          data.customerName,
          item.shirt,
          item.size,
          item.quantity,
          'รอชำระเงิน',
          '',
          ''
        ];
        
        sheet.appendRow(newRow);
      });
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({success: true, message: 'บันทึกข้อมูลเรียบร้อย'}))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      
  } catch (error) {
    console.error('Error saving order:', error);
    return ContentService
      .createTextOutput(JSON.stringify({success: false, message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
  }
}

function uploadEvidence(e) {
  try {
    const fileBlob = e.parameter.file;
    const customerName = e.parameter.customerName;
    
    if (!fileBlob) {
      throw new Error('ไม่พบไฟล์');
    }
    
    const fileName = `evidence_${customerName}_${new Date().getTime()}`;
    const file = DriveApp.createFile(fileBlob.setName(fileName));
    
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true, 
        fileUrl: file.getUrl(),
        message: 'อัพโหลดไฟล์สำเร็จ'
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error uploading evidence:', error);
    return ContentService
      .createTextOutput(JSON.stringify({success: false, message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}