const db = window.db;
const { collection, getDocs, doc, updateDoc } = window.firebaseFns;

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
  let orders = [];

  snap.forEach(docSnap=>{
    orders.push({ id: docSnap.id, ...docSnap.data() });
  });

  orders.sort((a,b)=>(b.createdAtMillis || 0) - (a.createdAtMillis || 0));

  if(orders.length === 0){
    box.innerHTML = "<p>אין הזמנות עדיין</p>";
    return;
  }

  let html = "<h3>📦 כל ההזמנות</h3>";

  orders.forEach(order=>{
    html += `
      <div class="order-card">
        <div class="order-title">📦 הזמנה #${order.orderNumber || "ללא מספר"}</div>
        <div class="order-meta">🗓️ ${window.orderDateText(order)}</div>
        <div><b>כונן:</b> ${order.volunteerName || ""}</div>
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
      html += `<div class="order-line">${item.name} - ביקש: ${item.quantity}</div>`;
    });

    html += `</div>`;
  });

  box.innerHTML = html;
};

window.managerUpdateStatus = async function(orderId, status){
  await updateDoc(doc(db,"orders",orderId), { status });
  alert("הסטטוס עודכן ✅");
  managerLoadOrders();
};