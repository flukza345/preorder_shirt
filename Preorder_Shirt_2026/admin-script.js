// Google Apps Script Web App URL - ใช้ URL เดียวกับหน้าลูกค้า
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzX1FN8SmjPB7MzFmd20Tm-eRHqWRfwrsu_UmBXlG_yZ_udQvUrAUS9YdQn53qsEWRR/exec';

let allOrders = [];
let currentOrderId = null;
let currentEditIndex = null;

const shirtTypeMap = {
    'Corp': 'ครอป',
    'Klam': 'เสื้อกล้าม',
    'Kud': 'แขนกุด',
    'Tshirt': 'แขนสั้น'
};

function getShirtTypeName(type) {
    return shirtTypeMap[type] || type;
}

document.addEventListener('DOMContentLoaded', function() {
    loadOrders();
    
    // Event listeners
    document.getElementById('refreshBtn').addEventListener('click', loadOrders);
    document.getElementById('reportBtn').addEventListener('click', generateReport);
    document.getElementById('statusFilter').addEventListener('change', filterOrders);
    document.getElementById('searchCustomer').addEventListener('input', filterOrders);
    document.getElementById('saveBtn').addEventListener('click', saveOrderUpdate);
    document.getElementById('saveEditBtn').addEventListener('click', saveItemEdit);
});

