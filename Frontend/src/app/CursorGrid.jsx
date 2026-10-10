import { useEffect, useRef } from "react";

const GAP = 30; // grid spacing in px
const RADIUS = 170; // glow radius around each cursor

const CREW = [
  {
    name: "Asha",
    c: [96, 165, 250],
    ax: 0.42,
    ay: 0.3,
    a: 0.00032,
    b: 0.00047,
    p: 0,
    q: 1,
  },
  {
    name: "Dev",
    c: [251, 146, 60],
    ax: 0.36,
    ay: 0.34,
    a: 0.00041,
    b: 0.00029,
    p: 2,
    q: 0.4,
  },
  {
    name: "Maya",
    c: [74, 222, 128],
    ax: 0.44,
    ay: 0.26,
    a: 0.00027,
    b: 0.00051,
    p: 4,
    q: 2.2,
  },
  {
    name: "Sam",
    c: [244, 114, 182],
    ax: 0.3,
    ay: 0.36,
    a: 0.00049,
    b: 0.00038,
    p: 1,
    q: 3.4,
  },
];

const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

// theme="light" -> use on a light page: your cursor, trail and dots are black
// theme="dark"  -> use on a dark page: your cursor, trail and dots are white
export default function CursorGrid({ theme = "light", className = "" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const cv = canvasRef.current;
    const ctx = cv.getContext("2d");
    const light = theme === "light";
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const crew = CREW.map((u) => ({ ...u, trail: [], x: 0, y: 0 }));
    const you = {
      name: "You",
      c: light ? [0, 0, 0] : [255, 255, 255],
      trail: [],
      x: 0,
      y: 0,
    };
    const idleDot = light ? "rgba(0,0,0,.15)" : "rgba(255,255,255,.12)";
    const youTagText = light ? "#ffffff" : "#0a0a0a";

    let W = 0,
      H = 0,
      mouse = null,
      raf;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      W = cv.clientWidth;
      H = cv.clientHeight;
      cv.width = W * dpr;
      cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onMove = (e) => {
      const r = cv.getBoundingClientRect();
      mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onLeave = () => (mouse = null);

    const frame = (t) => {
      ctx.clearRect(0, 0, W, H);

      const actors = crew.map((u) => {
        u.x = W / 2 + u.ax * W * Math.sin(t * u.a + u.p);
        u.y = H / 2 + u.ay * H * Math.sin(t * u.b + u.q);
        u.trail.push({ x: u.x, y: u.y, t });
        while (u.trail.length && t - u.trail[0].t > 1800) u.trail.shift();
        return u;
      });
      if (mouse) {
        you.x = mouse.x;
        you.y = mouse.y;
        you.trail.push({ x: mouse.x, y: mouse.y, t });
        actors.push(you);
      }
      while (you.trail.length && t - you.trail[0].t > 1200) you.trail.shift();

      // grid dots light up in the colour of the nearest cursor
      for (let gx = GAP / 2; gx < W; gx += GAP) {
        for (let gy = GAP / 2; gy < H; gy += GAP) {
          let best = 0,
            col = null;
          for (const u of actors) {
            const s = Math.max(0, 1 - Math.hypot(gx - u.x, gy - u.y) / RADIUS);
            if (s > best) {
              best = s;
              col = u.c;
            }
          }
          if (best > 0) {
            const s = best * best;
            ctx.fillStyle = rgba(col, 0.15 + 0.85 * s);
            ctx.beginPath();
            ctx.arc(gx, gy, 1.2 + 2.6 * s, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = idleDot;
            ctx.fillRect(gx - 0.75, gy - 0.75, 1.5, 1.5);
          }
        }
      }

      // trails + cursors with name tags
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.font = "600 12px system-ui, sans-serif";
      for (const u of actors) {
        const life = u === you ? 1200 : 1800;
        for (let i = 1; i < u.trail.length; i++) {
          const a = u.trail[i - 1],
            b = u.trail[i];
          const age = 1 - (t - b.t) / life;
          ctx.strokeStyle = rgba(u.c, Math.max(0, age) * 0.7);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
        ctx.fillStyle = rgba(u.c, 1);
        ctx.beginPath();
        ctx.moveTo(u.x, u.y);
        ctx.lineTo(u.x + 5, u.y + 17);
        ctx.lineTo(u.x + 9, u.y + 11);
        ctx.lineTo(u.x + 16, u.y + 10);
        ctx.closePath();
        ctx.fill();
        const w = ctx.measureText(u.name).width + 14;
        ctx.beginPath();
        ctx.roundRect(u.x + 14, u.y + 16, w, 20, 6);
        ctx.fill();
        ctx.fillStyle = u === you ? youTagText : "#0a0a0a";
        ctx.fillText(u.name, u.x + 21, u.y + 30);
      }
    };

    const loop = (t) => {
      frame(t);
      raf = requestAnimationFrame(loop);
    };

    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (still) frame(2500);
    });
    ro.observe(cv);
    // listen on window so cards sitting above the canvas don't block the pointer
    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", onLeave);

    if (still) frame(2500);
    else raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}
