// Google Apps Script Web App URL - ใช้ URL เดียวกับหน้าลูกค้า
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxIkhTBHKVJ4wYLcgX4F0rMVWw30Ecm9bkMTA1COdDQY1IZB6EbBBoG6dUTXdUw4Exw/exec';

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
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getOrders`, {
            method: 'GET',
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
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
        container.innerHTML = `
            <div class="error">
                <h3>เกิดข้อผิดพลาดในการโหลดข้อมูล</h3>
                <p>${error.message}</p>
                <button onclick="loadOrders()" class="refresh-btn">ลองใหม่</button>
            </div>
        `;
    } finally {
        loading.style.display = 'none';
    }
}

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
        
        if (firstOrder.evidenceUrl && firstOrder.evidenceUrl.trim() !== '') {
            html += `
                <span class="evidence-text">
                    📎 ${firstOrder.evidenceUrl}
                </span>
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

function updateStats() {
    const total = allOrders.length;
    const pending = allOrders.filter(order => !order.paymentStatus || order.paymentStatus === 'รอชำระเงิน').length;
    const paid = allOrders.filter(order => order.paymentStatus === 'ชำระแล้ว').length;
    
    let totalQuantity = 0;
    const shirtStats = {};
    
    allOrders.forEach(order => {
        const quantity = parseInt(order.quantity) || 0;
        totalQuantity += quantity;
        
        if (!shirtStats[order.shirtType]) {
            shirtStats[order.shirtType] = 0;
        }
        shirtStats[order.shirtType] += quantity;
    });
    
    document.getElementById('totalOrders').textContent = total;
    document.getElementById('pendingOrders').textContent = pending;
    document.getElementById('paidOrders').textContent = paid;
    document.getElementById('totalQuantity').textContent = `${totalQuantity} ตัว`;
    
    const shirtStatsContainer = document.getElementById('shirtStats');
    let shirtStatsHTML = '';
    
    Object.keys(shirtStats).sort().forEach(shirtType => {
        shirtStatsHTML += `
            <div class="shirt-stat-card">
                <h4>${shirtType}</h4>
                <span class="shirt-quantity">${shirtStats[shirtType]} ตัว</span>
            </div>
        `;
    });
    
    if (shirtStatsHTML === '') {
        shirtStatsHTML = '<p>ยังไม่มีข้อมูลการสั่งซื้อ</p>';
    }
    
    shirtStatsContainer.innerHTML = shirtStatsHTML;
}

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
        orderInfoHTML += `<div>• ${order.shirtType} ขนาด ${order.size} จำนวน ${order.quantity} ตัว</div>`;
    });
    
    orderInfo.innerHTML = orderInfoHTML;
    
    document.getElementById('paymentStatus').value = firstOrder.paymentStatus || 'รอชำระเงิน';
    document.getElementById('adminNotes').value = firstOrder.adminNotes || '';
    
    const currentEvidence = document.getElementById('currentEvidence');
    if (firstOrder.evidenceUrl && firstOrder.evidenceUrl.trim() !== '') {
        currentEvidence.innerHTML = `<p>หลักฐานปัจจุบัน: ${firstOrder.evidenceUrl}</p>`;
    } else {
        currentEvidence.innerHTML = '<p>ยังไม่มีหลักฐาน</p>';
    }
    
    document.getElementById('updateModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('updateModal').classList.add('hidden');
    currentOrderId = null;
}

async function saveOrderUpdate() {
    if (!currentOrderId) return;
    
    const paymentStatus = document.getElementById('paymentStatus').value;
    const adminNotes = document.getElementById('adminNotes').value;
    const evidenceFile = document.getElementById('evidenceFile').files[0];
    
    const firstOrder = allOrders.find(order => 
        `${order.customerName}_${order.orderDate}` === currentOrderId
    );
    
    if (!firstOrder) {
        alert('ไม่พบข้อมูลออเดอร์');
        return;
    }
    
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'กำลังบันทึก...';
    
    try {
        let evidenceUrl = '';
        
        if (evidenceFile) {
            evidenceUrl = `ไฟล์หลักฐาน: ${evidenceFile.name} (${(evidenceFile.size/1024).toFixed(1)} KB)`;
        }
        
        const params = {
            action: 'updateOrder',
            customerName: firstOrder.customerName,
            paymentStatus: paymentStatus,
            adminNotes: adminNotes || '',
            evidenceUrl: evidenceUrl
        };
        
        const url = `${GOOGLE_SCRIPT_URL}?${new URLSearchParams(params).toString()}`;
        
        const response = await fetch(url, {
            method: 'GET'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('อัพเดทสถานะเรียบร้อย');
            closeModal();
            loadOrders();
        } else {
            throw new Error(result.message || 'เกิดข้อผิดพลาด');
        }
        
    } catch (error) {
        console.error('Error updating order:', error);
        alert(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 บันทึก';
    }
}

function getStatusClass(status) {
    switch (status) {
        case 'ชำระแล้ว': return 'paid';
        case 'ยกเลิก': return 'cancelled';
        default: return 'pending';
    }
}