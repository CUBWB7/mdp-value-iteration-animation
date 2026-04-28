// ============================================================
// MDP Value Iteration on Grid World — 教学动画
// 完整 7 子步流程：Idle → Template → Q-table → Pick max →
//                  Highlight → Substitute & Compute → Commit & Move
// ============================================================

// ===== 工具：Grid 拓扑 =====
const cellKey = ([r, c]) => `${r},${c}`;
const isInBounds = ([r, c]) =>
  r >= 0 && r < GRID.rows && c >= 0 && c < GRID.cols;
const getCellType = (cell) => GRID.cellTypes[cellKey(cell)] || "normal";
const isWall = (cell) => getCellType(cell) === "wall";
// 终止/吸收态：green (+1) 与 red (-1) 都被本题答案当作终止处理
//   - 进入后 V = R，没有后续转移
//   - 动画里也只显示 2 子步（Idle → Commit）
const isTerminal = (cell) => {
  const t = getCellType(cell);
  return t === "green" || t === "red";
};
const getReward = (cell) => REWARD[getCellType(cell)];

// 动作位移（注意 [0,0] 在左下，所以 UP = row+1）
const DELTA = {
  UP: [+1, 0],
  DOWN: [-1, 0],
  LEFT: [0, -1],
  RIGHT: [0, +1],
};
// stochastic 0.1 偏移：与动作垂直的两侧
const PERPENDICULAR = {
  UP: ["LEFT", "RIGHT"],
  DOWN: ["LEFT", "RIGHT"],
  LEFT: ["DOWN", "UP"],
  RIGHT: ["DOWN", "UP"],
};

// 应用一次方向移动；越界或撞墙时停留原地
function applyMove(state, dir) {
  const [dr, dc] = DELTA[dir];
  const target = [state[0] + dr, state[1] + dc];
  if (!isInBounds(target) || isWall(target)) return [state[0], state[1]];
  return target;
}

// 返回 stochastic 三个分量
function getTransitions(state, action) {
  const [perpA, perpB] = PERPENDICULAR[action];
  return [
    { prob: 0.8, cell: applyMove(state, action), dir: action },
    { prob: 0.1, cell: applyMove(state, perpA), dir: perpA },
    { prob: 0.1, cell: applyMove(state, perpB), dir: perpB },
  ];
}

// 取 V_old；未访问的 state 默认 0
function vAt(cell, vTable) {
  const k = cellKey(cell);
  return k in vTable ? vTable[k] : 0;
}

// Q(s,a) = Σ T·V_old（不含 γ 与 R，那两步在主公式里）
function computeQ(state, action, vTable) {
  return getTransitions(state, action).reduce(
    (sum, t) => sum + t.prob * vAt(t.cell, vTable),
    0
  );
}

// V_new(s) = R(s) + γ · max_a Q(s,a)
function computeVNew(state, vTable) {
  if (isTerminal(state)) {
    return { vNew: getReward(state), qByAction: null, optimalAction: null, isTerm: true };
  }
  const qByAction = {};
  for (const a of ACTIONS) qByAction[a] = computeQ(state, a, vTable);
  // tie-break: ACTIONS 数组首位（UP）
  let optimalAction = ACTIONS[0];
  for (const a of ACTIONS) {
    if (qByAction[a] > qByAction[optimalAction]) optimalAction = a;
  }
  const vNew = getReward(state) + GAMMA * qByAction[optimalAction];
  return { vNew, qByAction, optimalAction, isTerm: false };
}

// ===== 应用状态 =====
const state = {
  trajectoryId: 1,
  stepIndex: 0,
  subStep: 0,
  isPlaying: false,
  speed: 1.0,
};
let playTimer = null;

const getCurrentTrajectory = () =>
  TRAJECTORIES.find((t) => t.id === state.trajectoryId);

// 当前 step 在 trajectory 里的最大子步号（normal=5, terminal=1）
function maxSubStep(stepIndex) {
  const traj = getCurrentTrajectory();
  return isTerminal(traj.steps[stepIndex].s) ? 1 : 5;
}

// 「该步 commit 已经完成」对应的子步阈值
const commitSubStep = (stepIndex) => maxSubStep(stepIndex);

// 数字格式化：去尾随 0
function fmt(n) {
  if (Number.isInteger(n)) return n.toString();
  return n
    .toFixed(2)
    .replace(/0+$/, "")
    .replace(/\.$/, "");
}

