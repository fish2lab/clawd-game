/* Chapter 1 · the library's floor plan, shared by the level (level.js), the rules
   (play.js) and the dead-end proof (solve.mjs, run with node).

   One character per 1 x 1 cell; the cell in column i, row j is centred on world
   (x, z) = (i + 1, j + 1). The rows start at the back wall.

     w  walkway: Clawds walk here, pallets can't (a low kerb keeps the casters out)
     .  floor: walk and pallets
     S  the scale at the tail of the conveyor (pallets get weighed and fed here)
     D  the DUP bay (park the duplicate here)
     #  shelf or desk        -  conveyor        K  skip hoist        C  counterweight cage
     a..d  pallets on the floor at the start

   Pallets: a, c, d are brown paper parcels that look the same; a and d weigh the same
   (one is a duplicate of the other). b is a bale of newspapers with pink SPAM flyers
   stapled in. The reactor is full with three different bundles: b, c and one of a / d. */
(function (root) {
  'use strict';
  const MAP = [
    'wS---K',
    'w.D..C',
    'w.##aw',
    'wbc..w',
    'w.##dw',
    'w#...w',
    'wwwwww',
  ];
  const PALLETS = {
    a: { kind: 'parcel', w: 42, twin: 'd' },
    b: { kind: 'news', w: 31, spam: true },
    c: { kind: 'parcel', w: 57 },
    d: { kind: 'parcel', w: 42, twin: 'a' },
  };
  const cellOf = (x, z) => [Math.round(x) - 1, Math.round(z) - 1];
  const at = (x, z) => { const [i, j] = cellOf(x, z); return (MAP[j] || '')[i] || ' '; };
  const isPallet = ch => ch === '.' || ch === 'S' || ch === 'D' || /[a-d]/.test(ch);
  const L = {
    MAP, PALLETS, FULL: 3,
    cellOf, at,
    // can a pallet stand centred on (x, z)? only on whole cells of pallet floor
    palletFits(x, z) {
      if (Math.abs(x - Math.round(x)) > 0.05 || Math.abs(z - Math.round(z)) > 0.05) return false;
      return isPallet(at(x, z));
    },
    find(ch) {
      for (let j = 0; j < MAP.length; j++) { const i = MAP[j].indexOf(ch); if (i >= 0) return [i + 1, j + 1]; }
      return null;
    },
    cells(test) {
      const out = [];
      MAP.forEach((row, j) => [...row].forEach((ch, i) => { if (test(ch)) out.push([i + 1, j + 1, ch]); }));
      return out;
    },
  };
  root.CL = root.CL || {};
  root.CL.Ch1Layout = L;
})(typeof window !== 'undefined' ? window : globalThis);
