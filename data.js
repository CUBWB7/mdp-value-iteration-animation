// 4×3 Grid World 静态数据
// 坐标约定：[row, col]，左下角 = [0, 0]（与作业 PDF 一致）
// 注意：CSS 的 grid 默认从上到下，渲染时要把行翻转

const GRID = {
  rows: 3,
  cols: 4,
  cellTypes: {
    "2,3": "green", // +1, terminal
    "1,3": "red",   // -1
    "1,1": "wall",  // 障碍，不可进入
  },
};

const REWARD = {
  green: 1,
  red: -1,
  normal: -2,
  wall: null,
};

const GAMMA = 0.8;

// 动作枚举顺序也是 max_a 平局时的 tie-breaking 顺序（取首位 UP）
const ACTIONS = ["UP", "DOWN", "LEFT", "RIGHT"];

// 6 条 trajectory 全部来自题目 PDF 第 3 页
// trajectoryAction = trajectory 表里的 a_t（决定 robot 下一步走到哪格，不进 V 公式）
// answerV = 答案 PDF 提供的标准答案，commit 时用于 sanity check
// 注意：T3/T4 在 step 4 进入红格 [1,3]，本题答案把红格也当终止处理（V = R = -1）
const TRAJECTORIES = [
  {
    id: 1,
    steps: [
      { s: [0, 0], trajectoryAction: "UP",    sNext: [1, 0], answerV: -2 },
      { s: [1, 0], trajectoryAction: "UP",    sNext: [2, 0], answerV: -2 },
      { s: [2, 0], trajectoryAction: "RIGHT", sNext: [2, 1], answerV: -2 },
      { s: [2, 1], trajectoryAction: "RIGHT", sNext: [2, 2], answerV: -2 },
      { s: [2, 2], trajectoryAction: "RIGHT", sNext: [2, 3], answerV: -2 },
      { s: [2, 3], trajectoryAction: null,    sNext: null,   answerV:  1 }, // green terminal
    ],
  },
  {
    id: 2,
    steps: [
      { s: [0, 0], trajectoryAction: "UP",    sNext: [1, 0], answerV: -2.32 },
      { s: [1, 0], trajectoryAction: "UP",    sNext: [2, 0], answerV: -3.6  },
      { s: [2, 0], trajectoryAction: "RIGHT", sNext: [2, 1], answerV: -3.6  },
      { s: [2, 1], trajectoryAction: "RIGHT", sNext: [2, 2], answerV: -3.6  },
      { s: [2, 2], trajectoryAction: "RIGHT", sNext: [2, 3], answerV: -1.52 },
      { s: [2, 3], trajectoryAction: null,    sNext: null,   answerV:  1    },
    ],
  },
  {
    id: 3,
    steps: [
      { s: [0, 0], trajectoryAction: "RIGHT", sNext: [0, 1], answerV: -2.47 },
      { s: [0, 1], trajectoryAction: "RIGHT", sNext: [0, 2], answerV: -2    },
      { s: [0, 2], trajectoryAction: "UP",    sNext: [1, 2], answerV: -2    },
      { s: [1, 2], trajectoryAction: "RIGHT", sNext: [1, 3], answerV: -2.28 },
      { s: [1, 3], trajectoryAction: null,    sNext: null,   answerV: -1    }, // red terminal
    ],
  },
  {
    id: 4,
    steps: [
      { s: [0, 0], trajectoryAction: "RIGHT", sNext: [0, 1], answerV: -3.77 },
      { s: [0, 1], trajectoryAction: "RIGHT", sNext: [0, 2], answerV: -3.6  },
      { s: [0, 2], trajectoryAction: "RIGHT", sNext: [0, 3], answerV: -2.34 },
      { s: [0, 3], trajectoryAction: "UP",    sNext: [1, 3], answerV: -2.08 },
      { s: [1, 3], trajectoryAction: null,    sNext: null,   answerV: -1    }, // red terminal
    ],
  },
  {
    id: 5,
    steps: [
      { s: [0, 0], trajectoryAction: "UP",    sNext: [1, 0], answerV: -4.89 },
      { s: [1, 0], trajectoryAction: "UP",    sNext: [2, 0], answerV: -4.88 },
      { s: [2, 0], trajectoryAction: "RIGHT", sNext: [2, 1], answerV: -4.88 },
      { s: [2, 1], trajectoryAction: "RIGHT", sNext: [2, 2], answerV: -3.54 },
      { s: [2, 2], trajectoryAction: "RIGHT", sNext: [2, 3], answerV: -1.66 },
      { s: [2, 3], trajectoryAction: null,    sNext: null,   answerV:  1    },
    ],
  },
  {
    id: 6,
    steps: [
      { s: [0, 0], trajectoryAction: "RIGHT", sNext: [0, 1], answerV: -5.09 },
      { s: [0, 1], trajectoryAction: "RIGHT", sNext: [0, 2], answerV: -4.07 },
      { s: [0, 2], trajectoryAction: "UP",    sNext: [1, 2], answerV: -3.70 },
      { s: [1, 2], trajectoryAction: "UP",    sNext: [2, 2], answerV: -3.06 },
      { s: [2, 2], trajectoryAction: "RIGHT", sNext: [2, 3], answerV: -1.74 },
      { s: [2, 3], trajectoryAction: null,    sNext: null,   answerV:  1    },
    ],
  },
];