// ===== 状态机：next/prev/reset =====
function next() {
  const traj = getCurrentTrajectory();
  const maxSub = maxSubStep(state.stepIndex);
  if (state.subStep < maxSub) {
    state.subStep++;
  } else if (state.stepIndex < traj.steps.length - 1) {
    state.stepIndex++;
    state.subStep = 0;
  } else {
    if (state.isPlaying) togglePlay();
    return false;
  }
  return true;
}

function prev() {
  if (state.subStep > 0) {
    state.subStep--;
  } else if (state.stepIndex > 0) {
    state.stepIndex--;
    state.subStep = maxSubStep(state.stepIndex);
  } else {
    return false;
  }
  return true;
}

function reset() {
  state.stepIndex = 0;
  state.subStep = 0;
  if (state.isPlaying) togglePlay();
}

// ===== 当前 robot 位置 =====
function currentRobotCell() {
  const traj = getCurrentTrajectory();
  const step = traj.steps[state.stepIndex];
  // commit 后 robot 沿 trajectory 的 a_t 移到 sNext（terminal 时 sNext=null，不动）
  if (state.subStep >= commitSubStep(state.stepIndex) && step.sNext) {
    return step.sNext;
  }
  return step.s;
}

// ===== 渲染：网格 =====
function renderGrid(displayVTable, highlights) {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";
  const robotCell = currentRobotCell();
  const traj = getCurrentTrajectory();
  const step = traj.steps[state.stepIndex];

  // CSS grid 从上到下；row=2 应在最上面 → 翻转
  for (let visualRow = 0; visualRow < GRID.rows; visualRow++) {
    const r = GRID.rows - 1 - visualRow;
    for (let c = 0; c < GRID.cols; c++) {
      const cell = [r, c];
      const type = getCellType(cell);
      const div = document.createElement("div");
      div.className = `cell ${type}`;

      // a* 邻居高亮 + 概率角标
      const hl =
        highlights &&
        highlights.find((h) => h.cell[0] === r && h.cell[1] === c);
      if (hl) {
        div.classList.add(hl.prob === 0.8 ? "hl-08" : "hl-01");
        const badge = document.createElement("div");
        badge.className = "prob-badge" + (hl.prob === 0.1 ? " p01" : "");
        badge.textContent = hl.prob.toFixed(1);
        div.appendChild(badge);
      }

      // 左下角坐标小字（wall 不显示）
      if (type !== "wall") {
        const coord = document.createElement("div");
        coord.className = "coord-label";
        coord.textContent = `[${r},${c}]`;
        div.appendChild(coord);
      }

      // V 值（wall 不显示）
      if (type !== "wall") {
        const vEl = document.createElement("div");
        const k = cellKey(cell);
        if (k in displayVTable) {
          vEl.className = "v-value";
          vEl.textContent = fmt(displayVTable[k]);
        } else {
          vEl.className = "v-value v-empty";
          vEl.textContent = "—";
        }
        div.appendChild(vEl);
      }

      // 机器人
      if (robotCell[0] === r && robotCell[1] === c) {
        const robot = document.createElement("div");
        robot.className = "robot";
        robot.textContent = "🤖";
        div.appendChild(robot);
      }

      // sub 0 时在 robot 当前格上显示淡灰 trajectory a_t
      if (
        state.subStep === 0 &&
        step.trajectoryAction &&
        robotCell[0] === r &&
        robotCell[1] === c
      ) {
        const hint = document.createElement("div");
        hint.className = "action-hint";
        hint.innerHTML = `a<sub>t</sub>=${step.trajectoryAction}`;
        div.appendChild(hint);
      }

      grid.appendChild(div);
    }
  }
}

// ===== 渲染：KaTeX 辅助 =====
function renderKaTeX(elementId, latex) {
  const el = document.getElementById(elementId);
  if (!latex) {
    el.innerHTML = `<span class="placeholder">（按 Next 进入下一子步）</span>`;
    return;
  }
  if (typeof katex === "undefined") {
    el.textContent = latex;
    return;
  }
  try {
    katex.render(latex, el, { throwOnError: false, displayMode: true });
  } catch (e) {
    el.textContent = latex;
  }
}

