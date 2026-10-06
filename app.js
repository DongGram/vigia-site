/* Vigía · progressive enhancement only: every page reads fine without this file. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const KO = document.documentElement.lang === "ko", LOC = KO ? "ko-KR" : "es-MX";

  /* reveal on scroll */
  const items = $$("[data-reveal]");
  if ("IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }), { rootMargin: "0px 0px -6% 0px" });
    items.forEach((el) => io.observe(el));
  } else items.forEach((el) => el.classList.add("in"));

  /* "updated N hours ago" */
  const live = $(".live[data-built]");
  if (live) {
    const t = new Date(live.dataset.built), mins = Math.round((Date.now() - t) / 60000);
    const label = $(".live-t", live);
    if (!isNaN(mins) && label) {
      label.textContent = KO
        ? (mins < 2 ? "방금 업데이트" : mins < 60 ? `${mins}분 전 업데이트` : mins < 24 * 60 ? `${Math.round(mins / 60)}시간 전 업데이트`
          : t.toLocaleDateString(LOC, { month: "long", day: "numeric" }) + " 업데이트")
        : (mins < 2 ? "Actualizado ahora" : mins < 60 ? `Actualizado hace ${mins} min`
          : mins < 24 * 60 ? `Actualizado hace ${Math.round(mins / 60)} h`
          : "Actualizado el " + t.toLocaleDateString(LOC, { day: "numeric", month: "short" }));
    }
  }

  /* effective-date countdowns follow the reader's today, not the build day */
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  $$("[data-eff]").forEach((el) => {
    const [y, m, d] = el.dataset.eff.split("-").map(Number), eff = new Date(y, m - 1, d);
    const n = Math.round((eff - today) / 864e5);
    el.textContent = KO
      ? (n > 1 ? `${n}일 후 시행` : n === 1 ? "내일 시행" : n === 0 ? "오늘 시행" : `${y}년 ${m}월 ${d}일 시행`)
      : n > 1 ? `Entra en vigor en ${n} días` : n === 1 ? "Entra en vigor mañana" : n === 0 ? "Entra en vigor hoy"
      : `En vigor desde el ${d} de ${MES[m - 1]} de ${y}`;
    el.classList.toggle("is-soon", n >= 0 && n <= 7);
  });

  /* reading progress on publication pages */
  const bar = $(".progress");
  if (bar && !reduce) {
    const upd = () => {
      const h = document.documentElement, max = h.scrollHeight - h.clientHeight;
      bar.style.transform = `scaleX(${max > 0 ? h.scrollTop / max : 0})`;
    };
    addEventListener("scroll", upd, { passive: true }); upd();
  }

  /* ticker: duplicate once for a seamless loop */
  const track = $("[data-ticker]");
  if (track && !reduce) track.innerHTML += track.innerHTML.replace(/href=/g, 'tabindex="-1" aria-hidden="true" href=');

  /* count-up stats */
  if (!reduce && "IntersectionObserver" in window) {
    const fmt = new Intl.NumberFormat(LOC);
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const end = +e.target.dataset.count, t0 = performance.now(), dur = 1100;
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur), v = Math.round(end * (1 - Math.pow(1 - p, 3)));
        e.target.textContent = fmt.format(v);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }), { threshold: .6 });
    $$("[data-count]").forEach((el) => io.observe(el));
  }

  /* filters: semáforo and topic chips */
  $$("[data-filters]").forEach((bar) => {
    const scope = bar.parentElement;
    const empty = bar.nextElementSibling;
    bar.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-f]");
      if (!b) return;
      $$("[data-f]", bar).forEach((x) => { x.classList.toggle("is-on", x === b); x.setAttribute("aria-pressed", x === b); });
      const f = b.dataset.f;
      let shown = 0;
      $$(".group", scope).forEach((g) => {
        let n = 0;
        $$(".card", g).forEach((c) => {
          const ok = f === "*" || (f.startsWith("sem:") ? c.dataset.sem === f.slice(4)
            : (" " + c.dataset.topics + " ").includes(" " + f.slice(2) + " "));
          c.hidden = !ok; if (ok) { n++; c.classList.add("in"); }
        });
        const others = $(".others", g);
        if (others) others.hidden = f !== "*";
        g.hidden = f !== "*" && n === 0;
        shown += n;
      });
      if (empty) empty.hidden = f === "*" || shown > 0;
    });
  });

  /* copy link */
  $$("[data-copy]").forEach((b) => b.addEventListener("click", async () => {
    const url = b.dataset.copy || location.href;
    try { await navigator.clipboard.writeText(url.startsWith("http") ? url : location.href); } catch (e) { return; }
    const t = b.textContent; b.textContent = b.dataset.copied || "¡Enlace copiado!"; setTimeout(() => (b.textContent = t), 1600);
  }));

  /* floating WhatsApp button hides while the big call-to-action is on screen */
  const fab = $(".wa-float"), cta = $(".cta");
  if (fab && cta && "IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => fab.classList.toggle("is-hidden", e.isIntersecting)).observe(cta);
  }

  /* search palette: "/" or Ctrl/⌘+K */
  const dlg = $("#search");
  if (!dlg || typeof dlg.showModal !== "function") return;
  const q = $("#search-q"), list = $("#search-r");
  let data = null, sel = 0, results = [];
  const fold = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").normalize("NFC").toLowerCase();   // NFC again: Hangul stays one character per syllable
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fecha = (d) => new Date(d + "T12:00:00").toLocaleDateString(LOC, { day: "numeric", month: "short", year: "numeric" });
  const load = () => data ? Promise.resolve(data) : fetch(dlg.dataset.index || "/buscar.json").then((r) => r.json()).then((j) => (data = j.map((x) => ({ ...x, f: fold(x.h + " " + x.t.join(" ") + " " + x.s) }))));
  const mark = (h, terms) => {
    let out = esc(h);
    terms.forEach((t) => {
      if (t.length < 2) return;
      const f = fold(out), i = f.indexOf(t);
      if (i >= 0 && !/[<>&]/.test(out.slice(i, i + t.length))) out = out.slice(0, i) + "<mark>" + out.slice(i, i + t.length) + "</mark>" + out.slice(i + t.length);
    });
    return out;
  };
  const render = () => {
    const terms = fold(q.value.trim()).split(/\s+/).filter(Boolean);
    if (!data) { list.innerHTML = `<li class="empty">${esc(dlg.dataset.loading || "…")}</li>`; return; }
    if (!terms.length) results = data.filter((x) => x.x).slice(0, 8);
    else {
      results = data.map((x) => {
        let sc = 0;
        for (const t of terms) { const i = x.f.indexOf(t); if (i < 0) return null; sc += i === 0 ? 3 : 1; }
        return [sc + (x.x ? 2 : 0) + (x.k === "rojo" ? 1 : 0), x];
      }).filter(Boolean).sort((a, b) => b[0] - a[0] || (a[1].d < b[1].d ? 1 : -1)).slice(0, 30).map((r) => r[1]);
    }
    sel = 0;
    list.innerHTML = results.length ? results.map((x, i) =>
      `<li><a href="${esc(x.p)}" role="option" aria-selected="${i === sel}"${x.x ? "" : ' rel="noopener"'}><span class="dot dot-${x.k}" aria-hidden="true"></span><span>${mark(x.h, terms)}</span><span class="m">${esc(x.s)} · ${fecha(x.d)}${x.t.length ? " · " + esc(x.t.join(", ")) : ""}</span></a></li>`
    ).join("") : `<li class="empty">${esc(dlg.dataset.empty || "")}</li>`;
  };
  const move = (d) => {
    const as = $$("a", list); if (!as.length) return;
    sel = (sel + d + as.length) % as.length;
    as.forEach((a, i) => a.setAttribute("aria-selected", i === sel));
    as[sel].scrollIntoView({ block: "nearest" });
  };
  const open = () => { dlg.showModal(); q.value = ""; q.focus(); load().then(render); render(); };
  $$("[data-search-open]").forEach((b) => b.addEventListener("click", open));
  q.addEventListener("input", () => load().then(render));
  q.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Enter") { e.preventDefault(); const a = $$("a", list)[sel]; if (a) location.href = a.href; }
  });
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  document.addEventListener("keydown", (e) => {
    const typing = /input|textarea|select/i.test(document.activeElement?.tagName || "");
    if ((e.key === "/" && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) {
      if (!dlg.open) { e.preventDefault(); open(); }
    }
  });
})();
