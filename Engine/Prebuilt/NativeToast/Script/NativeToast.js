// ---------------- Toast Registry ----------------

const NativeToastQueue = [];
let NativeToastActive = false;
const NativeToastConfigs = {};

// ---------------- Register Toast ----------------
function NativeToast({
  Name,
  Html = "",
  Position = "bottom",
  BackgroundColor = "rgba(0,0,0,0.8)",
  FontColor = "#fff",
  Duration = 3000,
  Width = "full", // default: full device width
  Height = "",
} = {}) {
  if (!Html) return console.error("NativeToast: Html is required");
  if (!Name) Name = "toast";
  
  NativeToastConfigs[Name] = { Name, Html, Position, BackgroundColor, FontColor, Duration, Width, Height };
}

// ---------------- Show Toast by Name ----------------
function openNativeToast(Name) {
  const config = NativeToastConfigs[Name];
  if (!config) return console.error(`NativeToast: No toast found with Name "${Name}"`);
  
  NativeToastQueue.push(config);
  processToastQueue();
}

// ---------------- Process Toast Queue ----------------
function processToastQueue() {
  if (NativeToastActive) return;
  if (NativeToastQueue.length === 0) return;
  
  NativeToastActive = true;
  const { Html, Position, BackgroundColor, FontColor, Duration, Width, Height } = NativeToastQueue.shift();
  
  const toast = document.createElement("div");
  toast.innerHTML = Html;
  
  // ── Base styles ──────────────────────────────────────────
  toast.style.position = "fixed";
  toast.style.left = "0";
  toast.style.padding = "12px 16px";
  toast.style.background = BackgroundColor;
  toast.style.color = FontColor;
  toast.style.fontSize = "14px";
  toast.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
  toast.style.zIndex = "9999";
  toast.style.opacity = "0";
  toast.style.textAlign = "center";
  toast.style.pointerEvents = "none";
  toast.style.boxSizing = "border-box";
  
  // ── Width ────────────────────────────────────────────────
  if (Width === "full") {
    // Full device width — no border-radius on sides
    toast.style.width = "100%";
    toast.style.borderRadius = "0";
  } else {
    // Custom width — centred with rounded corners
    toast.style.width = Width;
    toast.style.left = "50%";
    toast.style.transform = "translateX(-50%)";
    toast.style.borderRadius = "8px";
  }
  
  if (Height) toast.style.height = Height;
  
  // ── Slide direction based on Position ───────────────────
  const slideOffset = "100%";
  if (Position === "top") {
    toast.style.top = "0";
    toast.style.transform = (Width === "full") ? "translateY(-100%)" : "translate(-50%, -100%)";
    toast.style.transition = "opacity 0.3s ease, transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
  } else {
    toast.style.bottom = "0";
    toast.style.transform = (Width === "full") ? "translateY(100%)" : "translate(-50%, 100%)";
    toast.style.transition = "opacity 0.3s ease, transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
  }
  
  document.body.appendChild(toast);
  
  // ── Show: slide in ───────────────────────────────────────
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = (Width === "full") ? "translateY(0)" : "translate(-50%, 0)";
    });
  });
  
  // ── Hide: slide out, then show next ─────────────────────
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = (Position === "top") ?
      (Width === "full" ? "translateY(-100%)" : "translate(-50%, -100%)") :
      (Width === "full" ? "translateY(100%)" : "translate(-50%, 100%)");
    
    setTimeout(() => {
      toast.remove();
      NativeToastActive = false;
      processToastQueue(); // show next in queue
    }, 300);
  }, Duration);
}