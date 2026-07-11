export function pad(n){
  return String(n).padStart(2,"0");
}

export function formatDateTime(date){
  return `${pad(date.getDate())}/${pad(date.getMonth()+1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function makeOrderNumber(){
  return String(Date.now()).slice(-6);
}

export function statusText(status){
  if(status === "pending") return "🟡 ממתין";
  if(status === "in_progress") return "🔵 בטיפול";
  if(status === "ready") return "🟢 מוכן לאיסוף";
  if(status === "completed") return "✅ נמסר";
  if(status === "partial") return "🟠 נופק חלקית";
  return status || "ממתין";
}

export function orderDateText(order){
  if(order.createdAtText) return order.createdAtText;
  if(order.createdAtMillis) return formatDateTime(new Date(order.createdAtMillis));
  return "ללא תאריך";
}

export function menuEmoji(title){
  if(title === "BLS") return "🚑";
  if(title === "משתלם") return "🎒";
  if(title === "תן כבוד") return "❤️";
  return "📦";
}

export function menuOrder(title){
  if(title === "BLS") return 1;
  if(title === "משתלם") return 2;
  if(title === "תן כבוד") return 3;
  return 99;
}