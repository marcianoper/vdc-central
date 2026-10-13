/* =========================================================
   VDC 360° Central — Panel de Revisiones de Pesadas
   Muestra los mensajes de la revisión cada hora (izquierda)
   y del cierre del día (derecha) usando el espacio libre
   a los lados. En pantallas angostas aparece un botón
   flotante que abre los mensajes en un cajón.
   Lee la tabla Supabase: public.revisiones_pesadas
   ========================================================= */
(function () {
  const SUPABASE_URL = "https://bjebybdqcqscouxlinfd.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqZWJ5YmRxY3FzY291eGxpbmZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMjQ3MTksImV4cCI6MjA3MTkwMDcxOX0.mQgWtiYEyJTiF04pdcLv63SqPNrU1Iehws0vKqr82O0";
  const LADO_MIN = 300;      // espacio mínimo libre a cada lado para usar los 2 paneles laterales
  const ANCHO_FIJO = 230;    // ancho de la columna fija a la derecha cuando no hay espacio a los lados
  const PANTALLA_MIN = 1150; // debajo de este ancho solo se muestra el botón flotante
  const TZ = "America/Mexico_City";

  const REST = SUPABASE_URL + "/rest/v1/revisiones_pesadas";
  const HEADERS = { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY };

  /* ---------- estilos ---------- */
  const css = `
  .rvp-side{position:fixed;top:84px;bottom:20px;z-index:40;display:none;flex-direction:column;
    width:var(--rvp-w,300px);max-width:380px;
    background:#fff;border:1px solid #e6e6e1;border-radius:16px;overflow:hidden;
    font-family:inherit;color:#1c1c1a;box-shadow:0 1px 2px rgba(0,0,0,.03)}
  .rvp-side.izq{left:22px}.rvp-side.der{right:22px}
  html.rvp-modo-lados .rvp-side{display:flex}
  html.rvp-modo-lados .rvp-fab,html.rvp-modo-fijo .rvp-fab{display:none!important}
  html.rvp-modo-fijo body{padding-right:${ANCHO_FIJO}px!important}
  html.rvp-modo-fijo .rvp-drawer{display:block;left:auto;width:${ANCHO_FIJO}px;background:none}
  html.rvp-modo-fijo .rvp-drawer-box{width:100%;border-left:1px solid #e6e6e1;box-shadow:none}
  html.rvp-modo-fijo .rvp-x{display:none}
  .rvp-head{padding:16px 16px 12px;border-bottom:1px solid #efefea;display:flex;align-items:center;gap:10px}
  .rvp-head h3{margin:0;font-size:14px;font-weight:600;flex:1;line-height:1.25}
  .rvp-head small{display:block;font-weight:400;color:#7a7a72;font-size:11.5px;margin-top:2px}
  .rvp-dot{width:8px;height:8px;border-radius:50%;background:#1f6b3f;flex:none}
  .rvp-dot.off{background:#c9c9c2}
  .rvp-count{background:#c0392b;color:#fff;font-size:11px;font-weight:600;border-radius:999px;padding:2px 7px;display:none}
  .rvp-list{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:8px}
  .rvp-item{border:1px solid #ececE6;border-radius:12px;padding:10px 12px;background:#fafaf8;cursor:pointer;transition:background .15s}
  .rvp-item:hover{background:#f3f3ef}
  .rvp-item.nuevo{background:#fff;border-color:#f0c9c4;box-shadow:inset 3px 0 0 #c0392b}
  .rvp-item.ok{opacity:.7}
  .rvp-item.ok.nuevo{border-color:#cfe3d5;box-shadow:inset 3px 0 0 #1f6b3f}
  .rvp-meta{display:flex;align-items:center;gap:6px;font-size:11.5px;color:#7a7a72;margin-bottom:6px}
  .rvp-tag{font-size:11px;font-weight:600;border-radius:6px;padding:2px 7px}
  .rvp-tag.mal{background:#fbe9e7;color:#a8321f}.rvp-tag.bien{background:#e7f3ea;color:#1f6b3f}
  .rvp-msg{white-space:pre-wrap;font-size:12.5px;line-height:1.45;word-break:break-word}
  .rvp-item.ok .rvp-msg{color:#5d5d56}
  .rvp-day{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#8a8a82;margin:6px 4px 0}
  .rvp-empty{color:#8a8a82;font-size:12.5px;text-align:center;padding:28px 12px;line-height:1.5}
  .rvp-foot{border-top:1px solid #efefea;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;font-size:11.5px;color:#7a7a72}
  .rvp-foot button{border:1px solid #e3e3dd;background:#fff;border-radius:8px;padding:4px 9px;font:inherit;font-size:11.5px;cursor:pointer;color:#1c1c1a}
  .rvp-foot button:hover{background:#f3f3ef}
  .rvp-fab{position:fixed;right:18px;bottom:18px;z-index:60;background:#1f6b3f;color:#fff;border:0;border-radius:999px;
    padding:11px 16px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.18);display:flex;gap:8px;align-items:center}
  .rvp-fab .rvp-count{display:inline-block;background:#fff;color:#c0392b}
  .rvp-drawer{position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.35);display:none}
  .rvp-drawer.open{display:block}
  .rvp-drawer-box{position:absolute;right:0;top:0;bottom:0;width:min(420px,100%);background:#fff;display:flex;flex-direction:column;font-family:inherit}
  .rvp-tabs{display:flex;gap:6px;padding:10px 12px;border-bottom:1px solid #efefea}
  .rvp-tabs button{flex:1;border:1px solid #e3e3dd;background:#fff;border-radius:9px;padding:7px;font:inherit;font-size:12.5px;cursor:pointer}
  .rvp-tabs button.act{background:#1f6b3f;color:#fff;border-color:#1f6b3f}
  .rvp-x{border:0;background:none;font-size:20px;cursor:pointer;color:#555;line-height:1}
  @media (prefers-color-scheme:dark){}
  `;
  const st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------- utilidades ---------- */
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const hoyMX = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
  const hora = (iso) => new Date(iso).toLocaleTimeString("es-MX", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
  const diaLargo = (f) => {
    const [y, m, d] = f.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short" });
  };

  /* ---------- armar paneles ---------- */
  function panel(lado, titulo, sub) {
    const el = document.createElement("aside");
    el.className = "rvp-side " + lado;
    el.innerHTML = `
      <div class="rvp-head"><span class="rvp-dot off"></span>
        <h3>${titulo}<small>${sub}</small></h3><span class="rvp-count"></span></div>
      <div class="rvp-list"><div class="rvp-empty">Cargando…</div></div>
      <div class="rvp-foot"><span class="rvp-upd">—</span><button type="button">Marcar leídos</button></div>`;
    document.body.appendChild(el);
    return el;
  }
  const pHora = panel("izq", "Revisión cada hora", "Hoy · lun–sáb 8:05 a 17:05");
  const pCierre = panel("der", "Cierre del día", "Últimos cierres · 6:52 pm");

  const fab = document.createElement("button");
  fab.className = "rvp-fab";
  fab.type = "button";
  fab.innerHTML = `Revisiones <span class="rvp-count" style="display:none"></span>`;
  document.body.appendChild(fab);

  const drawer = document.createElement("div");
  drawer.className = "rvp-drawer";
  drawer.innerHTML = `<div class="rvp-drawer-box">
      <div class="rvp-head"><span class="rvp-dot off"></span><h3>Revisiones de pesadas<small>Mensajes de Claude</small></h3>
      <button class="rvp-x" type="button" aria-label="Cerrar">×</button></div>
      <div class="rvp-tabs"><button type="button" data-t="hora" class="act">Cada hora</button><button type="button" data-t="cierre">Cierres</button></div>
      <div class="rvp-list"></div>
      <div class="rvp-foot"><span class="rvp-upd">—</span><button type="button">Marcar leídos</button></div></div>`;
  document.body.appendChild(drawer);
  let tabDrawer = "hora";
  fab.onclick = () => { drawer.classList.add("open"); pintar(); };
  drawer.onclick = (e) => { if (e.target === drawer) drawer.classList.remove("open"); };
  drawer.querySelector(".rvp-x").onclick = () => drawer.classList.remove("open");
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") drawer.classList.remove("open"); });
  drawer.querySelectorAll(".rvp-tabs button").forEach((b) => (b.onclick = () => {
    tabDrawer = b.dataset.t;
    drawer.querySelectorAll(".rvp-tabs button").forEach((x) => x.classList.toggle("act", x === b));
    pintar();
  }));

  /* ---------- datos ---------- */
  let filas = [];
  let enLinea = false;

  async function cargar() {
    try {
      const desde = new Date(Date.now() - 8 * 864e5).toISOString().slice(0, 10);
      const r = await fetch(`${REST}?select=*&fecha=gte.${desde}&order=creado_at.desc&limit=200`, { headers: HEADERS });
      if (!r.ok) throw new Error(r.status);
      filas = await r.json();
      enLinea = true;
    } catch (e) {
      enLinea = false;
    }
    pintar();
  }

  async function marcarLeidos(ids) {
    if (!ids.length) return;
    filas.forEach((f) => { if (ids.includes(f.id)) f.leido = true; });
    pintar();
    try {
      await fetch(`${REST}?id=in.(${ids.join(",")})`, {
        method: "PATCH",
        headers: { ...HEADERS, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ leido: true }),
      });
    } catch (e) {}
  }

  function item(f, conDia) {
    const ok = f.incidencias === 0;
    const tag = ok
      ? `<span class="rvp-tag bien">${f.tipo === "cierre" ? "Todo cuadra" : "Sin incidencias"}</span>`
      : `<span class="rvp-tag mal">${f.incidencias} incidencia${f.incidencias === 1 ? "" : "s"}</span>`;
    return `<div class="rvp-item ${ok ? "ok" : ""} ${f.leido ? "" : "nuevo"}" data-id="${f.id}">
      <div class="rvp-meta">${tag}<span>${conDia ? diaLargo(f.fecha) + " · " : ""}${hora(f.creado_at)}</span></div>
      <div class="rvp-msg">${esc(f.mensaje)}</div></div>`;
  }

  function htmlHora() {
    const hoy = hoyMX();
    const deHoy = filas.filter((f) => f.tipo === "hora" && f.fecha === hoy);
    if (!deHoy.length) return `<div class="rvp-empty">Todavía no hay revisiones hoy.<br>La primera corre a las 8:05 am (lun–sáb).</div>`;
    return deHoy.map((f) => item(f, false)).join("");
  }
  function htmlCierre() {
    const c = filas.filter((f) => f.tipo === "cierre").slice(0, 7);
    if (!c.length) return `<div class="rvp-empty">Aún no hay cierres guardados.<br>El siguiente llega a las 6:52 pm.</div>`;
    return c.map((f) => item(f, true)).join("");
  }

  function pendientes(tipo) {
    const hoy = hoyMX();
    return filas.filter((f) => !f.leido && f.tipo === tipo && (tipo === "cierre" || f.fecha === hoy));
  }

  function setCount(el, n) {
    el.textContent = n;
    el.style.display = n ? "inline-block" : "none";
  }

  function conectarClicks(cont) {
    cont.querySelectorAll(".rvp-item.nuevo").forEach((it) => (it.onclick = () => marcarLeidos([Number(it.dataset.id)])));
  }

  function pintar() {
    const upd = enLinea ? "Actualizado " + new Date().toLocaleTimeString("es-MX", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }) : "Sin conexión";
    const nH = pendientes("hora"), nC = pendientes("cierre");

    [[pHora, htmlHora(), nH], [pCierre, htmlCierre(), nC]].forEach(([p, html, pend]) => {
      p.querySelector(".rvp-list").innerHTML = html;
      p.querySelector(".rvp-dot").classList.toggle("off", !enLinea);
      p.querySelector(".rvp-upd").textContent = upd;
      setCount(p.querySelector(".rvp-head .rvp-count"), pend.filter((f) => f.incidencias > 0).length);
      p.querySelector(".rvp-foot button").onclick = () => marcarLeidos(pend.map((f) => f.id));
      conectarClicks(p);
    });

    const dl = drawer.querySelector(".rvp-list");
    dl.innerHTML = tabDrawer === "hora" ? htmlHora() : htmlCierre();
    drawer.querySelector(".rvp-dot").classList.toggle("off", !enLinea);
    drawer.querySelector(".rvp-upd").textContent = upd;
    drawer.querySelector(".rvp-foot button").onclick = () => marcarLeidos((tabDrawer === "hora" ? nH : nC).map((f) => f.id));
    conectarClicks(drawer);

    setCount(fab.querySelector(".rvp-count"), [...nH, ...nC].filter((f) => f.incidencias > 0).length);
  }

  /* ---------- en vivo ---------- */
  function enVivo() {
    const arrancar = () => {
      try {
        const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        sb.channel("rvp-revisiones")
          .on("postgres_changes", { event: "*", schema: "public", table: "revisiones_pesadas" }, cargar)
          .subscribe();
      } catch (e) {}
    };
    if (window.supabase && window.supabase.createClient) return arrancar();
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    s.onload = arrancar;
    document.head.appendChild(s);
  }

  /* ---------- acomodo según el espacio real de la pantalla ---------- */
  function espacioLibre() {
    // Busca el bloque centrado más ancho del dashboard (la columna de módulos)
    const vw = document.documentElement.clientWidth;
    let mejor = 0;
    const els = document.body.querySelectorAll("body > *, body > * > *, body > * > * > *");
    for (const el of els) {
      if (el.closest(".rvp-side,.rvp-drawer,.rvp-fab")) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 500 || r.width > vw - 40) continue;
      if (Math.abs(r.left - (vw - r.right)) > 24) continue;
      if (r.width > mejor) mejor = r.width;
    }
    return mejor ? (vw - mejor) / 2 : 0;
  }

  function acomodar() {
    const html = document.documentElement;
    html.classList.remove("rvp-modo-lados", "rvp-modo-fijo");
    const vw = html.clientWidth;
    const lado = espacioLibre();
    if (lado >= LADO_MIN) {
      html.style.setProperty("--rvp-w", Math.min(380, lado - 44) + "px");
      html.classList.add("rvp-modo-lados");
    } else if (vw >= PANTALLA_MIN) {
      html.classList.add("rvp-modo-fijo");
    }
  }
  let tAc;
  window.addEventListener("resize", () => { clearTimeout(tAc); tAc = setTimeout(acomodar, 150); });
  if (document.readyState === "complete") acomodar();
  else window.addEventListener("load", acomodar);
  acomodar();

  cargar();
  enVivo();
  setInterval(cargar, 5 * 60 * 1000); // respaldo: recarga cada 5 min
})();
