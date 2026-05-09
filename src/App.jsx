import { useState, useRef, useCallback } from "react";

// ─── THEME ────────────────────────────────────────────────────────────────────
const T = {
  bg: "#f5f2ec",
  surface: "#ede9e0",
  card: "#faf8f4",
  border: "#d4cfc4",
  borderDark: "#b8b2a6",
  ink: "#1a1714",
  inkMid: "#4a4540",
  inkLight: "#8a847a",
  gold: "#b8952a",
  goldLight: "#e8d48a",
  goldPale: "#f5ecc8",
  red: "#c0392b",
  redPale: "#fce8e6",
  green: "#2e7d52",
  greenPale: "#e6f4ed",
  blue: "#1a5276",
  bluePale: "#e8f0f8",
  amber: "#d4700a",
  amberPale: "#fef0dc",
};

const G = {
  fontDisplay: "'Playfair Display', Georgia, serif",
  fontBody: "'DM Sans', 'Helvetica Neue', sans-serif",
  fontMono: "'JetBrains Mono', monospace",
  radius: 6,
  shadow: "0 2px 12px rgba(26,23,20,0.08)",
  shadowLg: "0 8px 32px rgba(26,23,20,0.12)",
};

// ─── UTILS ────────────────────────────────────────────────────────────────────
function readFileText(file) {
  return new Promise((resolve, reject) => {
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext === "pdf") {
      resolve(`[PDF] ${file.name} — 請將PDF內容複製後以文字形式貼入`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file, "UTF-8");
  });
}

function exportCSV(positions) {
  const rows = [["職位", "排名", "姓名", "總分", "推薦狀態", "關鍵優勢", "關鍵缺點", "獵頭評語"]];
  positions.forEach((pos) => {
    if (!pos.results) return;
    pos.results.forEach((r, i) => {
      rows.push([
        pos.title,
        r.excluded ? "排除" : i + 1,
        r.name || r.filename,
        r.score || "",
        r.excluded ? `排除：${r.excludeReason}` : r.recommendation,
        (r.strengths || []).join("；"),
        (r.weaknesses || []).join("；"),
        r.headhunterNote || "",
      ]);
    });
  });
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `headhunter_report_${Date.now()}.csv`;
  a.click();
}

