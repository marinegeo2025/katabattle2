document.addEventListener("DOMContentLoaded", async () => {
  const path = location.pathname;
  const slugMatch = path.match(/^\/b\/([^\/?#]+)/);
  const slug = slugMatch ? slugMatch[1] : null;

  const $ = (id) => document.getElementById(id);
  const welcome = $("welcome");
  const room = $("room");

  // --- Welcome screen ---
  if (!slug) {
    welcome.style.display = "block";
    $("createBtn").onclick = async () => {
  const customId = $("newId").value.trim();
  const name = $("newName").value.trim();

  try {
    const r = await fetch("/api/battles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customId, name })
    });

    // Don't assume JSON when the server returns an HTML 500 page
    const raw = await r.text();
    let j = {};
    try { j = raw ? JSON.parse(raw) : {}; } catch { /* leave j as {} */ }

    if (!r.ok) throw new Error(j.message || `HTTP ${r.status}`);

    // If server didn't send an absolute url (APP_BASE_URL missing), use a safe relative path
    const target = j.url || (j.slug ? `/b/${j.slug}` : null);
    if (!target) throw new Error("Create succeeded but no URL/slug returned.");
    location.href = target;

  } catch (err) {
    console.error("Create battle failed:", err);
    alert(`Create failed: ${err.message || "Unknown error"}`);
  }
};

  // --- Room view ---
  room.style.display = "block";
  let state = null;
  let judgeCode = localStorage.getItem(`judgeCode:${slug}`) || null;
  let countdownTimer = null;

  $("competitorJoinBtn").onclick = async () => {
    const name = $("competitorName").value.trim();
    if (!name) return;
    const r = await fetch(`/api/battles/${slug}/join-competitor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    const j = await r.json();
    if (!r.ok) return alert(j.message || "Join failed");
    $("competitorName").value = "";
    renderCompetitors(j.competitors);
  };

  $("judgeJoinBtn").onclick = async () => {
    const name = $("judgeName").value.trim();
    const r = await fetch(`/api/battles/${slug}/join-judge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    const j = await r.json();
    if (!r.ok) return alert(j.message || "Judge join failed");
    judgeCode = j.judgeCode;
    localStorage.setItem(`judgeCode:${slug}`, judgeCode);
    $("judgeCodeView").textContent = `Your judge code (saved on this device): ${judgeCode}`;
    refresh();
  };

  $("fightBtn").onclick = async () => {
    if (!judgeCode) return alert("Join as a judge first.");
    const r = await fetch(`/api/battles/${slug}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ judgeCode })
    });
    const j = await r.json();
    if (!r.ok) return alert(j.message || "Start failed");
    refresh();
  };

  $("uploadA").onclick = () => startUpload("A", $("statusA"));
  $("uploadB").onclick = () => startUpload("B", $("statusB"));

  async function startUpload(side, statusEl) {
  const r = await fetch(`/api/battles/${slug}/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fighter: side })
  });
  const j = await r.json();
  if (!r.ok) return alert(j.message || "Upload init failed");

  const input = document.createElement("input");
  input.type = "file"; input.accept = "video/*"; input.capture = "environment";
  input.onchange = async () => {
    const f = input.files[0]; if (!f) return;
    statusEl.textContent = "Uploading…";

    // Mux Direct Upload: PUT bytes to the upload URL
    await fetch(j.uploadURL, {
      method: "PUT",
      headers: { "Content-Type": f.type || "application/octet-stream" },
      body: f
    });

    statusEl.textContent = "Processing…";
    const poll = setInterval(async () => {
      const s = await fetch(`/api/battles/${slug}/video-status?uploadId=${encodeURIComponent(j.uploadId)}`).then(r => r.json());
      if (s.ready) { clearInterval(poll); statusEl.textContent = "Ready!"; refresh(); }
    }, 4000);
  };
  input.click();
}

  $("submitScores").onclick = async () => {
    if (!judgeCode) return alert("Join as a judge first.");
    const A = Number($("scoreA").value);
    const B = Number($("scoreB").value);
    const r = await fetch(`/api/battles/${slug}/submit-scores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ judgeCode, A, B })
    });
    const j = await r.json();
    if (!r.ok) return alert(j.message || "Score submit failed");
    renderScoreboard(j.scoreboard);
  };

  $("closeBtn").onclick = async () => {
    if (!judgeCode) return alert("Join as a judge first.");
    const r = await fetch(`/api/battles/${slug}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ judgeCode })
    });
    const j = await r.json();
    if (!r.ok) return alert(j.message || "Close failed");
    $("winnerView").textContent = `🏆 Winner: ${j.winner}`;
    refresh();
  };

  function renderCompetitors(list) {
    const ul = $("competitorList");
    ul.innerHTML = "";
    (list || []).forEach(n => {
      const li = document.createElement("li");
      li.textContent = n;
      ul.appendChild(li);
    });
  }

  function renderJudges(list) {
    const ul = $("judgeList");
    ul.innerHTML = (list || []).map(j => `<li>${j.name || "Judge"} ${j.submitted ? "✅" : ""}</li>`).join("");
  }

  function renderRound() {
  const r = state.round;
  $("deadline").textContent = "";

  if (!r) {
    $("vsBanner").innerHTML = "";
    $("uploadRow").style.display = "none";
    $("players").style.display = "none";
    return;
  }

  $("vsBanner").innerHTML = `
    <div class="kata-battle-container">
      <div class="kata-fighter">${r.fighterA.name}</div>
      <div class="kata-vs">⚔ VS ⚔</div>
      <div class="kata-fighter">${r.fighterB.name}</div>
    </div>
  `;
  $("aName").textContent = r.fighterA.name;
  $("bName").textContent = r.fighterB.name;
  $("sAname").textContent = r.fighterA.name;
  $("sBname").textContent = r.fighterB.name;

  if (state.status === "awaiting_videos") {
    $("uploadRow").style.display = "grid";
    $("players").style.display = "none";

    if (state.uploadDeadlineAt) {
      if (countdownTimer) clearInterval(countdownTimer);
      const tick = () => {
        const ms = new Date(state.uploadDeadlineAt) - new Date();
        $("deadline").textContent = ms > 0
          ? `Upload window closes in ${fmt(ms)}`
          : `Upload window has closed`;
      };
      tick();
      countdownTimer = setInterval(tick, 1000);
    }
  } else {
    $("uploadRow").style.display = "none";
  }

  if (state.status === "judging_open" || state.status === "archived") {
    const p = $("players");
    p.style.display = "grid";
    const A = r.fighterA.video, B = r.fighterB.video;

    console.log("Embedding playback IDs:", { A: A?.uid, B: B?.uid });

    if (!A?.uid || !B?.uid) {
      p.innerHTML = `<div>Waiting for videos to be ready…</div>`;
      return;
    }

    p.innerHTML = `
      <div><b>${r.fighterA.name}</b>
        <iframe src="https://player.mux.com/${A.uid}.html"
          allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
          allowfullscreen></iframe>
      </div>
      <div><b>${r.fighterB.name}</b>
        <iframe src="https://player.mux.com/${B.uid}.html"
          allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
          allowfullscreen></iframe>
      </div>
    `;
  }
}

  function renderScoreboard(sb) {
    if (!sb || !state.round) { $("scoreboard").innerHTML = ""; return; }
    $("scoreboard").innerHTML = `
      <h3>Live Scores</h3>
      <div><b>${state.round.fighterA.name}</b> — Total: ${sb.A.total?.toFixed?.(1) ?? sb.A.total} | Avg: ${sb.A.average} (Judges: ${sb.A.count})</div>
      <div><b>${state.round.fighterB.name}</b> — Total: ${sb.B.total?.toFixed?.(1) ?? sb.B.total} | Avg: ${sb.B.average} (Judges: ${sb.B.count})</div>
    `;
  }

  function fmt(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return (d ? d + "d " : "") + [h, m, ss].map(v => String(v).padStart(2, "0")).join(":");
  }

  async function refresh() {
    const r = await fetch(`/api/battles/${slug}`);
    const data = await r.json();
    state = data;

    $("battleTitle").textContent = `${state.name} (${state.slug})`;
    renderCompetitors(state.competitors);
    renderJudges(state.judges);
    renderRound();
    renderScoreboard(state.scoreboard);

    const judgeJoined = !!judgeCode;
    $("fightBtn").style.display = (state.status === "enrolling" && judgeJoined) ? "block" : "none";
    $("judgeScoring").style.display = (state.status === "judging_open" && judgeJoined) ? "block" : "none";
    $("closeBtn").style.display = (state.status === "judging_open" && judgeJoined) ? "block" : "none";

    if (state.status === "archived" && state.winner) {
      $("winnerView").textContent = `🏆 Winner: ${state.winner}`;
      if (countdownTimer) clearInterval(countdownTimer);
      $("deadline").textContent = "";
    }
  }

  await refresh();
  setInterval(refresh, 5000);
});
