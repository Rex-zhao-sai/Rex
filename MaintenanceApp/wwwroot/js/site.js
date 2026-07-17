// 设备月度保养记录系统 - 前端脚本

// 角色管理
let currentRole = sessionStorage.getItem('role') || 'operator';

function setRole(role) {
    currentRole = role;
    sessionStorage.setItem('role', role);
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.role === role);
    });
}

// Toast 提示
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// 照片上传处理
function handlePhotoUpload(input, slot) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = slot.querySelector('img') || document.createElement('img');
        img.src = e.target.result;
        if (!slot.querySelector('img')) {
            slot.insertBefore(img, slot.querySelector('.photo-time') || slot.lastChild);
        }
        slot.classList.add('has-photo');

        // 记录上传时间
        const timeEl = slot.querySelector('.photo-time') || document.createElement('div');
        timeEl.className = 'photo-time';
        timeEl.textContent = new Date().toLocaleString('zh-CN');
        if (!slot.querySelector('.photo-time')) {
            slot.appendChild(timeEl);
        }

        // 存储到 data 属性
        slot.dataset.photo = e.target.result;
        slot.dataset.time = new Date().toISOString();
    };
    reader.readAsDataURL(file);
}

// 获取当月
function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// API 请求封装
async function apiRequest(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'x-role': currentRole,
        ...options.headers
    };
    const res = await fetch(url, { ...options, headers });
    return res.json();
}

// 初始化角色按钮
document.addEventListener('DOMContentLoaded', function() {
    setRole(currentRole);
});
