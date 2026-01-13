// Google Apps Script Web App URL - ใส่ URL ที่ได้จาก Google Apps Script
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw1fPRpw3vhY2sUWNLoV4EN1zhSY7ig_OjE3r4-qm7kQuDizMnDBHwYCENshmsyIY-a/exec';

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('orderForm');
    const submitBtn = document.getElementById('submitBtn');
    const loading = document.getElementById('loading');
    const success = document.getElementById('success');
    const orderSummary = document.getElementById('orderSummary');

    // จัดการ toggle เสื้อ
    document.querySelectorAll('.shirt-toggle').forEach(toggle => {
        toggle.addEventListener('change', function() {
            const shirtCard = this.closest('.shirt-card');
            const shirtOptions = shirtCard.querySelector('.shirt-options');
            
            if (this.checked) {
                shirtCard.classList.add('active');
                shirtOptions.style.display = 'block';
            } else {
                shirtCard.classList.remove('active');
                shirtOptions.style.display = 'none';
                // รีเซ็ตจำนวนทั้งหมด
                shirtCard.querySelectorAll('.quantity-input').forEach(input => {
                    input.value = 0;
                });
            }
            updateOrderSummary();
        });
    });

    // จัดการการเปลี่ยนจำนวน
    document.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('input', updateOrderSummary);
    });

    // อัพเดทสรุปคำสั่งซื้อ
    function updateOrderSummary() {
        const selectedItems = [];
        let totalQuantity = 0;
        
        document.querySelectorAll('.shirt-toggle:checked').forEach(toggle => {
            const shirtType = toggle.dataset.shirt;
            const shirtCard = toggle.closest('.shirt-card');
            
            shirtCard.querySelectorAll('.quantity-input').forEach(input => {
                const quantity = parseInt(input.value) || 0;
                if (quantity > 0) {
                    selectedItems.push({
                        shirt: shirtType,
                        size: input.dataset.size,
                        quantity: quantity
                    });
                    totalQuantity += quantity;
                }
            });
        });

        if (selectedItems.length === 0) {
            orderSummary.innerHTML = '<p>กรุณาเลือกเสื้อที่ต้องการสั่งซื้อ</p>';
        } else {
            let summaryHTML = '<h3>รายการที่เลือก:</h3>';
            selectedItems.forEach(item => {
                summaryHTML += `
                    <div class="order-item">
                        <span class="order-item-info">${item.shirt} ขนาด ${item.size}</span>
                        <span class="order-item-quantity">${item.quantity} ตัว</span>
                    </div>
                `;
            });
            summaryHTML += `<div class="total-quantity"><strong>รวมทั้งหมด: ${totalQuantity} ตัว</strong></div>`;
            orderSummary.innerHTML = summaryHTML;
        }
    }

    // จัดการการส่งฟอร์ม
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // ตรวจสอบว่ามีการเลือกเสื้อหรือไม่
        const selectedItems = getSelectedItems();
        if (selectedItems.length === 0) {
            alert('กรุณาเลือกเสื้อและระบุจำนวนก่อน');
            return;
        }
        
        // แสดง loading
        submitBtn.disabled = true;
        loading.classList.remove('hidden');
        success.classList.add('hidden');

        try {
            // รวบรวมข้อมูลจากฟอร์ม
            const orderData = {
                orderDate: new Date().toLocaleString('th-TH'),
                customerName: document.getElementById('customerName').value,
                items: selectedItems
            };

            // ส่งข้อมูลไป Google Sheets
            const result = await submitToGoogleSheets(orderData);
            
            // ตรวจสอบผลลัพธ์จาก Google Sheets
            if (result && result.success) {
                // แสดงข้อความสำเร็จ
                loading.classList.add('hidden');
                success.classList.remove('hidden');
                
                // แสดง popup สถานะการสั่งซื้อ
                showOrderPopup(orderData, selectedItems);
                
                // รีเซ็ตฟอร์ม
                form.reset();
                document.querySelectorAll('.shirt-card').forEach(card => {
                    card.classList.remove('active');
                    card.querySelector('.shirt-options').style.display = 'none';
                });
                updateOrderSummary();
            } else {
                throw new Error(result?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
            }
            
        } catch (error) {
            console.error('Error:', error);
            alert(`เกิดข้อผิดพลาด: ${error.message}\nกรุณาตรวจสอบการตั้งค่า Google Apps Script`);
            loading.classList.add('hidden');
        } finally {
            submitBtn.disabled = false;
        }
    });

    // รวบรวมรายการที่เลือก
    function getSelectedItems() {
        const selectedItems = [];
        
        document.querySelectorAll('.shirt-toggle:checked').forEach(toggle => {
            const shirtType = toggle.dataset.shirt;
            const shirtCard = toggle.closest('.shirt-card');
            
            shirtCard.querySelectorAll('.quantity-input').forEach(input => {
                const quantity = parseInt(input.value) || 0;
                if (quantity > 0) {
                    selectedItems.push({
                        shirt: shirtType,
                        size: input.dataset.size,
                        quantity: quantity
                    });
                }
            });
        });
        
        return selectedItems;
    }
});

// แสดง popup สถานะการสั่งซื้อ
function showOrderPopup(orderData, selectedItems) {
    let totalQuantity = 0;
    selectedItems.forEach(item => {
        totalQuantity += item.quantity;
    });

    let orderDetailsHTML = `
        <div class="customer-info">
            <h3>ข้อมูลผู้สั่ง</h3>
            <p><strong>ชื่อ:</strong> ${orderData.customerName}</p>
        </div>
        
        <div class="order-date">
            <p>วันที่สั่ง: ${orderData.orderDate}</p>
        </div>
        
        <div class="order-summary-popup">
            <h3>รายการที่สั่งซื้อ</h3>
    `;
    
    selectedItems.forEach(item => {
        orderDetailsHTML += `
            <div class="order-item">
                <span class="order-item-info">${item.shirt} ขนาด ${item.size}</span>
                <span class="order-item-quantity">${item.quantity} ตัว</span>
            </div>
        `;
    });
    
    orderDetailsHTML += `
            <div class="total-quantity">
                <strong>รวมทั้งหมด: ${totalQuantity} ตัว</strong>
            </div>
        </div>
    `;
    
    document.getElementById('orderDetails').innerHTML = orderDetailsHTML;
    document.getElementById('orderPopup').classList.remove('hidden');
}

// ปิด popup
function closeOrderPopup() {
    document.getElementById('orderPopup').classList.add('hidden');
}

// ส่งข้อมูลไป Google Sheets
async function submitToGoogleSheets(orderData) {
    try {
        console.log('Sending data to Google Sheets:', orderData);
        
        // สร้าง hidden iframe สำหรับส่งข้อมูล
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.name = 'hiddenFrame';
        document.body.appendChild(iframe);
        
        // สร้าง form element สำหรับส่งข้อมูล
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = GOOGLE_SCRIPT_URL;
        form.target = 'hiddenFrame';
        
        // สร้าง input สำหรับข้อมูล
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'data';
        input.value = JSON.stringify(orderData);
        
        form.appendChild(input);
        document.body.appendChild(form);
        
        // ส่งฟอร์ม
        form.submit();
        
        // ลบฟอร์มและ iframe ออกหลังจากส่งเสร็จ
        setTimeout(() => {
            document.body.removeChild(form);
            document.body.removeChild(iframe);
        }, 2000);
        
        // รอสักครู่แล้วถือว่าสำเร็จ
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return { success: true, message: 'บันทึกข้อมูลเรียบร้อย' };
        
    } catch (error) {
        console.error('Error submitting to Google Sheets:', error);
        throw error;
    }
}