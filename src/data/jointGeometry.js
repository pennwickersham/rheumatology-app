/* Joint-map geometry shared by the on-screen homunculus (components/JointMap)
   and the PDF summary, so both draw joints in the same places.
   Examiner's view: the patient's RIGHT side is on the viewer's LEFT.
   Left-side panels are mirror images of the right-side ones. */

const mirrorX = (w, pts) => Object.fromEntries(
  Object.entries(pts).map(([id, [x, y]]) => [id.replace(/_R$/, '_L'), [w - x, y]]));
const mirrorLine = (w, line) => line.map(([x, y]) => [w - x, y]);
const extend = ([ax, ay], [bx, by], k) => [bx + (bx - ax) * k, by + (by - ay) * k];

/* ---------- body figure: viewBox 0 0 240 400 ---------- */
export const BODY_W = 240;
export const BODY_H = 400;

const BODY_R = {
  tmj_R: [106, 50], sc_R: [110, 80], ac_R: [90, 80],
  shoulder_R: [72, 94], elbow_R: [58, 152], wrist_R: [48, 206],
  hip_R: [100, 212], knee_R: [96, 288], ankle_R: [92, 360], tarsus_R: [88, 382],
};
export const BODY_POINTS = { ...BODY_R, ...mirrorX(BODY_W, BODY_R) };

// Small joints crowd each other, so they get smaller dots and tap targets.
export const BODY_SIZE = {
  tmj: [6, 10], sc: [6, 10], ac: [6, 10], tarsus: [7, 10], ankle: [8, 11],
};

const ARM_R = [[72, 94], [58, 152], [48, 206], [44, 228]];
const LEG_R = [[100, 212], [96, 288], [92, 360], [84, 394]];
export const BODY_HEAD = { cx: 120, cy: 32, r: 20 };
export const BODY_LINES = [
  [[120, 54], [120, 200]],
  [[72, 94], [120, 86], [168, 94]],
  [[100, 212], [120, 200], [140, 212]],
  ARM_R, mirrorLine(BODY_W, ARM_R),
  LEG_R, mirrorLine(BODY_W, LEG_R),
];

/* ---------- hands: viewBox 190 wide, palm view, thumb at the outer edge ---------- */
export const HAND_W = 190;

const MCP_R = { mcp1_R: [38, 108], mcp2_R: [66, 62], mcp3_R: [92, 56], mcp4_R: [118, 60], mcp5_R: [142, 70] };
const PIP_R = { pip1_R: [22, 84], pip2_R: [60, 36], pip3_R: [90, 28], pip4_R: [120, 32], pip5_R: [148, 46] };
const DIP_R = Object.fromEntries([2, 3, 4, 5].map(n =>
  [`dip${n}_R`, extend(MCP_R[`mcp${n}_R`], PIP_R[`pip${n}_R`], 0.75)]));

const PALM_R = [[66, 62], [92, 56], [118, 60], [142, 70], [150, 116], [124, 146], [72, 148], [52, 124]];

function handRight(withDip) {
  const points = { ...MCP_R, ...PIP_R, ...(withDip ? DIP_R : {}) };
  const fingers = [1, 2, 3, 4, 5].map(n => {
    const mcp = MCP_R[`mcp${n}_R`], pip = PIP_R[`pip${n}_R`];
    const chain = n === 1 ? [[58, 126], mcp, pip] : withDip ? [mcp, pip, DIP_R[`dip${n}_R`]] : [mcp, pip];
    return [...chain, extend(chain[chain.length - 2], chain[chain.length - 1], withDip || n === 1 ? 0.5 : 0.6)];
  });
  return { points, fingers, palm: PALM_R };
}

// set 28: MCP + PIP. set 68: adds DIP 2-5 (and the panel grows upward to fit fingertips).
export function handGeometry(side, set) {
  const g = handRight(set === 68);
  const view = set === 68 ? [0, -16, HAND_W, 166] : [0, 0, HAND_W, 150];
  if (side === 'R') return { ...g, view };
  return {
    view,
    points: mirrorX(HAND_W, g.points),
    fingers: g.fingers.map(f => mirrorLine(HAND_W, f)),
    palm: mirrorLine(HAND_W, g.palm),
  };
}

/* ---------- feet (68 set only): viewBox 0 0 190 160, top view, big toe toward the midline ---------- */
export const FOOT_W = 190;

const MTP_R = { mtp1_R: [150, 92], mtp2_R: [124, 86], mtp3_R: [100, 88], mtp4_R: [78, 94], mtp5_R: [58, 104] };
const TIP_R = { tip1_R: [154, 56], tip2_R: [128, 52], tip3_R: [102, 56], tip4_R: [80, 64], tip5_R: [60, 76] };
const SOLE_R = [[58, 104], [78, 94], [100, 88], [124, 86], [150, 92], [158, 122], [142, 156], [80, 156], [54, 130]];

export function footGeometry(side) {
  const points = { ...MTP_R, ...TIP_R };
  const toes = [1, 2, 3, 4, 5].map(n => {
    const a = MTP_R[`mtp${n}_R`], b = TIP_R[`tip${n}_R`];
    return [a, b, extend(a, b, 0.45)];
  });
  const view = [0, 20, FOOT_W, 140];
  if (side === 'R') return { points, toes, sole: SOLE_R, view };
  return {
    view,
    points: mirrorX(FOOT_W, points),
    toes: toes.map(t => mirrorLine(FOOT_W, t)),
    sole: mirrorLine(FOOT_W, SOLE_R),
  };
}