function exportHTML(positions) {
  const sections = positions
    .filter((p) => p.results)
    .map((pos) => {
      const candidates = pos.results
        .map((r, i) => {
          if (r.excluded) {
            return `<div class="candidate excluded">
              <div class="c-header"><span class="rank ex">排除</span><span class="name">${r.name || r.filename}</span></div>
              <div class="exclude-reason">⚠ 排除原因：${r.excludeReason}</div>
              ${r.crossMatch?.length ? `<div class="cross">💡 可轉推至：${r.crossMatch.join("、")}</div>` : ""}
            </div>`;
          }
          return `<div class="candidate rank${i + 1}">
            <div class="c-header">
              <span class="rank">#${i + 1}</span>
              <span class="name">${r.name || r.filename}</span>
              <span class="score">${r.score}分</span>
              <span class="badge">${r.recommendation}</span>
            </div>
            <div class="note">${r.headhunterNote}</div>
            <div class="tags">
              ${(r.strengths || []).map((s) => `<span class="tag green">✓ ${s}</span>`).join("")}
              ${(r.weaknesses || []).map((w) => `<span class="tag red">✗ ${w}</span>`).join("")}
              ${(r.crossMatch || []).map((c) => `<span class="tag blue">↗ 可轉推：${c}</span>`).join("")}
            </div>
          </div>`;
        })
        .join("");
      return `<section><h2>${pos.title}</h2>${candidates}</section>`;
    })
    .join("");

  const html = `<!DOCTYPE html><html lang="zh-TW"><head><meta charset="UTF-8">
<title>獵頭篩選報告</title>
<style>
  body{font-family:'Helvetica Neue',sans-serif;background:#f5f2ec;color:#1a1714;padding:40px;max-width:900px;margin:0 auto}
  h1{font-family:Georgia,serif;font-size:28px;border-bottom:2px solid #b8952a;padding-bottom:12px;margin-bottom:32px}
  h2{font-family:Georgia,serif;font-size:20px;color:#b8952a;margin:32px 0 16px}
  .candidate{background:#fff;border:1px solid #d4cfc4;border-radius:8px;padding:20px;margin-bottom:12px}
  .candidate.excluded{opacity:.7;border-color:#e0c0bc}
  .c-header{display:flex;align-items:center;gap:12px;margin-bottom:8px}
  .rank{background:#b8952a;color:#fff;border-radius:4px;padding:2px 10px;font-weight:700;font-size:13px}
  .rank.ex{background:#c0392b}
  .name{font-size:17px;font-weight:600}
  .score{margin-left:auto;font-size:22px;font-weight:700;color:#b8952a}
  .badge{padding:3px 12px;border-radius:20px;font-size:12px;background:#e6f4ed;color:#2e7d52}
  .note{color:#4a4540;font-size:14px;line-height:1.7;margin:8px 0}
  .tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
  .tag{padding:3px 10px;border-radius:4px;font-size:12px}
  .tag.green{background:#e6f4ed;color:#2e7d52}
  .tag.red{background:#fce8e6;color:#c0392b}
  .tag.blue{background:#e8f0f8;color:#1a5276}
  .exclude-reason{color:#c0392b;font-size:13px;margin:4px 0}
  .cross{color:#1a5276;font-size:13px;margin-top:4px}
</style></head><body>
<h1>獵頭篩選報告 — ${new Date().toLocaleDateString("zh-TW")}</h1>
${sections}
</body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `headhunter_report_${Date.now()}.html`;
  a.click();
}

// ─── API CALL ─────────────────────────────────────────────────────────────────
async function analyzePosition(position, allPositionTitles) {
  const resumeList = position.resumes
    .map((r, i) => `--- 履歷 ${i + 1}：${r.filename} ---\n${r.content}`)
    .join("\n\n");

  const otherPositions = allPositionTitles.filter((t) => t !== position.title);

  const prompt = `你是一位資深獵頭顧問，擁有20年高端人才搜尋經驗。請以專業獵頭的視角，對以下履歷進行嚴格篩選和排序。

【目標職位】
${position.title}

【職位說明 / JD】
${position.jd}

【其他現有職位（供轉推參考）】
${otherPositions.length ? otherPositions.join("、") : "無"}

【候選人履歷清單】
${resumeList}

請以嚴格的獵頭標準：
1. 先排除明顯不適合的人選（條件差距太大、有明顯紅旗等）
2. 對適合的人選進行排序，最適合排第一
3. 若被排除的人選可能適合其他職位，請標注

回覆格式為JSON（不要有任何其他文字）：
{
  "positionSummary": "職位核心需求的一句話總結",
  "totalScreened": 數字,
  "qualified": 數字,
  "excluded": 數字,
  "ranked": [
    {
      "filename": "履歷檔名或識別",
      "name": "候選人姓名（如有）",
      "score": 0-100的數字,
      "recommendation": "強烈推薦|推薦|可考慮",
      "headhunterNote": "獵頭視角的100-150字專業評語，說明為何這個人選排在這個位置",
      "strengths": ["優勢1", "優勢2", "優勢3"],
      "weaknesses": ["風險點1"],
      "crossMatch": []
    }
  ],
  "excludedList": [
    {
      "filename": "履歷檔名",
      "name": "姓名（如有）",
      "excluded": true,
      "excludeReason": "排除原因，具體說明",
      "crossMatch": ["可轉推的其他職位名稱"]
    }
  ],
  "headhunterOverallNote": "200字以內的整體選才建議，包含市場觀察和面試重點提示"
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const text = data.content?.find((b) => b.type === "text")?.text || "";
  const clean = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);

  const results = [
    ...(parsed.ranked || []),
    ...(parsed.excludedList || []),
  ];

  return { ...parsed, results };
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
function ScoreBadge({ score }) {
  const color = score >= 80 ? T.green : score >= 65 ? T.amber : T.red;
  const bg = score >= 80 ? T.greenPale : score >= 65 ? T.amberPale : T.redPale;
  return (
    <span style={{ background: bg, color, fontFamily: G.fontMono, fontWeight: 700, fontSize: 15, padding: "2px 10px", borderRadius: 4, minWidth: 48, textAlign: "center", display: "inline-block" }}>
      {score}
    </span>
  );
}

function RecommendBadge({ text }) {
  const map = {
    "強烈推薦": { bg: T.greenPale, color: T.green, icon: "★★★" },
    "推薦": { bg: T.bluePale, color: T.blue, icon: "★★" },
    "可考慮": { bg: T.amberPale, color: T.amber, icon: "★" },
  };
  const s = map[text] || { bg: T.surface, color: T.inkLight, icon: "" };
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 11, padding: "2px 10px", borderRadius: 20, fontWeight: 600, letterSpacing: "0.05em" }}>
      {s.icon} {text}
    </span>
  );
}

