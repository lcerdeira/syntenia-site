// Quando a conta Formspree existir, colar aqui o endpoint (https://formspree.io/f/XXXX).
// Enquanto estiver vazio, o formulário abre o e-mail do visitante já preenchido.
const FORM_ENDPOINT = "";

/* Fig. 1 — da sequência ao indicador.
   À esquerda, bases A/C/G/T correm como leitura de sequenciador; no meio elas se dissolvem
   ao passar pelo "modelo"; à direita viram colunas de indicadores, com o topo em âmbar
   quando passam do limiar. Tudo determinístico (hash), sem dados reais. */
(function fig1() {
  const canvas = document.getElementById("fig1");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const css = getComputedStyle(document.documentElement);
  const dark = canvas.dataset.theme === "dark"; // na seção de P&D a figura fica sobre navy
  const INK = dark ? "255,255,255" : "7,20,31", TEAL = dark ? "95,208,220" : "27,154,170";
  const AMBER = css.getPropertyValue("--amber").trim() || "#f2a900";
  const BASES = "ACGT";
  const A = 0.4, B = 0.6; // fronteiras das três zonas, iguais às colunas de .stages
  let W, H, cell, cols, rows;

  const hash = (x, y) => {
    let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const level = (col, t) => 0.22 + 0.62 * (0.5 + 0.5 * Math.sin(col * 0.47 + t * 0.7) * Math.cos(col * 0.19 - t * 0.43)) * (0.75 + 0.25 * hash(col, 7));

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cell = W < 640 ? 14 : 18;
    cols = Math.ceil(W / cell) + 1; rows = Math.floor(H / cell);
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    const top = (H - rows * cell) / 2;
    const flow = t * 1.4, shift = Math.floor(flow), frac = (flow - shift) * cell;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";

    for (let i = -1; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const cy = top + j * cell + cell / 2;
        const lx = i * cell + cell / 2 + frac; // letras correm para a direita
        const p = lx / W;
        if (p < B) {
          const src = i - shift;
          const fade = p < A ? 1 : 1 - (p - A) / (B - A);
          const variant = hash(src, j + 99) > 0.972;
          ctx.font = (variant ? "500 " : "400 ") + cell * 0.7 + 'px "IBM Plex Mono", ui-monospace, monospace';
          ctx.fillStyle = variant ? AMBER : `rgba(${INK},${((dark ? 0.3 : 0.22) + 0.5 * hash(src, j + 31)) * fade})`;
          if (variant) ctx.globalAlpha = fade;
          ctx.fillText(BASES[Math.floor(hash(src, j) * 4)], lx, cy);
          ctx.globalAlpha = 1;
        }
        // grade fixa: pontos no modelo, colunas de indicador à direita
        const gx = i * cell + cell / 2, q = gx / W;
        if (q >= A && q < B) {
          const k = (q - A) / (B - A);
          ctx.fillStyle = `rgba(${TEAL},${0.15 + 0.55 * k})`;
          ctx.beginPath(); ctx.arc(gx, cy, 0.8 + 1.6 * k, 0, 6.2832); ctx.fill();
        } else if (q >= B) {
          const appear = Math.min(1, (q - B) / 0.05);
          const h = level(i, t) * rows, fromBottom = rows - 1 - j;
          if (fromBottom < h) {
            const isTop = fromBottom >= h - 1 && h / rows > 0.7;
            ctx.fillStyle = isTop ? AMBER : `rgba(${TEAL},${(0.2 + 0.6 * (fromBottom / rows)) * appear})`;
            ctx.fillRect(gx - cell / 2 + 1.5, cy - cell / 2 + 1.5, cell - 3, cell - 3);
          } else {
            ctx.fillStyle = `rgba(${INK},0.13)`;
            ctx.fillRect(gx - 0.75, cy - 0.75, 1.5, 1.5);
          }
        }
      }
    }
    // fios das fronteiras entre as zonas
    ctx.fillStyle = `rgba(${INK},0.55)`;
    ctx.fillRect(Math.round(W * A), 0, 1, H); ctx.fillRect(Math.round(W * B), 0, 1, H);
  }

  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let visible = true, last = 0;
  function frame(ms) {
    if (visible && ms - last > 33) { last = ms; draw(ms / 1000); }
    requestAnimationFrame(frame);
  }
  resize(); draw(12);
  window.addEventListener("resize", () => { resize(); draw(12); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => draw(12));
  if (!still) {
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
    requestAnimationFrame(frame);
  }
})();

