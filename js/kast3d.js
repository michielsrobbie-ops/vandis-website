// Van Dis Solutions — holografische 3D-besturingskast (Three.js r128)
(function () {
  const container = document.getElementById('kast3d');
  if (!container || typeof THREE === 'undefined') {
    if (container) container.innerHTML = '<p style="color:var(--steel);padding:40px">3D-weergave niet beschikbaar in deze browser.</p>';
    return;
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const RED = 0xde3115, STEEL = 0x5a6b7a, WHITE = 0xdfe6ea;

  // ---------- scene ----------
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0e12, 0.055);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
  camera.position.set(0, 0.6, 8.2);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const world = new THREE.Group();
  scene.add(world);

  // ---------- helpers ----------
  function glowTexture(inner, outer) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 2, 64, 64, 64);
    g.addColorStop(0, inner); g.addColorStop(.35, outer); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  const glowRed = glowTexture('rgba(255,120,90,1)', 'rgba(222,49,21,.45)');
  const glowWhite = glowTexture('rgba(255,255,255,.9)', 'rgba(160,200,230,.3)');

  function sprite(tex, size, color) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, color: color || 0xffffff, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    s.scale.setScalar(size);
    return s;
  }

  function labelSprite(text) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 96;
    const x = c.getContext('2d');
    x.font = '600 34px "SF Mono", Consolas, monospace';
    x.fillStyle = '#e8ecef'; x.fillText(text, 14, 44);
    x.fillStyle = '#DE3115'; x.fillRect(14, 62, x.measureText(text).width, 3);
    const t = new THREE.CanvasTexture(c);
    t.minFilter = THREE.LinearFilter;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
    s.scale.set(1.7, 0.32, 1);
    return s;
  }

  // fresnel-rim shader (hologram-schil)
  function rimMaterial(colorHex, opacity) {
    return new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      uniforms: { c: { value: new THREE.Color(colorHex) }, o: { value: opacity } },
      vertexShader: `varying vec3 vN; varying vec3 vV;
        void main(){ vN = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position,1.0); vV = -mv.xyz;
          gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 c; uniform float o; varying vec3 vN; varying vec3 vV;
        void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
          gl_FragColor = vec4(c, f * o); }`
    });
  }

  // holo-blok: donker glas + edges + rim
  function holoBox(w, h, d, edgeColor, opts) {
    opts = opts || {};
    const g = new THREE.Group();
    const geo = new THREE.BoxGeometry(w, h, d);
    g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: 0x0c1219, transparent: true, opacity: opts.faceOpacity ?? 0.5, depthWrite: false
    })));
    g.add(new THREE.Mesh(geo, rimMaterial(edgeColor, opts.rim ?? 0.55)));
    g.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: opts.edgeOpacity ?? 0.9 })
    ));
    return g;
  }

  // ---------- behuizing (wireframe-hologram) ----------
  const shell = new THREE.Group();
  const enclosure = holoBox(4.9, 4.0, 1.5, STEEL, { faceOpacity: 0.18, rim: 0.25, edgeOpacity: 0.65 });
  shell.add(enclosure);
  const plate = holoBox(4.3, 3.5, 0.05, STEEL, { faceOpacity: 0.3, rim: 0.15, edgeOpacity: 0.4 });
  plate.position.z = -0.6;
  shell.add(plate);
  [1.05, 0, -1.1].forEach(y => {
    const rail = holoBox(4.0, 0.13, 0.07, RED, { faceOpacity: 0.25, rim: 0.4, edgeOpacity: 0.55 });
    rail.position.set(0, y, -0.54);
    shell.add(rail);
  });
  world.add(shell);

  // hoekmarkeringen (HUD-stijl)
  (function corners() {
    const m = new THREE.LineBasicMaterial({ color: RED, transparent: true, opacity: .8 });
    const L = 0.35, X = 2.75, Y = 2.3;
    [[-X, Y], [X, Y], [-X, -Y], [X, -Y]].forEach(([x, y]) => {
      const sx = x > 0 ? -1 : 1, sy = y > 0 ? -1 : 1;
      const pts = [new THREE.Vector3(x + sx * L, y, 0.4), new THREE.Vector3(x, y, 0.4), new THREE.Vector3(x, y + sy * L, 0.4)];
      world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), m));
    });
  })();

  // ---------- componenten ----------
  const comps = [];
  function comp(key, label, x, y, dir, build) {
    const g = new THREE.Group();
    g.userData = { key, home: new THREE.Vector3(x, y, -0.42), dir };
    build(g);
    const lb = labelSprite(label);
    lb.position.set(0, (g.userData.labelY ?? 0.6), 0.35);
    lb.material.opacity = 0.85;
    g.add(lb);
    g.userData.label = lb;
    const DIENST = { plc: 'PLC-AUTOMATISERING', voeding: 'HARDWARE ENGINEERING', relais: 'BESTURINGSPANELEN', klemmen: 'PANELENBOUW', hmi: 'SOFTWARE ENGINEERING', motor: 'INDUSTRI\u00cbLE AUTOMATISERING' };
    const dl = labelSprite('\u25b8 ' + DIENST[key]);
    dl.position.set(0, (g.userData.labelY ?? 0.6) + 0.34, 0.35);
    dl.material.opacity = 0;
    g.add(dl);
    g.userData.dienstLabel = dl;
    const hs = sprite(glowRed, 0.5);
    hs.position.set(g.userData.hsX ?? 0.6, g.userData.hsY ?? 0.4, 0.3);
    g.add(hs);
    g.userData.hotspot = hs;
    g.position.copy(g.userData.home);
    world.add(g);
    comps.push(g);
    return g;
  }

  comp('plc', '01 // PLC', -1.25, 1.22, new THREE.Vector3(-1.4, 0.9, 2.2), g => {
    g.add(holoBox(1.35, 0.72, 0.36, RED));
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.26),
      new THREE.MeshBasicMaterial({ color: 0x0c94b8, transparent: true, opacity: .9 }));
    scr.position.set(-0.32, 0.12, 0.19); g.add(scr);
    [[0.12, 0x3fbf5a], [0.3, 0x3fbf5a], [0.48, 0xe8a13c]].forEach(([x, c]) => {
      const l = sprite(glowWhite, 0.22, c); l.position.set(x, 0.14, 0.22); g.add(l);
      (g.userData.leds = g.userData.leds || []).push(l);
    });
  });

  comp('voeding', '02 // VOEDING 24VDC', 0.62, 1.22, new THREE.Vector3(0.8, 1.3, 2.0), g => {
    g.add(holoBox(0.85, 0.72, 0.36, WHITE, { edgeOpacity: .6 }));
    const l = sprite(glowWhite, 0.22, 0x3fbf5a); l.position.set(-0.2, -0.18, 0.22); g.add(l);
    (g.userData.leds = []).push(l);
  });

  comp('relais', '03 // RELAISGROEP', 1.2, 0.1, new THREE.Vector3(2.2, 0.2, 1.8), g => {
    for (let i = 0; i < 5; i++) {
      const b = holoBox(0.26, 0.5, 0.3, i === 2 ? RED : WHITE, { edgeOpacity: .55 });
      b.position.x = i * 0.36 - 0.72; g.add(b);
    }
  });

  comp('klemmen', '04 // KLEMMENSTROOK', -1.35, 0.1, new THREE.Vector3(-2.3, 0.1, 1.8), g => {
    for (let i = 0; i < 9; i++) {
      const b = holoBox(0.13, 0.36, 0.26, STEEL, { edgeOpacity: .5 });
      b.position.x = i * 0.17 - 0.68; g.add(b);
    }
    g.userData.labelY = 0.5;
  });

  // HMI met live scherm
  const hmiCanvas = document.createElement('canvas');
  hmiCanvas.width = 256; hmiCanvas.height = 128;
  const hmiCtx = hmiCanvas.getContext('2d');
  const hmiTex = new THREE.CanvasTexture(hmiCanvas);
  comp('hmi', '05 // HMI TOUCHSCREEN', -1.2, -1.18, new THREE.Vector3(-1.6, -1.2, 2.4), g => {
    g.add(holoBox(1.55, 1.0, 0.28, RED));
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.72),
      new THREE.MeshBasicMaterial({ map: hmiTex, transparent: true, opacity: .95 }));
    scr.position.set(0, 0.02, 0.16); g.add(scr);
    g.userData.labelY = 0.75; g.userData.hsY = 0.55;
  });

  comp('motor', '06 // MOTORBEVEILIGING', 1.2, -1.18, new THREE.Vector3(1.9, -1.3, 2.2), g => {
    g.add(holoBox(1.5, 1.0, 0.32, WHITE, { edgeOpacity: .6 }));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.03, 10, 40),
      new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: .9 }));
    ring.position.set(-0.35, 0, 0.2); g.add(ring);
    g.userData.ring = ring;
    g.userData.labelY = 0.75; g.userData.hsY = 0.55;
  });

  // leader-lijnen (exploded-tekening)
  const leaderMat = new THREE.LineDashedMaterial({ color: 0xde3115, transparent: true, opacity: 0, dashSize: 0.12, gapSize: 0.08 });
  comps.forEach(g => {
    const geo = new THREE.BufferGeometry().setFromPoints([g.userData.home.clone(), g.userData.home.clone()]);
    const line = new THREE.Line(geo, leaderMat.clone());
    line.computeLineDistances();
    world.add(line);
    g.userData.leader = line;
  });

  // ---------- bedrading + pulsen ----------
  const wires = [
    [[-1.25, 0.95, -0.4], [-1.35, 0.55, -0.25], [-1.35, 0.32, -0.4]],
    [[0.62, 0.95, -0.4], [0.9, 0.6, -0.2], [1.15, 0.4, -0.4]],
    [[1.2, -0.18, -0.4], [1.22, -0.55, -0.2], [1.2, -0.72, -0.4]],
    [[-0.8, -0.05, -0.35], [-0.1, -0.55, -0.1], [-0.85, -0.82, -0.35]],
  ].map(pts => {
    const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(curve.getPoints(40)),
      new THREE.LineBasicMaterial({ color: RED, transparent: true, opacity: .5 }));
    world.add(line);
    const pulse = sprite(glowRed, 0.3);
    world.add(pulse);
    return { curve, pulse, t: Math.random() };
  });

  // ---------- scanline ----------
  const scanTexC = document.createElement('canvas'); scanTexC.width = 4; scanTexC.height = 64;
  const sx = scanTexC.getContext('2d');
  const sg = sx.createLinearGradient(0, 0, 0, 64);
  sg.addColorStop(0, 'rgba(222,49,21,0)'); sg.addColorStop(.5, 'rgba(222,49,21,.5)'); sg.addColorStop(1, 'rgba(222,49,21,0)');
  sx.fillStyle = sg; sx.fillRect(0, 0, 4, 64);
  const scan = new THREE.Mesh(new THREE.PlaneGeometry(5.1, 0.5),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(scanTexC), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  scan.position.z = 0.45;
  world.add(scan);

  // ---------- particles ----------
  const pGeo = new THREE.BufferGeometry();
  const pCount = 90, pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    pPos[i * 3] = (Math.random() - .5) * 9;
    pPos[i * 3 + 1] = (Math.random() - .5) * 6;
    pPos[i * 3 + 2] = (Math.random() - .5) * 4;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
    color: RED, size: 0.035, transparent: true, opacity: .5,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  scene.add(particles);

  // ---------- vloerraster ----------
  const grid = new THREE.GridHelper(16, 32, RED, 0x1c242e);
  grid.material.transparent = true; grid.material.opacity = 0.35;
  grid.position.y = -2.6;
  scene.add(grid);

  // ---------- assemblage / exploded ----------
  let explode = 1, explodeTarget = 1, assembleT0 = null, assembled = false;
  const ease = t => 1 - Math.pow(1 - t, 3);
  const io = new IntersectionObserver(es => {
    if (es[0].isIntersecting && !assembled) {
      assembled = true;
      assembleT0 = performance.now() + 250;
      io.disconnect();
    }
  }, { threshold: .35 });
  io.observe(container);
  if (reduced) { explode = 0; explodeTarget = 0; assembled = true; }

  window.vdsKastExplode = function () {
    explodeTarget = explodeTarget === 0 ? 1 : 0;
    if (window.vdsKastMode) window.vdsKastMode(explodeTarget === 1);
    assembleT0 = null;
    const btn = document.getElementById('explode-btn');
    if (btn) btn.textContent = explodeTarget === 0 ? '▸ Exploded view' : '▸ Assembleer';
    return false;
  };

  // ---------- interactie ----------
  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  let hovered = null, dragging = false, moved = 0;
  let rotY = 0, rotX = 0.06, tRotY = 0, tRotX = 0.06;
  let lastX = 0, lastY = 0, parX = 0, parY = 0;

  function setPtr(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  }
  function findComp() {
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(comps, true)[0];
    if (!hit) return null;
    let o = hit.object;
    while (o && !(o.userData && o.userData.key)) o = o.parent;
    return o;
  }
  function highlight(g, on) {
    g.traverse(o => {
      if (o.isLineSegments || o.isLine) o.material.opacity = on ? 1 : 0.7;
    });
    g.scale.setScalar(on ? 1.06 : 1);
  }

  const el = renderer.domElement;
  el.style.cursor = 'grab';
  el.addEventListener('pointerdown', e => { dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY; el.style.cursor = 'grabbing'; });
  addEventListener('pointerup', e => {
    if (dragging && moved < 6) {
      setPtr(e);
      const g = findComp();
      if (g && window.vdsKastActivate) window.vdsKastActivate(g.userData.key);
    }
    dragging = false; el.style.cursor = 'grab';
  });
  addEventListener('pointermove', e => {
    if (dragging) {
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      tRotY += dx * 0.006; tRotX += dy * 0.004;
      tRotX = Math.max(-0.4, Math.min(0.55, tRotX));
      tRotY = Math.max(-1.3, Math.min(1.3, tRotY));
      lastX = e.clientX; lastY = e.clientY;
    } else if (e.target === el) {
      setPtr(e);
      parX = ptr.x; parY = ptr.y;
      const g = findComp();
      if (g !== hovered) {
        if (hovered) highlight(hovered, false);
        hovered = g;
        if (g) highlight(g, true);
        el.style.cursor = g ? 'pointer' : 'grab';
      }
    }
  });

  // ---------- resize ----------
  function resize() {
    const w = Math.min(container.clientWidth, document.documentElement.clientWidth - 32), h = Math.min(Math.max(340, w * 0.85), innerHeight * 0.62);
    renderer.setSize(w, h);
    renderer.domElement.style.maxWidth = '100%';
    camera.aspect = w / h;
    // camera exact zo ver terug dat de hele kast (incl. labels) in beeld past
    const halfW = 3.4, halfH = 2.6, tanV = Math.tan(camera.fov * Math.PI / 360);
    const zVoorHoogte = halfH / tanV;
    const zVoorBreedte = halfW / (tanV * camera.aspect);
    camera.position.z = Math.min(Math.max(zVoorHoogte, zVoorBreedte) + 0.6, 16);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  // ---------- HMI scherm ----------
  function drawHMI(time) {
    hmiCtx.fillStyle = 'rgba(8,12,16,.92)';
    hmiCtx.fillRect(0, 0, 256, 128);
    hmiCtx.strokeStyle = 'rgba(222,49,21,.25)';
    hmiCtx.lineWidth = 1;
    for (let y = 20; y < 128; y += 24) { hmiCtx.beginPath(); hmiCtx.moveTo(0, y); hmiCtx.lineTo(256, y); hmiCtx.stroke(); }
    hmiCtx.strokeStyle = '#DE3115'; hmiCtx.lineWidth = 3;
    hmiCtx.beginPath();
    for (let i = 0; i < 26; i++) {
      const x = i * 10.5, y = 70 - Math.sin(time / 500 + i * .6) * 22 - Math.sin(time / 1300 + i) * 10;
      i ? hmiCtx.lineTo(x, y) : hmiCtx.moveTo(x, y);
    }
    hmiCtx.stroke();
    hmiCtx.fillStyle = '#3fbf5a'; hmiCtx.font = 'bold 15px monospace';
    hmiCtx.fillText('● RUN', 10, 118);
    hmiCtx.fillStyle = '#e8ecef';
    hmiCtx.fillText((47.3 + Math.sin(time / 800) * 2).toFixed(1) + ' Hz', 78, 118);
    hmiCtx.fillStyle = '#e8a13c';
    hmiCtx.fillText((3.2 + Math.sin(time / 1100)).toFixed(1) + ' A', 185, 118);
    hmiTex.needsUpdate = true;
  }

  // ---------- render loop ----------
  const clock = new THREE.Clock();
  function tick() {
    requestAnimationFrame(tick);
    const t = clock.getElapsedTime() * 1000;

    // assemblage-animatie (gestaggerd per component)
    if (assembleT0 !== null) {
      const p = Math.min(Math.max((performance.now() - assembleT0) / 1900, 0), 1);
      explode = 1 - ease(p);
      if (p >= 1) { assembleT0 = null; explodeTarget = 0; }
    } else {
      explode += (explodeTarget - explode) * 0.06;
    }
    comps.forEach((g, i) => {
      const stag = assembleT0 !== null
        ? Math.min(Math.max(((performance.now() - assembleT0) - i * 130) / 1400, 0), 1)
        : null;
      const f = stag !== null ? 1 - ease(stag) : explode;
      g.position.copy(g.userData.home).addScaledVector(g.userData.dir, f);
      g.rotation.y = f * 0.6;
      g.userData.label.material.opacity = 0.85 * (1 - f) + 0.1;
      g.userData.dienstLabel.material.opacity = f;
      const ld = g.userData.leader;
      ld.material.opacity = f * 0.55;
      const pos = ld.geometry.attributes.position;
      pos.setXYZ(0, g.userData.home.x, g.userData.home.y, g.userData.home.z);
      pos.setXYZ(1, g.position.x, g.position.y, g.position.z);
      pos.needsUpdate = true;
      ld.computeLineDistances();
    });

    // rotatie: drag + parallax + subtiele sway
    const sway = (!dragging && !reduced) ? Math.sin(t / 3400) * 0.10 : 0;
    rotY += ((tRotY + sway + parX * 0.12) - rotY) * 0.06;
    rotX += ((tRotX - parY * 0.06) - rotX) * 0.06;
    world.rotation.set(rotX, rotY, 0);

    if (!reduced) {
      wires.forEach(w => { w.t = (w.t + 0.005) % 1; w.pulse.position.copy(w.curve.getPoint(w.t)); });
      scan.position.y = Math.sin(t / 2600) * 1.9;
      const s = 0.42 + Math.sin(t / 320) * 0.12;
      comps.forEach(c => c.userData.hotspot.scale.setScalar(s));
      comps.forEach(c => {
        if (c.userData.leds) c.userData.leds.forEach((l, j) => {
          l.material.opacity = 0.6 + Math.sin(t / 300 + j * 2.1) * 0.4;
        });
        if (c.userData.ring) c.userData.ring.rotation.z = t / 900;
      });
      particles.rotation.y = t / 30000;
      if (Math.floor(t / 130) % 2 === 0) drawHMI(t);
      grid.position.z = (t / 900) % 0.5;
    }
    renderer.render(scene, camera);
  }
  drawHMI(0);
  tick();
})();
