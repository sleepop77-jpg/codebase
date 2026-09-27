// Minimal GitHub API Engine
let PAT = "", OWNER = "", REPO = "", BRANCH = "main";

function setConn(pat, repo, branch) {
    PAT = pat || "";
    BRANCH = branch || "main";
    const p = (repo || "").split("/");
    OWNER = p[0] || "";
    REPO = p[1] || "";
    return !!(OWNER && REPO);
}

async function api(method, path, body) {
    const r = await fetch("https://api.github.com" + path, {
        method,
        headers: Object.assign({
            "Authorization": "Bearer " + PAT,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
        }, body ? { "Content-Type": "application/json" } : {}),
        body: body ? JSON.stringify(body) : undefined
    });
    if (!r.ok) {
        const e = new Error("HTTP " + r.status);
        e.code = r.status;
        throw e;
    }
    const t = await r.text();
    return t ? JSON.parse(t) : {};
}

const b64 = s => btoa(unescape(encodeURIComponent(s)));
const unb64 = s => decodeURIComponent(escape(atob((s || "").replace(/\s/g, ""))));

async function validate() { return (await api("GET", "/user")).login; }

async function postBlob(c) {
    return (await api("POST", `/repos/${OWNER}/${REPO}/git/blobs`, { content: b64(c), encoding: "base64" })).sha;
}

const norm = s => s.split("\n").map(x => x.trim()).join("\n").trim();

function applyEdit(content, find, replace) {
    if (content.includes(find)) return content.replace(find, replace);
    const cf = norm(find).split("\n"), cl = content.split("\n");
    outer: for (let s = 0; s + cf.length <= cl.length; s++) {
        for (let j = 0; j < cf.length; j++) if (cl[s + j].trim() !== cf[j]) continue outer;
        return cl.slice(0, s).concat(replace.split("\n"), cl.slice(s + cf.length)).join("\n");
    }
    return null;
}

async function commitOps(ops, message) {
    let refSha = null, baseTree = null;
    try {
        const ref = await api("GET", `/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
        refSha = ref.object.sha;
        baseTree = (await api("GET", `/repos/${OWNER}/${REPO}/git/commits/${refSha}`)).tree.sha;
    } catch (e) {
        if (e.code !== 404) throw e;
        await api("GET", `/repos/${OWNER}/${REPO}`);
    }

    const misses = [];
    const entries = [];

    for (const op of ops) {
        if (op.kind === "FILE") {
            entries.push({ path: op.path, mode: "100644", type: "blob", sha: await postBlob(op.content) });
        } else if (op.kind === "DELETE") {
            entries.push({ path: op.path, mode: "100644", type: "blob", sha: null });
        } else {
            let content;
            try {
                content = unb64((await api("GET", `/repos/${OWNER}/${REPO}/contents/${op.path}?ref=${BRANCH}`)).content);
            } catch (e) {
                misses.push(`cannot read ${op.path} from ${BRANCH} (${e.message})`);
                continue;
            }
            for (let hi = 0; hi < op.hunks.length; hi++) {
                const h = op.hunks[hi];
                const next = applyEdit(content, h.find, h.replace);
                if (next == null) {
                    misses.push(`hunk ${(hi + 1)}/${op.hunks.length} in ${op.path} — FIND first line: ${h.find.split("\n")[0].slice(0, 90)}`);
                    continue;
                }
                content = next;
            }
            entries.push({ path: op.path, mode: "100644", type: "blob", sha: await postBlob(content) });
        }
    }

    if (misses.length) throw new Error("HUNK MISS REPORT\n" + misses.join("\n") + "\nNothing was committed.");

    const treeBody = { tree: entries };
    if (baseTree) treeBody.base_tree = baseTree;
    const tree = await api("POST", `/repos/${OWNER}/${REPO}/git/trees`, treeBody);
    const commit = await api("POST", `/repos/${OWNER}/${REPO}/git/commits`, { message, tree: tree.sha, parents: refSha ? [refSha] : [] });
    
    if (refSha) await api("PATCH", `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, { sha: commit.sha, force: false });
    else await api("POST", `/repos/${OWNER}/${REPO}/git/refs`, { ref: `refs/heads/${BRANCH}`, sha: commit.sha });
    
    return commit;
}

async function getTree() {
    const ref = await api("GET", `/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
    const commit = await api("GET", `/repos/${OWNER}/${REPO}/git/commits/${ref.object.sha}`);
    const tree = await api("GET", `/repos/${OWNER}/${REPO}/git/trees/${commit.tree.sha}?recursive=1`);
    return tree.tree.filter(i => i.type === 'blob');
}

async function getFile(path) {
    const res = await api("GET", `/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`);
    return unb64(res.content);
}

// Parser for VibeBridge payloads
function parsePayload(text) {
    const ops = [], warnings = [];
    if (!text.includes("===VIBEBRIDGE===")) warnings.push("no sentinel — lenient mode");
    const lines = text.split("\n");
    let i = 0;
    const clean = (l, t) => l.replace(t, "").replace(/=+\s*$/, "").trim();
    
    while (i < lines.length) {
        const l = lines[i].trim();
        if (l.startsWith("===== FILE:")) {
            const path = clean(l, "===== FILE:");
            const buf = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith("=====")) buf.push(lines[i++]);
            ops.push({ kind: "FILE", path, content: buf.join("\n") });
            continue;
        }
        if (l.startsWith("===== EDIT:")) {
            const path = clean(l, "===== EDIT:");
            const hunks = [];
            i++;
            let f = [], r = [], mode = "";
            while (i < lines.length && !lines[i].trim().startsWith("=====")) {
                const t = lines[i].trim();
                if (t === "--- FIND") mode = "f";
                else if (t === "--- REPLACE") mode = "r";
                else if (t === "--- END") {
                    if (f.length) hunks.push({ find: f.join("\n"), replace: r.join("\n") });
                    f = []; r = []; mode = "";
                } else if (mode === "f") f.push(lines[i]);
                else if (mode === "r") r.push(lines[i]);
                i++;
            }
            ops.push({ kind: "EDIT", path, hunks });
            continue;
        }
        if (l.startsWith("===== DELETE:")) ops.push({ kind: "DELETE", path: clean(l, "===== DELETE:") });
        i++;
    }
    return { ops, warnings };
}
