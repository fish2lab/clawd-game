/* The HUD every chapter shares: the TO-DO clipboard (top left), the portraits of the
   Clawds you can play (bottom left), and the floating badge (✓ TESTS PASS).
   The rotate and mute buttons are wired once in main.js. */
(function (CL) {
  'use strict';
  const T = THREE;
  const NAMES = { opus: 'Opus 5.5', sonnet: 'Sonnet 5.5', haiku: 'Haiku 5.5' };

  // todo: list of strings for the clipboard; actors: { name: Actor } in portrait order
  function setup(world, opt) {
    const todo = document.getElementById('todo');
    const list = todo.querySelector('ol');
    const whoBar = document.getElementById('who');
    list.textContent = '';
    (opt.todo || []).forEach((text, i) => {
      const li = document.createElement('li');
      li.dataset.i = i;
      li.append(document.createElement('i'));
      const sp = document.createElement('span');
      sp.textContent = text;
      li.append(sp);
      list.append(li);
    });
    todo.hidden = !(opt.todo && opt.todo.length);
    todo.onclick = () => todo.classList.toggle('min');

    whoBar.textContent = '';
    const portraits = {};
    Object.entries(opt.actors || {}).forEach(([n, a]) => {
      const b = document.createElement('button');
      b.className = 'who';
      b.type = 'button';
      b.setAttribute('aria-label', NAMES[n] || n);
      const spec = CL.Engine.SPECS[n];
      const st = CL.Clawd.CS({ W: spec.W, outfit: spec.outfit });
      b.appendChild(CL.Clawd.faceDecal(st, 'front', 200 / st.W, true));
      b.addEventListener('click', () => world.select(a));
      whoBar.appendChild(b);
      portraits[n] = { b, a };
    });
    function refresh() {
      Object.values(portraits).forEach(({ b, a }) => {
        b.classList.toggle('on', world.active === a);
        b.classList.toggle('off', !a.free);
      });
    }
    world.on('select', a => { refresh(); world.rig.follow = a; });

    const item = i => list.querySelector(`li[data-i="${i}"]`);
    function badge(a, text, dur) {
      const el = document.createElement('div');
      el.className = 'badge';
      el.textContent = text;
      world.host.appendChild(el);
      return world.tween(dur || 2.2, u => {
        const [x, y] = world.project(new T.Vector3(a.x, a.y + a.height + 0.5 + 0.4 * u, a.z));
        el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
        el.style.opacity = u > 0.8 ? (1 - u) / 0.2 : 1;
      }, () => el.remove());
    }
    function show(v) {
      ['hud-tl', 'who', 'hud-br'].forEach(id => { document.getElementById(id).hidden = v === false; });
      refresh();
    }
    return {
      refresh, badge, show,
      tick: i => { const li = item(i); if (li && !li.classList.contains('done')) { li.classList.add('done'); CL.Sound.play('click'); } },
      circle: i => { const li = item(i); if (li) li.classList.add('circled'); },
      untick: i => { const li = item(i); if (li) li.classList.remove('done', 'circled'); },
    };
  }

  CL.Hud = { setup };
})(window.CL = window.CL || {});
