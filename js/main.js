/* ==========================================================
   Gustavo Mafra - retro RPG portfolio
   ========================================================== */
(() => {
    "use strict";

    const $ = (s, el = document) => el.querySelector(s);
    const $$ = (s, el = document) => [...el.querySelectorAll(s)];
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rand = (min, max) => Math.random() * (max - min) + min;
    const t = (key) => window.I18N.t(key);
    const S = () => window.STRINGS[window.I18N.lang];

    /* ---------- Level = years since first quest (2020) ---------- */
    $("#hud-level").textContent = new Date().getFullYear() - 2020;
    $("#year").textContent = new Date().getFullYear();

    /* ======================================================
       HUD: mobile menu, XP bar, current section
       ====================================================== */
    const nav = $("#hud-nav");
    const toggle = $("#menu-toggle");
    toggle.addEventListener("click", () => {
        const open = nav.classList.toggle("open");
        toggle.setAttribute("aria-expanded", open);
    });
    $$("a", nav).forEach((a) => a.addEventListener("click", () => {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
    }));

    const xpFill = $("#xp-fill");
    function onScroll() {
        const max = document.documentElement.scrollHeight - innerHeight;
        xpFill.style.width = `${max > 0 ? Math.min(100, (scrollY / max) * 100) : 0}%`;
    }
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const sectionIds = ["player", "inventory", "quests", "levels", "party"];
    const navObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const id = entry.target.id;
            $$("a", nav).forEach((a) => a.classList.toggle("current", a.getAttribute("href") === `#${id}`));
        });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sectionIds.forEach((id) => navObserver.observe(document.getElementById(id)));

    /* ---------- Reveal on scroll ---------- */
    const revealTargets = $$(".section-title, .section-lead, .panel, .tabs, .inventory");
    revealTargets.forEach((el) => el.classList.add("reveal"));
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("visible");
            revealObserver.unobserve(entry.target);
        });
    }, { threshold: 0.12 });
    revealTargets.forEach((el) => revealObserver.observe(el));

    const statsObserver = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) { $("#stats").classList.add("filled"); statsObserver.disconnect(); }
    }, { threshold: 0.4 });
    statsObserver.observe($("#stats"));

    /* ======================================================
       Title screen: stars + typewriter
       ====================================================== */
    const stars = $(".stars");
    for (let i = 0; i < 60; i++) {
        const s = document.createElement("span");
        s.style.left = `${Math.random() * 100}%`;
        s.style.top = `${Math.random() * 100}%`;
        s.style.setProperty("--d", `${2 + Math.random() * 4}s`);
        s.style.animationDelay = `${Math.random() * 4}s`;
        if (Math.random() > 0.8) { s.style.width = s.style.height = "4px"; s.style.background = "#2dd4bf"; }
        stars.appendChild(s);
    }

    const tw = $("#typewriter");
    let typing = null;
    function startTypewriter(fromStart) {
        clearTimeout(typing);
        const phrases = S().typewriter;
        if (reduceMotion || !fromStart) { tw.textContent = phrases[phrases.length - 1]; return; }
        let p = 0, c = 0, deleting = false;
        (function type() {
            const word = phrases[p];
            tw.textContent = word.slice(0, c);
            let delay = deleting ? 45 : 95;
            if (!deleting && c === word.length) {
                if (p === phrases.length - 1) return; // end on the greeting
                deleting = true; delay = 1200;
            } else if (deleting && c === 0) {
                deleting = false; p++; delay = 300;
            }
            c += deleting ? -1 : 1;
            typing = setTimeout(type, delay);
        })();
    }
    startTypewriter(true);

    /* ======================================================
       Pixel avatar
       ====================================================== */
    const SPRITE = [
        "................",
        ".....hhhhhh.....",
        "....hhhhhhhh....",
        "...hhhhhhhhhh...",
        "...hssssssssh...",
        "...sgggssgggs...",
        "...sgkgssgkgs...",
        "...ssssssssss...",
        "....sssmmsss....",
        ".....ssssss.....",
        "....tttssttt....",
        "...tttttttttt...",
        "..stttwttwttts..",
        "..stttttttttts..",
        "....pppppppp....",
        "....ppp..ppp....",
    ];
    const COLORS = { h: "#3b2a1f", s: "#f1c27d", g: "#2dd4bf", k: "#0b0f1a", m: "#b45309", t: "#2dd4bf", w: "#0f766e", p: "#283456" };
    const svg = $("#avatar-svg");
    function drawAvatar(blink = false) {
        let out = "";
        SPRITE.forEach((row, y) => [...row].forEach((ch, x) => {
            if (ch === ".") return;
            const color = blink && ch === "k" ? COLORS.g : COLORS[ch];
            out += `<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`;
        }));
        svg.innerHTML = out;
    }
    drawAvatar();
    if (!reduceMotion) {
        setInterval(() => { drawAvatar(true); setTimeout(() => drawAvatar(false), 160); }, 3800);
    }

    let pokes = 0, speechTimer;
    const avatar = $("#avatar");
    const speech = $("#speech");
    avatar.addEventListener("click", () => {
        const lines = S().lines;
        speech.textContent = lines[pokes % lines.length];
        speech.classList.add("show");
        clearTimeout(speechTimer);
        speechTimer = setTimeout(() => speech.classList.remove("show"), 2200);
        avatar.classList.remove("hit"); void avatar.offsetWidth; avatar.classList.add("hit");
        pokes++;
    });

    /* ======================================================
       Inventory
       ====================================================== */
    const rarityLabel = (r) => t("rarity." + r);
    // Item name and description in the current language.
    const itemText = (it) => {
        const pt = window.I18N.lang === "pt" ? S().items[it.n] : null;
        if (Array.isArray(pt)) return { name: pt[0], desc: pt[1] };
        return { name: it.n, desc: pt ?? it.d };
    };
    const RARITY_COLOR = { legendary: "var(--legendary)", epic: "var(--epic)", rare: "var(--rare)", common: "var(--common)" };
    const ITEMS = [
        { n: "PHP", c: "lang", r: "legendary", i: "devicon-php-plain colored", d: "My main weapon. Battle-tested daily on an ERP used by thousands of companies." },
        { n: "JavaScript", c: "lang", r: "legendary", i: "devicon-javascript-plain colored", d: "Works on both sides of the map: browser and server." },
        { n: "TypeScript", c: "lang", r: "epic", i: "devicon-typescript-plain colored", d: "Types everywhere: Electron, React and tooling in my latest projects." },
        { n: "Python", c: "lang", r: "epic", i: "devicon-python-plain colored", d: "Django backends, Celery workers and research scripts." },

        { n: "Laravel", c: "fw", r: "legendary", i: "devicon-laravel-original colored", d: "The framework I use every day at vhsys for sales, purchasing and financial modules." },
        { n: "Django", c: "fw", r: "epic", i: "devicon-django-plain", d: "Django + DRF for multi-tenant APIs, like Transport Company." },
        { n: "Yii2", c: "fw", r: "rare", i: "devicon-yii-plain colored", d: "Powered the Beto Carrero World modules I maintained." },
        { n: "Node.js", c: "fw", r: "epic", i: "devicon-nodejs-plain colored", d: "Runtime for APIs, tooling and Electron apps." },
        { n: "Express", c: "fw", r: "rare", i: "devicon-express-original", d: "Minimal and flexible for Node.js APIs." },

        { n: "React", c: "front", r: "epic", i: "devicon-react-original colored", d: "Admin panels, a medical scheduling portal and my side projects." },
        { n: "Vue.js", c: "front", r: "epic", i: "devicon-vuejs-plain colored", d: "Part of the ERP frontend I work on at vhsys." },
        { n: "React Native", c: "front", r: "rare", i: "fa-solid fa-mobile-screen-button", d: "Brought a web portal to mobile." },
        { n: "Tailwind", c: "front", r: "rare", i: "devicon-tailwindcss-original colored", d: "Utility-first styling for fast UI work." },
        { n: "HTML", c: "front", r: "rare", i: "devicon-html5-plain colored", d: "The foundation of every web level." },
        { n: "CSS", c: "front", r: "rare", i: "devicon-css3-plain colored", d: "Makes things look good, like this page." },

        { n: "MySQL", c: "db", r: "legendary", i: "devicon-mysql-original", d: "Indexes and N+1 fixes that made some queries 60–70% faster." },
        { n: "PostgreSQL", c: "db", r: "epic", i: "devicon-postgresql-plain colored", d: "Reliable relational storage for Django projects." },
        { n: "Redis", c: "db", r: "epic", i: "devicon-redis-plain colored", d: "Cache and message broker for background jobs." },
        { n: "MariaDB", c: "db", r: "rare", i: "devicon-mariadb-original", d: "The open-source MySQL sibling." },
        { n: "MongoDB", c: "db", r: "rare", i: "devicon-mongodb-plain colored", d: "Document storage for Node.js APIs." },
        { n: "SQLite", c: "db", r: "rare", i: "devicon-sqlite-plain colored", d: "Embedded database with FTS5 full-text search in Dungeon Guide AI." },

        { n: "AWS", c: "other", r: "epic", i: "fa-brands fa-aws", d: "Deployments and infrastructure for production systems." },
        { n: "Docker", c: "other", r: "epic", i: "devicon-docker-plain colored", d: "Whole stacks (Django, Celery, MySQL, Redis, React) with Docker Compose." },
        { n: "Linux", c: "other", r: "epic", i: "devicon-linux-plain", d: "Servers, terminals and deploys." },
        { n: "Git", c: "other", r: "legendary", i: "devicon-git-plain colored", d: "Save points for code. Never leave home without it." },
        { n: "Firebase", c: "other", r: "common", i: "devicon-firebase-plain colored", d: "Storage and realtime data for small projects." },
        { n: "Figma", c: "other", r: "common", i: "devicon-figma-plain colored", d: "Sketching interfaces before building them." },

        { n: "Software architecture", c: "ai", r: "epic", i: "fa-solid fa-sitemap", d: "Breaking monoliths into decoupled services. Postgraduate in Distributed Software Architecture." },
        { n: "Claude", c: "ai", r: "legendary", i: "fa-solid fa-asterisk claude-icon", d: "Part of my daily work: I write custom skills for Claude Code and use it to automate my development pipeline. In Dungeon Guide AI, the Claude API answers with tool calls." },
        { n: "LLMs", c: "ai", r: "epic", i: "fa-solid fa-robot", d: "Prompting, embeddings and local models through Ollama." },
        { n: "RAG", c: "ai", r: "rare", i: "fa-solid fa-magnifying-glass-chart", d: "Hybrid search (embeddings + BM25 + RRF) over a whole wiki." },
        { n: "REST APIs", c: "ai", r: "legendary", i: "fa-solid fa-plug", d: "Designing and integrating APIs, including payment gateways used daily." },
        { n: "Automated tests", c: "ai", r: "epic", i: "fa-solid fa-vial-circle-check", d: "Introduced tests in my squad, keeping 80–90% coverage." },
    ];

    const grid = $("#inventory-grid");
    function renderInventory() {
        grid.innerHTML = ITEMS.map((it, idx) => {
            const { name } = itemText(it);
            return `
        <li>
            <button class="slot ${it.r}" data-idx="${idx}" data-cat="${it.c}" aria-label="${name}, ${rarityLabel(it.r)}" style="width:100%">
                <i class="${it.i}" aria-hidden="true"></i>
                <span class="slot-name">${name}</span>
            </button>
        </li>`;
        }).join("");
    }
    renderInventory();

    let selectedIdx = null;
    function showItem(btn) {
        const it = ITEMS[btn.dataset.idx];
        const { name, desc } = itemText(it);
        selectedIdx = btn.dataset.idx;
        $$(".slot", grid).forEach((s) => s.classList.toggle("selected", s === btn));
        $("#detail-icon").innerHTML = `<i class="${it.i}"></i>`;
        $("#detail-icon").style.borderColor = RARITY_COLOR[it.r];
        $("#detail-name").textContent = name;
        $("#detail-rarity").textContent = rarityLabel(it.r);
        $("#detail-rarity").style.color = RARITY_COLOR[it.r];
        $("#detail-desc").textContent = desc;
    }
    grid.addEventListener("click", (e) => { const b = e.target.closest(".slot"); if (b) showItem(b); });
    grid.addEventListener("mouseover", (e) => {
        const b = e.target.closest(".slot");
        if (b && matchMedia("(hover: hover)").matches) showItem(b);
    });

    $("#inv-tabs").addEventListener("click", (e) => {
        const tab = e.target.closest(".tab");
        if (!tab) return;
        $$(".tab", e.currentTarget).forEach((t) => t.classList.toggle("active", t === tab));
        const f = tab.dataset.filter;
        $$(".slot", grid).forEach((s) => {
            const show = f === "all" || s.dataset.cat === f;
            s.parentElement.style.display = show ? "" : "none";
            if (show) { s.classList.remove("pop"); void s.offsetWidth; s.classList.add("pop"); }
        });
    });

    /* ======================================================
       Project galleries
       ====================================================== */
    $$(".level-gallery").forEach((gallery) => {
        const main = $("[data-main]", gallery);
        gallery.addEventListener("click", (e) => {
            const thumb = e.target.closest(".thumb");
            if (!thumb || thumb.classList.contains("active")) return;
            $$(".thumb", gallery).forEach((t) => t.classList.toggle("active", t === thumb));
            main.classList.add("fading");
            setTimeout(() => {
                main.src = thumb.dataset.src;
                main.alt = t(thumb.dataset.altKey);
                main.dataset.i18nAttr = "alt:" + thumb.dataset.altKey;
                main.classList.remove("fading");
            }, reduceMotion ? 0 : 200);
        });
    });

    /* ======================================================
       Language
       ====================================================== */
    $("#lang-toggle").addEventListener("click", () => {
        window.I18N.set(window.I18N.lang === "pt" ? "en" : "pt");
    });
    document.addEventListener("langchange", () => {
        startTypewriter(false);
        renderInventory();
        const tab = $("#inv-tabs .tab.active");
        if (tab && tab.dataset.filter !== "all") tab.click();
        if (selectedIdx !== null) showItem($(`.slot[data-idx="${selectedIdx}"]`, grid));
    });

    /* ======================================================
       Konami code → party mode
       ====================================================== */
    const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    let k = 0;
    addEventListener("keydown", (e) => {
        const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        k = key === KONAMI[k] ? k + 1 : key === KONAMI[0] ? 1 : 0;
        if (k === KONAMI.length) { k = 0; partyMode(); }
    });

    function partyMode() {
        if (reduceMotion) return;
        document.body.classList.add("party-mode");
        const colors = ["#2dd4bf", "#f472b6", "#facc15", "#a78bfa", "#38bdf8"];
        for (let i = 0; i < 120; i++) {
            const c = document.createElement("div");
            c.className = "confetti";
            c.style.left = `${Math.random() * 100}vw`;
            c.style.background = colors[i % colors.length];
            c.style.animationDuration = `${rand(2, 4)}s`;
            c.style.animationDelay = `${rand(0, 1)}s`;
            document.body.appendChild(c);
            setTimeout(() => c.remove(), 5200);
        }
        setTimeout(() => document.body.classList.remove("party-mode"), 5000);
    }
})();
