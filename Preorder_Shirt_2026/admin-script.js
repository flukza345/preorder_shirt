// Google Apps Script Web App URL - ใช้ URL เดียวกับหน้าลูกค้า
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwAWYlNA8wGMcDoM6Kj-iGIb1rxmblaeT4Z65FHUFTByaLMnV7BFR_mQhHKA4Lr5cMu/exec';

let allOrders = [];
let currentOrderId = null;

document.addEventListener('DOMContentLoaded', function() {
    loadOrders();
    
    // Event listeners
    document.getElementById('refreshBtn').addEventListener('click', loadOrders);
    document.getElementById('statusFilter').addEventListener('change', filterOrders);
    document.getElementById('searchCustomer').addEventListener('input', filterOrders);
    document.getElementById('saveBtn').addEventListener('click', saveOrderUpdate);
});

// โหลดข้อมูลออเดอร์
async function loadOrders() {
    const loading = document.getElementById('loading');
    const container = document.getElementById('ordersContainer');
    
    loading.style.display = 'block';
    container.innerHTML = '';
    
    try {
        // เรียกข้อมูลจาก Google Sheets
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getOrders`);
        const data = await response.json();
        
        if (data.success) {
            allOrders = data.orders || [];
            displayOrders(allOrders);
            updateStats();
        } else {
            throw new Error(data.message || 'ไม่สามารถโหลดข้อมูลได้');
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        container.innerHTML = `<div class="error">เกิดข้อผิดพลาด: ${error.message}</div>`;
    } finally {
        loading.style.display = 'none';
    }
}

// แสดงรายการออเดอร์
function displayOrders(orders) {
    const container = document.getElementById('ordersContainer');
    
    if (orders.length === 0) {
        container.innerHTML = '<div class="no-orders">ไม่มีข้อมูลออเดอร์</div>';
        return;
    }
    
    // จัดกลุ่มออเดอร์ตามลูกค้าและวันที่
    const groupedOrders = groupOrdersByCustomer(orders);
    
    let html = '';
    Object.keys(groupedOrders).forEach(key => {
        const orderGroup = groupedOrders[key];
        const firstOrder = orderGroup[0];
        
        html += `
            <div class="order-card">
                <div class="order-header">
                    <div class="order-info">
                        <h3>${firstOrder.customerName}</h3>
                        <div class="order-date">วันที่สั่ง: ${firstOrder.orderDate}</div>
                    </div>
                    <div class="status-badge status-${getStatusClass(firstOrder.paymentStatus || 'รอชำระเงิน')}">
                        ${firstOrder.paymentStatus || 'รอชำระเงิน'}
                    </div>
                </div>
                <div class="order-body">
                    <div class="order-items">
                        <h4>รายการสินค้า:</h4>
        `;
        
        let totalQuantity = 0;
        orderGroup.forEach(order => {
            html += `
                <div class="order-item">
                    <span>${order.shirtType} ขนาด ${order.size}</span>
                    <span>${order.quantity} ตัว</span>
                </div>
            `;
            totalQuantity += parseInt(order.quantity);
        });
        
        html += `
                        <div class="order-item" style="font-weight: bold; border-top: 2px solid #ddd; margin-top: 10px; padding-top: 10px;">
                            <span>รวมทั้งหมด</span>
                            <span>${totalQuantity} ตัว</span>
                        </div>
                    </div>
        `;
        
        // แสดงหมายเหตุถ้ามี
        if (firstOrder.adminNotes) {
            html += `
                <div class="admin-notes">
                    <strong>หมายเหตุ:</strong> ${firstOrder.adminNotes}
                </div>
            `;
        }
        
        html += `
                    <div class="order-actions">
                        <button class="update-btn" onclick="openUpdateModal('${key}')">
                            📝 อัพเดทสถานะ
                        </button>
        `;
        
        // แสดงลิงก์หลักฐานถ้ามี
        if (firstOrder.evidenceUrl) {
            html += `
                <a href="${firstOrder.evidenceUrl}" target="_blank" class="evidence-link">
                    📎 ดูหลักฐาน
                </a>
            `;
        }
        
        html += `
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// จัดกลุ่มออเดอร์ตามลูกค้าและวันที่
function groupOrdersByCustomer(orders) {
    const grouped = {};
    
    orders.forEach(order => {
        const key = `${order.customerName}_${order.orderDate}`;
        if (!grouped[key]) {
            grouped[key] = [];
        }
        grouped[key].push(order);
    });
    
    return grouped;
}

// อัพเดทสถิติ
function updateStats() {
    const total = allOrders.length;
    const pending = allOrders.filter(order => !order.paymentStatus || order.paymentStatus === 'รอชำระเงิน').length;
    const paid = allOrders.filter(order => order.paymentStatus === 'ชำระแล้ว').length;
    
    document.getElementById('totalOrders').textContent = total;
    document.getElementById('pendingOrders').textContent = pending;
    document.getElementById('paidOrders').textContent = paid;
}

// กรองออเดอร์
function filterOrders() {
    const statusFilter = document.getElementById('statusFilter').value;
    const searchText = document.getElementById('searchCustomer').value.toLowerCase();
    
    let filtered = allOrders;
    
    if (statusFilter) {
        filtered = filtered.filter(order => 
            (order.paymentStatus || 'รอชำระเงิน') === statusFilter
        );
    }
    
    if (searchText) {
        filtered = filtered.filter(order => 
            order.customerName.toLowerCase().includes(searchText)
        );
    }
    
    displayOrders(filtered);
}

// เปิด Modal อัพเดท
function openUpdateModal(orderKey) {
    currentOrderId = orderKey;
    const orderGroup = Object.values(groupOrdersByCustomer(allOrders))[0];
    const firstOrder = allOrders.find(order => 
        `${order.customerName}_${order.orderDate}` === orderKey
    );
    
    if (!firstOrder) return;
    
    // แสดงข้อมูลออเดอร์
    const orderInfo = document.getElementById('modalOrderInfo');
    const relatedOrders = allOrders.filter(order => 
        `${order.customerName}_${order.orderDate}` === orderKey
    );
    
    let orderInfoHTML = `
        <p><strong>ลูกค้า:</strong> ${firstOrder.customerName}</p>
        <p><strong>วันที่สั่ง:</strong> ${firstOrder.orderDate}</p>
        <div style="margin-top: 10px;"><strong>รายการ:</strong></div>
    `;
    
    relatedOrders.forEach(order => {
        orderInfoHTML += `<div>• ${order.shirtType} ขนาด ${order.size} จำนวน ${order.quantity} ตัว</div>`;
    });
    
    orderInfo.innerHTML = orderInfoHTML;
    
    // ตั้งค่าสถานะปัจจุบัน
    document.getElementById('paymentStatus').value = firstOrder.paymentStatus || 'รอชำระเงิน';
    document.getElementById('adminNotes').value = firstOrder.adminNotes || '';
    
    // แสดงหลักฐานปัจจุบัน
    const currentEvidence = document.getElementById('currentEvidence');
    if (firstOrder.evidenceUrl) {
        currentEvidence.innerHTML = `
            <p>หลักฐานปัจจุบัน:</p>
            <a href="${firstOrder.evidenceUrl}" target="_blank">ดูหลักฐาน</a>
        `;
    } else {
        currentEvidence.innerHTML = '<p>ยังไม่มีหลักฐาน</p>';
    }
    
    document.getElementById('updateModal').classList.remove('hidden');
}

// ปิด Modal
function closeModal() {
    document.getElementById('updateModal').classList.add('hidden');
    currentOrderId = null;
}

// บันทึกการอัพเดท
async function saveOrderUpdate() {
    if (!currentOrderId) return;
    
    const paymentStatus = document.getElementById('paymentStatus').value;
    const adminNotes = document.getElementById('adminNotes').value;
    const evidenceFile = document.getElementById('evidenceFile').files[0];
    
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'กำลังบันทึก...';
    
    try {
        const updateData = {
            action: 'updateOrder',
            orderKey: currentOrderId,
            paymentStatus: paymentStatus,
            adminNotes: adminNotes
        };
        
        // ถ้ามีไฟล์หลักฐาน ให้อัพโหลดก่อน
        if (evidenceFile) {
            const evidenceUrl = await uploadEvidence(evidenceFile);
            updateData.evidenceUrl = evidenceUrl;
        }
        
        // ส่งข้อมูลอัพเดทแบบ form data
        const formData = new FormData();
        formData.append('data', JSON.stringify(updateData));
        
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('อัพเดทสถานะเรียบร้อย');
            closeModal();
            loadOrders(); // โหลดข้อมูลใหม่
        } else {
            throw new Error(result.message || 'เกิดข้อผิดพลาดในการอัพเดท');
        }
        
    } catch (error) {
        console.error('Error updating order:', error);
        alert(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 บันทึก';
    }
}

// อัพโหลดหลักฐาน
async function uploadEvidence(file) {
    // สำหรับตัวอย่างนี้ จะใช้ base64 encoding
    // ในการใช้งานจริง ควรอัพโหลดไป Google Drive
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            // ในที่นี้จะ return base64 string
            // ในการใช้งานจริงควรส่งไปยัง Google Drive และ return URL
            resolve(e.target.result);
        };
        reader.readAsDataURL(file);
    });
}