// ===== 渲染：右侧信息面板 =====
function renderInfoPane(preCommitVTable, vRes) {
  const traj = getCurrentTrajectory();
  const step = traj.steps[state.stepIndex];
  const sub = state.subStep;
  const isTerm = isTerminal(step.s);

  // 标题
  document.getElementById("step-title").textContent =
    `Trajectory ${traj.id} — step ${state.stepIndex} / ${traj.steps.length - 1}`;

  const subLabels = isTerm
    ? ["0. Terminal Idle", "1. Commit V=+1"]
    : [
        "0. Idle",
        "1. Q-table",
        "2. Pick max",
        "3. Highlight neighbors",
        "4. Substitute & Compute",
        "5. Commit & Move",
      ];
  const termType = isTerm ? getCellType(step.s) : null;
  const termColorWord = termType === "green" ? "绿色" : "红色";
  const termRewardStr = termType === "green" ? "+1" : "−1";
  const subExplains = isTerm
    ? [
        `机器人到达${termColorWord}终止格 [${step.s[0]},${step.s[1]}]，直接领 ${termRewardStr}，无需算 Q。`,
        `把 ${termRewardStr} 写进 grid 与底部 V 表，trajectory 结束。`,
      ]
    : [
        `机器人在 s = [${step.s[0]},${step.s[1]}]，准备算这格的新 V 值。`,
        `先把 4 个动作各自的 Q 值都算出来，准备比较谁最大。`,
        `在 4 个 Q 中挑出最大值，对应的动作就是 a*（公式里的 max_a）。`,
        `在 grid 上标出 a* 触发的 3 个可能下一格（深色 0.8、浅色各 0.1）。`,
        `代入主公式 V_new = R + γ·max_Q，算出本格的新 V 值。`,
        `把 V_new 写进 grid 与底部 V 表；机器人按 trajectory 的 a<sub>t</sub>（不是 a*）走到下一格。`,
      ];
  document.getElementById("sub-step-title").textContent =
    `Sub-step ${sub} / ${maxSubStep(state.stepIndex)} · ${subLabels[sub]}`;
  document.getElementById("sub-step-explain").innerHTML = subExplains[sub] || "";

  // 状态信息
  const stateInfo = document.getElementById("state-info");
  if (isTerm) {
    stateInfo.innerHTML = `
      <div>当前 state：<code>s = [${step.s[0]}, ${step.s[1]}]</code> （${termColorWord} / Terminal）</div>
      <div>Reward：<code>R(${termType}) = ${termRewardStr}</code>，进入后无后续转移</div>
    `;
  } else {
    let html = `
      <div>当前 state：<code>s = [${step.s[0]}, ${step.s[1]}]</code></div>
      <div>Reward：<code>R(s) = ${getReward(step.s)}</code></div>
      <div class="traj-action">trajectory <code>a<sub>t</sub> = ${step.trajectoryAction}</code>（仅决定下一格走向，不进 V 公式）</div>
    `;
    // sub >= 2 时 a* 已确定，列出 T(s, a*, s') 与 V_old(s')
    if (sub >= 2 && vRes.optimalAction) {
      const a = vRes.optimalAction;
      const trans = getTransitions(step.s, a);
      html += `<div class="opt-action">最优动作 <code>a* = ${a}</code></div>`;
      html += `<table class="trans-table"><thead><tr>
          <th>T(s, a*, s')</th><th>下一格 s'</th><th>V<sub>old</sub>(s')</th>
        </tr></thead><tbody>`;
      for (const t of trans) {
        html += `<tr>
          <td>${t.prob}</td>
          <td><code>[${t.cell[0]},${t.cell[1]}]</code></td>
          <td>${fmt(vAt(t.cell, preCommitVTable))}</td>
        </tr>`;
      }
      html += `</tbody></table>`;
    }
    stateInfo.innerHTML = html;
  }

  // Q-table（4 个动作）
  const qTable = document.getElementById("q-table");
  qTable.innerHTML = "";
  if (!isTerm && sub >= 1) {
    for (const a of ACTIONS) {
      const row = document.createElement("div");
      row.className = "q-row";
      const isMax = sub >= 2 && a === vRes.optimalAction;
      if (isMax) row.classList.add("is-max");

      const trans = getTransitions(step.s, a);
      const parts = trans
        .map((t) => `${t.prob}·${fmt(vAt(t.cell, preCommitVTable))}`)
        .join(" + ");
      row.innerHTML = `
        <span class="q-action">Q(${a})</span>
        <span>= ${parts} = ${fmt(vRes.qByAction[a])}</span>
        ${isMax ? `<span class="max-mark">← max → a*</span>` : ""}
      `;
      qTable.appendChild(row);
    }
  } else if (isTerm) {
    qTable.innerHTML = `<div class="q-row" style="opacity:.6">Terminal state，无 Q 计算</div>`;
  }

  // 代入与化简
  if (isTerm && sub >= 1) {
    renderKaTeX(
      "formula-substitute",
      `V_{\\text{new}}([${step.s[0]},${step.s[1]}]) = ${fmt(vRes.vNew)}`
    );
  } else if (!isTerm && sub >= 4) {
    const a = vRes.optimalAction;
    const trans = getTransitions(step.s, a);
    const inner = trans
      .map((t) => `${t.prob}\\cdot ${fmt(vAt(t.cell, preCommitVTable))}`)
      .join("+");
    const innerSum = vRes.qByAction[a];
    const r = getReward(step.s);
    renderKaTeX(
      "formula-substitute",
      `V_{\\text{new}}([${step.s[0]},${step.s[1]}])` +
        ` = ${fmt(r)} + ${GAMMA}\\cdot(${inner})` +
        ` = ${fmt(r)} + ${GAMMA}\\cdot ${fmt(innerSum)}` +
        ` = ${fmt(vRes.vNew)}`
    );
  } else {
    renderKaTeX("formula-substitute", null);
  }
}