function Tag({ children, variant = "neutral" }) {
  const styles = {
    green: { bg: T.greenPale, color: T.green },
    red: { bg: T.redPale, color: T.red },
    blue: { bg: T.bluePale, color: T.blue },
    neutral: { bg: T.surface, color: T.inkMid },
  };
  const s = styles[variant];
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 12, padding: "2px 10px", borderRadius: 4, display: "inline-block" }}>
      {children}
    </span>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function HeadhunterScreener() {
  const [positions, setPositions] = useState([
    { id: 1, title: "Senior Frontend Engineer", jd: "需求：React/TypeScript 3年+，團隊帶領經驗佳。加分：Node.js、CI/CD 經驗。", resumes: [], analyzing: false, results: null, error: null },
  ]);
  const [activePositionId, setActivePositionId] = useState(1);
  const [nextId, setNextId] = useState(2);
  const [globalNote, setGlobalNote] = useState("");
  const [tab, setTab] = useState("setup"); // setup | results
  const dropRef = useRef();

  const activePos = positions.find((p) => p.id === activePositionId);

  const updatePos = useCallback((id, patch) => {
    setPositions((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const addPosition = () => {
    const id = nextId;
    setNextId(id + 1);
    setPositions((prev) => [...prev, { id, title: `新職位 ${id}`, jd: "", resumes: [], analyzing: false, results: null, error: null }]);
    setActivePositionId(id);
  };

  const removePosition = (id) => {
    setPositions((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (activePositionId === id && next.length) setActivePositionId(next[0].id);
      return next;
    });
  };

  const handleFiles = async (files) => {
    const items = [];
    for (const file of files) {
      const content = await readFileText(file);
      items.push({ filename: file.name, content, id: Math.random() });
    }
    updatePos(activePositionId, { resumes: [...(activePos?.resumes || []), ...items] });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFiles(Array.from(e.dataTransfer.files));
  };

  const analyze = async () => {
    if (!activePos || activePos.resumes.length === 0 || !activePos.jd.trim()) return;
    updatePos(activePos.id, { analyzing: true, error: null, results: null });
    try {
      const allTitles = positions.map((p) => p.title);
      const result = await analyzePosition(activePos, allTitles);
      updatePos(activePos.id, { analyzing: false, results: result });
      setTab("results");
    } catch (e) {
      updatePos(activePos.id, { analyzing: false, error: "分析失敗，請再試一次：" + e.message });
    }
  };

  const analyzeAll = async () => {
    const allTitles = positions.map((p) => p.title);
    for (const pos of positions) {
      if (pos.resumes.length === 0 || !pos.jd.trim()) continue;
      updatePos(pos.id, { analyzing: true, error: null });
      try {
        const result = await analyzePosition(pos, allTitles);
        updatePos(pos.id, { analyzing: false, results: result });
      } catch (e) {
        updatePos(pos.id, { analyzing: false, error: "分析失敗" });
      }
    }
    setTab("results");
  };

  const hasAnyResults = positions.some((p) => p.results);

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: G.fontBody, color: T.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        textarea, input { font-family: inherit; }
        button { font-family: inherit; cursor: pointer; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%,100%{opacity:0.5} 50%{opacity:1} }
        .res-card { transition: box-shadow 0.2s; }
        .res-card:hover { box-shadow: 0 4px 20px rgba(26,23,20,0.12) !important; }
        .pos-tab:hover { background: ${T.goldPale} !important; }
        .btn-primary:hover { background: #9a7a20 !important; }
        .btn-ghost:hover { background: ${T.surface} !important; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
      `}</style>

      {/* HEADER */}
      <header style={{ background: T.ink, padding: "0 40px", display: "flex", alignItems: "center", height: 60, gap: 20 }}>
        <div style={{ fontFamily: G.fontDisplay, fontSize: 20, color: T.goldLight, letterSpacing: "0.02em", flexShrink: 0 }}>
          ◈ Headhunter Pro
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn-ghost" onClick={() => setTab("setup")} style={{ background: tab === "setup" ? T.goldPale : "transparent", color: tab === "setup" ? T.ink : T.surface, border: "none", padding: "6px 16px", borderRadius: G.radius, fontSize: 13, fontWeight: 500, transition: "background 0.2s" }}>
          設定職位 & 上傳
        </button>
        <button className="btn-ghost" onClick={() => setTab("results")} style={{ background: tab === "results" ? T.goldPale : "transparent", color: tab === "results" ? T.ink : T.surface, border: "none", padding: "6px 16px", borderRadius: G.radius, fontSize: 13, fontWeight: 500 }}>
          分析結果 {hasAnyResults && "●"}
        </button>
        {hasAnyResults && (
          <>
            <button className="btn-ghost" onClick={() => exportCSV(positions)} style={{ background: "transparent", color: T.goldLight, border: `1px solid ${T.gold}44`, padding: "5px 14px", borderRadius: G.radius, fontSize: 12 }}>
              ↓ CSV
            </button>
            <button className="btn-ghost" onClick={() => exportHTML(positions)} style={{ background: "transparent", color: T.goldLight, border: `1px solid ${T.gold}44`, padding: "5px 14px", borderRadius: G.radius, fontSize: 12 }}>
              ↓ HTML
            </button>
          </>
        )}
      </header>

      {tab === "setup" && (
        <div style={{ display: "flex", height: "calc(100vh - 60px)" }}>
          {/* Sidebar */}
          <aside style={{ width: 220, background: T.surface, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <div style={{ padding: "16px 16px 8px", fontSize: 10, letterSpacing: "0.15em", color: T.inkLight, textTransform: "uppercase" }}>職位列表</div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
              {positions.map((pos) => (
                <div key={pos.id} className="pos-tab" onClick={() => setActivePositionId(pos.id)}
                  style={{ padding: "10px 12px", borderRadius: G.radius, marginBottom: 2, cursor: "pointer", background: pos.id === activePositionId ? T.goldPale : "transparent", display: "flex", alignItems: "center", gap: 8, transition: "background 0.15s" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: pos.id === activePositionId ? T.ink : T.inkMid }}>{pos.title}</div>
                    <div style={{ fontSize: 11, color: T.inkLight }}>{pos.resumes.length} 份履歷 {pos.results ? "✓" : ""}{pos.analyzing ? "⟳" : ""}</div>
                  </div>
                  {positions.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); removePosition(pos.id); }} style={{ background: "none", border: "none", color: T.inkLight, fontSize: 14, padding: "0 2px", lineHeight: 1 }}>✕</button>
                  )}
                </div>
              ))}
            </div>
            <div style={{ padding: 12, borderTop: `1px solid ${T.border}` }}>
              <button onClick={addPosition} style={{ width: "100%", padding: "8px", background: "transparent", border: `1px dashed ${T.borderDark}`, borderRadius: G.radius, color: T.inkMid, fontSize: 12 }}>
                + 新增職位
              </button>
            </div>
          </aside>

          {/* Main */}
          {activePos && (
            <main style={{ flex: 1, overflowY: "auto", padding: 32 }}>
              <div style={{ maxWidth: 720 }}>
                {/* Position title */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 11, letterSpacing: "0.15em", color: T.inkLight, textTransform: "uppercase", display: "block", marginBottom: 6 }}>職位名稱</label>
                  <input value={activePos.title} onChange={(e) => updatePos(activePos.id, { title: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", background: T.card, border: `1px solid ${T.border}`, borderRadius: G.radius, fontSize: 16, fontFamily: G.fontDisplay, fontWeight: 600, color: T.ink, outline: "none" }} />
                </div>

                {/* JD */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 11, letterSpacing: "0.15em", color: T.inkLight, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    職位說明 JD
                  </label>
                  <textarea value={activePos.jd} onChange={(e) => updatePos(activePos.id, { jd: e.target.value })}
                    placeholder="貼上職位需求，包含必要條件、加分條件、薪資範圍等..."
                    style={{ width: "100%", minHeight: 160, padding: "12px 14px", background: T.card, border: `1px solid ${T.border}`, borderRadius: G.radius, fontSize: 14, lineHeight: 1.7, color: T.ink, resize: "vertical", outline: "none" }} />
                </div>

                {/* Upload */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 11, letterSpacing: "0.15em", color: T.inkLight, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    上傳履歷 — {activePos.resumes.length} 份已上傳
                  </label>
                  <div ref={dropRef} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}
                    onClick={() => { const i = document.createElement("input"); i.type = "file"; i.multiple = true; i.accept = ".txt,.md,.html,.htm"; i.onchange = (e) => handleFiles(Array.from(e.target.files)); i.click(); }}
                    style={{ border: `2px dashed ${T.border}`, borderRadius: G.radius, padding: "28px 20px", textAlign: "center", cursor: "pointer", background: T.card, transition: "border-color 0.2s" }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>⊕</div>
                    <div style={{ color: T.inkMid, fontSize: 14 }}>拖曳或點擊上傳履歷</div>
                    <div style={{ color: T.inkLight, fontSize: 12, marginTop: 4 }}>支援 .txt · .md · .html（每次可多選，上限無限）</div>
                  </div>

                  {activePos.resumes.length > 0 && (
                    <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {activePos.resumes.map((r) => (
                        <div key={r.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", background: T.goldPale, border: `1px solid ${T.goldLight}`, borderRadius: 20, fontSize: 12, color: T.inkMid }}>
                          📄 {r.filename}
                          <button onClick={() => updatePos(activePos.id, { resumes: activePos.resumes.filter((x) => x.id !== r.id) })}
                            style={{ background: "none", border: "none", color: T.inkLight, fontSize: 13, padding: 0, lineHeight: 1 }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Error */}
                {activePos.error && (
                  <div style={{ background: T.redPale, border: `1px solid ${T.red}44`, borderRadius: G.radius, padding: "12px 16px", color: T.red, fontSize: 13, marginBottom: 16 }}>
                    ⚠ {activePos.error}
                  </div>
                )}

                {/* Buttons */}
                <div style={{ display: "flex", gap: 12 }}>
                  <button className="btn-primary" onClick={analyze}
                    disabled={activePos.analyzing || activePos.resumes.length === 0 || !activePos.jd.trim()}
                    style={{ flex: 1, padding: "13px", background: T.gold, border: "none", borderRadius: G.radius, color: "#fff", fontWeight: 600, fontSize: 14, letterSpacing: "0.03em", opacity: activePos.analyzing || activePos.resumes.length === 0 || !activePos.jd.trim() ? 0.5 : 1, transition: "background 0.2s" }}>
                    {activePos.analyzing ? "⟳ 獵頭分析中..." : `▶ 分析「${activePos.title}」`}
                  </button>
                  {positions.length > 1 && (
                    <button onClick={analyzeAll} style={{ padding: "13px 20px", background: T.ink, border: "none", borderRadius: G.radius, color: T.goldLight, fontWeight: 600, fontSize: 14 }}>
                      ▶▶ 全部分析
                    </button>
                  )}
                </div>
              </div>
            </main>
          )}
        </div>
      )}

      {tab === "results" && (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
          {!hasAnyResults ? (
            <div style={{ textAlign: "center", padding: "80px 20px", color: T.inkLight }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>◎</div>
              <div style={{ fontSize: 16 }}>尚未有分析結果</div>
              <button onClick={() => setTab("setup")} style={{ marginTop: 16, padding: "10px 24px", background: T.gold, border: "none", borderRadius: G.radius, color: "#fff", fontWeight: 600 }}>前往設定</button>
            </div>
          ) : (
            positions.filter((p) => p.results).map((pos) => {
              const r = pos.results;
              const ranked = r.results?.filter((x) => !x.excluded) || [];
              const excluded = r.results?.filter((x) => x.excluded) || [];
              return (
                <div key={pos.id} style={{ marginBottom: 48, animation: "fadeUp 0.4s ease" }}>
                  {/* Position header */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20, paddingBottom: 16, borderBottom: `2px solid ${T.gold}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: G.fontDisplay, fontSize: 24, fontWeight: 700, color: T.ink, marginBottom: 4 }}>{pos.title}</div>
                      <div style={{ color: T.inkLight, fontSize: 13 }}>{r.positionSummary}</div>
                    </div>
                    <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
                      <div style={{ textAlign: "center", padding: "8px 16px", background: T.greenPale, borderRadius: G.radius }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: T.green, fontFamily: G.fontMono }}>{r.qualified}</div>
                        <div style={{ fontSize: 10, color: T.inkLight, letterSpacing: "0.1em" }}>QUALIFIED</div>
                      </div>
                      <div style={{ textAlign: "center", padding: "8px 16px", background: T.redPale, borderRadius: G.radius }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: T.red, fontFamily: G.fontMono }}>{r.excluded}</div>
                        <div style={{ fontSize: 10, color: T.inkLight, letterSpacing: "0.1em" }}>EXCLUDED</div>
                      </div>
                    </div>
                  </div>

                  {/* Overall note */}
                  {r.headhunterOverallNote && (
                    <div style={{ background: T.goldPale, border: `1px solid ${T.goldLight}`, borderRadius: G.radius, padding: "16px 20px", marginBottom: 24, fontSize: 14, lineHeight: 1.7, color: T.inkMid }}>
                      <div style={{ fontSize: 11, letterSpacing: "0.15em", color: T.gold, textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>◈ 獵頭綜合建議</div>
                      {r.headhunterOverallNote}
                    </div>
                  )}

                  {/* Ranked */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 11, letterSpacing: "0.15em", color: T.inkLight, textTransform: "uppercase", marginBottom: 12 }}>推薦人選排序</div>
                    {ranked.map((c, i) => (
                      <div key={i} className="res-card" style={{ background: T.card, border: `1px solid ${i === 0 ? T.gold : T.border}`, borderRadius: G.radius, padding: "20px 24px", marginBottom: 10, boxShadow: i === 0 ? `0 0 0 1px ${T.goldLight}` : G.shadow, animation: `fadeUp ${0.2 + i * 0.08}s ease` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                          <div style={{ width: 32, height: 32, background: i === 0 ? T.gold : T.surface, border: `1px solid ${i === 0 ? T.gold : T.border}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: G.fontMono, fontWeight: 700, fontSize: 14, color: i === 0 ? "#fff" : T.inkMid, flexShrink: 0 }}>
                            {i + 1}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 16, fontWeight: 600, color: T.ink }}>{c.name || c.filename}</div>
                            {c.name && <div style={{ fontSize: 11, color: T.inkLight }}>{c.filename}</div>}
                          </div>
                          <ScoreBadge score={c.score} />
                          <RecommendBadge text={c.recommendation} />
                        </div>

                        <div style={{ fontSize: 13, lineHeight: 1.8, color: T.inkMid, marginBottom: 12, paddingLeft: 44 }}>
                          {c.headhunterNote}
                        </div>

                        <div style={{ paddingLeft: 44, display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {(c.strengths || []).map((s, j) => <Tag key={j} variant="green">✓ {s}</Tag>)}
                          {(c.weaknesses || []).map((w, j) => <Tag key={j} variant="red">△ {w}</Tag>)}
                          {(c.crossMatch || []).map((m, j) => <Tag key={j} variant="blue">↗ {m}</Tag>)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Excluded */}
                  {excluded.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, letterSpacing: "0.15em", color: T.inkLight, textTransform: "uppercase", marginBottom: 12 }}>排除人選（{excluded.length}）</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8 }}>
                        {excluded.map((c, i) => (
                          <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: G.radius, padding: "14px 16px", opacity: 0.85 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: T.inkMid, marginBottom: 6 }}>{c.name || c.filename}</div>
                            <div style={{ fontSize: 12, color: T.red, marginBottom: c.crossMatch?.length ? 6 : 0 }}>⊘ {c.excludeReason}</div>
                            {c.crossMatch?.length > 0 && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                {c.crossMatch.map((m, j) => <Tag key={j} variant="blue">↗ {m}</Tag>)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
