// Google Apps Script Code - เวอร์ชันเรียบง่าย
// คัดลอกโค้ดนี้ไปใส่ใน Google Apps Script

// ID ของ Google Sheets ที่ต้องการบันทึกข้อมูล
const SPREADSHEET_ID = '1uyZUQBIDR_BRVJ6-ArBISmpvkvLtKWNiFBWsT3xQgF4';

function doGet(e) {
  try {
    const action = e.parameter.action;
    const callback = e.parameter.callback;
    
    if (action === 'getOrders') {
      const orders = getOrdersData();
      const response = JSON.stringify({success: true, orders: orders});
      
      if (callback) {
        return ContentService
          .createTextOutput(`${callback}(${response})`)
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      } else {
        return ContentService
          .createTextOutput(response)
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    if (action === 'updateOrder') {
      const updateData = {
        action: 'updateOrder',
        orderKey: e.parameter.orderKey,
        paymentStatus: e.parameter.paymentStatus,
        adminNotes: e.parameter.adminNotes,
        evidenceUrl: e.parameter.evidenceUrl
      };
      
      const result = updateOrderStatus(updateData);
      const response = result.getContent();
      
      if (callback) {
        return ContentService
          .createTextOutput(`${callback}(${response})`)
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      } else {
        return result;
      }
    }
    
    const errorResponse = JSON.stringify({success: false, message: 'Invalid action'});
    if (callback) {
      return ContentService
        .createTextOutput(`${callback}(${errorResponse})`)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return ContentService
      .createTextOutput(errorResponse)
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in doGet:', error);
    const errorResponse = JSON.stringify({success: false, message: error.toString()});
    const callback = e.parameter.callback;
    
    if (callback) {
      return ContentService
        .createTextOutput(`${callback}(${errorResponse})`)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return ContentService
      .createTextOutput(errorResponse)
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrdersData() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return [];
    }
    
    const orders = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      orders.push({
        rowIndex: i + 1,
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
    
    return orders;
    
  } catch (error) {
    console.error('Error getting orders:', error);
    return [];
  }
}

function doPost(e) {
  try {
    console.log('doPost called with:', e);
    console.log('postData:', e.postData);
    console.log('parameter:', e.parameter);
    
    let data;
    
    if (e && e.postData && e.postData.contents) {
      console.log('Using postData.contents');
      data = JSON.parse(e.postData.contents);
    } else if (e && e.parameter && e.parameter.data) {
      console.log('Using parameter.data');
      data = JSON.parse(e.parameter.data);
    } else {
      console.log('No data found, using default');
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
    
    console.log('Parsed data:', JSON.stringify(data));
    
    if (data && data.action === 'updateOrder') {
      console.log('Calling updateOrderStatus');
      return updateOrderStatus(data);
    } else {
      console.log('Calling saveNewOrder');
      return saveNewOrder(data || e);
    }
    
  } catch (error) {
    console.error('Error in doPost:', error);
    return ContentService
      .createTextOutput(JSON.stringify({success: false, message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function updateOrderStatus(data) {
  try {
    console.log('Received update data:', JSON.stringify(data));
    
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    const allData = sheet.getDataRange().getValues();
    
    console.log('OrderKey:', data.orderKey);
    const [customerName, orderDate] = data.orderKey.split('_');
    console.log('Looking for:', customerName, orderDate);
    
    let updated = false;
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      console.log(`Row ${i}: ${row[1]} === ${customerName} && ${row[0]} === ${orderDate}`);
      
      if (row[1] === customerName && row[0] === orderDate) {
        console.log('Found matching row, updating...');
        
        if (data.paymentStatus) {
          sheet.getRange(i + 1, 6).setValue(data.paymentStatus);
          console.log('Updated payment status to:', data.paymentStatus);
        }
        if (data.evidenceUrl) {
          sheet.getRange(i + 1, 7).setValue(data.evidenceUrl);
          console.log('Updated evidence URL');
        }
        if (data.adminNotes !== undefined) {
          sheet.getRange(i + 1, 8).setValue(data.adminNotes);
          console.log('Updated admin notes:', data.adminNotes);
        }
        updated = true;
      }
    }
    
    if (updated) {
      console.log('Update successful');
      return ContentService
        .createTextOutput(JSON.stringify({success: true, message: 'อัพเดทสถานะเรียบร้อย'}))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      console.log('No matching rows found');
      throw new Error('ไม่พบออเดอร์ที่ต้องการอัพเดท');
    }
    
  } catch (error) {
    console.error('Error updating order:', error);
    return ContentService
      .createTextOutput(JSON.stringify({success: false, message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function saveNewOrder(e) {
  try {
    let data;
    
    if (e && e.parameter && e.parameter.data) {
      data = JSON.parse(e.parameter.data);
    } else if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
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
    
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    
    if (sheet.getLastRow() === 0) {
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
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error:', error);
    return ContentService
      .createTextOutput(JSON.stringify({success: false, message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}