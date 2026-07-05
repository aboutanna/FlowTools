/* ==========================================================================
   FlowTools V2.0.1 — Shared Utilities
   ========================================================================== */

function showToast(msg, duration = 2200) {
    let t = document.querySelector(".toast");
    if (!t) {
        t = document.createElement("div");
        t.className = "toast";
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove("show"), duration);
}

function getGreeting() {
    const h = new Date().getHours();
    if (h >= 5  && h < 12) return "Good morning.";
    if (h >= 12 && h < 18) return "Good afternoon.";
    if (h >= 18 && h < 23) return "Good evening.";
    return "Good night.";
}

/** Convert stored minutes to a human label */
function formatDuration(minutes) {
    if (minutes < 60)   return `${minutes} min`;
    if (minutes < 1440) return `${Math.round(minutes / 60 * 10) / 10} h`;
    return `${Math.round(minutes / 1440 * 10) / 10} 天`;
}

/** Remaining time string */
function formatRemaining(lastStartedAt, durationMinutes) {
    if (!lastStartedAt) return null;
    const remaining = new Date(lastStartedAt).getTime() + durationMinutes * 60000 - Date.now();
    if (remaining <= 0) return null;
    const m = Math.ceil(remaining / 60000);
    if (m < 60)  return `${m} min`;
    const h = Math.ceil(m / 60);
    if (h < 24)  return `${h} h`;
    const d = Math.ceil(h / 24);
    return `${d} 天`;
}

/** 0–1 progress value */
function recoveryProgress(lastStartedAt, durationMinutes) {
    if (!lastStartedAt || !durationMinutes) return 1;
    const elapsed = Date.now() - new Date(lastStartedAt).getTime();
    return Math.min(1, Math.max(0, elapsed / (durationMinutes * 60000)));
}

/**
 * Draw an SVG ring that fills clockwise as progress goes 0→1.
 * Returns an <svg> element.
 * size: diameter in px; stroke: line thickness; colors: { empty, fill, ready }
 */
function makeSvgRing(progress, size = 36, stroke = 3) {
    const r   = (size - stroke) / 2;
    const cx  = size / 2;
    const cy  = size / 2;
    const circ = 2 * Math.PI * r;

    const isReady = progress >= 1;
    const fillColor   = isReady ? "var(--ring-ready)"  : (progress >= 0.5 ? "var(--ring-fill)" : "var(--ring-early-fill)");
    const trackColor  = "var(--ring-track)";

    // Dash offset: 0 = full ring drawn; circ = nothing drawn
    const offset = circ * (1 - Math.min(progress, 1));

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
    svg.style.flexShrink = "0";
    svg.style.display = "block";

    // Track circle (grey background ring)
    const track = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    track.setAttribute("cx", cx);
    track.setAttribute("cy", cy);
    track.setAttribute("r", r);
    track.setAttribute("fill", "none");
    track.setAttribute("stroke", trackColor);
    track.setAttribute("stroke-width", stroke);
    svg.appendChild(track);

    if (progress > 0) {
        // Progress arc
        const arc = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        arc.setAttribute("cx", cx);
        arc.setAttribute("cy", cy);
        arc.setAttribute("r", r);
        arc.setAttribute("fill", "none");
        arc.setAttribute("stroke", fillColor);
        arc.setAttribute("stroke-width", stroke);
        arc.setAttribute("stroke-linecap", "round");
        // Start from top (–90°)
        arc.setAttribute("transform", `rotate(-90 ${cx} ${cy})`);
        arc.setAttribute("stroke-dasharray", circ);
        arc.setAttribute("stroke-dashoffset", offset);
        arc.style.transition = "stroke-dashoffset 1s ease, stroke 0.4s ease";
        svg.appendChild(arc);
    }

    // Center dot when ready
    if (isReady) {
        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("cx", cx);
        dot.setAttribute("cy", cy);
        dot.setAttribute("r", stroke * 0.8);
        dot.setAttribute("fill", fillColor);
        svg.appendChild(dot);
    }

    return svg;
}

/** Confirm dialog — returns Promise<boolean> */
function confirmDialog(message) {
    return new Promise(resolve => {
        const overlay = document.createElement("div");
        overlay.className = "confirm-overlay";
        overlay.innerHTML = `
            <div class="confirm-box">
                <p>${message}</p>
                <div class="confirm-btns">
                    <button class="btn-cancel">取消</button>
                    <button class="btn-confirm-del">删除</button>
                </div>
            </div>
        `;
        overlay.querySelector(".btn-cancel").addEventListener("click", () => {
            overlay.remove(); resolve(false);
        });
        overlay.querySelector(".btn-confirm-del").addEventListener("click", () => {
            overlay.remove(); resolve(true);
        });
        document.body.appendChild(overlay);
    });
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function toMinutes(val, unit) {
    const v = parseFloat(val) || 1;
    if (unit === "min") return Math.round(v);
    if (unit === "h")   return Math.round(v * 60);
    if (unit === "d")   return Math.round(v * 1440);
    return Math.round(v);
}

function bestUnit(minutes) {
    if (minutes < 60)   return { val: minutes,          unit: "min", label: `${minutes} min` };
    if (minutes < 1440) return { val: minutes / 60,     unit: "h",   label: `${Math.round(minutes/60*10)/10} h` };
    return                     { val: minutes / 1440,   unit: "d",   label: `${Math.round(minutes/1440*10)/10} 天` };
}