/* Reel do hero: seis cenas, 6 s cada. Comporta-se como um player: barra de capítulos,
   contador de tempo, pausa, setas do teclado. Pausa fora da tela e com a aba oculta;
   com "reduzir movimento" começa pausado e mostra as cenas já desenhadas. */
(function reel() {
  const root = document.getElementById("reel");
  if (!root) return;
  const scenes = [...root.querySelectorAll(".scene")];
  const items = [...root.querySelectorAll(".reel-index li")];
  const tc = document.getElementById("reel-tc");
  const toggle = document.getElementById("reel-toggle");
  const DUR = 6000, total = DUR * scenes.length;
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let i = 0, elapsed = 0, last = 0, userPaused = still, visible = true;

  const fmt = (ms) => "00:" + String(Math.floor(ms / 1000)).padStart(2, "0");
  function show(n) {
    i = (n + scenes.length) % scenes.length; elapsed = 0;
    scenes.forEach((s, k) => s.classList.toggle("on", k === i));
    items.forEach((li, k) => {
      li.classList.toggle("done", k < i);
      const b = li.querySelector("button");
      if (k === i) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
      li.querySelector(".bar b").style.width = k === i ? "0%" : "";
    });
  }
  function setPaused(p) {
    userPaused = p;
    root.classList.toggle("paused", p);
    toggle.setAttribute("aria-label", p ? toggle.dataset.play : toggle.dataset.pause);
    toggle.firstElementChild.textContent = p ? "▶" : "❙❙";
  }
  function tick(ms) {
    const dt = last ? ms - last : 0; last = ms;
    if (!userPaused && visible && !document.hidden) {
      elapsed += Math.min(dt, 100);
      if (elapsed >= DUR) show(i + 1);
      items[i].querySelector(".bar b").style.width = (elapsed / DUR) * 100 + "%";
      tc.textContent = fmt(i * DUR + elapsed) + " / " + fmt(total);
    }
    requestAnimationFrame(tick);
  }
  items.forEach((li, k) => li.querySelector("button").addEventListener("click", () => show(k)));
  toggle.addEventListener("click", () => setPaused(!userPaused));
  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") show(i + 1);
    if (e.key === "ArrowLeft") show(i - 1);
  });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.25 }).observe(root);
  tc.textContent = fmt(0) + " / " + fmt(total);
  setPaused(still);
  requestAnimationFrame(tick);
})();

/* Fig. 1 — "o dado corre como rio".
   Sobrevoo de uma bacia dendrítica: o tronco corre de oeste para leste até a foz; cada
   afluente é uma fonte de dado e ramifica em fontes menores. Partículas descem; a cada
   poucas chegadas num encontro, ele acende — é a informação que a IA gera ao cruzar
   fontes. Rede gerada por hash (sempre o mesmo desenho), sem dado real. */