// โหลดข้อมูลออเดอร์
async function loadOrders() {
    const loading = document.getElementById('loading');
    const container = document.getElementById('ordersContainer');
    
    loading.style.display = 'block';
    container.innerHTML = '';
    
    try {
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
        orderGroup.forEach((order, index) => {
            html += `
                <div class="order-item">
                    <span>${getShirtTypeName(order.shirtType)} ขนาด ${order.size}</span>
                    <span>${order.quantity} ตัว</span>
                    <button class="edit-item-btn" onclick="openEditModal('${key}', ${index})">✏️</button>
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
                            📝 อัพเดทสถานเ
                        </button>
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
    const totalQuantity = allOrders.reduce((sum, order) => sum + parseInt(order.quantity), 0);
    
    document.getElementById('totalOrders').textContent = total;
    document.getElementById('pendingOrders').textContent = pending;
    document.getElementById('paidOrders').textContent = paid;
    document.getElementById('totalQuantity').textContent = `${totalQuantity} ตัว`;
    
    // สรุปยอดแต่ละแบบ
    const shirtSummary = {};
    allOrders.forEach(order => {
        const typeName = getShirtTypeName(order.shirtType);
        if (!shirtSummary[typeName]) {
            shirtSummary[typeName] = 0;
        }
        shirtSummary[typeName] += parseInt(order.quantity);
    });
    
    const shirtStatsContainer = document.getElementById('shirtStats');
    let statsHTML = '';
    Object.keys(shirtSummary).sort().forEach(type => {
        statsHTML += `
            <div class="shirt-stat-card">
                <h4>${type}</h4>
                <div class="shirt-quantity">${shirtSummary[type]} ตัว</div>
            </div>
        `;
    });
    shirtStatsContainer.innerHTML = statsHTML;
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
    const firstOrder = allOrders.find(order => 
        `${order.customerName}_${order.orderDate}` === orderKey
    );
    
    if (!firstOrder) return;
    
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
        orderInfoHTML += `<div>• ${getShirtTypeName(order.shirtType)} ขนาด ${order.size} จำนวน ${order.quantity} ตัว</div>`;
    });
    
    orderInfo.innerHTML = orderInfoHTML;
    
    document.getElementById('paymentStatus').value = firstOrder.paymentStatus || 'รอชำระเงิน';
    document.getElementById('adminNotes').value = firstOrder.adminNotes || '';
    
    document.getElementById('updateModal').classList.remove('hidden');
}

// ปิด Modal
function closeModal() {
    document.getElementById('updateModal').classList.add('hidden');
    currentOrderId = null;
}

// เปิด Modal แก้ไข
function openEditModal(orderKey, itemIndex) {
    currentOrderId = orderKey;
    currentEditIndex = itemIndex;
    
    const relatedOrders = allOrders.filter(order => 
        `${order.customerName}_${order.orderDate}` === orderKey
    );
    
    const item = relatedOrders[itemIndex];
    if (!item) return;
    
    document.getElementById('editSize').value = item.size;
    document.getElementById('editQuantity').value = item.quantity;
    
    document.getElementById('editModal').classList.remove('hidden');
}

// ปิด Modal แก้ไข
function closeEditModal() {
    document.getElementById('editModal').classList.add('hidden');
    currentOrderId = null;
    currentEditIndex = null;
}

// บันทึกการแก้ไข
async function saveItemEdit() {
    if (currentOrderId === null || currentEditIndex === null) return;
    
    const newSize = document.getElementById('editSize').value;
    const newQuantity = parseInt(document.getElementById('editQuantity').value);
    
    if (newQuantity < 1) {
        alert('จำนวนต้องมากกว่า 0');
        return;
    }
    
    const saveBtn = document.getElementById('saveEditBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'กำลังบันทึก...';
    
    try {
        const updateData = {
            action: 'updateOrderItem',
            orderKey: currentOrderId,
            itemIndex: currentEditIndex,
            newSize: newSize,
            newQuantity: newQuantity
        };
        
        const formData = new FormData();
        formData.append('data', JSON.stringify(updateData));
        
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('แก้ไขเรียบร้อย');
            closeEditModal();
            loadOrders();
        } else {
            throw new Error(result.message || 'เกิดข้อผิดพลาดในการแก้ไข');
        }
        
    } catch (error) {
        console.error('Error updating item:', error);
        alert(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 บันทึก';
    }
}

// บันทึกการอัพเดท
async function saveOrderUpdate() {
    if (!currentOrderId) return;
    
    const paymentStatus = document.getElementById('paymentStatus').value;
    const adminNotes = document.getElementById('adminNotes').value;
    
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
            loadOrders();
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

// ได้ class สำหรับสถานะ
function getStatusClass(status) {
    switch (status) {
        case 'ชำระแล้ว': return 'paid';
        case 'ยกเลิก': return 'cancelled';
        default: return 'pending';
    }
}

// สร้างรายงาน
function generateReport() {
    const summary = {};
    const notesMap = new Map();
    const typeTotal = {};
    
    allOrders.forEach(order => {
        const typeName = getShirtTypeName(order.shirtType);
        const key = `${typeName}_${order.size}`;
        const qty = parseInt(order.quantity);
        
        if (!summary[key]) {
            summary[key] = {
                shirtType: typeName,
                size: order.size,
                quantity: 0
            };
        }
        summary[key].quantity += qty;
        
        if (!typeTotal[typeName]) {
            typeTotal[typeName] = 0;
        }
        typeTotal[typeName] += qty;
        
        if (order.adminNotes && !notesMap.has(order.customerName)) {
            notesMap.set(order.customerName, order.adminNotes);
        }
    });
    
    const sortedSummary = Object.values(summary).sort((a, b) => {
        if (a.shirtType !== b.shirtType) {
            return a.shirtType.localeCompare(b.shirtType, 'th');
        }
        const sizeOrder = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
        return sizeOrder.indexOf(a.size) - sizeOrder.indexOf(b.size);
    });
    
    const totalQuantity = allOrders.reduce((sum, o) => sum + parseInt(o.quantity), 0);
    
    let html = '<div class="report-summary">';
    html += '<h3>สรุปยอดรวม</h3>';
    html += `<p>ออเดอร์ทั้งหมด: ${allOrders.length} รายการ</p>`;
    html += `<p>จำนวนเสื้อทั้งหมด: ${totalQuantity} ตัว</p>`;
    html += '</div>';
    
    html += '<table class="report-table">';
    html += '<thead><tr><th>ประเภทเสื้อ</th><th>ไซส์</th><th>จำนวน (ตัว)</th></tr></thead>';
    html += '<tbody>';
    
    let currentType = '';
    sortedSummary.forEach(item => {
        if (currentType !== item.shirtType) {
            if (currentType !== '') {
                html += `<tr style="background: #e8f4f8; font-weight: bold;"><td colspan="2">รวม ${currentType}</td><td>${typeTotal[currentType]}</td></tr>`;
            }
            currentType = item.shirtType;
        }
        html += `<tr><td>${item.shirtType}</td><td>${item.size}</td><td>${item.quantity}</td></tr>`;
    });
    
    if (currentType !== '') {
        html += `<tr style="background: #e8f4f8; font-weight: bold;"><td colspan="2">รวม ${currentType}</td><td>${typeTotal[currentType]}</td></tr>`;
    }
    
    html += `<tr style="background: #2c3e50; color: white; font-weight: bold;"><td colspan="2">รวมทั้งหมด</td><td>${totalQuantity}</td></tr>`;
    html += '</tbody></table>';
    
    if (notesMap.size > 0) {
        html += '<div class="report-summary">';
        html += '<h3>หมายเหตุ</h3>';
        notesMap.forEach((note) => {
            html += `<p>${note}</p>`;
        });
        html += '</div>';
    }
    
    document.getElementById('reportContent').innerHTML = html;
    document.getElementById('reportModal').classList.remove('hidden');
}

// ปิด Modal รายงาน
function closeReportModal() {
    document.getElementById('reportModal').classList.add('hidden');
}

// Export รายงานเป็นรูปภาพ
async function exportReport() {
    const reportContent = document.getElementById('reportContent');
    const button = event.target;
    button.disabled = true;
    button.textContent = 'กำลัง Export...';
    
    try {
        const canvas = await html2canvas(reportContent, {
            backgroundColor: '#ffffff',
            scale: 2
        });
        
        canvas.toBlob(function(blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `รายงานสรุปการสั่งซื้อ_${new Date().toLocaleDateString('th-TH')}.png`;
            a.click();
            URL.revokeObjectURL(url);
        });
    } catch (error) {
        console.error('Error exporting report:', error);
        alert('เกิดข้อผิดพลาดในการ export รายงาน');
    } finally {
        button.disabled = false;
        button.textContent = '💾 Export รายงาน';
    }
}