// ===== 主 render：组装 vTable + Highlight =====
function render() {
  const traj = getCurrentTrajectory();
  const step = traj.steps[state.stepIndex];

  // pre-commit vTable：先把之前所有 trajectory 跑完（V 表跨 trajectory 累积）
  const preCommit = {};
  for (const t of TRAJECTORIES) {
    if (t.id >= state.trajectoryId) break;
    for (const s2 of t.steps) {
      const r = computeVNew(s2.s, preCommit);
      preCommit[cellKey(s2.s)] = r.vNew;
    }
  }
  // 再把当前 trajectory 已 commit 的 step 跑完
  for (let i = 0; i < state.stepIndex; i++) {
    const s2 = traj.steps[i];
    const r = computeVNew(s2.s, preCommit);
    preCommit[cellKey(s2.s)] = r.vNew;
  }

  // 当前 step 的 V_new 中间结果
  const vRes = computeVNew(step.s, preCommit);

  // 显示用 vTable：commit 子步及之后包含当前 step 的 V_new
  const displayVTable = { ...preCommit };
  if (state.subStep >= commitSubStep(state.stepIndex)) {
    displayVTable[cellKey(step.s)] = vRes.vNew;
    // sanity check：与答案 PDF 比对
    if (Math.abs(vRes.vNew - step.answerV) > 0.01) {
      console.error(
        `[assertMatchesAnswer] step ${state.stepIndex} V[${step.s}]: ` +
          `computed=${vRes.vNew}, expected=${step.answerV}`
      );
    }
  }

  // a* 邻居高亮：sub 3 (Highlight) 与 sub 4 (Substitute) 都显示
  let highlights = null;
  if (!vRes.isTerm && (state.subStep === 3 || state.subStep === 4)) {
    highlights = getTransitions(step.s, vRes.optimalAction).map((t) => ({
      cell: t.cell,
      prob: t.prob,
    }));
  }

  renderGrid(displayVTable, highlights);
  renderInfoPane(preCommit, vRes);
  renderFormulaBanner();
  renderVMatrix();
  updateButtons();
}

// ===== 顶部公式横条（始终常显） =====
function renderFormulaBanner() {
  renderKaTeX(
    "formula-template-banner",
    `V_{\\text{new}}(s) = R(s) + \\gamma\\cdot\\max_{a}\\sum_{s'}T(s,a,s')\\,V_{\\text{old}}(s')`
  );
}

