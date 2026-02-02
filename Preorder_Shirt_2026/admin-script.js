// Google Apps Script Web App URL - ใช้ URL เดียวกับหน้าลูกค้า
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzs8MW86F5nI-zW_nmvmirZJaf2bzcG2dFUqCpWMulFidyYscbiHEtv2hePn4NqcBUV/exec';

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
    document.getElementById('receivedFilter').addEventListener('change', filterOrders);
    document.getElementById('searchCustomer').addEventListener('input', filterOrders);
    document.getElementById('saveBtn').addEventListener('click', saveOrderUpdate);
    document.getElementById('saveEditBtn').addEventListener('click', saveItemEdit);
});

// โหลดข้อมูลออเดอร์ด้วย JSONP เพื่อหลีกเลี่ยง CORS
async function loadOrders() {
    const loading = document.getElementById('loading');
    const container = document.getElementById('ordersContainer');
    
    loading.style.display = 'block';
    container.innerHTML = '';
    
    try {
        // ใช้ JSONP แทน fetch เพื่อหลีกเลี่ยง CORS
        const data = await new Promise((resolve, reject) => {
            const callbackName = 'jsonpCallback_' + Date.now();
            const script = document.createElement('script');
            
            window[callbackName] = function(data) {
                delete window[callbackName];
                document.body.removeChild(script);
                resolve(data);
            };
            
            script.onerror = function() {
                delete window[callbackName];
                document.body.removeChild(script);
                reject(new Error('Failed to load data'));
            };
            
            script.src = `${GOOGLE_SCRIPT_URL}?action=getOrders&callback=${callbackName}`;
            document.body.appendChild(script);
            
            // Timeout after 30 seconds
            setTimeout(() => {
                if (window[callbackName]) {
                    delete window[callbackName];
                    document.body.removeChild(script);
                    reject(new Error('Request timeout'));
                }
            }, 30000);
        });
        
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
        
        // Debug: ดูค่า receivedStatus
        console.log('Order:', firstOrder.customerName, 'receivedStatus:', firstOrder.receivedStatus);
        
        html += `
            <div class="order-card">
                <div class="order-header">
                    <div class="order-info">
                        <h3>${firstOrder.customerName}</h3>
                        <div class="order-date">วันที่สั่ง: ${firstOrder.orderDate}</div>
                    </div>
                    <div>
                        <div class="status-badge status-${getStatusClass(firstOrder.paymentStatus || 'รอชำระเงิน')}">
                            ${firstOrder.paymentStatus || 'รอชำระเงิน'}
                        </div>
                        ${firstOrder.receivedStatus && firstOrder.receivedStatus !== 'ยังไม่รับ' ? '<div class="status-badge" style="background: #27ae60; margin-top: 5px;">✓ รับเสื้อแล้ว</div>' : ''}
                    </div>
                </div>
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
    const received = allOrders.filter(order => order.receivedStatus && order.receivedStatus !== 'ยังไม่รับ').length;
    const totalQuantity = allOrders.reduce((sum, order) => sum + parseInt(order.quantity), 0);
    
    document.getElementById('totalOrders').textContent = total;
    document.getElementById('pendingOrders').textContent = pending;
    document.getElementById('paidOrders').textContent = paid;
    document.getElementById('receivedOrders').textContent = received;
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
    const receivedFilter = document.getElementById('receivedFilter').value;
    const searchText = document.getElementById('searchCustomer').value.toLowerCase();
    
    let filtered = allOrders;
    
    if (statusFilter) {
        filtered = filtered.filter(order => 
            (order.paymentStatus || 'รอชำระเงิน') === statusFilter
        );
    }
    
    if (receivedFilter) {
        if (receivedFilter === 'รับแล้ว') {
            filtered = filtered.filter(order => 
                order.receivedStatus && order.receivedStatus !== 'ยังไม่รับ'
            );
        } else if (receivedFilter === 'ยังไม่รับ') {
            filtered = filtered.filter(order => 
                !order.receivedStatus || order.receivedStatus === 'ยังไม่รับ'
            );
        }
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
    
    const receivedCheckbox = document.getElementById('receivedStatus');
    const receivedLabel = document.getElementById('receivedLabel');
    const isReceived = firstOrder.receivedStatus && firstOrder.receivedStatus !== 'ยังไม่รับ';
    
    receivedCheckbox.checked = isReceived;
    receivedLabel.textContent = isReceived ? '✓ รับเสื้อแล้ว' : 'รับเสื้อแล้ว';
    
    // อัพเดท label เมื่อคลิก checkbox
    receivedCheckbox.addEventListener('change', function() {
        receivedLabel.textContent = this.checked ? '✓ รับเสื้อแล้ว' : 'รับเสื้อแล้ว';
    });
    
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

// บันทึกการอัพเดท (ใช้ JSONP)
async function saveOrderUpdate() {
    if (!currentOrderId) return;
    
    const paymentStatus = document.getElementById('paymentStatus').value;
    const receivedStatus = document.getElementById('receivedStatus').checked ? 'รับแล้ว' : 'ยังไม่รับ';
    const adminNotes = document.getElementById('adminNotes').value;
    
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'กำลังบันทึก...';
    
    try {
        // หา order ที่ตรงกับ currentOrderId
        const firstOrder = allOrders.find(order => 
            `${order.customerName}_${order.orderDate}` === currentOrderId
        );
        
        if (!firstOrder) {
            throw new Error('ไม่พบข้อมูลออเดอร์');
        }
        
        const customerName = firstOrder.customerName;
        const orderDate = firstOrder.orderDate;
        
        console.log('Updating:', { customerName, orderDate, paymentStatus, receivedStatus });
        
        const data = await new Promise((resolve, reject) => {
            const callbackName = 'jsonpCallback_' + Date.now();
            const script = document.createElement('script');
            
            window[callbackName] = function(data) {
                delete window[callbackName];
                document.body.removeChild(script);
                resolve(data);
            };
            
            script.onerror = function() {
                delete window[callbackName];
                document.body.removeChild(script);
                reject(new Error('Failed to update'));
            };
            
            const params = new URLSearchParams({
                action: 'updateOrder',
                customerName: customerName,
                orderDate: orderDate,
                paymentStatus: paymentStatus,
                receivedStatus: receivedStatus,
                adminNotes: adminNotes,
                callback: callbackName
            });
            
            script.src = `${GOOGLE_SCRIPT_URL}?${params.toString()}`;
            document.body.appendChild(script);
            
            setTimeout(() => {
                if (window[callbackName]) {
                    delete window[callbackName];
                    document.body.removeChild(script);
                    reject(new Error('Request timeout'));
                }
            }, 30000);
        });
        
        if (data.success) {
            alert('อัพเดทสถานะเรียบร้อย');
            closeModal();
            loadOrders();
        } else {
            throw new Error(data.message || 'เกิดข้อผิดพลาดในการอัพเดท');
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
    const allSizes = new Set();
    
    allOrders.forEach(order => {
        const typeName = getShirtTypeName(order.shirtType);
        const size = order.size;
        const key = `${typeName}_${size}`;
        const qty = parseInt(order.quantity);
        
        allSizes.add(size);
        
        if (!summary[key]) {
            summary[key] = {
                shirtType: typeName,
                size: size,
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
    
    const sizeOrder = Array.from(allSizes).sort((a, b) => {
        const order = ['2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];
        const aIndex = order.indexOf(a.toUpperCase());
        const bIndex = order.indexOf(b.toUpperCase());
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.localeCompare(b);
    });
    
    const sortedTypes = Object.keys(typeTotal).sort((a, b) => a.localeCompare(b, 'th'));
    const totalQuantity = allOrders.reduce((sum, o) => sum + parseInt(o.quantity), 0);
    
    let html = '<div class="report-summary">';
    html += '<h3>สรุปยอดรวม</h3>';
    html += `<p>ออเดอร์ทั้งหมด: ${allOrders.length} รายการ</p>`;
    html += `<p>จำนวนเสื้อทั้งหมด: ${totalQuantity} ตัว</p>`;
    html += '</div>';
    
    html += '<table class="report-table">';
    html += '<thead><tr><th>ประเภทเสื้อ</th>';
    sizeOrder.forEach(size => {
        html += `<th>${size}</th>`;
    });
    html += '<th>รวม</th></tr></thead>';
    html += '<tbody>';
    
    sortedTypes.forEach(type => {
        html += `<tr><td><strong>${type}</strong></td>`;
        sizeOrder.forEach(size => {
            const key = `${type}_${size}`;
            const qty = summary[key] ? summary[key].quantity : 0;
            html += `<td>${qty > 0 ? qty : '-'}</td>`;
        });
        html += `<td style="background: #e8f4f8; font-weight: bold;">${typeTotal[type]}</td></tr>`;
    });
    
    html += '<tr style="background: #2c3e50; color: white; font-weight: bold;"><td>รวมทั้งหมด</td>';
    sizeOrder.forEach(size => {
        let sizeTotal = 0;
        sortedTypes.forEach(type => {
            const key = `${type}_${size}`;
            if (summary[key]) sizeTotal += summary[key].quantity;
        });
        html += `<td>${sizeTotal > 0 ? sizeTotal : '-'}</td>`;
    });
    html += `<td>${totalQuantity}</td></tr>`;
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
            scale: 2,
            logging: false,
            useCORS: true,
            allowTaint: true,
            scrollY: -window.scrollY,
            scrollX: -window.scrollX,
            width: reportContent.scrollWidth,
            height: reportContent.scrollHeight
        });
        
        const finalCanvas = document.createElement('canvas');
        const padding = 40;
        finalCanvas.width = canvas.width + (padding * 2);
        finalCanvas.height = canvas.height + (padding * 2);
        
        const ctx = finalCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
        ctx.drawImage(canvas, padding, padding);
        
        finalCanvas.toBlob(function(blob) {
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