(function amazonia() {
  const canvas = document.getElementById("amazonia");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const css = getComputedStyle(document.documentElement);
  const AMBER = css.getPropertyValue("--amber").trim() || "#f2a900";
  const TEAL = "95,208,220";
  let W, H, SW, rivers, nodes, parts, labels, t0 = 0;

  const rnd = (s) => { let n = Math.imul((s | 0) ^ 0x9e3779b9, 0x85ebca6b); n ^= n >>> 13; n = Math.imul(n, 0xc2b2ae35); n ^= n >>> 16; return (n >>> 0) / 4294967296; };

  // trecho sinuoso entre a e b, suavizado (Chaikin) para virar meandro e não raio
  function course(a, b, seed, amp) {
    let pts = [];
    const steps = 9, dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps, k = Math.sin(u * Math.PI), off = (rnd(seed + i * 13) - 0.5) * 2 * amp * k;
      pts.push({ x: a.x + dx * u + nx * off, y: a.y + dy * u + ny * off });
    }
    for (let r = 0; r < 3; r++) {
      const q = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i], p1 = pts[i + 1];
        q.push({ x: p0.x * 0.75 + p1.x * 0.25, y: p0.y * 0.75 + p1.y * 0.25 }, { x: p0.x * 0.25 + p1.x * 0.75, y: p0.y * 0.25 + p1.y * 0.75 });
      }
      q.push(pts[pts.length - 1]); pts = q;
    }
    return pts;
  }

  // um afluente e, recursivamente, os afluentes dele; devolve a rota até o fim do pai
  function branch(end, side, len, level, seed, down) {
    const ang = (side < 0 ? -1 : 1) * (0.55 + rnd(seed) * 0.5) + Math.PI; // vem de montante (oeste) e de um lado
    const head = { x: end.x + Math.cos(ang) * len, y: end.y + Math.sin(ang) * len * 0.9 };
    const pts = course(head, end, seed * 7 + 1, len * 0.16);
    const r = { pts, w0: [0, 1.3, 0.8, 0.5][level], w1: [0, 3.2, 1.7, 1.0][level] };
    rivers.push(r);
    const route = pts.concat(down);
    parts.push({ pts: route, u: rnd(seed * 3), v: 0.045 + rnd(seed * 5) * 0.03 }, { pts: route, u: rnd(seed * 3 + 1), v: 0.045 + rnd(seed * 5 + 1) * 0.03 });
    if (level < 3) {
      const kids = level === 1 ? 3 : 2;
      for (let k = 0; k < kids; k++) {
        const m = Math.round((0.18 + k * (0.62 / kids) + rnd(seed + k) * 0.08) * (pts.length - 1));
        const at = pts[m];
        nodes.push({ x: at.x, y: at.y, level: level + 1, charge: rnd(seed + k * 11) * 3, flare: -9 });
        branch(at, k % 2 ? side : -side, len * (0.46 + rnd(seed + k * 5) * 0.16), level + 1, seed * 31 + k * 97 + 5, pts.slice(m + 1).concat(down));
      }
    }
  }

  function build() {
    SW = W * 1.6;
    rivers = []; nodes = []; parts = [];
    const mouth = { x: SW - 40, y: H * 0.5 };
    const stem = course({ x: -40, y: H * 0.46 }, mouth, 17, H * 0.1);
    rivers.push({ pts: stem, w0: 2.2, w1: 7.5, stem: true });
    for (let k = 0; k < 4; k++) parts.push({ pts: stem, u: k / 4, v: 0.03 });
    const joins = [0.13, 0.24, 0.33, 0.44, 0.54, 0.63, 0.72, 0.8, 0.88];
    joins.forEach((u, i) => {
      const j = Math.round(u * (stem.length - 1)), at = stem[j];
      nodes.push({ x: at.x, y: at.y, level: i === 4 ? 0 : 1, charge: i % 3, flare: -9, big: i === 4 });
      const side = i % 2 ? 1 : -1;
      branch(at, side, H * (0.42 + rnd(i * 41) * 0.2), 1, 1000 + i * 131, stem.slice(j + 1));
    });
    const man = stem[Math.round(0.54 * (stem.length - 1))];
    labels = [{ x: man.x, y: man.y, s: "MANAUS" }, { x: mouth.x - 30, y: mouth.y, s: "BELÉM" }];
  }

  function at(pts, u) {
    const f = Math.max(0, Math.min(0.99999, u)) * (pts.length - 1), i = Math.floor(f), k = f - i;
    const a = pts[i], b = pts[i + 1] || a;
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  function stroke(r) {  // afina da nascente para a foz, em quatro lances
    const n = r.pts.length, seg = 4;
    for (let s = 0; s < seg; s++) {
      const a = Math.floor((s / seg) * (n - 1)), b = Math.floor(((s + 1) / seg) * (n - 1));
      ctx.lineWidth = r.w0 + (r.w1 - r.w0) * ((s + 0.5) / seg);
      ctx.strokeStyle = r.stem ? `rgba(${TEAL},0.55)` : `rgba(${TEAL},${0.18 + ctx.lineWidth * 0.07})`;
      ctx.beginPath(); ctx.moveTo(r.pts[a].x, r.pts[a].y);
      for (let i = a + 1; i <= b; i++) ctx.lineTo(r.pts[i].x, r.pts[i].y);
      ctx.stroke();
    }
  }

  function draw(time, dt) {
    ctx.clearRect(0, 0, W, H);
    const pan = (SW - W) * (0.5 - 0.5 * Math.cos(time / 14)); // sobrevoo: rio abaixo até a foz e de volta
    ctx.save(); ctx.translate(-pan, 0);
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    rivers.forEach(stroke);

    for (const n of nodes) {
      const age = time - n.flare, r0 = n.big ? 8 : [4, 4, 3, 2.4][n.level];
      if (n.level <= 1) { ctx.strokeStyle = `rgba(${TEAL},0.45)`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(n.x, n.y, r0 + 3, 0, 6.2832); ctx.stroke(); }
      if (age < 2.4) {
        const k = age / 2.4, R = r0 + k * (n.big ? 70 : 34 - n.level * 6);
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = AMBER; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.arc(n.x, n.y, R, 0, 6.2832); ctx.stroke();
        ctx.fillStyle = AMBER; ctx.globalAlpha = Math.min(1, 2 * (1 - k));
        ctx.beginPath(); ctx.arc(n.x, n.y, r0, 0, 6.2832); ctx.fill();
        if (n.level <= 1) ctx.fillRect(n.x - 2.5, n.y - 26 - k * 22, 5, 5); // o dado gerado sobe
        ctx.globalAlpha = 1;
      }
    }
    for (const p of parts) {
      p.u += p.v * dt * (p.pts.length > 200 ? 0.6 : 1);
      if (p.u >= 1) p.u -= 1;
      const q = at(p.pts, p.u), tail = at(p.pts, p.u - 0.022);
      const g = ctx.createLinearGradient(tail.x, tail.y, q.x, q.y);
      g.addColorStop(0, `rgba(${TEAL},0)`); g.addColorStop(1, "rgba(220,250,255,0.95)");
      ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(q.x, q.y); ctx.stroke();
    }
    // encontros acendem num ritmo próprio: carga cresce com o fluxo e dispara ao encher
    for (const n of nodes) {
      n.charge += dt * (n.big ? 0.9 : 0.55 - n.level * 0.08);
      if (n.charge >= 3) { n.charge = rnd(n.x) * 0.8; n.flare = time; }
    }
    ctx.font = '500 12px "IBM Plex Mono", ui-monospace, monospace'; ctx.textAlign = "center";
    for (const l of labels) {
      ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(l.x, l.y - 12); ctx.lineTo(l.x, l.y - 30); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.fillText(l.s, l.x, l.y - 38);
    }
    ctx.restore();
  }

  let visible = true;
  function frame(ms) {
    const time = ms / 1000, dt = t0 ? Math.min(time - t0, 0.1) : 0; t0 = time;
    if (visible && !document.hidden) draw(time, dt);
    requestAnimationFrame(frame);
  }
  resize();
  window.addEventListener("resize", () => { resize(); draw(t0 || 8, 0); });
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { draw(8, 0); return; }
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
  requestAnimationFrame(frame);
})();