// ===== 累积 V 表 =====
// 对每条 trajectory 重放至「已 commit」的步数，把 V 写入对应 (trajId, stepIdx) 的格子
function renderVMatrix() {
  const container = document.getElementById("v-matrix");
  if (!container) return;
  const maxSteps = 6; // 行数：s_0..s_5

  // 每条 trajectory 的「已 commit step 数」
  const committedCount = (traj) => {
    if (traj.id < state.trajectoryId) return traj.steps.length;
    if (traj.id > state.trajectoryId) return 0;
    // 当前 trajectory：当前 step 已 commit 时计入
    const curCommitted =
      state.subStep >= maxSubStep(state.stepIndex) ? state.stepIndex + 1 : state.stepIndex;
    return curCommitted;
  };

  // 计算每条 trajectory 的 V 值数组（已 commit 的位置）
  const vByTraj = {};
  for (const traj of TRAJECTORIES) {
    const n = committedCount(traj);
    const vTable = { ...(vByTraj.__cumulative || {}) };
    const vals = [];
    for (let i = 0; i < traj.steps.length; i++) {
      if (i >= n) {
        vals.push(null);
        continue;
      }
      const s = traj.steps[i].s;
      const r = computeVNew(s, vTable);
      vTable[cellKey(s)] = r.vNew;
      vals.push(r.vNew);
    }
    vByTraj[traj.id] = vals;
    vByTraj.__cumulative = vTable; // 跨 trajectory 累积
  }

  // 渲染 HTML 表格
  let html = '<table class="v-matrix-table"><thead><tr><th></th>';
  for (let t = 1; t <= 6; t++) {
    const cls = t === state.trajectoryId ? "col-current" : "";
    html += `<th class="${cls}">T${t}</th>`;
  }
  html += "</tr></thead><tbody>";
  for (let i = 0; i < maxSteps; i++) {
    const isCurrentRow = i === state.stepIndex;
    html += `<tr class="${isCurrentRow ? "row-current" : ""}"><th>s<sub>${i}</sub> V</th>`;
    for (let t = 1; t <= 6; t++) {
      const vals = vByTraj[t];
      const cls = t === state.trajectoryId ? "col-current" : "";
      if (!vals || i >= vals.length) {
        html += `<td class="${cls} empty">—</td>`;
      } else if (vals[i] === null) {
        html += `<td class="${cls} empty">—</td>`;
      } else {
        html += `<td class="${cls}">${fmt(vals[i])}</td>`;
      }
    }
    html += "</tr>";
  }
  html += "</tbody></table>";
  container.innerHTML = html;
}

// ===== 控件状态 =====
function updateButtons() {
  const traj = getCurrentTrajectory();
  const lastStep = traj.steps.length - 1;
  const lastSub = maxSubStep(lastStep);
  const atStart = state.stepIndex === 0 && state.subStep === 0;
  const atEnd =
    state.stepIndex === lastStep && state.subStep === lastSub;
  document.getElementById("btn-prev").disabled = atStart;
  document.getElementById("btn-next").disabled = atEnd;
  document.getElementById("btn-reset").disabled = atStart;
  document.getElementById("btn-play").disabled = atEnd;
  document.getElementById("btn-play").textContent = state.isPlaying
    ? "⏸ Pause"
    : "▶ Play";
}

// ===== 自动播放 =====
function togglePlay() {
  state.isPlaying = !state.isPlaying;
  if (state.isPlaying) {
    startPlayTimer();
  } else {
    clearInterval(playTimer);
    playTimer = null;
  }
  updateButtons();
}

function startPlayTimer() {
  clearInterval(playTimer);
  const intervalMs = 800 / state.speed;
  playTimer = setInterval(() => {
    next();
    render();
  }, intervalMs);
}

// ===== 初始化 =====
function init() {
  document
    .getElementById("btn-next")
    .addEventListener("click", () => {
      next();
      render();
    });
  document
    .getElementById("btn-prev")
    .addEventListener("click", () => {
      prev();
      render();
    });
  document
    .getElementById("btn-reset")
    .addEventListener("click", () => {
      reset();
      render();
    });
  document
    .getElementById("btn-play")
    .addEventListener("click", () => {
      togglePlay();
    });

  const speedEl = document.getElementById("speed");
  const speedLabel = document.getElementById("speed-label");
  speedEl.addEventListener("input", () => {
    state.speed = parseFloat(speedEl.value);
    speedLabel.textContent = state.speed.toFixed(1) + "×";
    if (state.isPlaying) startPlayTimer();
  });
  speedLabel.textContent = state.speed.toFixed(1) + "×";

  // Trajectory 切换器（阶段 1：仅 Trajectory 1 启用）
  document.querySelectorAll(".traj-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      const id = parseInt(btn.dataset.traj, 10);
      state.trajectoryId = id;
      reset();
      document
        .querySelectorAll(".traj-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      render();
    });
  });

  // 键盘：← → 翻页，空格 Play/Pause
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") {
      next();
      render();
    } else if (e.key === "ArrowLeft") {
      prev();
      render();
    } else if (e.key === " ") {
      e.preventDefault();
      togglePlay();
    }
  });

  // 推导块里的 KaTeX 行（一次性渲染，折叠状态下也能渲染）
  document.querySelectorAll(".katex-line").forEach((el) => {
    const tex = el.dataset.tex;
    if (tex && typeof katex !== "undefined") {
      try {
        katex.render(tex, el, { throwOnError: false, displayMode: true });
      } catch (e) {
        el.textContent = tex;
      }
    }
  });

  render();
}

window.addEventListener("DOMContentLoaded", init);
