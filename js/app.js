import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const app = initializeApp({
  apiKey:"AIzaSyDplJPY5X9D7PeorWsMwJswqF5Q9vq730",
  authDomain:"afula-equipment.firebaseapp.com",
  projectId:"afula-equipment"
});

const db = getFirestore(app);

window.db = db;
window.firebaseFns = { collection, getDocs, addDoc, doc, getDoc, updateDoc };

let currentUser = null;
let menus = [];
let currentMenu = null;
let currentItems = [];

function pad(n){
  return String(n).padStart(2,"0");
}

function formatDateTime(date){
  return `${pad(date.getDate())}/${pad(date.getMonth()+1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function makeOrderNumber(){
  return String(Date.now()).slice(-6);
}

function statusText
  if(status === "pending") return "🟡 ממתין";
  if(status === "in_progress") return "🔵 בטיפול";
  if(status === "ready") return "🟢 מוכן לאיסוף";
  if(status === "completed") return "✅ נמסר";
  if(status === "partial") return "🟠 נופק חלקית";
  return status || "ממתין";
}

function orderDateText(order){
  if(order.createdAtText) return order.createdAtText;
  if(order.createdAtMillis) return formatDateTime(new Date(order.createdAtMillis));
  return "ללא תאריך";
}

function menuEmoji(title){
  if(title === "BLS") return "🚑";
  if(title === "משתלם") return "🎒";
  if(title === "תן כבוד") return "❤️";
  return "📦";
}

function menuOrder(title){
  if(title === "BLS") return 1;
  if(title === "משתלם") return 2;
  if(title === "תן כבוד") return 3;
  return 99;
}

window.statusText = statusText;
window.orderDateText = orderDateText;

window.login = async function(){
  const code = document.getElementById("codeInput").value.trim();
  document.getElementById("msg").innerText = "";

  const adminSnap = await getDoc(doc(db,"admins",code));

  if(adminSnap.exists()){
    const admin = adminSnap.data();

    if(admin.active !== false){
      window.currentAdmin = { code, ...admin };

      document.getElementById("loginBox").style.display = "none";
      document.getElementById("volunteerApp").style.display = "none";
      document.getElementById("managerApp").style.display = "block";

      if(window.managerLoadDashboard){
        window.managerLoadDashboard();
      }

      return;
    }
  }

  const snap = await getDocs(collection(db,"volunteers"));
  let found = null;

  snap.forEach(docSnap=>{
    const d = docSnap.data();
    if(String(d.code || d.Code).trim() === code){
      found = {
        code:String(d.code || d.Code).trim(),
        name:d.name || d.Name
      };
    }
  });

  if(!found){
    document.getElementById("msg").innerText = "קוד לא נמצא";
    return;
  }

  currentUser = found;
  window.currentUser = found;

  document.getElementById("loginBox").style.display = "none";
  document.getElementById("managerApp").style.display = "none";
  document.getElementById("volunteerApp").style.display = "block";
  document.getElementById("hello").innerText = "שלום, " + found.name + " 👋";

  await loadMenus();
  showVolunteerHome();
};

async function loadMenus(){
  const snap = await getDocs(collection(db,"menus"));
  menus = [];

  snap.forEach(docSnap=>{
    const d = docSnap.data();
    const title = d.title || docSnap.id;

    menus.push({
      id: docSnap.id,
      title,
      emoji: d.emoji || menuEmoji(title),
      order: Number(d.order || menuOrder(title))
    });
  });

  menus.sort((a,b)=>a.order-b.order);

  let html = "";
  menus.forEach(menu=>{
    html += `<button class="menu-btn" onclick="loadMenu('${menu.id}')">${menu.emoji} ${menu.title}</button>`;
  });

  document.getElementById("menusBox").innerHTML = html;
}

window.loadMenu = async function(menuId){
  currentMenu = menus.find(m => m.id === menuId);
  currentItems = [];

  document.getElementById("content").innerHTML = "טוען...";

  const itemsSnap = await getDocs(collection(db,"menus",menuId,"items"));

  itemsSnap.forEach(docSnap=>{
    const d = docSnap.data();

    currentItems.push({
      name: d.name,
      max: Number(d.max || 0),
      category: d.category || "ללא קטגוריה",
      order: Number(d.order || 999),
      step: Number(d.step || 1),
      qty: 0
    });
  });

  currentItems.sort((a,b)=>a.order-b.order);
  renderMenu();
};

function selectedItems(){
  return currentItems.filter(i => i.qty > 0);
}

function renderMenu(){
  if(!currentMenu){
    document.getElementById("content").innerHTML = "";
    return;
  }

  let html = `<h3>${currentMenu.emoji} ${currentMenu.title}</h3>`;

  if(currentItems.length === 0){
    html += `<div class="empty">אין עדיין פריטים בלשונית הזו</div>`;
    document.getElementById("content").innerHTML = html;
    return;
  }

  html += `<div class="summary">${selectedItems().length} פריטים נבחרו</div>`;

  let currentCategory = "";

  currentItems.forEach((item,index)=>{
    if(item.category !== currentCategory){
      currentCategory = item.category;
      html += `<div class="category">${currentCategory}</div>`;
    }

    html += `
      <div class="item ${item.qty > 0 ? "selected" : ""}">
        <button class="info" onclick="showInfo(${index})">i</button>
        <b>${item.name}</b>
        <div class="qty">
          <button onclick="changeQty(${index}, -1)" ${item.qty <= 0 ? "disabled" : ""}>➖</button>
          <span>${item.qty}</span>
          <button onclick="changeQty(${index}, 1)" ${item.qty >= item.max ? "disabled" : ""}>➕</button>
        </div>
      </div>
    `;
  });

  html += `
    <button class="submit" ${selectedItems().length === 0 ? "disabled" : ""} onclick="openConfirm()">
      📦 שלח הזמנה (${selectedItems().length})
    </button>
  `;

  document.getElementById("content").innerHTML = html;
}

window.changeQty = function(index, direction){
  const item = currentItems[index];
  const next = item.qty + (item.step * direction);

  if(next < 0) item.qty = 0;
  else if(next > item.max) item.qty = item.max;
  else item.qty = next;

  renderMenu();
};

window.showInfo = function(index){
  const item = currentItems[index];
  document.getElementById("infoTitle").innerText = item.name;
  document.getElementById("infoText").innerText = "תקן: " + item.max;
  document.getElementById("infoModal").style.display = "flex";
};

window.closeInfo = function(){
  document.getElementById("infoModal").style.display = "none";
};

window.openConfirm = function(){
  let html = `<p><b>${currentMenu.emoji} ${currentMenu.title}</b></p>`;

  selectedItems().forEach(i=>{
    html += `<div class="order-line">${i.name} - ${i.qty}</div>`;
  });

  document.getElementById("confirmContent").innerHTML = html;
  document.getElementById("confirmModal").style.display = "flex";
};

window.closeConfirm = function(){
  document.getElementById("confirmModal").style.display = "none";
};

window.sendOrder = async function(){
  const now = new Date();
  const orderNumber = makeOrderNumber();

  const items = selectedItems().map(i=>({
    name:i.name,
    quantity:i.qty,
    supplied:null,
    max:i.max,
    category:i.category
  }));

  await addDoc(collection(db,"orders"), {
    orderNumber,
    createdAtText: formatDateTime(now),
    createdAtMillis: now.getTime(),
    volunteerName: currentUser.name,
    volunteerCode: currentUser.code,
    type: currentMenu.title,
    menuId: currentMenu.id,
    items,
    status: "pending",
    managerNote: ""
  });

  currentItems.forEach(i=>i.qty = 0);
  closeConfirm();
  renderMenu();

  alert("הזמנה #" + orderNumber + " נשלחה בהצלחה 🚑");
};

window.loadMyOrders = async function(){
  document.getElementById("content").innerHTML = "טוען הזמנות...";

  const snap = await getDocs(collection(db,"orders"));
  let orders = [];

  snap.forEach(docSnap=>{
    const d = docSnap.data();
    if(String(d.volunteerCode) === String(currentUser.code)){
      orders.push(d);
    }
  });

  orders.sort((a,b)=>(b.createdAtMillis || 0) - (a.createdAtMillis || 0));

  if(orders.length === 0){
    document.getElementById("content").innerHTML = "<h3>📦 ההזמנות שלי</h3><p>אין הזמנות עדיין</p>";
    return;
  }

  let html = "<h3>📦 ההזמנות שלי</h3>";

  orders.forEach(order=>{
    html += `
      <div class="order-card">
        <div class="order-title">📦 הזמנה #${order.orderNumber || "ללא מספר"}</div>
        <div class="order-meta">🗓️ ${orderDateText(order)}</div>
        <div><b>${order.type || "הזמנה"}</b></div>
        <div>סטטוס: ${statusText(order.status)}</div>
    `;

    if(order.managerNote){
      html += `<div class="order-line">💬 הערת מחסן: ${order.managerNote}</div>`;
    }

    (order.items || []).forEach(item=>{
      const supplied = item.supplied;

      if(supplied === null || supplied === undefined){
        html += `<div class="order-line">${item.name} - ביקשת: ${item.quantity}</div>`;
      } else {
        html += `
          <div class="order-line">
            <b>${item.name}</b><br>
            ביקשת: ${item.quantity}<br>
            קיבלת: ${supplied}
          </div>
        `;
      }
    });

    html += `</div>`;
  });

  document.getElementById("content").innerHTML = html;
};