// public/judge.js
export function renderJudgePanel(slug, judgeCode, fighterKey, fighterName) {
  const panel = document.createElement("div");
  panel.className = "judge-panel";

  let base = 8.0;
  let score = base;

  const deductions = [
    { key: "balance", label: "Balance", val: -0.1 },
    { key: "movement", label: "Movement", val: -0.1 },
    { key: "timing", label: "Timing", val: -0.1 },
    { key: "focus", label: "Focus", val: -0.1 },
    { key: "technique", label: "Technique", val: -0.2 },
    { key: "attire", label: "Attire / Space", val: -0.2 }
  ];

  const additions = [
    { key: "speed", label: "Speed", val: +0.1 },
    { key: "power", label: "Power", val: +0.1 },
    { key: "rhythm", label: "Rhythm", val: +0.1 },
    { key: "spirit", label: "Spirit", val: +0.1 },
    { key: "expression", label: "Expression", val: +0.1 }
  ];

  const title = document.createElement("h4");
  title.textContent = `⚖️ Judge Panel: ${fighterName}`;
  panel.appendChild(title);

  const scoreEl = document.createElement("div");
  scoreEl.className = "score-display";
  scoreEl.textContent = score.toFixed(2);
  panel.appendChild(scoreEl);

  const btnBox = document.createElement("div");
  btnBox.className = "judge-buttons";

  function update(delta) {
    score = Math.min(10, Math.max(6, +(score + delta).toFixed(2)));
    scoreEl.textContent = score.toFixed(2);
  }

  // Deduction buttons
  deductions.forEach(d => {
    const btn = document.createElement("button");
    btn.textContent = d.label;
    btn.className = "deduct";
    btn.onclick = () => update(d.val);
    btnBox.appendChild(btn);
  });

  // Addition buttons
  additions.forEach(a => {
    const btn = document.createElement("button");
    btn.textContent = a.label;
    btn.className = "add";
    btn.onclick = () => update(a.val);
    btnBox.appendChild(btn);
  });

  panel.appendChild(btnBox);

  const submitBtn = document.createElement("button");
  submitBtn.textContent = "✅ Submit Score";
  submitBtn.className = "submit-score";

    submitBtn.onclick = async () => {
    if (!judgeCode) return alert("Join as judge first!");

    try {
      const r = await fetch(`/api/battles/${slug}/judge-score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          judgeCode,
          fighter: fighterKey,
          base,
          deductions: {},
          additions: {},
          final: score
        })
      });

      const j = await r.json();

      if (r.ok) {
        console.log("✅ Saved scores:", j.scores);

        // Immediately refresh the battle view so averages/winner appear
        if (window.refresh) await window.refresh();
        else location.reload();

        // Optional: friendly toast/alert
        alert(`Score for ${fighterName}: ${score.toFixed(2)} submitted!`);

        // Optional: visually disable the panel to prevent resubmission
        submitBtn.disabled = true;
        submitBtn.textContent = "✅ Score Submitted";
        panel.querySelectorAll("button.deduct, button.add").forEach(b => (b.disabled = true));

      } else {
        alert(j.message || "Submit failed");
      }
    } catch (err) {
      console.error("Submit error:", err);
      alert("Network error while submitting score");
    }
  };

  panel.appendChild(submitBtn);

  return panel;
}
