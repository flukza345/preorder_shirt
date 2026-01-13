# คำแนะนำการตั้งค่า Application สั่งซื้อเสื้อ

## ขั้นตอนการตั้งค่า Google Sheets และ Google Apps Script

### 1. สร้าง Google Sheets
1. ไปที่ [Google Sheets](https://sheets.google.com)
2. สร้าง Spreadsheet ใหม่
3. ตั้งชื่อว่า "Pre-order Shirt 2026"
4. คัดลอก ID ของ Spreadsheet จาก URL (ส่วนที่อยู่ระหว่าง /d/ และ /edit)

### 2. สร้าง Google Apps Script
1. ไปที่ [Google Apps Script](https://script.google.com)
2. สร้างโปรเจคใหม่
3. ลบโค้ดเดิมทั้งหมด
4. คัดลอกโค้ดจากไฟล์ `google-apps-script.js` ไปวาง
5. แก้ไข `SPREADSHEET_ID` ให้เป็น ID ของ Spreadsheet ที่สร้างไว้
6. บันทึกโปรเจค

### 3. Deploy Web App
1. ใน Google Apps Script คลิก "Deploy" > "New deployment"
2. เลือก Type เป็น "Web app"
3. ตั้งค่า:
   - Execute as: Me
   - Who has access: Anyone
4. คลิก "Deploy"
5. คัดลอก URL ที่ได้

### 4. อัพเดท JavaScript
1. เปิดไฟล์ `script.js`
2. แก้ไข `GOOGLE_SCRIPT_URL` ให้เป็น URL ที่ได้จากขั้นตอนที่ 3

## การใช้งาน

### ฟีเจอร์ที่มี:
- ✅ เลือกแบบเสื้อได้หลายแบบในคำสั่งซื้อเดียว (4 แบบ)
- ✅ เลือกขนาดและจำนวนแยกกันสำหรับแต่ละแบบเสื้อ พร้อมรายละเอียดรอบอก
- ✅ แสดงสรุปคำสั่งซื้อแบบ real-time
- ✅ กรอกข้อมูลผู้สั่ง (ชื่อ)
- ✅ บันทึกข้อมูลลง Google Sheets (แต่ละรายการเสื้อจะเป็นแถวแยกกัน)

### ข้อมูลที่บันทึกใน Google Sheets:
1. วันที่สั่ง
2. ชื่อผู้สั่ง
3. แบบเสื้อ
4. ขนาด (พร้อมรอบอก)
5. จำนวน

**หมายเหตุ:** ถ้าลูกค้าสั่งซื้อหลายแบบในคำสั่งซื้อเดียว แต่ละแบบเสื้อจะถูกบันทึกเป็นแถวแยกกัน

## การเปิดใช้งาน
1. เปิดไฟล์ `index.html` ในเบราว์เซอร์
2. หรือใช้ Live Server ใน VS Code

## หมายเหตุ
- รูปเสื้อจะโหลดจากโฟลเดอร์ `Image/`
- ไฟล์ slip จะถูกอัพโหลดไป Google Drive อัตโนมัติ
- ข้อมูลจะบันทึกลง Google Sheets แบบ real-time