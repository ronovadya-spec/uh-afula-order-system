const db = window.db;
const { collection, getDocs, doc, updateDoc } = window.firebaseFns;

let managerOrdersCache = [];

window.managerLoadDashboard = function(){
  document.getElementById("managerContent").innerHTML = `
    <div class="summary">ברוך הבא למנהל המחסן 👨‍💼</div>
    <button class="menu-btn" onclick="managerLoadOrders()">📦 כל ההזמנות</button>
  `;
};

window.managerLoadOrders = async function(){
  const box = document.getElementById("managerContent");
  box.innerHTML = "טוען הזמנות...";

  const snap = await getDocs(collection(db,"orders"));
  managerOrdersCache = [];

  snap.forEach(docSnap=>{
    managerOrdersCache.push({ id: docSnap.id, ...docSnap.data() });
  });

  managerOrdersCache.sort((a,b)=>(b.createdAtMillis || 0) - (a.createdAtMillis || 0));

  if(managerOrdersCache.length === 0){
    box.innerHTML = `
      <button class="menu-btn orders-btn" onclick="managerLoadDashboard()">⬅ חזור</button>
      <p>אין הזמנות עדיין</p>
    `;
    return;
  }

  let html = `
    <button class="menu-btn orders-btn" onclick="managerLoadDashboard()">⬅ חזור</button>
    <h3>📦 כל ההזמנות</h3>
  `;

  managerOrdersCache.forEach(order=>{
    html += `
      <div class="order-card">
        <div class="order-title">📦 הזמנה #${order.orderNumber || "ללא מספר"}</div>
        <div class="order-meta">🗓️ ${window.orderDateText(order)}</div>
        <div><b>כונן:</b> ${order.volunteerName || ""}</div>
        <div><b>קוד כונן:</b> ${order.volunteerCode || "לא קיים"}</div>
        <div><b>סוג:</b> ${order.type || ""}</div>
        <div><b>סטטוס:</b> ${window.statusText(order.status)}</div>

        <button class="menu-btn" onclick="managerOpenOrder('${order.id}')">פתח הזמנה</button>
      </div>
    `;
  });

  box.innerHTML = html;
};

window.managerOpenOrder = function(orderId){
  const order = managerOrdersCache.find(o => o.id === orderId);
  const box = document.getElementById("managerContent");

  if(!order){
    box.innerHTML = `
      <button class="menu-btn orders-btn" onclick="managerLoadOrders()">⬅ חזור</button>
      <p>ההזמנה לא נמצאה</p>
    `;
    return;
  }

  let html = `
    <button class="menu-btn orders-btn" onclick="managerLoadOrders()">⬅ חזור לכל ההזמנות</button>

    <div class="order-card">
      <div class="order-title">📦 הזמנה #${order.orderNumber || "ללא מספר"}</div>
      <div class="order-meta">🗓️ ${window.orderDateText(order)}</div>

      <div><b>כונן:</b> ${order.volunteerName || ""}</div>
      <div><b>קוד כונן:</b> ${order.volunteerCode || "לא קיים"}</div>
      <div><b>סוג:</b> ${order.type || ""}</div>
      <div><b>סטטוס:</b> ${window.statusText(order.status)}</div>

      <br>

      <select onchange="managerUpdateStatus('${order.id}', this.value)">
        <option value="pending" ${order.status === "pending" ? "selected" : ""}>ממתין</option>
        <option value="in_progress" ${order.status === "in_progress" ? "selected" : ""}>בטיפול</option>
        <option value="ready" ${order.status === "ready" ? "selected" : ""}>מוכן לאיסוף</option>
        <option value="partial" ${order.status === "partial" ? "selected" : ""}>נופק חלקית</option>
        <option value="completed" ${order.status === "completed" ? "selected" : ""}>נמסר</option>
      </select>

      <br><br>
  `;

  (order.items || []).forEach(item=>{
    html += `
      <div class="order-line">
        <b>${item.name}</b><br>
        ביקש: ${item.quantity}<br>
        סופק בפועל: ${item.supplied ?? "עדיין לא עודכן"}
      </div>
    `;
  });

  if(order.managerNote){
    html += `<div class="order-line">💬 הערת מחסן: ${order.managerNote}</div>`;
  }

  html += `
      <button class="menu-btn" onclick="managerShowVolunteerHistory('${order.volunteerCode}')">
        📜 היסטוריית הזמנות של הכונן
      </button>
    </div>
  `;

  box.innerHTML = html;
};

window.managerUpdateStatus = async function(orderId, status){
  await updateDoc(doc(db,"orders",orderId), { status });
  alert("הסטטוס עודכן ✅");
  await managerLoadOrders();
};

window.managerShowVolunteerHistory = function(volunteerCode){
  const box = document.getElementById("managerContent");

  const orders = managerOrdersCache
    .filter(o => String(o.volunteerCode) === String(volunteerCode))
    .sort((a,b)=>(b.createdAtMillis || 0) - (a.createdAtMillis || 0));

  let html = `
    <button class="menu-btn orders-btn" onclick="managerLoadOrders()">⬅ חזור לכל ההזמנות</button>
    <h3>📜 היסטוריית כונן ${volunteerCode}</h3>
  `;

  if(orders.length === 0){
    html += `<p>אין היסטוריה לכונן הזה</p>`;
    box.innerHTML = html;
    return;
  }

  const itemTotals = {};

  orders.forEach(order=>{
    (order.items || []).forEach(item=>{
      itemTotals[item.name] = (itemTotals[item.name] || 0) + Number(item.quantity || 0);
    });
  });

  html += `<div class="order-card"><b>סיכום פריטים:</b><br>`;

  Object.keys(itemTotals).forEach(name=>{
    html += `<div class="order-line">${name} - סה״כ ${itemTotals[name]}</div>`;
  });

  html += `</div>`;

  orders.forEach(order=>{
    html += `
      <div class="order-card">
        <div class="order-title">📦 הזמנה #${order.orderNumber || "ללא מספר"}</div>
        <div class="order-meta">🗓️ ${window.orderDateText(order)}</div>
        <div><b>סוג:</b> ${order.type || ""}</div>
        <div><b>סטטוס:</b> ${window.statusText(order.status)}</div>
    `;

    (order.items || []).forEach(item=>{
      html += `<div class="order-line">${item.name} - ${item.quantity}</div>`;
    });

    html += `</div>`;
  });

  box.innerHTML = html;
};