// menu de idiomas: fecha ao clicar fora ou com Esc
(function langMenu() {
  const menu = document.querySelector("details.lang");
  if (!menu) return;
  document.addEventListener("click", (e) => { if (!menu.contains(e.target)) menu.open = false; });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") menu.open = false; });
})();

// links de produto já selecionam o assunto no formulário
document.querySelectorAll("[data-subject]").forEach((a) =>
  a.addEventListener("click", () => { document.getElementById("f-subject").value = a.dataset.subject; })
);

(function contactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;
  const status = document.getElementById("form-status");
  const email = (window.SITE && window.SITE.email) || "";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    if (data.get("_gotcha")) return;

    if (!FORM_ENDPOINT) {
      const body = [...data.entries()]
        .filter(([k, v]) => k !== "_gotcha" && k !== "message" && v)
        .map(([k, v]) => k + ": " + v).join("\n") + "\n\n" + data.get("message");
      location.href = "mailto:" + email + "?subject=" + encodeURIComponent("[Site] " + data.get("subject")) + "&body=" + encodeURIComponent(body);
      return;
    }
    status.textContent = form.dataset.sending;
    try {
      const r = await fetch(FORM_ENDPOINT, { method: "POST", body: data, headers: { Accept: "application/json" } });
      if (!r.ok) throw new Error(r.status);
      form.reset();
      status.textContent = form.dataset.ok;
    } catch {
      status.textContent = form.dataset.fail;
    }
  });
})();
