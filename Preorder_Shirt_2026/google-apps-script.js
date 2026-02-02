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
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      
  } catch (error) {
    console.error('Error in doGet:', error);
    return ContentService
      .createTextOutput(JSON.stringify({success: false, message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
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
    let data;
    if (e.parameter && e.parameter.data) {
      data = JSON.parse(e.parameter.data);
    } else {
      data = e.parameter;
    }
    
    const orderKey = data.orderKey;
    const paymentStatus = data.paymentStatus;
    const receivedStatus = data.receivedStatus;
    const adminNotes = data.adminNotes;
    
    const [customerName, orderDate] = orderKey.split('_');
    
    console.log('Updating order for customer:', customerName);
    
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    const data_sheet = sheet.getDataRange().getValues();
    
    if (data_sheet.length <= 1) {
      throw new Error('No orders found');
    }
    
    const headers = data_sheet[0];
    let paymentStatusCol = headers.indexOf('สถานะการชำระ');
    let receivedStatusCol = headers.indexOf('สถานะการรับเสื้อ');
    let adminNotesCol = headers.indexOf('หมายเหตุ');
    
    if (paymentStatusCol === -1) {
      paymentStatusCol = headers.length;
      sheet.getRange(1, paymentStatusCol + 1).setValue('สถานะการชำระ');
    }
    
    if (receivedStatusCol === -1) {
      receivedStatusCol = headers.length + (paymentStatusCol === headers.length ? 1 : 0);
      sheet.getRange(1, receivedStatusCol + 1).setValue('สถานะการรับเสื้อ');
    }
    
    if (adminNotesCol === -1) {
      adminNotesCol = headers.length + (paymentStatusCol === headers.length ? 1 : 0) + (receivedStatusCol === headers.length + (paymentStatusCol === headers.length ? 1 : 0) ? 1 : 0);
      sheet.getRange(1, adminNotesCol + 1).setValue('หมายเหตแ');
    }
    
    let updated = false;
    
    for (let i = 1; i < data_sheet.length; i++) {
      const row = data_sheet[i];
      const rowCustomer = String(row[1] || '').trim();
      const rowDate = String(row[0] || '').trim();
      
      if (rowCustomer === customerName && rowDate === orderDate) {
        if (paymentStatus) {
          sheet.getRange(i + 1, paymentStatusCol + 1).setValue(paymentStatus);
        }
        
        if (receivedStatus) {
          sheet.getRange(i + 1, receivedStatusCol + 1).setValue(receivedStatus);
        }
        
        if (adminNotes !== undefined) {
          sheet.getRange(i + 1, adminNotesCol + 1).setValue(adminNotes);
        }
        
        updated = true;
      }
    }
    
    if (!updated) {
      throw new Error('ไม่พบออเดอร์');
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({success: true, message: 'อัพเดทสำเร็จ'}))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      
  } catch (error) {
    console.error('Error updating order:', error);
    return ContentService
      .createTextOutput(JSON.stringify({success: false, message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
  }
}

function getOrdersFromSheet() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return ContentService
        .createTextOutput(JSON.stringify({success: true, orders: []}))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeaders({
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST',
          'Access-Control-Allow-Headers': 'Content-Type'
        });
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
        receivedStatus: row[6] || 'ยังไม่รับ',
        adminNotes: row[7] || ''
      });
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({success: true, orders: orders}))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      
  } catch (error) {
    console.error('Error getting orders:', error);
    return ContentService
      .createTextOutput(JSON.stringify({success: false, message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
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
        'สถานะการรับเสื้อ',
        'หมายเหตุ'
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
          'ยังไม่รับ',
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
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      
  } catch (error) {
    console.error('Error uploading evidence:', error);
    return ContentService
      .createTextOutput(JSON.stringify({success: false, message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
  }
}