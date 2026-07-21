// Van Dis Solutions — 3D-doorvlucht door het circuit (Three.js r128)
(function () {
  const container = document.getElementById('world3d');
  const fallback = document.getElementById('world-fallback');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!container || typeof THREE === 'undefined' || reduced) {
    if (container) container.style.display = 'none';
    if (fallback) fallback.style.display = 'block';
    const scrolly = document.getElementById('scrolly');
    if (scrolly) scrolly.style.height = 'auto';
    return;
  }

  const RED = 0xde3115, STEEL = 0x5a6b7a, WHITE = 0xdfe6ea;

  // ---------- basis ----------
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0e12, 0.022);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const key = new THREE.DirectionalLight(0xffffff, 0.7);
  key.position.set(4, 10, 4);
  scene.add(key);

  // ---------- helpers (hologram-stijl) ----------
  function glowTexture(inner, outer) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 2, 64, 64, 64);
    g.addColorStop(0, inner); g.addColorStop(.35, outer); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  const glowRed = glowTexture('rgba(255,120,90,1)', 'rgba(222,49,21,.45)');

  function sprite(size, color) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowRed, color: color || 0xffffff, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    s.scale.setScalar(size);
    return s;
  }

  function labelSprite(text, big) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 128;
    const x = c.getContext('2d');
    x.font = '600 ' + (big ? 64 : 44) + 'px "SF Mono", Consolas, monospace';
    x.fillStyle = '#e8ecef'; x.fillText(text, 20, big ? 74 : 60);
    x.fillStyle = '#DE3115'; x.fillRect(20, big ? 92 : 78, x.measureText(text).width, 5);
    const t = new THREE.CanvasTexture(c);
    t.minFilter = THREE.LinearFilter;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
    s.scale.set(big ? 11 : 8, big ? 1.4 : 1, 1);
    return s;
  }

  function rimMaterial(colorHex, opacity) {
    return new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { c: { value: new THREE.Color(colorHex) }, o: { value: opacity } },
      vertexShader: `varying vec3 vN,vV;void main(){vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.0);vV=-mv.xyz;gl_Position=projectionMatrix*mv;}`,
      fragmentShader: `uniform vec3 c;uniform float o;varying vec3 vN,vV;void main(){float f=pow(1.0-abs(dot(normalize(vN),normalize(vV))),2.0);gl_FragColor=vec4(c,f*o);}`
    });
  }

  function holo(geo, edgeColor, faceOpacity, rim) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x0c1219, transparent: true, opacity: faceOpacity ?? .5, depthWrite: false })));
    g.add(new THREE.Mesh(geo, rimMaterial(edgeColor, rim ?? .5)));
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: .85 })));
    return g;
  }

  // ---------- vluchtpad ----------
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 3.2, 14),
    new THREE.Vector3(0, 2.6, -4),
    new THREE.Vector3(-8, 2.6, -20),
    new THREE.Vector3(7, 2.6, -36),
    new THREE.Vector3(-7, 2.6, -52),
    new THREE.Vector3(8, 2.6, -68),
    new THREE.Vector3(-5, 2.6, -84),
    new THREE.Vector3(0, 2.6, -100),
    new THREE.Vector3(0, 2.6, -114),
  ]);

  // ---------- vloer: printplaat ----------
  const grid = new THREE.GridHelper(300, 150, 0x2a1512, 0x161d25);
  grid.position.y = 0;
  scene.add(grid);
  // gloeiende trace op de vloer die het pad volgt
  const floorPts = path.getPoints(120).map(p => new THREE.Vector3(p.x, 0.06, p.z));
  const floorCurve = new THREE.CatmullRomCurve3(floorPts);
  scene.add(new THREE.Mesh(
    new THREE.TubeGeometry(floorCurve, 120, 0.09, 6),
    new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: .55 })
  ));
  // pulsen over de vloertrace
  const floorPulses = Array.from({ length: 5 }, (_, i) => {
    const s = sprite(1.4); scene.add(s);
    return { s, t: i / 5 };
  });

  // zijtraces (sfeer)
  for (let i = 0; i < 14; i++) {
    const z = -6 - i * 8, x = (i % 2 ? 1 : -1) * (10 + (i % 3) * 4);
    const pts = [new THREE.Vector3(x, 0.05, z), new THREE.Vector3(x * .4, 0.05, z - 4), new THREE.Vector3(x * .7, 0.05, z - 9)];
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0x33251f, transparent: true, opacity: .8 })));
  }

  // ---------- circuit-stad (filler) ----------
  const corridor = path.getPoints(60);
  function farFromPath(x, z, min) {
    const m2 = min * min;
    for (const p of corridor) {
      const dx = p.x - x, dz = p.z - z;
      if (dx * dx + dz * dz < m2) return false;
    }
    return true;
  }
  const dummy = new THREE.Object3D();

  // chips (InstancedMesh — 1 draw call)
  const chipGeo = new THREE.BoxGeometry(1, 1, 1);
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x141b23, roughness: .6, metalness: .3, emissive: 0x1c0704, emissiveIntensity: .6 });
  const chips = new THREE.InstancedMesh(chipGeo, darkMat, 110);
  let ci = 0;
  const ledPositions = [];
  while (ci < 110) {
    const x = (Math.random() - .5) * 60, z = 18 - Math.random() * 145;
    if (!farFromPath(x, z, 4.5)) continue;
    const w = 0.8 + Math.random() * 2.6, h = 0.4 + Math.random() * 3.4, d = 0.8 + Math.random() * 2.6;
    dummy.position.set(x, h / 2, z);
    dummy.scale.set(w, h, d);
    dummy.rotation.y = Math.floor(Math.random() * 4) * Math.PI / 2;
    dummy.updateMatrix();
    chips.setMatrixAt(ci++, dummy.matrix);
    if (Math.random() < .5) ledPositions.push(x + (Math.random() - .5) * w * .6, h + 0.12, z + (Math.random() - .5) * d * .6);
  }
  chips.instanceMatrix.needsUpdate = true;
  scene.add(chips);

  // condensatoren (InstancedMesh)
  const capGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
  const caps = new THREE.InstancedMesh(capGeo, darkMat, 45);
  let cc = 0;
  while (cc < 45) {
    const x = (Math.random() - .5) * 55, z = 15 - Math.random() * 140;
    if (!farFromPath(x, z, 4.5)) continue;
    const h = 1.2 + Math.random() * 3.6, r = 0.5 + Math.random() * 0.9;
    dummy.position.set(x, h / 2, z);
    dummy.scale.set(r, h, r);
    dummy.rotation.y = 0;
    dummy.updateMatrix();
    caps.setMatrixAt(cc++, dummy.matrix);
  }
  caps.instanceMatrix.needsUpdate = true;
  scene.add(caps);

  // skyline in de verte (grote silhouetten)
  const skyline = new THREE.InstancedMesh(chipGeo, new THREE.MeshBasicMaterial({ color: 0x10161d }), 26);
  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (26 + Math.random() * 22), z = 10 - Math.random() * 135;
    const w = 4 + Math.random() * 8, h = 6 + Math.random() * 16;
    dummy.position.set(x, h / 2, z);
    dummy.scale.set(w, h, w);
    dummy.rotation.y = 0;
    dummy.updateMatrix();
    skyline.setMatrixAt(i, dummy.matrix);
  }
  skyline.instanceMatrix.needsUpdate = true;
  scene.add(skyline);

  // LEDs op de chips (1 Points draw call)
  const ledGeo = new THREE.BufferGeometry();
  ledGeo.setAttribute('position', new THREE.Float32BufferAttribute(ledPositions, 3));
  const ledMat = new THREE.PointsMaterial({ color: 0xff5a3c, size: 0.22, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false });
  scene.add(new THREE.Points(ledGeo, ledMat));

  // extra vloertraces: L-vormige banen (1 draw call)
  const segs = [];
  for (let i = 0; i < 90; i++) {
    const x = (Math.random() - .5) * 70, z = 18 - Math.random() * 145;
    const l1 = 2 + Math.random() * 7, l2 = 2 + Math.random() * 7;
    const dx = Math.random() < .5 ? 1 : -1, dz = Math.random() < .5 ? 1 : -1;
    segs.push(x, 0.04, z, x + l1 * dx, 0.04, z);
    segs.push(x + l1 * dx, 0.04, z, x + l1 * dx, 0.04, z + l2 * dz);
  }
  const segGeo = new THREE.BufferGeometry();
  segGeo.setAttribute('position', new THREE.Float32BufferAttribute(segs, 3));
  scene.add(new THREE.LineSegments(segGeo, new THREE.LineBasicMaterial({ color: 0x3a1c14, transparent: true, opacity: .9 })));

  // poorten/bruggen over het pad (vlieg eronder door)
  [0.1, 0.24, 0.38, 0.52, 0.66, 0.8].forEach((t, gi) => {
    const p = path.getPoint(t), ahead = path.getPoint(t + 0.01);
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z);
    g.lookAt(new THREE.Vector3(ahead.x, 0, ahead.z));
    const c = gi % 2 ? STEEL : RED;
    [-4.4, 4.4].forEach(x => {
      const pil = holo(new THREE.BoxGeometry(0.5, 7.4, 0.5), c, .35, .3);
      pil.position.set(x, 3.7, 0); g.add(pil);
    });
    const beam = holo(new THREE.BoxGeometry(9.3, 0.5, 0.5), c, .35, .4);
    beam.position.set(0, 7.2, 0); g.add(beam);
    const lamp = sprite(1.1, gi % 2 ? 0xdfe6ea : 0xde3115);
    lamp.position.set(0, 6.7, 0); g.add(lamp);
    scene.add(g);
  });

  // silkscreen-opschriften op de vloer
  const silk = ['VDS-24V', 'GND', 'PLC-BUS', 'X1', 'PE', 'VDS-04', '400V-3F', 'Q1'];
  silk.forEach((txt, i) => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const x2 = c.getContext('2d');
    x2.font = '600 40px "SF Mono", Consolas, monospace';
    x2.fillStyle = 'rgba(138,148,158,.85)'; x2.fillText(txt, 8, 46);
    const tx = new THREE.CanvasTexture(c);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.85),
      new THREE.MeshBasicMaterial({ map: tx, transparent: true, opacity: .35, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    let px, pz;
    do { px = (Math.random() - .5) * 30; pz = 8 - Math.random() * 120; } while (!farFromPath(px, pz, 3.5));
    m.position.set(px, 0.07, pz);
    m.rotation.z = Math.random() * Math.PI * 2;
    scene.add(m);
  });

  // ---------- stations ----------
  const stations = [];
  function station(i, name, build) {
    const t = (i + 1) / 7;
    const p = path.getPoint(t);
    const ahead = path.getPoint(Math.min(t + 0.012, 1));
    const side = new THREE.Vector3().subVectors(ahead, p).normalize().cross(new THREE.Vector3(0, 1, 0));
    const g = new THREE.Group();
    const pos = p.clone().addScaledVector(side, i === 5 ? 0 : 4.6);
    pos.y = 0;
    g.position.copy(pos);
    g.lookAt(new THREE.Vector3(p.x, 0, p.z));
    build(g, side);
    const lb = labelSprite('0' + (i + 1) + ' // ' + name, false);
    lb.position.set(0, g.userData.labelH ?? 7.2, 0);
    g.add(lb);
    const hs = sprite(2.2);
    hs.position.set(0, (g.userData.labelH ?? 7.2) - 1.1, 0);
    g.add(hs);
    scene.add(g);
    stations.push({ g, t, lb, hs });
    return g;
  }

  // 01 — besturingspaneel: monoliet met DIN-rails
  station(0, 'BESTURINGSPANELEN', g => {
    const kast = holo(new THREE.BoxGeometry(4.4, 6, 1.2), RED, .35, .4);
    kast.position.y = 3; g.add(kast);
    [1.6, 3, 4.4].forEach(y => {
      const rail = holo(new THREE.BoxGeometry(3.6, 0.22, 0.28), STEEL, .4, .3);
      rail.position.set(0, y, 0.65); g.add(rail);
    });
    for (let i = 0; i < 6; i++) {
      const m = holo(new THREE.BoxGeometry(0.5, 0.7, 0.4), i % 2 ? WHITE : STEEL, .5, .3);
      m.position.set(-1.4 + i * 0.56, 3, 0.72); g.add(m);
    }
  });

  // 02 — paneelbouw: rij klemmen-torens
  station(1, 'PANEELBOUW', g => {
    for (let i = 0; i < 7; i++) {
      const h = 2.2 + (i % 3) * 1.3;
      const t = holo(new THREE.BoxGeometry(0.8, h, 0.8), i % 2 ? STEEL : WHITE, .45, .35);
      t.position.set(-2.4 + i * 0.82, h / 2, 0); g.add(t);
      const led = sprite(0.6, i % 2 ? 0x3fbf5a : RED);
      led.position.set(-2.4 + i * 0.82, h + 0.3, 0); g.add(led);
    }
    g.userData.labelH = 6.4;
  });

  // 03 — PLC: gigantische chip met pinnen
  station(2, 'PLC-AUTOMATISERING', g => {
    const chip = holo(new THREE.BoxGeometry(3.6, 0.9, 3.6), RED, .4, .5);
    chip.position.y = 2.6; g.add(chip);
    for (let i = 0; i < 8; i++) {
      [-1, 1].forEach(s => {
        const pin = holo(new THREE.BoxGeometry(0.16, 2.6, 0.16), STEEL, .5, .25);
        pin.position.set(-1.55 + i * 0.44, 1.3, s * 1.95); g.add(pin);
      });
    }
    const die = holo(new THREE.BoxGeometry(1.4, 0.25, 1.4), WHITE, .3, .6);
    die.position.y = 3.2; g.add(die);
    const led = sprite(0.8, 0x3fbf5a); led.position.set(1.4, 3.3, 1.4); g.add(led);
    g.userData.labelH = 6.2;
  });

  // 04 — hardware: condensator-torens + weerstand
  station(3, 'HARDWARE ENGINEERING', g => {
    [[-1.6, 5, RED], [0.4, 3.6, STEEL], [2.2, 4.4, WHITE]].forEach(([x, h, c]) => {
      const cap = holo(new THREE.CylinderGeometry(0.85, 0.85, h, 18), c, .4, .4);
      cap.position.set(x, h / 2, 0); g.add(cap);
      const top = holo(new THREE.CylinderGeometry(0.85, 0.85, 0.12, 18), c, .2, .6);
      top.position.set(x, h + 0.06, 0); g.add(top);
    });
    g.userData.labelH = 7;
  });

  // 05 — software: zwevende schermen
  const hmiCanvas = document.createElement('canvas');
  hmiCanvas.width = 256; hmiCanvas.height = 128;
  const hmiCtx = hmiCanvas.getContext('2d');
  const hmiTex = new THREE.CanvasTexture(hmiCanvas);
  let screens = [];
  station(4, 'SOFTWARE ENGINEERING', g => {
    [[-1.8, 3.4, -0.4, .25], [0.6, 4.6, 0.3, -.15], [1.9, 2.6, -0.2, .1]].forEach(([x, y, z, ry], i) => {
      const fr = holo(new THREE.BoxGeometry(2.6, 1.6, 0.12), i === 1 ? RED : STEEL, .25, .4);
      fr.position.set(x, y, z); fr.rotation.y = ry;
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.3),
        new THREE.MeshBasicMaterial({ map: hmiTex, transparent: true, opacity: .92 }));
      scr.position.set(0, 0, 0.08); fr.add(scr);
      g.add(fr); screens.push(fr);
    });
    g.userData.labelH = 6.6;
  });

  // 06 — automatisering: poort óp het pad waar je doorheen vliegt
  let portal;
  station(5, 'INDUSTRIËLE AUTOMATISERING', (g) => {
    const t = 6 / 7;
    const p = path.getPoint(t), ahead = path.getPoint(t + 0.01);
    g.position.set(p.x, 0, p.z);
    g.lookAt(new THREE.Vector3(ahead.x, 0, ahead.z));
    portal = holo(new THREE.TorusGeometry(3.4, 0.22, 12, 48), RED, .3, .7);
    portal.position.y = p.y;
    g.add(portal);
    const ring2 = holo(new THREE.TorusGeometry(4.1, 0.08, 8, 48), STEEL, .2, .4);
    ring2.position.y = p.y;
    g.add(ring2);
    g.userData.labelH = 7.6;
  });

  // eindpunt: glow
  const endP = path.getPoint(0.985);
  const endGlow = sprite(7);
  endGlow.position.copy(endP);
  scene.add(endGlow);
  const endLabel = labelSprite('EINDTEST // OK', true);
  endLabel.position.set(endP.x, endP.y + 2.2, endP.z - 2);
  scene.add(endLabel);

  // ---------- deeltjes ----------
  const pGeo = new THREE.BufferGeometry();
  const pCount = 600, pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    pPos[i * 3] = (Math.random() - .5) * 40;
    pPos[i * 3 + 1] = Math.random() * 12;
    pPos[i * 3 + 2] = 20 - Math.random() * 140;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({
    color: RED, size: 0.06, transparent: true, opacity: .45,
    blending: THREE.AdditiveBlending, depthWrite: false
  })));

  // ---------- scroll ----------
  const scrolly = document.getElementById('scrolly');
  let target = 0, prog = 0, parX = 0, parY = 0;
  function onScroll() {
    const r = scrolly.getBoundingClientRect();
    const total = scrolly.offsetHeight - innerHeight;
    target = Math.min(Math.max(-r.top / total, 0), 1);
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  addEventListener('pointermove', e => {
    parX = (e.clientX / innerWidth - .5);
    parY = (e.clientY / innerHeight - .5);
  }, { passive: true });

  // ---------- panel ----------
  const data = [
    { n: '01', t: 'Besturingspanelen & -kasten', x: 'De reis begint bij het paneel: het kloppend hart van elke installatie. Op maat ontworpen, gebouwd en volledig getest in eigen huis.', l: '/besturingspanelen/' },
    { n: '02', t: 'Panelenbouw', x: 'In onze werkplaats in Steenbergen krijgt het ontwerp handen en voeten: nette, gedocumenteerde bedrading, in serie of enkelstuks.', l: '/panelenbouw/' },
    { n: '03', t: 'PLC-automatisering', x: 'De PLC is het brein. Wij programmeren en configureren besturingen van alle grote merken, tot en met de inbedrijfstelling.', l: '/plc-automatisering/' },
    { n: '04', t: 'Hardware engineering', x: 'Onder elke betrouwbare installatie ligt een doordacht schema. Voedingen, beveiligingen en bekabeling, exact gedimensioneerd.', l: '/hardware-engineering/' },
    { n: '05', t: 'Software engineering', x: 'HMI, SCADA en besturingssoftware maken het proces zichtbaar en bestuurbaar, voor operator én management.', l: '/software-engineering/' },
    { n: '06', t: 'Industriële automatisering', x: 'Alles komt samen: vlieg door de poort: één partner die het complete traject draagt, van schets tot productielijn.', l: '/industriele-automatisering/' },
  ];
  const panel = document.getElementById('panel');
  const pN = document.getElementById('p-num'), pT = document.getElementById('p-title'),
        pX = document.getElementById('p-text'), pL = document.getElementById('p-link'),
        pC = document.getElementById('p-count'), pF = document.getElementById('progress-fill');
  let current = -2;
  function setStation(i) {
    if (i === current) return;
    current = i;
    panel.classList.add('fading');
    setTimeout(() => {
      if (i < 0) {
        pN.textContent = '// SYSTEEMVLUCHT 01—06';
        pT.textContent = 'Vlieg door onze techniek';
        pX.textContent = 'Scroll om op te stijgen. Je vliegt langs zes stations, samen één traject onder één dak.';
        pL.style.display = 'none'; pC.textContent = '00/06';
      } else if (i > 5) {
        pN.textContent = '// EINDTEST — GESLAAGD';
        pT.textContent = 'Signaal afgeleverd';
        pX.textContent = 'Van eerste schets tot werkende installatie: dit is wat één partner voor het hele traject betekent.';
        pL.href = '/contact/'; pL.textContent = 'Start uw traject →'; pL.style.display = 'inline-block';
        pC.textContent = '06/06';
      } else {
        const s = data[i];
        pN.textContent = '// STATION ' + s.n + ' — ' + s.t.toUpperCase();
        pT.textContent = s.t; pX.textContent = s.x;
        pL.href = s.l; pL.textContent = 'Bekijk ' + s.t + ' →'; pL.style.display = 'inline-block';
        pC.textContent = s.n + '/06';
      }
      panel.classList.remove('fading');
    }, 150);
  }
  setStation(-1);

  // ---------- resize ----------
  function resize() {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  // ---------- HMI textuur ----------
  function drawHMI(time) {
    hmiCtx.fillStyle = 'rgba(8,12,16,.95)'; hmiCtx.fillRect(0, 0, 256, 128);
    hmiCtx.strokeStyle = '#DE3115'; hmiCtx.lineWidth = 3; hmiCtx.beginPath();
    for (let i = 0; i < 26; i++) {
      const x = i * 10.5, y = 64 - Math.sin(time / 480 + i * .6) * 26 - Math.sin(time / 1200 + i) * 10;
      i ? hmiCtx.lineTo(x, y) : hmiCtx.moveTo(x, y);
    }
    hmiCtx.stroke();
    hmiCtx.fillStyle = '#3fbf5a'; hmiCtx.font = 'bold 16px monospace';
    hmiCtx.fillText('RUN ' + (47 + Math.sin(time / 700) * 2).toFixed(1) + ' Hz', 10, 118);
    hmiTex.needsUpdate = true;
  }

  // ---------- render loop ----------
  const clock = new THREE.Clock();
  const up = new THREE.Vector3(0, 1, 0);
  function tick() {
    requestAnimationFrame(tick);
    const t = clock.getElapsedTime() * 1000;
    prog += (target - prog) * 0.07;

    // camera langs het pad
    const camT = prog * 0.97;
    const pos = path.getPoint(camT);
    const look = path.getPoint(Math.min(camT + 0.02, 1));
    camera.position.set(pos.x + parX * 1.2, pos.y + 0.2 - parY * 0.6, pos.z);
    camera.lookAt(look.x, look.y, look.z);
    camera.rotation.z = Math.sin(t / 2800) * 0.015 + parX * 0.05;

    // stations activeren
    let active = -1;
    stations.forEach((s, i) => {
      const lit = camT > s.t - 0.06;
      s.hs.material.opacity = lit ? (0.7 + Math.sin(t / 300) * 0.3) : 0.15;
      s.lb.material.opacity = lit ? 1 : 0.25;
      if (lit) active = i;
    });
    if (prog > 0.965) active = 6;
    else if (prog < 0.02) active = -1;
    setStation(active);
    pF.style.width = (prog * 100) + '%';

    // leven in de scene
    floorPulses.forEach(fp => {
      fp.t = (fp.t + 0.0012) % 1;
      fp.s.position.copy(floorCurve.getPoint(fp.t));
      fp.s.position.y = 0.3;
    });
    if (portal) portal.rotation.z = t / 2400;
    ledMat.opacity = 0.65 + Math.sin(t / 260) * 0.3;
    endGlow.scale.setScalar(6 + Math.sin(t / 400) * 1.2);
    if (Math.floor(t / 140) % 2 === 0) drawHMI(t);

    renderer.render(scene, camera);
  }
  tick();
})();
