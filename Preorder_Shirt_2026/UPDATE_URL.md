# วิธีอัพเดท URL หลัง Deploy ใหม่

## ไฟล์ที่ต้องแก้ไข:

### 1. admin-script.js (บรรทัดที่ 2)
```javascript
const GOOGLE_SCRIPT_URL = 'URL_ใหม่_ที่_ได้_จาก_Deploy';
```

### 2. script.js (บรรทัดที่ 2)  
```javascript
const GOOGLE_SCRIPT_URL = 'URL_ใหม่_ที่_ได้_จาก_Deploy';
```

## ตัวอย่าง URL:
```
https://script.google.com/macros/s/AKfycby.../exec
```

## หลังแก้ไขแล้ว:
1. บันทึกไฟล์
2. รีเฟรชหน้า admin.html
3. ทดสอบว่าโหลดข้อมูลได้หรือไม่
