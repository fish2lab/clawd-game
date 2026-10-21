// Chapter 1 · proof that the library has no dead ends.
//   node src/diorama/ch1/solve.mjs
//
// The pallets follow CL.Moves.pushable exactly: Opus clicks a side and stands there;
// the pallet goes one cell away from him if that cell is pallet floor and empty,
// otherwise he pulls it one cell towards himself if the cell behind him is walkable
// and empty. A pallet on the scale can be fed (it rides the conveyor away). Sonnet
// only ever stands on the walkway, which pallets can't enter.
//
// Every state reachable from the start is enumerated (pallet cells, which were fed,
// and the region Opus can walk to). The proof checks, by searching backwards from
// the goals, that from EVERY reachable state:
//   1. the reactor can still be filled: b, c and one of a / d can be fed, and Opus can
//      then walk to the counterweight cage;
//   2. unless both twins a and d were already fed (the wrong route, which the reactor's
//      skim valve fixes), the clean finish is still possible too: both twins weighed (that
//      is how you find out they are twins), one fed, the other parked on the DUP bay.
// It also prints the shortest clean solution (tools/playtest-ch1.mjs plays it).
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const ctx = { globalThis: {} };
vm.runInNewContext(fs.readFileSync(here + 'layout.js', 'utf8'), ctx);
const LAY = ctx.globalThis.CL.Ch1Layout;

export function model() {
  const rows = LAY.MAP;
  const H = rows.length, W = rows[0].length;
  const cells = [], pallets = [];
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    let ch = rows[z][x];
    if (/[a-d]/.test(ch)) { pallets[ch.charCodeAt(0) - 97] = z * W + x; ch = '.'; }
    cells.push(ch);
  }
  const walk = cells.map(c => c === 'w' || c === '.' || c === 'S' || c === 'D');
  const pal = cells.map(c => c === '.' || c === 'S' || c === 'D');
  return { H, W, NC: W * H, cells, walk, pal, pallets, scale: cells.indexOf('S'), dup: cells.indexOf('D') };
}

export function explore(M, start) {
  const { H, W, NC, walk, pal, scale } = M;
  const N = M.pallets.length, GONE = 63;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]], OPP = [1, 0, 3, 2];
  const NB = DIRS.map(d => Int16Array.from({ length: NC }, (_, i) => { const x = i % W + d[0], z = Math.floor(i / W) + d[1]; return x < 0 || z < 0 || x >= W || z >= H ? -1 : z * W + x; }));
  const seen = new Int32Array(NC), stack = new Int16Array(NC);
  let stamp = 0;
  // flood the walkable cells Opus can reach; returns the region's smallest cell (its name)
  function reach(pos, op) {
    stamp++;
    for (const c of pos) if (c !== GONE) seen[c] = -stamp;
    let sp = 0, canon = op;
    stack[sp++] = op; seen[op] = stamp;
    while (sp) {
      const i = stack[--sp];
      if (i < canon) canon = i;
      for (let d = 0; d < 4; d++) { const j = NB[d][i]; if (j >= 0 && walk[j] && seen[j] !== stamp && seen[j] !== -stamp) { seen[j] = stamp; stack[sp++] = j; } }
    }
    return canon;
  }
  // fed: bits 0..3 = fed, bits 4..7 = has been on the scale (weighed)
  const key = (pos, fed, op) => pos.reduce((k, c) => k * 64 + c, op * 256 + fed);
  const pos_ = [], fed_ = [], op_ = [], prev = [], move = [], edges = [], index = new Map();
  function add(pos, fed, op, from, mv) {
    for (let p = 0; p < pos.length; p++) if (pos[p] === scale) fed |= 1 << (4 + p);
    const c = reach(pos, op), k = key(pos, fed, c);
    let id = index.get(k);
    if (id === undefined) { id = pos_.length; index.set(k, id); pos_.push(pos); fed_.push(fed); op_.push(c); prev.push(from); move.push(mv); edges.push([]); }
    return id;
  }
  add(M.pallets.slice(), 0, start, -1, '');
  const name = 'abcd';
  for (let s = 0; s < pos_.length; s++) {
    const pos = pos_[s], fed = fed_[s];
    reach(pos, op_[s]);
    const occ = c => seen[c] === -stamp, stand = c => c >= 0 && seen[c] === stamp;
    const out = [];
    for (let p = 0; p < N; p++) if (pos[p] === scale) { const np = pos.slice(); np[p] = GONE; out.push([np, fed | 1 << p, op_[s], `feed ${name[p]}`]); }
    for (let p = 0; p < N; p++) {
      const c = pos[p];
      if (c === GONE) continue;
      for (let d = 0; d < 4; d++) {
        const me = NB[OPP[d]][c];
        if (!stand(me)) continue;
        const fwd = NB[d][c];
        if (fwd >= 0 && pal[fwd] && !occ(fwd)) { const np = pos.slice(); np[p] = fwd; out.push([np, fed, c, `push ${name[p]} ${'EWSN'[d]}`]); continue; }
        const back = NB[OPP[d]][me];
        if (pal[me] && back >= 0 && walk[back] && !occ(back)) { const np = pos.slice(); np[p] = me; out.push([np, fed, back, `pull ${name[p]} ${'EWSN'[OPP[d]]}`]); }
      }
    }
    for (const [np, nf, op, mv] of out) edges[s].push(add(np, nf, op, s, mv));
  }
  return { n: pos_.length, pos: pos_, fed: fed_, op: op_, prev, move, edges, reach, seenAt: c => seen[c] === stamp, GONE };
}

