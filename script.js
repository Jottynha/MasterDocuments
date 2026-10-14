/* ============================================================
   PORTAL DE DOCUMENTAÇÃO MASTER
   Navegação de páginas, documentação por projeto e biblioteca PDF
   ============================================================ */

/* Configure estes valores apenas se o site não for publicado na raiz
   de um repositório público do GitHub Pages. */
const GITHUB_OWNER = ""; // Exemplo: "Jottynha"
const GITHUB_REPO = "";  // Exemplo: "portal-documentacao"
const DATA_DIR = "data/";

const pageButtons = [...document.querySelectorAll("[data-page]")];
const pages = {
    guias: document.getElementById("pagina-guias"),
    documentacao: document.getElementById("pagina-documentacao")
};
const projectButtons = [...document.querySelectorAll("[data-project]")];
const projectPages = [...document.querySelectorAll(".project-page")];
const guideGrid = document.getElementById("guide-grid");
const guideStatus = document.getElementById("guide-status");
const guideCount = document.getElementById("guide-count");
const searchInput = document.getElementById("search-guides");
const refreshButton = document.getElementById("refresh-guides");
let allGuides = [];

function setPage(pageName, updateHash = true) {
    if (!pages[pageName]) pageName = "guias";

    Object.entries(pages).forEach(([name, element]) => {
        element.hidden = name !== pageName;
    });
    pageButtons.forEach(button => {
        button.setAttribute("aria-selected", String(button.dataset.page === pageName));
    });

    if (updateHash) {
        const activeProject = document.querySelector(".project-page:not([hidden])");
        const hash = pageName === "documentacao"
            ? (activeProject ? `#${activeProject.id}` : "#documentacao")
            : "#guias";
        history.replaceState(null, "", hash);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function setProject(projectId, updateHash = true, scrollToTop = false) {
    const targetId = `projeto-${projectId}`;
    const target = document.getElementById(targetId);
    if (!target) return;

    projectPages.forEach(project => {
        project.hidden = project.id !== targetId;
    });
    projectButtons.forEach(button => {
        button.setAttribute("aria-selected", String(button.dataset.project === projectId));
    });

    if (updateHash) history.replaceState(null, "", `#${targetId}`);
    if (scrollToTop) window.scrollTo({ top: 0, behavior: "smooth" });
}

pageButtons.forEach(button => {
    button.addEventListener("click", () => setPage(button.dataset.page));
});

projectButtons.forEach(button => {
    button.addEventListener("click", () => {
        setProject(button.dataset.project);
    });
});

function inferGitHubRepository() {
    if (GITHUB_OWNER.trim() && GITHUB_REPO.trim()) {
        return { owner: GITHUB_OWNER.trim(), repo: GITHUB_REPO.trim() };
    }

    const hostname = window.location.hostname;
    if (!hostname.endsWith(".github.io")) return null;

    const owner = hostname.slice(0, -".github.io".length);
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    const repo = pathParts.length ? pathParts[0] : `${owner}.github.io`;
    if (!owner || !repo) return null;
    return { owner, repo };
}

function getSiteFileUrl(fileName) {
    const base = new URL(".", window.location.href);
    return new URL(DATA_DIR + encodeURIComponent(fileName), base).href;
}

function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return "PDF";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} KB`;
    }
    return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

function titleFromFilename(fileName) {
    return fileName
        .replace(/\.pdf$/i, "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function setStatus(message, isError = false) {
    guideStatus.classList.toggle("error", isError);
    guideStatus.textContent = message;
    guideStatus.hidden = !message;
}

function renderGuides() {
    const term = searchInput.value.trim().toLocaleLowerCase("pt-BR");
    const filtered = allGuides.filter(guide => {
        const haystack = `${guide.title} ${guide.fileName}`.toLocaleLowerCase("pt-BR");
        return haystack.includes(term);
    });

    guideGrid.replaceChildren();
    guideCount.textContent = `${filtered.length} ${filtered.length === 1 ? "guia" : "guias"}`;

    if (!filtered.length) {
        setStatus(allGuides.length
            ? "Nenhum guia corresponde à busca. Tente outro termo."
            : "Nenhum PDF foi encontrado na pasta data.");
        return;
    }

    setStatus("");
    const fragment = document.createDocumentFragment();

    filtered.forEach(guide => {
        const card = document.createElement("article");
        card.className = "guide-card";

        const top = document.createElement("div");
        top.className = "guide-card-top";
        const icon = document.createElement("div");
        icon.className = "pdf-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = "PDF";

        const info = document.createElement("div");
        info.style.minWidth = "0";
        const title = document.createElement("h3");
        title.className = "guide-title";
        title.textContent = guide.title;
        const meta = document.createElement("div");
        meta.className = "guide-meta";
        const tagType = document.createElement("span");
        tagType.className = "meta-tag";
        tagType.textContent = "Documento PDF";
        meta.append(tagType);

        if (Number.isFinite(guide.size)) {
            const tagSize = document.createElement("span");
            tagSize.className = "meta-tag";
            tagSize.textContent = formatFileSize(guide.size);
            meta.append(tagSize);
        }
        info.append(title, meta);
        top.append(icon, info);

        const description = document.createElement("p");
        description.className = "guide-description";
        description.textContent = guide.description || "Guia de referência disponível para consulta e download.";

        const actions = document.createElement("div");
        actions.className = "guide-actions";
        const download = document.createElement("a");
        download.className = "action-link primary";
        download.href = guide.url;
        download.setAttribute("download", guide.fileName);
        download.textContent = "↓ Baixar PDF";
        download.setAttribute("aria-label", `Baixar ${guide.title}`);

        const open = document.createElement("a");
        open.className = "action-link secondary";
        open.href = guide.url;
        open.target = "_blank";
        open.rel = "noopener noreferrer";
        open.textContent = "↗ Abrir";
        open.setAttribute("aria-label", `Abrir ${guide.title} em uma nova aba`);

        actions.append(download, open);
        card.append(top, description, actions);
        fragment.append(card);
    });

    guideGrid.append(fragment);
}

function normalizeManifestEntry(item) {
    const fileName = typeof item === "string"
        ? item
        : (item.arquivo || item.file || item.nome || item.name || "");
    if (!fileName || !/\.pdf$/i.test(fileName)) return null;

    return {
        fileName,
        title: (typeof item === "object" && (item.titulo || item.title)) || titleFromFilename(fileName),
        description: (typeof item === "object" && item.descricao) || "",
        size: typeof item === "object" && Number.isFinite(item.tamanho) ? item.tamanho : undefined,
        url: (typeof item === "object" && item.url) || getSiteFileUrl(fileName)
    };
}

async function loadFromManifest() {
    const response = await fetch(`${DATA_DIR}guias.json`, { cache: "no-store" });
    if (!response.ok) throw new Error("Catálogo de guias indisponível.");
    const manifest = await response.json();
    const entries = Array.isArray(manifest) ? manifest : manifest.guias;
    if (!Array.isArray(entries)) throw new Error("Formato do catálogo de guias inválido.");
    return entries.map(normalizeManifestEntry).filter(Boolean);
}

async function loadGuides() {
    refreshButton.disabled = true;
    refreshButton.textContent = "Carregando…";
    guideGrid.replaceChildren();
    guideCount.textContent = "Carregando…";
    setStatus("Carregando os guias…");
    allGuides = [];

    try {
        const repository = inferGitHubRepository();
        if (!repository) throw new Error("Catálogo GitHub não configurado.");

        const folder = DATA_DIR.replace(/\/$/, "");
        const endpoint = `https://api.github.com/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/contents/${folder}`;
        const response = await fetch(endpoint, {
            headers: { Accept: "application/vnd.github+json" },
            cache: "no-store"
        });
        if (!response.ok) throw new Error(`Catálogo remoto respondeu com status ${response.status}.`);

        const files = await response.json();
        if (!Array.isArray(files)) throw new Error("Formato do catálogo remoto inválido.");

        allGuides = files
            .filter(item => item.type === "file" && /\.pdf$/i.test(item.name))
            .map(item => ({
                fileName: item.name,
                title: titleFromFilename(item.name),
                description: "Guia de referência disponível para consulta e download.",
                size: Number.isFinite(item.size) ? item.size : undefined,
                url: getSiteFileUrl(item.name)
            }))
            .sort((a, b) => a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" }));
    } catch (catalogError) {
        try {
            allGuides = await loadFromManifest();
            allGuides.sort((a, b) => a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" }));
        } catch (manifestError) {
            console.error("Não foi possível carregar a biblioteca de guias:", catalogError, manifestError);
            guideCount.textContent = "Indisponível";
            guideGrid.replaceChildren();
            setStatus("Não foi possível carregar a lista de PDFs. Confira a configuração do catálogo de documentos.", true);
            refreshButton.disabled = false;
            refreshButton.textContent = "↻ Tentar novamente";
            return;
        }
    }

    renderGuides();
    refreshButton.disabled = false;
    refreshButton.textContent = "↻ Atualizar lista";
}

searchInput.addEventListener("input", renderGuides);
refreshButton.addEventListener("click", loadGuides);

/* Suporte a links diretos para páginas do portal e projetos. */
function openFromHash() {
    const hash = window.location.hash;
    if (hash === "#documentacao") {
        setPage("documentacao", false);
        setProject("bi", false);
        return;
    }
    if (hash.startsWith("#projeto-")) {
        setPage("documentacao", false);
        setProject(hash.slice("#projeto-".length), false);
        return;
    }
    if (hash.startsWith("#modulo-")) {
        setPage("documentacao", false);
        setProject("bi", false);
        requestAnimationFrame(() => {
            const target = document.querySelector(hash);
            if (target) target.scrollIntoView({ behavior: "auto", block: "start" });
        });
        return;
    }
    setPage("guias", false);
}

window.addEventListener("hashchange", openFromHash);
openFromHash();
loadGuides();
