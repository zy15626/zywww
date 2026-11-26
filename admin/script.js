/* ================= 数据存储 ================= */
const DOCS_KEY = 'my_docs';
const USERS_KEY = 'my_users';

function initDocs() {
  if (!localStorage.getItem(DOCS_KEY)) {
    const docs = [
      { title: 'HTML 入门', content: 'HTML 是网页的骨架，用标签描述内容结构。' },
      { title: 'CSS 基础', content: 'CSS 负责网页的样式，比如颜色、字体、布局。' },
      { title: 'JavaScript 简介', content: 'JavaScript 让网页具有交互能力。' },
      { title: '视频播放', content: '使用 video 标签可以在网页中播放视频。' },
      { title: '图片显示', content: '使用 img 标签在网页上显示图片。' }
    ];
    localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
  }
}

/* ================= 1. 文档搜索 ================= */
function renderDocs() {
  const docs = JSON.parse(localStorage.getItem(DOCS_KEY) || '[]');
  document.getElementById('docList').innerHTML = docs.map(d =>
    `<div class="doc-item"><strong>${d.title}</strong>：${d.content}</div>`
  ).join('');
}

function doSearch() {
  const kw = document.getElementById('searchBox').value.trim().toLowerCase();
  const docs = JSON.parse(localStorage.getItem(DOCS_KEY) || '[]');
  const result = document.getElementById('searchResult');
  if (!kw) { result.textContent = '请输入关键词'; return; }
  const hits = docs.filter(d =>
    d.title.toLowerCase().includes(kw) || d.content.toLowerCase().includes(kw)
  );
  result.innerHTML = hits.length === 0
    ? '😢 没有找到相关内容。'
    : `🎯 找到 ${hits.length} 条：<br>` + hits.map(d =>
        `<div class="doc-item"><strong>${d.title}</strong>：${d.content}</div>`).join('');
}

/* ================= 2. 注册 / 登录 ================= */
function getUsers() { return JSON.parse(localStorage.getItem(USERS_KEY) || '{}'); }
function saveUsers(u) { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }

function register() {
  const u = document.getElementById('username').value.trim();
  const p = document.getElementById('password').value;
  if (!u || !p) { alert('账号和密码不能为空'); return; }
  const users = getUsers();
  if (users[u]) { alert('该账号已存在，请直接登录'); return; }
  users[u] = p;
  saveUsers(users);
  localStorage.setItem('current_user', u);
  updateUserInfo();
  alert('注册成功，已自动登录');
}

function login() {
  const u = document.getElementById('username').value.trim();
  const p = document.getElementById('password').value;
  const users = getUsers();
  if (!users[u]) { alert('账号不存在'); return; }
  if (users[u] !== p) { alert('密码错误'); return; }
  localStorage.setItem('current_user', u);
  updateUserInfo();
  alert('登录成功');
}

function logout() { localStorage.removeItem('current_user'); updateUserInfo(); }

function updateUserInfo() {
  const u = localStorage.getItem('current_user');
  const el = document.getElementById('userInfo');
  el.textContent = u ? '当前登录：' + u : '当前未登录';
  el.classList.toggle('logged-in', !!u);
}

/* ================= 3. 上传图片/视频 ================= */
let db;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('my_media_db', 1);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('files')) d.createObjectStore('files', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = e => { db = e.target.result; resolve(db); };
    req.onerror = e => reject(e);
  });
}

function addFile(blob, type, name) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    const req = tx.objectStore('files').add({ blob, type, name, time: Date.now() });
    req.onsuccess = () => resolve();
    req.onerror = e => reject(e);
  });
}

function getAllFiles() {
  return new Promise((resolve, reject) => {
    const req = db.transaction('files', 'readonly').objectStore('files').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = e => reject(e);
  });
}

function deleteFile(id) {
  return new Promise((resolve, reject) => {
    const req = db.transaction('files', 'readwrite').objectStore('files').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = e => reject(e);
  });
}

async function uploadFiles() {
  const files = document.getElementById('fileInput').files;
  if (files.length === 0) { alert('请先选择图片或视频'); return; }
  for (const f of files) {
    await addFile(f, f.type.startsWith('image/') ? 'image' : 'video', f.name);
  }
  document.getElementById('fileInput').value = '';
  alert('已保存到本地，下次访问仍可看到');
  renderGallery();
}

async function renderGallery() {
  const list = await getAllFiles();
  const box = document.getElementById('mediaGallery');
  box.innerHTML = '';
  list.forEach(item => {
    const url = URL.createObjectURL(item.blob);
    const div = document.createElement('div');
    div.className = 'item';

    const media = document.createElement(item.type === 'image' ? 'img' : 'video');
    media.src = url;
    if (item.type === 'video') media.controls = true;

    const del = document.createElement('span');
    del.className = 'del';
    del.textContent = '×';
    del.onclick = async () => {
      await deleteFile(item.id);
      URL.revokeObjectURL(url);
      renderGallery();
    };

    div.appendChild(media);
    div.appendChild(del);
    box.appendChild(div);
  });
}

/* ================= 启动 ================= */
async function init() {
  initDocs();
  renderDocs();
  updateUserInfo();
  await openDB();
  renderGallery();
}
init();