// backwards search from the goal states: which states can still reach one, and how far
export function backwards(G, isGoal) {
  const radj = Array.from({ length: G.n }, () => []);
  G.edges.forEach((es, i) => es.forEach(j => radj[j].push(i)));
  const dist = new Int32Array(G.n).fill(-1), q = [];
  for (let i = 0; i < G.n; i++) if (isGoal(i)) { dist[i] = 0; q.push(i); }
  for (let k = 0; k < q.length; k++) for (const j of radj[q[k]]) if (dist[j] < 0) { dist[j] = dist[q[k]] + 1; q.push(j); }
  return dist;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const M = model();
  const t0 = Date.now();
  const startCell = (M.H - 1) * M.W + 3;           // Opus starts on the front walkway
  const G = explore(M, startCell);
  const fedOf = (i, p) => G.fed[i] >> p & 1;
  const cageApproach = 2 * M.W + 5;                 // walkway cell in front of the cage
  const opusCanLeave = i => { G.reach(G.pos[i], G.op[i]); return G.seenAt(cageApproach); };
  const filled = i => fedOf(i, 1) && fedOf(i, 2) && (fedOf(i, 0) || fedOf(i, 3)) && opusCanLeave(i);
  const weighed = (i, p) => G.fed[i] >> (4 + p) & 1;
  const clean = i => filled(i) && (fedOf(i, 0) ^ fedOf(i, 3)) && G.pos[i][fedOf(i, 0) ? 3 : 0] === M.dup && weighed(i, 0) && weighed(i, 3);
  const dFill = backwards(G, filled), dClean = backwards(G, clean);
  let deadFill = 0, deadClean = 0;
  for (let i = 0; i < G.n; i++) {
    if (dFill[i] < 0) deadFill++;
    if (dClean[i] < 0 && !(fedOf(i, 0) && fedOf(i, 3))) deadClean++;
  }
  // the shortest clean line, by walking down the distance field from the start
  const line = [];
  for (let i = 0; dClean[i] > 0;) {
    const j = G.edges[i].find(k => dClean[k] === dClean[i] - 1);
    line.push(G.move[j]);
    i = j;
  }
  console.log(`library: ${G.n} reachable states (${Date.now() - t0} ms)`);
  console.log(`  states that can no longer fill the reactor: ${deadFill}`);
  console.log(`  states that can no longer finish clean (twins not both fed): ${deadClean}`);
  console.log(`  shortest fill: ${dFill[0]} moves; shortest clean finish: ${dClean[0]} moves`);
  console.log(`  ${line.join(' / ')}`);
  if (deadFill || deadClean) { console.log('FAILED: dead ends'); process.exitCode = 1; } else console.log('ok   no dead ends');
}