// ได้ class สำหรับสถานะ
function getStatusClass(status) {
    switch (status) {
        case 'ชำระแล้ว': return 'paid';
        case 'ยกเลิก': return 'cancelled';
        default: return 'pending';
    }
}Orders(); // โหลดข้อมูลใหม่
        } else {
            throw new Error(result.message || 'เกิดข้อผิดพลาดในการอัพเดท');
        }
        
    } catch (error) {
        console.error('Error updating order:', error);
        alert(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 บันทึก';
    }
}ดข้อมูลใหม่
        } else {
            throw new Error(result.message || 'เกิดข้อผิดพลาดในการอัพเดท');
        }
        
    } catch (error) {
        console.error('Error updating order:', error);
        alert(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 บันทึก';
    }
}

// อัพโหลดหลักฐาน
async function uploadEvidence(file) {
    // สำหรับตัวอย่างนี้ จะใช้ base64 encoding
    // ในการใช้งานจริง ควรอัพโหลดไป Google Drive
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            // ในที่นี้จะ return base64 string
            // ในการใช้งานจริงควรส่งไปยัง Google Drive และ return URL
            resolve(e.target.result);
        };
        reader.readAsDataURL(file);
    });
}

// ได้ class สำหรับสถานะ
function getStatusClass(status) {
    switch (status) {
        case 'ชำระแล้ว': return 'paid';
        case 'ยกเลิก': return 'cancelled';
        default: return 'pending';
    }
}