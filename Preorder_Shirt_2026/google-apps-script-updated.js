// Google Apps Script Code
// คัดลอกโค้ดนี้ไปใส่ใน Google Apps Script

// ID ของ Google Sheets ที่ต้องการบันทึกข้อมูล
const SPREADSHEET_ID = '1uyZUQBIDR_BRVJ6-ArBISmpvkvLtKWNiFBWsT3xQgF4';

function doGet(e) {
  try {
    const action = e.parameter.action;
    const callback = e.parameter.callback;
    
    if (action === 'getOrders') {
      const result = getOrdersFromSheet();
      
      if (callback) {
        // JSONP response
        const jsonpResponse = `${callback}(${result.getContent()})`;
        return ContentService
          .createTextOutput(jsonpResponse)
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      } else {
        return result;
      }
    }
    
    const response = JSON.stringify({success: false, message: 'Invalid action'});
    if (callback) {
      return ContentService
        .createTextOutput(`${callback}(${response})`)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return ContentService
      .createTextOutput(response)
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in doGet:', error);
    const response = JSON.stringify({success: false, message: error.toString()});
    const callback = e.parameter.callback;
    
    if (callback) {
      return ContentService
        .createTextOutput(`${callback}(${response})`)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return ContentService
      .createTextOutput(response)
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
    
    // แปลงข้อมูลเป็น array ของ orders
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      orders.push({
        rowIndex: i + 1, // เก็บ index ของแถวใน sheet (เริ่มจาก 1)
        orderDate: row[0],
        customerName: row[1],
        shirtType: row[2],
        size: row[3],
        quantity: parseInt(row[4]) || 0,
        paymentStatus: row[5] || 'รอชำระเงิน',
        evidenceUrl: row[6] || '',
        adminNotes: row[7] || ''
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

function doPost(e) {
  try {
    let data;
    
    // ตรวจสอบว่าข้อมูลมาจาก form หรือ JSON
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e && e.parameter && e.parameter.data) {
      data = JSON.parse(e.parameter.data);
    }
    
    console.log('Received data:', data);
    
    // ตรวจสอบ action
    if (data && data.action === 'updateOrder') {
      return updateOrderStatus(data);
    } else {
      // ถือว่าเป็นการสั่งซื้อใหม่
      return saveNewOrder(data || e);
    }
    
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

function updateOrderStatus(data) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    const allData = sheet.getDataRange().getValues();
    
    // หา orders ที่ตรงกับ orderKey
    const [customerName, orderDate] = data.orderKey.split('_');
    
    let updated = false;
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      if (row[1] === customerName && row[0] === orderDate) {
        // อัพเดทสถานะการชำระเงิน (คอลัมน์ F = index 5)
        if (data.paymentStatus) {
          sheet.getRange(i + 1, 6).setValue(data.paymentStatus);
        }
        
        // อัพเดท URL หลักฐาน (คอลัมน์ G = index 6)
        if (data.evidenceUrl) {
          sheet.getRange(i + 1, 7).setValue(data.evidenceUrl);
        }
        
        // อัพเดทหมายเหตุ (คอลัมน์ H = index 7)
        if (data.adminNotes !== undefined) {
          sheet.getRange(i + 1, 8).setValue(data.adminNotes);
        }
        
        updated = true;
      }
    }
    
    if (updated) {
      return ContentService
        .createTextOutput(JSON.stringify({success: true, message: 'อัพเดทสถานะเรียบร้อย'}))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeaders({
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type'
        });
    } else {
      throw new Error('ไม่พบออเดอร์ที่ต้องการอัพเดท');
    }
    
  } catch (error) {
    console.error('Error updating order:', error);
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

function saveNewOrder(e) {
  try {
    console.log('Received request:', e);
    
    let data;
    
    // ตรวจสอบว่าข้อมูลมาจาก form หรือ JSON
    if (e && e.parameter && e.parameter.data) {
      // ข้อมูลมาจาก form submission
      data = JSON.parse(e.parameter.data);
    } else if (e && e.postData && e.postData.contents) {
      // ข้อมูลมาจาก fetch request
      data = JSON.parse(e.postData.contents);
    } else {
      // ถ้าไม่มีข้อมูล ให้สร้างข้อมูลทดสอบ
      data = {
        orderDate: new Date().toLocaleString('th-TH'),
        customerName: 'ทดสอบระบบ',
        items: [{
          shirt: 'Test',
          size: 'M',
          quantity: 1
        }]
      };
    }
    
    console.log('Parsed data:', data);
    
    // เปิด Google Sheets
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    
    // ตรวจสอบว่ามี header แล้วหรือยัง
    if (sheet.getLastRow() === 0) {
      // สร้าง header
      const headers = [
        'วันที่สั่ง',
        'ชื่อผู้สั่ง',
        'แบบเสื้อ',
        'ขนาด',
        'จำนวน',
        'สถานะการชำระ',
        'หลักฐานการชำระ',
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
          'รอชำระเงิน', // สถานะเริ่มต้น
          '', // หลักฐานการชำระ
          '' // หมายเหตุ
        ];
        
        sheet.appendRow(newRow);
      });
    }
    
    console.log('Data saved successfully');
    
    // สำหรับ fetch request - คืน JSON response
    return ContentService
      .createTextOutput(JSON.stringify({success: true, message: 'บันทึกข้อมูลเรียบร้อย'}))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      
  } catch (error) {
    console.error('Error:', error);
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

function uploadSlipToDrive(base64Data, fileName) {
  try {
    // สร้างโฟลเดอร์สำหรับเก็บ slip ถ้ายังไม่มี
    const folders = DriveApp.getFoldersByName('Payment_Slips');
    let folder;
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder('Payment_Slips');
    }
    
    // แปลง base64 เป็นไฟล์
    const base64 = base64Data.split(',')[1]; // ตัด data:image/jpeg;base64, ออก
    const blob = Utilities.newBlob(Utilities.base64Decode(base64), 'image/jpeg', fileName);
    
    // อัพโหลดไฟล์
    const file = folder.createFile(blob);
    
    // ตั้งค่าให้ทุกคนดูได้
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return file.getUrl();
    
  } catch (error) {
    console.error('Upload error:', error);
    return 'Error uploading file';
  }
}

// ฟังก์ชันสำหรับทดสอบและขอสิทธิ์
function testFunction() {
  try {
    // ทดสอบการเข้าถึง Google Sheets
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    console.log('Google Apps Script is working!');
    console.log('Sheet name:', sheet.getName());
    
    // ทดสอบเขียนข้อมูล
    const testData = {
      orderDate: new Date().toLocaleString('th-TH'),
      customerName: 'ทดสอบระบบ',
      items: [{
        shirt: 'Test',
        size: 'M',
        quantity: 1
      }]
    };
    
    // เรียกใช้ฟังก์ชัน doPost เพื่อทดสอบ
    const mockEvent = {
      parameter: {
        data: JSON.stringify(testData)
      }
    };
    
    const result = saveNewOrder(mockEvent);
    console.log('Test result:', result.getContent());
    
    return 'Test completed successfully!';
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
}