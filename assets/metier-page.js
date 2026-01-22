/* metier-page.v11.1.js — Ulydia
   - Uses the exact design/markup from propal1-fiche metier.html
   - Loads Tailwind CDN + Outfit font (only once)
   - Injects the propal CSS variables/styles (only once)
   - Reads /assets/catalog.json to set banners (wide + square) for selected ISO
   - Auto-detects which image is wide vs square by image ratio (prevents inversion)

   Query params:
     ?iso=FR (default FR)
     ?slug=analyste-juridique (optional, only used for debug box)
*/
(() => {
  if (window.__ULYDIA_METIER_V111__) return;
  window.__ULYDIA_METIER_V111__ = true;

  const ASSETS_BASE = "https://ulydia-assets.pages.dev/assets";
  const CATALOG_URL = `${ASSETS_BASE}/catalog.json`;

  // ---------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------
  function $(sel, root=document) { return root.querySelector(sel); }
  function $all(sel, root=document) { return Array.from(root.querySelectorAll(sel)); }

  function ensureLink(id, href) {
    if (document.getElementById(id)) return;
    const l = document.createElement("link");
    l.id = id;
    l.rel = "stylesheet";
    l.href = href;
    document.head.appendChild(l);
  }

  function ensureScript(id, src) {
    if (document.getElementById(id)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.id = id;
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = (e) => reject(new Error("Failed to load " + src));
      document.head.appendChild(s);
    });
  }

  function ensureStyle(id, cssText) {
    let st = document.getElementById(id);
    if (!st) {
      st = document.createElement("style");
      st.id = id;
      document.head.appendChild(st);
    }
    if (!st.textContent || st.textContent.length < 50) st.textContent = cssText;
  }

  function detectISO() {
    const u = new URL(location.href);
    const iso = String(u.searchParams.get("iso") || "").trim().toUpperCase();
    return iso || "FR";
  }

  function detectSlug() {
    const u = new URL(location.href);
    return String(u.searchParams.get("slug") || "").trim();
  }

  function pickFirst(...vals) {
    for (const v of vals) {
      if (v === undefined || v === null) continue;
      if (typeof v === "string" && v.trim() === "") continue;
      if (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0) continue;
      return v;
    }
    return "";
  }

  function pickUrl(v) {
    if (!v) return "";
    if (typeof v === "string") return v.trim();
    if (Array.isArray(v)) {
      for (const it of v) {
        const u = pickUrl(it);
        if (u) return u;
      }
      return "";
    }
    if (typeof v === "object") {
      const u = pickFirst(
        v.url, v.src, v.href, v.original, v.originalUrl, v.assetUrl, v.cdnUrl,
        v?.file?.url, v?.file?.src,
        v?.image?.url, v?.image?.src
      );
      return typeof u === "string" ? u.trim() : "";
    }
    return "";
  }

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Fetch failed ${res.status} for ${url} :: ${t.slice(0,140)}`);
    }
    return res.json();
  }

  function setBg(el, url) {
    if (!el) return false;
    if (url) {
      el.style.backgroundImage = `url("${url}")`;
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
      el.style.backgroundRepeat = "no-repeat";
    }
    return true;
  }

  function getImageRatio(url) {
    return new Promise((resolve) => {
      if (!url) return resolve(0);
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || 0;
        const h = img.naturalHeight || 1;
        resolve(w / h);
      };
      img.onerror = () => resolve(0);
      img.src = url;
    });
  }

  // ---------------------------------------------------------
  // Render propal HTML (exact)
  // ---------------------------------------------------------
  function ensureRoot() {
    let root = document.getElementById("ulydia-metier-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "ulydia-metier-root";
      // Important: do NOT wipe the whole body; just add our root at top
      document.body.prepend(root);
    }
    return root;
  }

  function renderShell(root) {
    root.innerHTML = `<div class="w-full h-full" style="background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);"><!-- Barre de Filtres -->
   <div class="w-full" style="background: white; border-bottom: 2px solid var(--border); box-shadow: 0 2px 8px rgba(0,0,0,.05);">
    <div class="max-w-[1200px] mx-auto px-6 py-4">
     <div class="grid grid-cols-1 md:grid-cols-3 gap-4"><!-- Filtre Pays -->
      <div class="relative"><label for="filter-pays" class="block text-xs font-semibold mb-2" style="color: var(--text);"> 🌍 Pays / Région </label>
       <div class="relative"><select id="filter-pays" class="w-full px-4 py-3 pr-10 rounded-lg border-2 text-sm font-medium appearance-none cursor-pointer transition-all" style="border-color: var(--border); color: var(--text); background: white;"> <option value="">Tous les pays</option> <option value="FR" selected>🇫🇷 France</option> <option value="BE">🇧🇪 Belgique</option> <option value="CH">🇨🇭 Suisse</option> <option value="CA">🇨🇦 Canada</option> <option value="LU">🇱🇺 Luxembourg</option> <option value="UK">🇬🇧 Royaume-Uni</option> <option value="US">🇺🇸 États-Unis</option> <option value="DE">🇩🇪 Allemagne</option> <option value="ES">🇪🇸 Espagne</option> <option value="IT">🇮🇹 Italie</option> <option value="PT">🇵🇹 Portugal</option> <option value="NL">��🇱 Pays-Bas</option> </select>
        <div class="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
         <svg width="20" height="20" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9" />
         </svg>
        </div>
       </div>
      </div><!-- Filtre Secteur d'activité -->
      <div class="relative"><label for="filter-secteur" class="block text-xs font-semibold mb-2" style="color: var(--text);"> 🏢 Secteur d'activité </label>
       <div class="relative"><select id="filter-secteur" class="w-full px-4 py-3 pr-10 rounded-lg border-2 text-sm font-medium appearance-none cursor-pointer transition-all" style="border-color: var(--border); color: var(--text); background: white;"> <option value="">Tous les secteurs</option> <option value="tech" selected>💻 Technologies &amp; Numérique</option> <option value="finance">💰 Finance &amp; Banque</option> <option value="sante">🏥 Santé &amp; Médical</option> <option value="commerce">🛍️ Commerce &amp; Distribution</option> <option value="industrie">🏭 Industrie &amp; Manufacturing</option> <option value="construction">🏗️ BTP &amp; Construction</option> <option value="transport">����� Transport &amp; Logistique</option> <option value="education">📚 Éducation &amp; Formation</option> <option value="communication">📢 Communication &amp; Marketing</option> <option value="juridique">⚖️ Juridique &amp; Droit</option> <option value="rh">👥 Ressources Humaines</option> <option value="hotellerie">🏨 Hôtellerie &amp; Restauration</option> <option value="environnement">🌱 Environnement &amp; Énergie</option> <option value="art">🎨 Arts &amp; Culture</option> <option value="securite">🔒 Sécurité &amp; Défense</option> </select>
        <div class="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
         <svg width="20" height="20" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9" />
         </svg>
        </div>
       </div>
      </div><!-- Recherche Métier (Saisie Assistée) -->
      <div class="relative"><label for="filter-metier" class="block text-xs font-semibold mb-2" style="color: var(--text);"> 🔍 Rechercher un métier </label>
       <div class="relative"><input type="text" id="filter-metier" placeholder="Ex: Développeur, Designer, Chef de projet..." class="w-full px-4 py-3 pr-10 rounded-lg border-2 text-sm font-medium transition-all" style="border-color: var(--border); color: var(--text); background: white;" autocomplete="off">
        <div class="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
         <svg width="20" height="20" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8" /> <path d="m21 21-4.35-4.35" />
         </svg>
        </div><!-- Dropdown Suggestions -->
        <div id="metier-suggestions" class="absolute top-full left-0 right-0 mt-2 rounded-lg border-2 overflow-hidden z-50 hidden" style="border-color: var(--border); background: white; box-shadow: 0 8px 24px rgba(0,0,0,.12); max-height: 320px; overflow-y: auto;"><!-- Suggestions dynamiques -->
        </div>
       </div>
      </div>
     </div><!-- Bouton Réinitialiser -->
     <div class="mt-4 flex items-center justify-between"><button id="reset-filters" class="text-sm font-semibold flex items-center gap-2 px-4 py-2 rounded-lg transition-all" style="color: var(--muted);">
       <svg width="16" height="16" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /> <path d="M21 3v5h-5" /> <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /> <path d="M3 21v-5h5" />
       </svg> Réinitialiser les filtres </button>
      <div class="text-xs font-semibold" style="color: var(--muted);"><span id="result-count">1</span> fiche(s) métier trouvée(s)
      </div>
     </div>
    </div>
   </div><!-- Header Métier -->
   <header class="w-full" style="border-bottom: 2px solid var(--border); background: white;">
    <div class="max-w-[1200px] mx-auto px-6 py-10">
     <div class="flex items-start gap-5 mb-5">
      <div class="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 gradient-primary">
       <svg width="40" height="40" viewbox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polyline points="16 18 22 12 16 6" /> <polyline points="8 6 2 12 8 18" />
       </svg>
      </div>
      <div class="flex-1"><span class="badge badge-primary">💼 Fiche Métier</span>
       <h1 id="nom-metier" class="text-5xl font-bold mt-4 mb-3 tracking-tight" style="color: var(--text);">Développeur Full-Stack</h1>
       <p id="accroche-metier" class="text-xl" style="color: var(--muted);">Créez des applications web modernes de A à Z, maîtrisez le front-end et le back-end</p>
      </div>
     </div><!-- Sponsor Banner Wide (Centré sous l'accroche) -->
     <div class="flex justify-center mt-8"><a id="sponsor-banner-link" href="#" target="_blank" rel="noopener noreferrer" class="sponsor-banner-wide gradient-primary block">
       <div class="w-full h-full flex items-center justify-center text-white">
        <div class="text-center">
         <div class="mb-3">
          <svg width="56" height="56" viewbox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /> <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
         </div>
         <p class="text-sm font-semibold mb-2 opacity-90">Formation sponsorisée par</p>
         <h3 id="sponsor-name-banner" class="text-3xl font-bold">École 42</h3>
         <p class="text-sm mt-2 opacity-80">Formation intensive • 100% gratuite • Reconnu par l'État</p>
        </div>
       </div></a>
     </div>
    </div>
   </header><!-- Main Content -->
   <main class="max-w-[1200px] mx-auto px-6 py-10">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8"><!-- Main Content Column (2/3) -->
     <div class="lg:col-span-2 space-y-8"><!-- Vue d'ensemble / Description -->
      <div class="card">
       <div class="card-header pastel-blue">
        <h2 id="description-title" class="section-title">
         <svg width="24" height="24" viewbox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /> <polyline points="14 2 14 8 20 8" /> <line x1="16" y1="13" x2="8" y2="13" /> <line x1="16" y1="17" x2="8" y2="17" /> <polyline points="10 9 9 9 8 9" />
         </svg> Vue d'ensemble</h2>
       </div>
       <div class="rich-content">
        <p>Le <strong>Développeur Full-Stack</strong> est un professionnel polyvalent capable de travailler sur l'ensemble des couches d'une application web : l'interface utilisateur (front-end), la logique métier et les bases de données (back-end), ainsi que l'infrastructure et le déploiement.</p>
        <p>Ce métier requiert une expertise technique large et une capacité d'adaptation constante aux nouvelles technologies. Le développeur Full-Stack intervient sur toutes les phases du cycle de développement, de la conception à la mise en production.</p>
        <p>Très recherché sur le marché, ce profil permet de comprendre l'ensemble d'un projet web et d'avoir une vision globale des enjeux techniques et fonctionnels.</p>
       </div>
      </div><!-- Missions principales -->
      <div class="card">
       <div class="card-header pastel-green">
        <h2 id="missions-title" class="section-title">
         <svg width="24" height="24" viewbox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /> <polyline points="22 4 12 14.01 9 11.01" />
         </svg> Missions principales</h2>
       </div>
       <div class="rich-content">
        <h4>Développement Front-End</h4>
        <ul>
         <li>Créer des interfaces utilisateur modernes, responsive et accessibles</li>
         <li>Intégrer des maquettes design en HTML/CSS/JavaScript</li>
         <li>Développer avec des frameworks modernes (React, Vue.js, Angular)</li>
         <li>Optimiser les performances front-end et l'expérience utilisateur</li>
        </ul>
        <h4>Développement Back-End</h4>
        <ul>
         <li>Concevoir et développer des API RESTful ou GraphQL</li>
         <li>Gérer la logique métier et les flux de données</li>
         <li>Administrer les bases de données (SQL et NoSQL)</li>
         <li>Impl��menter l'authentification et la sécurité des applications</li>
        </ul>
        <h4>DevOps &amp; Déploiement</h4>
        <ul>
         <li>Configurer et maintenir l'infrastructure cloud (AWS, Azure, GCP)</li>
         <li>Mettre en place des pipelines CI/CD</li>
         <li>Assurer le monitoring et la scalabilité des applications</li>
         <li>Gérer le versioning du code avec Git</li>
        </ul>
       </div>
      </div><!-- Compétences clés -->
      <div class="card">
       <div class="card-header pastel-purple">
        <h2 id="competences-title" class="section-title">
         <svg width="24" height="24" viewbox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2"><path d="M12 20h9" /> <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
         </svg> Compétences clés</h2>
       </div>
       <div class="rich-content">
        <h4>🎨 Technologies Front-End</h4>
        <ul>
         <li><strong>Langages :</strong> HTML5, CSS3, JavaScript ES6+, TypeScript</li>
         <li><strong>Frameworks :</strong> React, Vue.js, Angular, Svelte</li>
         <li><strong>Styling :</strong> Tailwind CSS, Sass, CSS-in-JS, Styled Components</li>
         <li><strong>Build Tools :</strong> Webpack, Vite, Parcel</li>
        </ul>
        <h4>⚙️ Technologies Back-End</h4>
        <ul>
         <li><strong>Langages :</strong> Node.js, Python, PHP, Java, Ruby, Go</li>
         <li><strong>Frameworks :</strong> Express, NestJS, Django, Laravel, Spring Boot</li>
         <li><strong>API :</strong> REST, GraphQL, WebSockets</li>
         <li><strong>Authentification :</strong> JWT, OAuth2, Sessions</li>
        </ul>
        <h4>🗄️ Bases de données</h4>
        <ul>
         <li><strong>SQL :</strong> PostgreSQL, MySQL, SQL Server</li>
         <li><strong>NoSQL :</strong> MongoDB, Redis, Elasticsearch</li>
         <li><strong>ORM :</strong> Prisma, Sequelize, TypeORM, SQLAlchemy</li>
        </ul>
        <h4>☁️ DevOps &amp; Infrastructure</h4>
        <ul>
         <li><strong>Cloud :</strong> AWS, Google Cloud, Azure, Vercel, Netlify</li>
         <li><strong>Containers :</strong> Docker, Kubernetes</li>
         <li><strong>CI/CD :</strong> GitHub Actions, GitLab CI, Jenkins</li>
         <li><strong>Monitoring :</strong> Prometheus, Grafana, Sentry</li>
        </ul>
       </div>
      </div><!-- Environnements de travail -->
      <div class="card">
       <div class="card-header pastel-orange">
        <h2 id="environnements-title" class="section-title">
         <svg width="24" height="24" viewbox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" /> <line x1="8" y1="21" x2="16" y2="21" /> <line x1="12" y1="17" x2="12" y2="21" />
         </svg> Environnements de travail</h2>
       </div>
       <div class="rich-content">
        <ul>
         <li><strong>Start-ups tech :</strong> Environnement agile, forte polyvalence, impact direct sur le produit, stack moderne, equity possible</li>
         <li><strong>Scale-ups :</strong> Croissance rapide, équipes structurées, défis de scalabilité, culture tech forte</li>
         <li><strong>ESN / Agences digitales :</strong> Diversité de projets clients, montée en compétences rapide, méthodologies variées</li>
         <li><strong>Grandes entreprises / Corporates :</strong> Projets d'envergure, processus établis, équipes spécialisées, avantages solides</li>
         <li><strong>Freelance / Consultant :</strong> Autonomie totale, choix des missions, tarifs journaliers élevés (400-800€/jour), gestion administrative</li>
         <li><strong>Remote / Hybride :</strong> Télétravail très fréquent (70-100%), flexibilité horaire, outils collaboratifs, présence occasionnelle</li>
        </ul>
       </div>
      </div><!-- Profil recherché -->
      <div class="card">
       <div class="card-header pastel-pink">
        <h2 id="profil-title" class="section-title">
         <svg width="24" height="24" viewbox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /> <circle cx="12" cy="7" r="4" />
         </svg> Profil recherché</h2>
       </div>
       <div class="rich-content">
        <h4>🎯 Qualités techniques</h4>
        <ul>
         <li>Maîtrise de plusieurs langages et frameworks front-end et back-end</li>
         <li>Compréhension des architectures logicielles (MVC, microservices, serverless)</li>
         <li>Capacité à écrire du code propre, maintenable et testé</li>
         <li>Connaissance des bonnes pratiques de sécurité web</li>
         <li>Compétences en optimisation des performances</li>
        </ul>
        <h4>💡 Soft skills</h4>
        <ul>
         <li><strong>Polyvalence :</strong> Capacité à jongler entre front-end, back-end et infrastructure</li>
         <li><strong>Apprentissage continu :</strong> Curiosité et veille technologique active</li>
         <li><strong>Résolution de problèmes :</strong> Approche analytique et débogage méthodique</li>
         <li><strong>Communication :</strong> Collaboration avec designers, product managers, et autres développeurs</li>
         <li><strong>Autonomie :</strong> Gestion de projets de bout en bout</li>
         <li><strong>Adaptabilité :</strong> Flexibilité face aux changements technologiques</li>
        </ul>
        <h4>📚 Formation</h4>
        <ul>
         <li>Niveau Bac+2 à Bac+5 en informatique (ou équivalent autodidacte)</li>
         <li>Bootcamps intensifs (Le Wagon, Ironhack, Wild Code School)</li>
         <li>Écoles d'ingénieurs (Epitech, 42, EPITA)</li>
         <li>Formation autodidacte avec portfolio conséquent</li>
        </ul>
       </div>
      </div><!-- Évolutions possibles -->
      <div class="card">
       <div class="card-header pastel-cyan">
        <h2 id="evolutions-title" class="section-title">
         <svg width="24" height="24" viewbox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5" /> <polyline points="5 12 12 5 19 12" />
         </svg> Évolutions possibles</h2>
       </div>
       <div class="rich-content">
        <h4>🚀 Évolution technique</h4>
        <ul>
         <li><strong>Lead Developer / Tech Lead (3-5 ans) :</strong> Encadrement technique d'équipe, architecture logicielle, choix technologiques</li>
         <li><strong>Architecte Logiciel (5-8 ans) :</strong> Conception de systèmes complexes, stratégie technique, scalabilité</li>
         <li><strong>Staff Engineer / Principal Engineer (8+ ans) :</strong> Expertise technique de haut niveau, influence transverse</li>
        </ul>
        <h4>📊 Évolution managériale</h4>
        <ul>
         <li><strong>Engineering Manager (4-6 ans) :</strong> Management d'équipe tech, recrutement, développement des talents</li>
         <li><strong>CTO / VP Engineering (8+ ans) :</strong> Direction technique de l'entreprise, stratégie tech, budget</li>
        </ul>
        <h4>🎨 Spécialisations</h4>
        <ul>
         <li><strong>DevOps Engineer :</strong> Focus infrastructure, CI/CD, automatisation</li>
         <li><strong>Security Engineer :</strong> Sécurité applicative, pentesting, conformité</li>
         <li><strong>Product Manager technique :</strong> Vision produit avec expertise technique</li>
         <li><strong>Solutions Architect :</strong> Conseil en architecture pour clients</li>
        </ul>
        <h4>💼 Indépendance</h4>
        <ul>
         <li><strong>Freelance / Consultant senior (3+ ans) :</strong> TJM 500-800€, missions diversifiées</li>
         <li><strong>Entrepreneur tech :</strong> Création de startup, développement de SaaS</li>
         <li><strong>Tech Content Creator :</strong> Formation, tutoriels, consulting</li>
        </ul>
       </div>
      </div><!-- FAQ -->
      <div class="card">
       <div class="card-header" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);">
        <h2 id="faq-title" class="section-title">
         <svg width="24" height="24" viewbox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="10" /> <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /> <line x1="12" y1="17" x2="12.01" y2="17" />
         </svg> Questions fréquentes</h2>
       </div>
       <div class="space-y-3">
        <div class="faq-item"><button class="faq-question w-full text-left p-4 rounded-lg transition-all flex items-start justify-between gap-3" style="background: white; border: 2px solid var(--border);">
          <div class="flex items-start gap-3 flex-1"><span class="text-xl flex-shrink-0">❓</span> <span class="font-semibold text-sm" style="color: var(--text);">Quelle est la différence entre un développeur Full-Stack et un développeur spécialisé ?</span>
          </div>
          <svg class="faq-icon w-5 h-5 flex-shrink-0 transition-transform" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9" />
          </svg></button>
         <div class="faq-answer hidden mt-2 px-4 py-3 rounded-lg text-sm" style="background: rgba(99,102,241,0.05); color: var(--text); border-left: 3px solid var(--primary); margin-left: 20px;">
          <p>Le développeur Full-Stack maîtrise à la fois le <strong>front-end</strong> (interface utilisateur) et le <strong>back-end</strong> (logique serveur, bases de données). Un développeur spécialisé se concentre sur un seul de ces domaines. Le Full-Stack a une vision globale du projet, peut intervenir sur toutes les couches, et est particulièrement recherché dans les start-ups et petites structures. En revanche, un développeur spécialisé (front ou back) aura une expertise plus pointue dans son domaine.</p>
         </div>
        </div>
        <div class="faq-item"><button class="faq-question w-full text-left p-4 rounded-lg transition-all flex items-start justify-between gap-3" style="background: white; border: 2px solid var(--border);">
          <div class="flex items-start gap-3 flex-1"><span class="text-xl flex-shrink-0">❓</span> <span class="font-semibold text-sm" style="color: var(--text);">Peut-on devenir développeur Full-Stack sans diplôme ?</span>
          </div>
          <svg class="faq-icon w-5 h-5 flex-shrink-0 transition-transform" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9" />
          </svg></button>
         <div class="faq-answer hidden mt-2 px-4 py-3 rounded-lg text-sm" style="background: rgba(99,102,241,0.05); color: var(--text); border-left: 3px solid var(--primary); margin-left: 20px;">
          <p><strong>Oui, absolument !</strong> Le secteur tech valorise énormément les compétences pratiques et le portfolio. Beaucoup de développeurs Full-Stack sont autodidactes ou issus de bootcamps (Le Wagon, Ironhack, Wild Code School). L'essentiel est de démontrer vos compétences via un <strong>portfolio GitHub solide</strong> avec des projets fonctionnels, des contributions open-source, et des applications déployées. Les recruteurs regardent davantage votre code et vos réalisations que votre diplôme.</p>
         </div>
        </div>
        <div class="faq-item"><button class="faq-question w-full text-left p-4 rounded-lg transition-all flex items-start justify-between gap-3" style="background: white; border: 2px solid var(--border);">
          <div class="flex items-start gap-3 flex-1"><span class="text-xl flex-shrink-0">❓</span> <span class="font-semibold text-sm" style="color: var(--text);">Combien de temps faut-il pour devenir développeur Full-Stack ?</span>
          </div>
          <svg class="faq-icon w-5 h-5 flex-shrink-0 transition-transform" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9" />
          </svg></button>
         <div class="faq-answer hidden mt-2 px-4 py-3 rounded-lg text-sm" style="background: rgba(99,102,241,0.05); color: var(--text); border-left: 3px solid var(--primary); margin-left: 20px;">
          <p>La durée varie selon votre parcours : un <strong>bootcamp intensif</strong> dure 3 à 6 mois et vous rend opérationnel pour un poste junior. En <strong>autodidacte</strong>, comptez 6 à 12 mois d'apprentissage intensif (20-30h/semaine). Une <strong>formation universitaire</strong> (Bac+3 à Bac+5) prend 3 à 5 ans mais offre des bases théoriques solides. L'important est la régularité : mieux vaut coder 2h par jour que 14h le week-end. Après 6-12 mois, vous pouvez prétendre à un poste junior.</p>
         </div>
        </div>
        <div class="faq-item"><button class="faq-question w-full text-left p-4 rounded-lg transition-all flex items-start justify-between gap-3" style="background: white; border: 2px solid var(--border);">
          <div class="flex items-start gap-3 flex-1"><span class="text-xl flex-shrink-0">❓</span> <span class="font-semibold text-sm" style="color: var(--text);">Quels langages de programmation faut-il absolument maîtriser ?</span>
          </div>
          <svg class="faq-icon w-5 h-5 flex-shrink-0 transition-transform" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9" />
          </svg></button>
         <div class="faq-answer hidden mt-2 px-4 py-3 rounded-lg text-sm" style="background: rgba(99,102,241,0.05); color: var(--text); border-left: 3px solid var(--primary); margin-left: 20px;">
          <p>Les <strong>indispensables</strong> : <strong>JavaScript</strong> (langage universel du web, front et back avec Node.js), <strong>HTML/CSS</strong> (structure et style des pages). Ensuite, choisissez une stack cohérente : <strong>TypeScript</strong> (JavaScript typé), <strong>React</strong> ou <strong>Vue.js</strong> pour le front-end, <strong>Node.js/Express</strong> ou <strong>Python/Django</strong> pour le back-end. Ajoutez <strong>SQL</strong> (PostgreSQL/MySQL) et <strong>Git</strong> pour le versioning. La stack JavaScript (JS/TS + React + Node.js) est la plus demandée actuellement (70% des offres).</p>
         </div>
        </div>
        <div class="faq-item"><button class="faq-question w-full text-left p-4 rounded-lg transition-all flex items-start justify-between gap-3" style="background: white; border: 2px solid var(--border);">
          <div class="flex items-start gap-3 flex-1"><span class="text-xl flex-shrink-0">❓</span> <span class="font-semibold text-sm" style="color: var(--text);">Est-ce que le télétravail est vraiment possible en tant que développeur Full-Stack ?</span>
          </div>
          <svg class="faq-icon w-5 h-5 flex-shrink-0 transition-transform" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9" />
          </svg></button>
         <div class="faq-answer hidden mt-2 px-4 py-3 rounded-lg text-sm" style="background: rgba(99,102,241,0.05); color: var(--text); border-left: 3px solid var(--primary); margin-left: 20px;">
          <p><strong>Oui, et c'est même la norme !</strong> Environ <strong>70% des postes</strong> de développeur Full-Stack proposent du full remote ou de l'hybride (2-3 jours/semaine au bureau). Les outils collaboratifs (Slack, GitHub, Figma, Jira) permettent de travailler efficacement à distance. Certaines entreprises recrutent même à l'international en remote. En freelance, le remote est quasi systématique. C'est l'un des métiers les plus compatibles avec le télétravail, ce qui permet de vivre en province avec un salaire parisien.</p>
         </div>
        </div>
        <div class="faq-item"><button class="faq-question w-full text-left p-4 rounded-lg transition-all flex items-start justify-between gap-3" style="background: white; border: 2px solid var(--border);">
          <div class="flex items-start gap-3 flex-1"><span class="text-xl flex-shrink-0">❓</span> <span class="font-semibold text-sm" style="color: var(--text);">Quel est le salaire moyen d'un développeur Full-Stack en freelance ?</span>
          </div>
          <svg class="faq-icon w-5 h-5 flex-shrink-0 transition-transform" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9" />
          </svg></button>
         <div class="faq-answer hidden mt-2 px-4 py-3 rounded-lg text-sm" style="background: rgba(99,102,241,0.05); color: var(--text); border-left: 3px solid var(--primary); margin-left: 20px;">
          <p>En freelance, les développeurs Full-Stack facturent entre <strong>400€ et 800€ par jour</strong> (TJM - Taux Journalier Moyen) selon leur expérience. Un <strong>junior</strong> (2-3 ans) facture 400-500€/jour, un <strong>confirmé</strong> (4-6 ans) 500-650€/jour, et un <strong>senior</strong> (7+ ans) 650-800€/jour. Sur une base de 18 jours facturables par mois (après congés, prospection, administration), cela représente <strong>7 200€ à 14 400€ de CA mensuel</strong>. Après charges (environ 45%), le revenu net varie de 50K€ à 95K€ annuel, soit nettement plus qu'en salariat.</p>
         </div>
        </div>
        <div class="faq-item"><button class="faq-question w-full text-left p-4 rounded-lg transition-all flex items-start justify-between gap-3" style="background: white; border: 2px solid var(--border);">
          <div class="flex items-start gap-3 flex-1"><span class="text-xl flex-shrink-0">❓</span> <span class="font-semibold text-sm" style="color: var(--text);">L'intelligence artificielle va-t-elle remplacer les développeurs Full-Stack ?</span>
          </div>
          <svg class="faq-icon w-5 h-5 flex-shrink-0 transition-transform" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9" />
          </svg></button>
         <div class="faq-answer hidden mt-2 px-4 py-3 rounded-lg text-sm" style="background: rgba(99,102,241,0.05); color: var(--text); border-left: 3px solid var(--primary); margin-left: 20px;">
          <p><strong>Non, l'IA est un outil, pas un remplaçant.</strong> L'IA (GitHub Copilot, ChatGPT) assiste les développeurs en générant du code boilerplate, en debuggant, et en accélérant certaines tâches répétitives. Mais elle ne remplace pas la <strong>compréhension métier</strong>, l'<strong>architecture logicielle</strong>, les <strong>choix techniques stratégiques</strong>, et la <strong>résolution de problèmes complexes</strong>. L'IA rend les développeurs plus productifs (+30-40%), ce qui augmente la demande pour créer encore plus d'applications. Le risque d'automatisation est estimé à seulement <strong>12%</strong>, l'un des plus faibles du marché.</p>
         </div>
        </div>
       </div>
      </div><!-- Sections Pays (France example) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8"><!-- Formation -->
       <div class="card">
        <div class="card-header pastel-blue">
         <h3 id="formation-title" class="section-title text-base">🎓 Formation</h3>
        </div>
        <div class="rich-content text-sm">
         <h4>Diplômes recommandés</h4>
         <ul>
          <li>Bac+2 : BTS SIO, DUT Informatique</li>
          <li>Bac+3 : Licence Pro Développement Web</li>
          <li>Bac+5 : Master Informatique, Diplôme d'ingénieur</li>
         </ul>
         <h4>Bootcamps (3-6 mois)</h4>
         <ul>
          <li>Le Wagon (9 semaines)</li>
          <li>Ironhack (9 semaines)</li>
          <li>Wild Code School (5 mois)</li>
          <li>OpenClassrooms (6-12 mois)</li>
         </ul>
         <h4>Écoles spécialisées</h4>
         <ul>
          <li>École 42 (gratuite, peer-learning)</li>
          <li>Epitech, EPITA, Supinfo</li>
         </ul>
        </div>
       </div><!-- Accès au métier -->
       <div class="card">
        <div class="card-header pastel-green">
         <h3 id="acces-title" class="section-title text-base">🚪 Accès au métier</h3>
        </div>
        <div class="rich-content text-sm">
         <h4>Voies d'accès</h4>
         <ul>
          <li><strong>Formation initiale :</strong> École d'ingénieur, université</li>
          <li><strong>Bootcamp :</strong> Reconversion rapide (3-6 mois)</li>
          <li><strong>Autodidacte :</strong> Apprentissage en ligne + portfolio</li>
          <li><strong>Alternance :</strong> Très prisée, facilite l'embauche</li>
         </ul>
         <h4>Prérequis</h4>
         <ul>
          <li>Portfolio GitHub actif avec projets personnels</li>
          <li>Contribution open-source (bonus)</li>
          <li>Stage ou 1ère expérience professionnelle</li>
          <li>Veille technologique régulière</li>
         </ul>
         <h4>Premiers postes</h4>
         <ul>
          <li>Junior Full-Stack Developer</li>
          <li>Full-Stack Developer (alternance)</li>
          <li>Développeur Web Junior</li>
         </ul>
        </div>
       </div><!-- Marché du travail -->
       <div class="card">
        <div class="card-header pastel-purple">
         <h3 id="marche-title" class="section-title text-base">📈 Marché du travail</h3>
        </div>
        <div class="rich-content text-sm">
         <h4>Demande</h4>
         <ul>
          <li><strong>Très forte demande</strong> : Pénurie de profils qualifiés</li>
          <li>+20 000 postes à pourvoir en France en 2024</li>
          <li>Croissance continue du secteur tech (+15% /an)</li>
         </ul>
         <h4>Secteurs recruteurs</h4>
         <ul>
          <li>Tech / SaaS / Scale-ups</li>
          <li>E-commerce &amp; Marketplaces</li>
          <li>Fintech / Banking</li>
          <li>Santé digitale / HealthTech</li>
          <li>ESN &amp; Agences digitales</li>
         </ul>
         <h4>Tendances</h4>
         <ul>
          <li>Remote first : 70% des postes en full remote</li>
          <li>Freelance en hausse : +25% depuis 2020</li>
          <li>Stack moderne privilégiée (React, Node.js, TypeScript)</li>
         </ul>
        </div>
       </div><!-- Rémunération -->
       <div class="card">
        <div class="card-header pastel-orange">
         <h3 id="salaire-title" class="section-title text-base">💰 Rémunération</h3>
        </div>
        <div class="space-y-4">
         <div>
          <div class="progress-label"><span class="text-xs font-semibold" style="color: var(--text);">Junior (0-2 ans)</span> <span class="text-xs font-bold" style="color: var(--primary);">35 000 - 45 000 €</span>
          </div>
          <div class="salary-bar-container">
           <div class="salary-bar-fill gradient-primary" style="width: 40%;"></div>
          </div>
         </div>
         <div>
          <div class="progress-label"><span class="text-xs font-semibold" style="color: var(--text);">Confirmé (3-5 ans)</span> <span class="text-xs font-bold" style="color: var(--primary);">45 000 - 60 000 €</span>
          </div>
          <div class="salary-bar-container">
           <div class="salary-bar-fill gradient-primary" style="width: 60%;"></div>
          </div>
         </div>
         <div>
          <div class="progress-label"><span class="text-xs font-semibold" style="color: var(--text);">Senior (5+ ans)</span> <span class="text-xs font-bold" style="color: var(--primary);">60 000 - 85 000 €</span>
          </div>
          <div class="salary-bar-container">
           <div class="salary-bar-fill gradient-primary" style="width: 80%;"></div>
          </div>
         </div>
         <div class="mt-4 p-3 rounded-lg" style="background: rgba(99,102,241,0.1);">
          <p class="text-xs font-semibold mb-2" style="color: var(--primary);">💡 Informations complémentaires</p>
          <p class="text-xs" style="color: var(--text);"><strong>Variable :</strong> 5-15% du salaire fixe<br><strong>Freelance TJM :</strong> 400-800€/jour (selon expérience)<br><strong>Paris :</strong> Salaires +15-20% par rapport à la province<br><strong>Remote :</strong> Possible de négocier salaire Paris en province</p>
         </div>
        </div>
       </div>
      </div>
     </div><!-- Sidebar (1/3) -->
     <div class="space-y-6"><!-- Sponsor Logo Square + CTA -->
      <div class="card">
       <div class="card-header" style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);">
        <h3 class="section-title text-sm">🤝 Partenaire</h3>
       </div><a id="sponsor-logo-link" href="#" target="_blank" rel="noopener noreferrer" style="display: block;">
        <div class="sponsor-logo-square">
         <svg width="80" height="80" viewbox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="1.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /> <path d="M6 12v5c3 3 9 3 12 0v-5" />
         </svg>
        </div>
        <div class="text-center mt-4">
         <p id="sponsor-name-sidebar" class="font-bold text-base" style="color: var(--text);">École 42</p>
         <p class="text-sm mt-1" style="color: var(--muted);">Formation intensive • 100% gratuite</p>
         <p class="text-xs mt-2" style="color: var(--muted);">Cursus peer-learning reconnu par l'État</p>
        </div></a> <a id="sponsor-cta" href="#" target="_blank" rel="noopener noreferrer" class="btn btn-primary w-full mt-5">
        <svg width="20" height="20" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /> <polyline points="15 3 21 3 21 9" /> <line x1="10" y1="14" x2="21" y2="3" />
        </svg> En savoir plus </a>
      </div><!-- KPIs Indicateurs -->
      <div class="card">
       <div class="card-header gradient-primary" style="color: white;">
        <h3 class="section-title text-sm" style="color: white;">📊 Indicateurs clés</h3>
       </div>
       <div class="space-y-3">
        <div class="kpi-box">
         <div class="kpi-icon" style="background: rgba(16,185,129,0.1);"><span>🏠</span>
         </div>
         <div class="flex-1">
          <p class="text-xs font-semibold" style="color: var(--muted);">Télétravail</p>
          <p class="text-sm font-bold" style="color: var(--text);">Full Remote / Hybride</p>
         </div>
        </div>
        <div class="kpi-box">
         <div class="kpi-icon" style="background: rgba(16,185,129,0.1);"><span>🤖</span>
         </div>
         <div class="flex-1">
          <p class="text-xs font-semibold" style="color: var(--muted);">Risque d'automatisation</p>
          <p class="text-sm font-bold" style="color: #10b981;">Faible (12%)</p>
         </div>
        </div>
        <div class="kpi-box">
         <div class="kpi-icon" style="background: rgba(99,102,241,0.1);"><span>💰</span>
         </div>
         <div class="flex-1">
          <p class="text-xs font-semibold" style="color: var(--muted);">Devise</p>
          <p class="text-sm font-bold" style="color: var(--text);">EUR (€)</p>
         </div>
        </div>
        <div class="kpi-box">
         <div class="kpi-icon" style="background: rgba(245,158,11,0.1);"><span>⏱️</span>
         </div>
         <div class="flex-1">
          <p class="text-xs font-semibold" style="color: var(--muted);">Délai d'employabilité</p>
          <p class="text-sm font-bold" style="color: var(--text);">6-12 mois</p>
         </div>
        </div>
        <div class="kpi-box">
         <div class="kpi-icon" style="background: rgba(99,102,241,0.1);"><span>📈</span>
         </div>
         <div class="flex-1">
          <p class="text-xs font-semibold" style="color: var(--muted);">Croissance du marché</p>
          <p class="text-sm font-bold" style="color: var(--success);">+15% / an</p>
         </div>
        </div>
        <div class="kpi-box">
         <div class="kpi-icon" style="background: rgba(239,68,68,0.1);"><span>🔥</span>
         </div>
         <div class="flex-1">
          <p class="text-xs font-semibold" style="color: var(--muted);">Demande du marché</p>
          <p class="text-sm font-bold" style="color: #ef4444;">Très forte</p>
         </div>
        </div>
       </div>
      </div><!-- Salaires détaillés -->
      <div class="card">
       <div class="card-header gradient-success" style="color: white;">
        <h3 class="section-title text-sm" style="color: white;">💵 Grille salariale (France)</h3>
       </div>
       <div class="space-y-4">
        <div>
         <div class="flex justify-between items-center mb-2"><span class="text-xs font-semibold" style="color: var(--muted);">💼 Junior</span> <span class="text-xs font-bold" style="color: var(--text);">35-45K€</span>
         </div>
         <div class="salary-bar-container">
          <div class="salary-bar-fill gradient-success" style="width: 40%;"></div>
         </div>
         <p class="text-xs mt-1" style="color: var(--muted);">0-2 ans d'expérience</p>
        </div>
        <div>
         <div class="flex justify-between items-center mb-2"><span class="text-xs font-semibold" style="color: var(--muted);">🚀 Confirmé</span> <span class="text-xs font-bold" style="color: var(--text);">45-60K€</span>
         </div>
         <div class="salary-bar-container">
          <div class="salary-bar-fill gradient-success" style="width: 60%;"></div>
         </div>
         <p class="text-xs mt-1" style="color: var(--muted);">3-5 ans d'expérience</p>
        </div>
        <div>
         <div class="flex justify-between items-center mb-2"><span class="text-xs font-semibold" style="color: var(--muted);">⭐ Senior</span> <span class="text-xs font-bold" style="color: var(--text);">60-85K€</span>
         </div>
         <div class="salary-bar-container">
          <div class="salary-bar-fill gradient-success" style="width: 80%;"></div>
         </div>
         <p class="text-xs mt-1" style="color: var(--muted);">5+ ans d'expérience</p>
        </div>
        <div class="pt-3 mt-3" style="border-top: 1px solid var(--border);">
         <p class="text-xs font-semibold mb-2" style="color: var(--text);">📌 Part variable</p>
         <div class="flex items-center gap-2">
          <div class="flex-1 h-2 rounded-full" style="background: var(--border);"></div><span class="text-xs font-bold" style="color: var(--accent);">5-15%</span>
         </div>
         <p class="text-xs mt-2" style="color: var(--muted);">Bonus, intéressement, participation</p>
        </div>
       </div>
      </div><!-- Compétences must-have (chips) -->
      <div class="card">
       <div class="card-header pastel-purple">
        <h3 class="section-title text-sm">⚡ Compétences incontournables</h3>
       </div>
       <div class="flex flex-wrap gap-2"><span class="chip badge-primary">JavaScript</span> <span class="chip badge-primary">TypeScript</span> <span class="chip badge-success">React</span> <span class="chip badge-success">Node.js</span> <span class="chip badge-warning">PostgreSQL</span> <span class="chip badge-warning">MongoDB</span> <span class="chip badge-danger">Git</span> <span class="chip badge-danger">Docker</span> <span class="chip badge-primary">API REST</span> <span class="chip badge-success">HTML/CSS</span> <span class="chip badge-warning">AWS/GCP</span> <span class="chip badge-danger">CI/CD</span>
       </div>
      </div><!-- Soft Skills -->
      <div class="card">
       <div class="card-header pastel-pink">
        <h3 class="section-title text-sm">🧠 Soft Skills essentiels</h3>
       </div>
       <div class="space-y-3">
        <div class="skill-tag"><span class="text-lg">🧩</span> <span class="text-sm">Résolution de problèmes</span>
        </div>
        <div class="skill-tag"><span class="text-lg">🤝</span> <span class="text-sm">Travail en équipe</span>
        </div>
        <div class="skill-tag"><span class="text-lg">📚</span> <span class="text-sm">Apprentissage continu</span>
        </div>
        <div class="skill-tag"><span class="text-lg">💬</span> <span class="text-sm">Communication efficace</span>
        </div>
        <div class="skill-tag"><span class="text-lg">🎯</span> <span class="text-sm">Autonomie &amp; rigueur</span>
        </div>
        <div class="skill-tag"><span class="text-lg">🔄</span> <span class="text-sm">Adaptabilité</span>
        </div>
       </div>
      </div><!-- Tech Stack -->
      <div class="card">
       <div class="card-header pastel-cyan">
        <h3 class="section-title text-sm">🛠️ Stack Technique Populaire</h3>
       </div>
       <div class="space-y-3 text-sm">
        <div>
         <p class="font-semibold mb-2" style="color: var(--text);">🎨 Front-End</p>
         <div class="flex flex-wrap gap-2"><span class="badge badge-primary">React</span> <span class="badge badge-primary">Next.js</span> <span class="badge badge-primary">Tailwind</span>
         </div>
        </div>
        <div>
         <p class="font-semibold mb-2" style="color: var(--text);">⚙️ Back-End</p>
         <div class="flex flex-wrap gap-2"><span class="badge badge-success">Node.js</span> <span class="badge badge-success">Express</span> <span class="badge badge-success">NestJS</span>
         </div>
        </div>
        <div>
         <p class="font-semibold mb-2" style="color: var(--text);">🗄️ Database</p>
         <div class="flex flex-wrap gap-2"><span class="badge badge-warning">PostgreSQL</span> <span class="badge badge-warning">MongoDB</span> <span class="badge badge-warning">Redis</span>
         </div>
        </div>
        <div>
         <p class="font-semibold mb-2" style="color: var(--text);">☁️ Cloud &amp; DevOps</p>
         <div class="flex flex-wrap gap-2"><span class="badge badge-danger">AWS</span> <span class="badge badge-danger">Docker</span> <span class="badge badge-danger">GitHub Actions</span>
         </div>
        </div>
       </div>
      </div><!-- Certifications -->
      <div class="card">
       <div class="card-header pastel-orange">
        <h3 class="section-title text-sm">🎓 Certifications utiles</h3>
       </div>
       <div class="space-y-3 text-sm">
        <div class="flex items-start gap-3"><span class="text-2xl">🏆</span>
         <div>
          <p class="font-semibold" style="color: var(--text);">AWS Certified Developer</p>
          <p class="text-xs" style="color: var(--muted);">Cloud computing &amp; infrastructure</p>
         </div>
        </div>
        <div class="flex items-start gap-3"><span class="text-2xl">🏆</span>
         <div>
          <p class="font-semibold" style="color: var(--text);">MongoDB Certified Developer</p>
          <p class="text-xs" style="color: var(--muted);">Bases de données NoSQL</p>
         </div>
        </div>
        <div class="flex items-start gap-3"><span class="text-2xl">🏆</span>
         <div>
          <p class="font-semibold" style="color: var(--text);">Google Professional Cloud Developer</p>
          <p class="text-xs" style="color: var(--muted);">GCP &amp; services Google</p>
         </div>
        </div>
        <div class="flex items-start gap-3"><span class="text-2xl">🏆</span>
         <div>
          <p class="font-semibold" style="color: var(--text);">Microsoft Azure Developer</p>
          <p class="text-xs" style="color: var(--muted);">Développement cloud Azure</p>
         </div>
        </div>
       </div>
      </div><!-- Écoles & Formations -->
      <div class="card">
       <div class="card-header pastel-blue">
        <h3 class="section-title text-sm">🏫 Écoles &amp; Parcours recommandés</h3>
       </div>
       <div class="space-y-3 text-sm">
        <div>
         <p class="font-semibold" style="color: var(--text);">🎯 Bootcamps</p>
         <ul class="mt-2 space-y-1" style="color: var(--muted);">
          <li class="text-xs">• Le Wagon (9 semaines)</li>
          <li class="text-xs">• Ironhack (9 semaines)</li>
          <li class="text-xs">• Wild Code School (5 mois)</li>
         </ul>
        </div>
        <div>
         <p class="font-semibold" style="color: var(--text);">🏛️ Écoles d'ingénieurs</p>
         <ul class="mt-2 space-y-1" style="color: var(--muted);">
          <li class="text-xs">• École 42 (gratuite)</li>
          <li class="text-xs">• Epitech, EPITA</li>
          <li class="text-xs">• Centrale, Mines</li>
         </ul>
        </div>
        <div>
         <p class="font-semibold" style="color: var(--text);">����� Formations en ligne</p>
         <ul class="mt-2 space-y-1" style="color: var(--muted);">
          <li class="text-xs">• OpenClassrooms</li>
          <li class="text-xs">• freeCodeCamp</li>
          <li class="text-xs">• The Odin Project</li>
         </ul>
        </div>
       </div>
      </div><!-- Projets Portfolio -->
      <div class="card">
       <div class="card-header pastel-green">
        <h3 class="section-title text-sm">💼 Projets Portfolio essentiels</h3>
       </div>
       <div class="space-y-2 text-sm">
        <div class="flex items-start gap-2"><span class="text-lg">✅</span>
         <div>
          <p class="font-semibold text-xs" style="color: var(--text);">Application CRUD complète</p>
          <p class="text-xs" style="color: var(--muted);">Front + Back + BDD + Auth</p>
         </div>
        </div>
        <div class="flex items-start gap-2"><span class="text-lg">✅</span>
         <div>
          <p class="font-semibold text-xs" style="color: var(--text);">API REST documentée</p>
          <p class="text-xs" style="color: var(--muted);">Avec tests &amp; documentation</p>
         </div>
        </div>
        <div class="flex items-start gap-2"><span class="text-lg">✅</span>
         <div>
          <p class="font-semibold text-xs" style="color: var(--text);">Clone de site populaire</p>
          <p class="text-xs" style="color: var(--muted);">Twitter, Airbnb, Netflix...</p>
         </div>
        </div>
        <div class="flex items-start gap-2"><span class="text-lg">✅</span>
         <div>
          <p class="font-semibold text-xs" style="color: var(--text);">Application en temps réel</p>
          <p class="text-xs" style="color: var(--muted);">Chat, dashboard, notifications</p>
         </div>
        </div>
        <div class="flex items-start gap-2"><span class="text-lg">✅</span>
         <div>
          <p class="font-semibold text-xs" style="color: var(--text);">Projet déployé en production</p>
          <p class="text-xs" style="color: var(--muted);">Sur Vercel, Netlify ou AWS</p>
         </div>
        </div>
       </div>
      </div>
     </div>
    </div>
   </main><!-- Footer -->
   <footer class="w-full py-8 mt-12" style="background: var(--card); border-top: 2px solid var(--border);">
    <div class="max-w-[1200px] mx-auto px-6">
     <div class="flex flex-col md:flex-row items-center justify-between gap-4">
      <div>
       <p class="text-sm font-semibold" style="color: var(--text);">© 2024 Plateforme B2B • Fiches Métiers &amp; Écoles</p>
       <p class="text-xs mt-1" style="color: var(--muted);">Données actualisées • Sources : APEC, France Travail, LinkedIn</p>
      </div>
      <div class="flex items-center gap-6 text-sm"><a href="#" class="hover:underline" style="color: var(--muted);">Mentions légales</a> <span style="color: var(--border);">•</span> <a href="#" class="hover:underline" style="color: var(--muted);">CGU</a> <span style="color: var(--border);">•</span> <a href="#" class="hover:underline" style="color: var(--muted);">Contact</a>
      </div>
     </div>
    </div>
   </footer>
  </div>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": "Développeur Full-Stack",
    "description": "Le Développeur Full-Stack est un professionnel polyvalent capable de travailler sur l'ensemble des couches d'une application web : front-end, back-end et infrastructure.",
    "datePosted": "2024-01-01",
    "employmentType": ["FULL_TIME", "CONTRACT", "PART_TIME"],
    "hiringOrganization": {
      "@type": "Organization",
      "name": "Plateforme B2B Métiers"
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "FR"
      }
    },
    "baseSalary": {
      "@type": "MonetaryAmount",
      "currency": "EUR",
      "value": {
        "@type": "QuantitativeValue",
        "minValue": 35000,
        "maxValue": 85000,
        "unitText": "YEAR"
      }
    }
  }
  </script>
  <script>
    const defaultConfig = {
      nom: 'Développeur Full-Stack',
      accroche: 'Créez des applications web modernes de A à Z, maîtrisez le front-end et le back-end',
      sponsor_name: 'École 42',
      lien_sponsor: 'https://www.42.fr',
      description_title: "Vue d'ensemble",
      missions_title: 'Missions principales',
      competences_title: 'Compétences clés',
      environnements_title: 'Environnements de travail',
      profil_title: 'Profil recherché',
      evolutions_title: 'Évolutions possibles',
      faq_title: 'Questions fréquentes',
      formation_title: 'Formation',
      acces_title: 'Accès au métier',
      marche_title: 'Marché du travail',
      salaire_title: 'Rémunération',
      background_color: '#ffffff',
      card_color: '#f8fafc',
      text_color: '#0f172a',
      primary_color: '#6366f1',
      accent_color: '#f59e0b',
      font_family: 'Outfit',
      font_size: 15
    };
    
    // Base de données de métiers pour l'autocomplétion
    const metiersDatabase = [
      { nom: 'Développeur Full-Stack', secteur: 'tech', pays: ['FR', 'BE', 'CH', 'CA', 'LU', 'UK', 'US'] },
      { nom: 'Développeur Front-End', secteur: 'tech', pays: ['FR', 'BE', 'CH', 'CA', 'LU'] },
      { nom: 'Développeur Back-End', secteur: 'tech', pays: ['FR', 'BE', 'CH', 'CA'] },
      { nom: 'Data Scientist', secteur: 'tech', pays: ['FR', 'BE', 'CH', 'UK', 'US'] },
      { nom: 'DevOps Engineer', secteur: 'tech', pays: ['FR', 'BE', 'CH', 'CA', 'UK'] },
      { nom: 'Chef de Projet Digital', secteur: 'tech', pays: ['FR', 'BE', 'CH', 'LU'] },
      { nom: 'UX/UI Designer', secteur: 'tech', pays: ['FR', 'BE', 'CH', 'CA', 'UK'] },
      { nom: 'Product Manager', secteur: 'tech', pays: ['FR', 'BE', 'CH', 'UK', 'US'] },
      { nom: 'Analyste Financier', secteur: 'finance', pays: ['FR', 'BE', 'CH', 'LU', 'UK'] },
      { nom: 'Trader', secteur: 'finance', pays: ['FR', 'UK', 'US', 'CH'] },
      { nom: 'Comptable', secteur: 'finance', pays: ['FR', 'BE', 'CH', 'CA', 'LU'] },
      { nom: 'Infirmier', secteur: 'sante', pays: ['FR', 'BE', 'CH', 'CA', 'LU'] },
      { nom: 'Médecin Généraliste', secteur: 'sante', pays: ['FR', 'BE', 'CH', 'CA'] },
      { nom: 'Pharmacien', secteur: 'sante', pays: ['FR', 'BE', 'CH', 'LU'] },
      { nom: 'Chef de Projet Construction', secteur: 'construction', pays: ['FR', 'BE', 'CH', 'LU'] },
      { nom: 'Architecte', secteur: 'construction', pays: ['FR', 'BE', 'CH', 'CA'] },
      { nom: 'Conducteur de Travaux', secteur: 'construction', pays: ['FR', 'BE', 'LU'] },
      { nom: 'Commercial', secteur: 'commerce', pays: ['FR', 'BE', 'CH', 'CA', 'LU'] },
      { nom: 'Chef de Produit', secteur: 'commerce', pays: ['FR', 'BE', 'CH', 'UK'] },
      { nom: 'Responsable Marketing', secteur: 'communication', pays: ['FR', 'BE', 'CH', 'CA', 'UK'] },
      { nom: 'Community Manager', secteur: 'communication', pays: ['FR', 'BE', 'CH', 'CA'] },
      { nom: 'Professeur', secteur: 'education', pays: ['FR', 'BE', 'CH', 'CA', 'LU'] },
      { nom: 'Formateur', secteur: 'education', pays: ['FR', 'BE', 'CH', 'CA'] },
      { nom: 'Avocat', secteur: 'juridique', pays: ['FR', 'BE', 'CH', 'LU', 'CA'] },
      { nom: 'Juriste', secteur: 'juridique', pays: ['FR', 'BE', 'CH', 'LU'] },
      { nom: 'Responsable RH', secteur: 'rh', pays: ['FR', 'BE', 'CH', 'CA', 'LU'] },
      { nom: 'Recruteur', secteur: 'rh', pays: ['FR', 'BE', 'CH', 'CA'] },
      { nom: 'Ingénieur Logistique', secteur: 'transport', pays: ['FR', 'BE', 'LU', 'DE'] },
      { nom: 'Chef de Cuisine', secteur: 'hotellerie', pays: ['FR', 'BE', 'CH', 'CA'] },
      { nom: 'Ingénieur Environnement', secteur: 'environnement', pays: ['FR', 'BE', 'CH', 'CA'] }
    ];
    
    // Gestion de l'autocomplétion
    const metierInput = document.getElementById('filter-metier');
    const suggestionsContainer = document.getElementById('metier-suggestions');
    
    function filterMetiers(query, selectedPays, selectedSecteur) {
      if (!query || query.length < 2) return [];
      
      const lowerQuery = query.toLowerCase();
      return metiersDatabase.filter(metier => {
        const matchesQuery = metier.nom.toLowerCase().includes(lowerQuery);
        const matchesPays = !selectedPays || selectedPays === '' || metier.pays.includes(selectedPays);
        const matchesSecteur = !selectedSecteur || selectedSecteur === '' || metier.secteur === selectedSecteur;
        
        return matchesQuery && matchesPays && matchesSecteur;
      });
    }
    
    function renderSuggestions(metiers) {
      if (metiers.length === 0) {
        suggestionsContainer.innerHTML = '<div class="px-4 py-3 text-sm" style="color: var(--muted);">Aucun métier trouvé</div>';
        suggestionsContainer.classList.remove('hidden');
        return;
      }
      
      suggestionsContainer.innerHTML = metiers.map(metier => \`
        <div class="suggestion-item px-4 py-3 cursor-pointer transition-all hover:bg-gray-50 text-sm font-medium" style="color: var(--text); border-bottom: 1px solid var(--border);" data-metier="${metier.nom}">
          <div class="flex items-center justify-between">
            <span>${metier.nom}</span>
            <span class="text-xs px-2 py-1 rounded" style="background: rgba(99,102,241,0.1); color: var(--primary);">${getSecteurLabel(metier.secteur)}</span>
          </div>
        </div>
      \`).join('');
      
      suggestionsContainer.classList.remove('hidden');
      
      // Ajouter les event listeners sur les suggestions
      document.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', function() {
          metierInput.value = this.dataset.metier;
          suggestionsContainer.classList.add('hidden');
          applyFilters();
        });
      });
    }
    
    function getSecteurLabel(secteur) {
      const labels = {
        'tech': 'Tech',
        'finance': 'Finance',
        'sante': 'Santé',
        'commerce': 'Commerce',
        'industrie': 'Industrie',
        'construction': 'BTP',
        'transport': 'Transport',
        'education': 'Éducation',
        'communication': 'Marketing',
        'juridique': 'Juridique',
        'rh': 'RH',
        'hotellerie': 'Hôtellerie',
        'environnement': 'Environnement',
        'art': 'Arts',
        'securite': 'Sécurité'
      };
      return labels[secteur] || secteur;
    }
    
    metierInput.addEventListener('input', function(e) {
      const query = e.target.value;
      const selectedPays = document.getElementById('filter-pays').value;
      const selectedSecteur = document.getElementById('filter-secteur').value;
      
      if (query.length < 2) {
        suggestionsContainer.classList.add('hidden');
        return;
      }
      
      const filteredMetiers = filterMetiers(query, selectedPays, selectedSecteur);
      renderSuggestions(filteredMetiers);
    });
    
    // Fermer les suggestions au clic extérieur
    document.addEventListener('click', function(e) {
      if (!metierInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
        suggestionsContainer.classList.add('hidden');
      }
    });
    
    // Gestion du focus sur les selects
    const filterPays = document.getElementById('filter-pays');
    const filterSecteur = document.getElementById('filter-secteur');
    
    [filterPays, filterSecteur, metierInput].forEach(element => {
      element.addEventListener('focus', function() {
        this.style.borderColor = 'var(--primary)';
        this.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)';
      });
      
      element.addEventListener('blur', function() {
        this.style.borderColor = 'var(--border)';
        this.style.boxShadow = 'none';
      });
    });
    
    // Gestion de l'application des filtres
    function applyFilters() {
      const pays = filterPays.value;
      const secteur = filterSecteur.value;
      const metier = metierInput.value;
      
      // Ici vous pourriez faire une requête API ou filtrer des données
      console.log('Filtres appliqués:', { pays, secteur, metier });
      
      // Mise à jour du compteur (exemple)
      const resultCount = document.getElementById('result-count');
      if (metier && metiersDatabase.some(m => m.nom.toLowerCase() === metier.toLowerCase())) {
        resultCount.textContent = '1';
      } else {
        resultCount.textContent = metiersDatabase.length;
      }
    }
    
    filterPays.addEventListener('change', applyFilters);
    filterSecteur.addEventListener('change', applyFilters);
    
    // Réinitialiser les filtres
    document.getElementById('reset-filters').addEventListener('click', function() {
      filterPays.value = 'FR';
      filterSecteur.value = 'tech';
      metierInput.value = '';
      suggestionsContainer.classList.add('hidden');
      applyFilters();
    });
    
    // FAQ Accordion functionality
    document.querySelectorAll('.faq-question').forEach(button => {
      button.addEventListener('click', function() {
        const faqItem = this.closest('.faq-item');
        const answer = faqItem.querySelector('.faq-answer');
        const icon = this.querySelector('.faq-icon');
        const isOpen = !answer.classList.contains('hidden');
        
        // Close all other FAQs
        document.querySelectorAll('.faq-item').forEach(item => {
          if (item !== faqItem) {
            item.querySelector('.faq-answer').classList.add('hidden');
            item.querySelector('.faq-icon').style.transform = 'rotate(0deg)';
            item.querySelector('.faq-question').style.borderColor = 'var(--border)';
          }
        });
        
        // Toggle current FAQ
        if (isOpen) {
          answer.classList.add('hidden');
          icon.style.transform = 'rotate(0deg)';
          this.style.borderColor = 'var(--border)';
        } else {
          answer.classList.remove('hidden');
          icon.style.transform = 'rotate(180deg)';
          this.style.borderColor = 'var(--primary)';
        }
      });
    });
    
    async function onConfigChange(config) {
      // Update text content
      const nomMetier = document.getElementById('nom-metier');
      const accrocheMetier = document.getElementById('accroche-metier');
      const sponsorNameBanner = document.getElementById('sponsor-name-banner');
      const sponsorNameSidebar = document.getElementById('sponsor-name-sidebar');
      const sponsorBannerLink = document.getElementById('sponsor-banner-link');
      const sponsorLogoLink = document.getElementById('sponsor-logo-link');
      const sponsorCta = document.getElementById('sponsor-cta');
      
      if (nomMetier) nomMetier.textContent = config.nom || defaultConfig.nom;
      if (accrocheMetier) accrocheMetier.textContent = config.accroche || defaultConfig.accroche;
      if (sponsorNameBanner) sponsorNameBanner.textContent = config.sponsor_name || defaultConfig.sponsor_name;
      if (sponsorNameSidebar) sponsorNameSidebar.textContent = config.sponsor_name || defaultConfig.sponsor_name;
      
      const sponsorLink = config.lien_sponsor || defaultConfig.lien_sponsor;
      if (sponsorBannerLink) sponsorBannerLink.href = sponsorLink;
      if (sponsorLogoLink) sponsorLogoLink.href = sponsorLink;
      if (sponsorCta) sponsorCta.href = sponsorLink;
      
      // Update section titles
      const titleMap = {
        'description-title': 'description_title',
        'missions-title': 'missions_title',
        'competences-title': 'competences_title',
        'environnements-title': 'environnements_title',
        'profil-title': 'profil_title',
        'evolutions-title': 'evolutions_title',
        'faq-title': 'faq_title',
        'formation-title': 'formation_title',
        'acces-title': 'acces_title',
        'marche-title': 'marche_title',
        'salaire-title': 'salaire_title'
      };
      
      for (const [elementId, configKey] of Object.entries(titleMap)) {
        const element = document.getElementById(elementId);
        if (element) {
          const icon = element.querySelector('svg') || element.querySelector('span');
          const currentText = config[configKey] || defaultConfig[configKey];
          element.textContent = currentText;
          if (icon) {
            element.insertBefore(icon, element.firstChild);
          }
        }
      }
      
      // Apply colors
      document.documentElement.style.setProperty('--bg', config.background_color || defaultConfig.background_color);
      document.documentElement.style.setProperty('--card', config.card_color || defaultConfig.card_color);
      document.documentElement.style.setProperty('--text', config.text_color || defaultConfig.text_color);
      document.documentElement.style.setProperty('--primary', config.primary_color || defaultConfig.primary_color);
      document.documentElement.style.setProperty('--accent', config.accent_color || defaultConfig.accent_color);
      
      // Apply font
      const customFont = config.font_family || defaultConfig.font_family;
      document.documentElement.style.setProperty('--font-family', \`'${customFont}', sans-serif\`);
      
      // Apply font size
      const baseSize = config.font_size || defaultConfig.font_size;
      document.documentElement.style.setProperty('--font-base', \`${baseSize}px\`);
      document.body.style.fontSize = \`${baseSize}px\`;
    }
    
    function mapToCapabilities(config) {
      return {
        recolorables: [
          {
            get: () => config.background_color || defaultConfig.background_color,
            set: (value) => {
              config.background_color = value;
              window.elementSdk.setConfig({ background_color: value });
            }
          },
          {
            get: () => config.card_color || defaultConfig.card_color,
            set: (value) => {
              config.card_color = value;
              window.elementSdk.setConfig({ card_color: value });
            }
          },
          {
            get: () => config.text_color || defaultConfig.text_color,
            set: (value) => {
              config.text_color = value;
              window.elementSdk.setConfig({ text_color: value });
            }
          },
          {
            get: () => config.primary_color || defaultConfig.primary_color,
            set: (value) => {
              config.primary_color = value;
              window.elementSdk.setConfig({ primary_color: value });
            }
          },
          {
            get: () => config.accent_color || defaultConfig.accent_color,
            set: (value) => {
              config.accent_color = value;
              window.elementSdk.setConfig({ accent_color: value });
            }
          }
        ],
        borderables: [],
        fontEditable: {
          get: () => config.font_family || defaultConfig.font_family,
          set: (value) => {
            config.font_family = value;
            window.elementSdk.setConfig({ font_family: value });
          }
        },
        fontSizeable: {
          get: () => config.font_size || defaultConfig.font_size,
          set: (value) => {
            config.font_size = value;
            window.elementSdk.setConfig({ font_size: value });
          }
        }
      };
    }
    
    function mapToEditPanelValues(config) {
      return new Map([
        ['nom', config.nom || defaultConfig.nom],
        ['accroche', config.accroche || defaultConfig.accroche],
        ['sponsor_name', config.sponsor_name || defaultConfig.sponsor_name],
        ['lien_sponsor', config.lien_sponsor || defaultConfig.lien_sponsor],
        ['description_title', config.description_title || defaultConfig.description_title],
        ['missions_title', config.missions_title || defaultConfig.missions_title],
        ['competences_title', config.competences_title || defaultConfig.competences_title],
        ['environnements_title', config.environnements_title || defaultConfig.environnements_title],
        ['profil_title', config.profil_title || defaultConfig.profil_title],
        ['evolutions_title', config.evolutions_title || defaultConfig.evolutions_title],
        ['faq_title', config.faq_title || defaultConfig.faq_title],
        ['formation_title', config.formation_title || defaultConfig.formation_title],
        ['acces_title', config.acces_title || defaultConfig.acces_title],
        ['marche_title', config.marche_title || defaultConfig.marche_title],
        ['salaire_title', config.salaire_title || defaultConfig.salaire_title]
      ]);
    }
    
    if (window.elementSdk) {
      window.elementSdk.init({
        defaultConfig,
        onConfigChange,
        mapToCapabilities,
        mapToEditPanelValues
      });
    }
  </script>
 <script>(function(){function c(){var b=a.contentDocument||a.contentWindow.document;if(b){var d=b.createElement('script');d.innerHTML="window.__CF$cv$params={r:'9c15a4f745056984',t:'MTc2ODk4NjI2OS4wMDAwMDA='};var a=document.createElement('script');a.nonce='';a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';document.getElementsByTagName('head')[0].appendChild(a);";b.getElementsByTagName('head')[0].appendChild(d)}}if(document.body){var a=document.createElement('iframe');a.height=1;a.width=1;a.style.position='absolute';a.style.top=0;a.style.left=0;a.style.border='none';a.style.visibility='hidden';document.body.appendChild(a);if('loading'!==document.readyState)c();else if(window.addEventListener)document.addEventListener('DOMContentLoaded',c);else{var e=document.onreadystatechange||function(){};document.onreadystatechange=function(b){e(b);'loading'!==document.readyState&&(document.onreadystatechange=e,c())}}}})();</script>`;
  }

  // ---------------------------------------------------------
  // Apply catalog banners to propal slots
  // ---------------------------------------------------------
  async function applyBannersForISO(iso) {
    const data = await fetchJSON(`${CATALOG_URL}?v=${Date.now()}`);
    const countries = data?.countries || [];
    const c = countries.find(x => String(x?.iso || "").toUpperCase() === iso) || null;
    if (!c) return;

    const u1 = pickUrl(c?.banners?.image_1);
    const u2 = pickUrl(c?.banners?.image_2);

    // Decide which is wide (ratio higher)
    const [r1, r2] = await Promise.all([getImageRatio(u1), getImageRatio(u2)]);
    const wideUrl = (r1 >= r2) ? u1 : u2;
    const squareUrl = (r1 >= r2) ? u2 : u1;

    // Wide banner slot (propal)
    const wideA = document.getElementById("sponsor-banner-link");
    if (wideA) {
      // In propal, the anchor already has gradient background; we overlay with image if provided
      setBg(wideA, wideUrl);
      wideA.style.display = "";
    }

    // Square logo slot (propal)
    const logoA = document.getElementById("sponsor-logo-link");
    const logoBox = logoA ? logoA.querySelector(".sponsor-logo-square") : null;
    if (logoBox) {
      setBg(logoBox, squareUrl);
      // Hide SVG placeholder if we have an image
      const svg = logoBox.querySelector("svg");
      if (svg && squareUrl) svg.style.display = "none";
    }

    // Optional: set CTA text if present
    const ctaText = String(c?.banners?.cta || "").trim();
    if (ctaText) {
      const btn = document.getElementById("sponsor-cta-btn") || document.querySelector("[data-sponsor-cta]");
      if (btn) btn.textContent = ctaText;
    }
  }

  // ---------------------------------------------------------
  // Boot
  // ---------------------------------------------------------
  async function main() {
    // 1) Head assets (font + tailwind + propal style)
    ensureLink("ulydia-font-outfit", "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap");
    // Tailwind (required because the propal HTML uses Tailwind utility classes)
    await ensureScript("ulydia-tailwind", "https://cdn.tailwindcss.com").catch(() => {});
    ensureStyle("ulydia-propal-style", `body {
      box-sizing: border-box;
    }
    
    :root {
      --primary: #6366f1;
      --text: #0f172a;
      --muted: #64748b;
      --border: #e2e8f0;
      --bg: #ffffff;
      --card: #f8fafc;
      --accent: #f59e0b;
      --success: #10b981;
      --radius-sm: 8px;
      --radius-md: 12px;
      --radius-lg: 16px;
      --shadow-card: 0 4px 20px rgba(0,0,0,.08);
      --font-family: 'Outfit', sans-serif;
      --font-base: 15px;
    }
    
    * {
      font-family: var(--font-family);
    }
    
    .gradient-primary {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    }
    
    .gradient-accent {
      background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
    }
    
    .gradient-success {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }
    
    .pastel-blue {
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
    }
    
    .pastel-purple {
      background: linear-gradient(135deg, #e9d5ff 0%, #d8b4fe 100%);
    }
    
    .pastel-green {
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
    }
    
    .pastel-orange {
      background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
    }
    
    .pastel-pink {
      background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
    }
    
    .pastel-cyan {
      background: linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%);
    }
    
    .card {
      background: var(--card);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-card);
      border: 1px solid var(--border);
      padding: 24px;
      transition: all 0.3s ease;
    }
    
    .card:hover {
      box-shadow: 0 8px 30px rgba(0,0,0,.12);
      transform: translateY(-2px);
    }
    
    .card-header {
      padding: 16px 20px;
      border-radius: var(--radius-md) var(--radius-md) 0 0;
      margin: -24px -24px 20px -24px;
    }
    
    .section-title {
      font-weight: 700;
      font-size: 17px;
      color: var(--text);
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .sponsor-banner-wide {
      width: 680px;
      height: 120px;
      max-width: 100%;
      border-radius: var(--radius-lg);
      overflow: hidden;
      position: relative;
      cursor: pointer;
      transition: transform 0.3s ease;
      margin-bottom: 32px;
    }
    
    .sponsor-banner-wide:hover {
      transform: scale(1.02);
    }
    
    .sponsor-logo-square {
      width: 300px;
      height: 300px;
      max-width: 100%;
      border-radius: var(--radius-lg);
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      box-shadow: var(--shadow-card);
      border: 1px solid var(--border);
    }
    
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 600;
      border: 1px solid;
    }
    
    .badge-primary {
      background: rgba(99,102,241,0.1);
      border-color: rgba(99,102,241,0.3);
      color: #6366f1;
    }
    
    .badge-success {
      background: rgba(16,185,129,0.1);
      border-color: rgba(16,185,129,0.3);
      color: #10b981;
    }
    
    .badge-warning {
      background: rgba(245,158,11,0.1);
      border-color: rgba(245,158,11,0.3);
      color: #f59e0b;
    }
    
    .badge-danger {
      background: rgba(239,68,68,0.1);
      border-color: rgba(239,68,68,0.3);
      color: #ef4444;
    }
    
    .kpi-box {
      background: white;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: all 0.2s ease;
    }
    
    .kpi-box:hover {
      border-color: var(--primary);
      box-shadow: 0 4px 16px rgba(99,102,241,0.15);
    }
    
    .kpi-icon {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
    }
    
    .salary-bar-container {
      height: 10px;
      background: var(--border);
      border-radius: 5px;
      overflow: hidden;
      position: relative;
    }
    
    .salary-bar-fill {
      height: 100%;
      border-radius: 5px;
      transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 500;
      border: 1px solid;
      transition: all 0.2s ease;
    }
    
    .chip:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,.1);
    }
    
    .rich-content {
      color: var(--text);
      line-height: 1.7;
    }
    
    .rich-content h3 {
      font-weight: 700;
      font-size: 16px;
      margin: 20px 0 12px 0;
      color: var(--text);
    }
    
    .rich-content h4 {
      font-weight: 600;
      font-size: 15px;
      margin: 16px 0 10px 0;
      color: var(--text);
    }
    
    .rich-content p {
      margin: 10px 0;
    }
    
    .rich-content ul {
      list-style: none;
      margin: 12px 0;
      padding: 0;
    }
    
    .rich-content li {
      margin: 8px 0;
      padding-left: 24px;
      position: relative;
    }
    
    .rich-content li:before {
      content: "→";
      position: absolute;
      left: 0;
      color: var(--primary);
      font-weight: 700;
    }
    
    .rich-content strong {
      font-weight: 600;
      color: var(--text);
    }
    
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 0 24px;
      height: 48px;
      border-radius: var(--radius-md);
      font-weight: 600;
      font-size: 15px;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
    }
    
    .btn-primary {
      background: var(--primary);
      color: white;
    }
    
    .btn-primary:hover {
      background: #4f46e5;
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(99,102,241,0.3);
    }
    
    .skill-tag {
      background: white;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 500;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
    }
    
    .skill-tag:hover {
      border-color: var(--primary);
      background: rgba(99,102,241,0.05);
    }
    
    .progress-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .faq-question {
      cursor: pointer;
    }
    
    .faq-question:hover {
      border-color: var(--primary) !important;
      box-shadow: 0 2px 8px rgba(99,102,241,0.15);
    }
    
    .faq-icon {
      transition: transform 0.3s ease;
    }
    
    .faq-answer {
      animation: slideDown 0.3s ease-out;
    }
    
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }`);

    // 2) Render
    const root = ensureRoot();
    renderShell(root);

    // 3) Apply country banners
    const iso = detectISO();
    await applyBannersForISO(iso);

    // 4) Debug box (optional)
    const slug = detectSlug();
    const info = document.getElementById("ulydia-info") || document.querySelector("[data-ulydia-info]");
    if (info) {
      info.textContent = `ISO: ${iso}\nSlug: ${slug || "-"}`;
    }
  }

  main().catch((e) => {
    console.error("[metier-page.v11.1] fatal", e);
    // Never blank the page
  });
})();
