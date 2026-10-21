/* The short's look, in 3-D.

   - ink(): flat colour, a soft two-tone light, and a pencil hatch on the shaded
     side that is anchored to the screen (like the hatch tiles in the short).
   - Pipeline: draws the scene, then a normals+depth pass, then one full-screen
     pass that inks every crease and silhouette, adds paper grain and a vignette.

   Colours are used exactly as written (no colour management), so the palette
   matches the 2-D renderer pixel for pixel. */
(function (CL) {
  'use strict';
  const T = THREE;
  const P = CL.P;

  const LIGHT = new T.Vector3(-0.5, 0.85, 0.45).normalize();
  const INK = new T.Color(P.INK);

  const inkVert = `
    varying vec3 vN;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vN = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`;

  const inkFrag = `
    uniform vec3 uColor;
    uniform sampler2D uMap;
    uniform float uUseMap;
    uniform vec3 uLight;
    uniform float uShadeMin;
    uniform float uHatch;
    uniform vec3 uEmissive;
    uniform float uOpacity;
    uniform float uPx;
    uniform float uHover;
    uniform float uFlat;
    uniform float uDark;
    varying vec3 vN;
    varying vec2 vUv;
    void main() {
      vec4 base = vec4(uColor, 1.0);
      if (uUseMap > 0.5) {
        vec4 t = texture2D(uMap, vUv);
        base.rgb = mix(base.rgb, t.rgb, t.a);
        if (uUseMap > 1.5) base.a = t.a;
      }
      float l = dot(normalize(vN), uLight);
      float lit = smoothstep(-0.1, 0.5, l);
      float shade = uFlat > 0.5 ? 1.0 : mix(uShadeMin, 1.0, lit);
      vec3 col = base.rgb * shade;
      float d = mod(gl_FragCoord.x + gl_FragCoord.y, 9.0 * uPx);
      float line = 1.0 - smoothstep(0.55 * uPx, 1.5 * uPx, abs(d - 4.5 * uPx));
      col = mix(col, vec3(0.165, 0.145, 0.255), line * (1.0 - lit) * uHatch * (1.0 - uFlat));
      col *= 1.0 - uDark;
      col += uEmissive;
      col = mix(col, col * 1.1 + vec3(0.05, 0.04, 0.0), uHover);
      gl_FragColor = vec4(col, base.a * uOpacity);
    }`;

  const shared = { px: { value: 1 }, dark: { value: 0 }, night: { value: 0 } };

  // opt: map, useAlpha, emissive, opacity, flat, hatch, shadeMin, side, depthWrite
  function ink(color, opt) {
    opt = opt || {};
    const m = new T.ShaderMaterial({
      uniforms: {
        uColor: { value: new T.Color(color || '#FFFFFF') },
        uMap: { value: opt.map || null },
        uUseMap: { value: opt.map ? (opt.useAlpha ? 2 : 1) : 0 },
        uLight: { value: LIGHT },
        uShadeMin: { value: opt.shadeMin === undefined ? 0.8 : opt.shadeMin },
        uHatch: { value: opt.hatch === undefined ? 0.22 : opt.hatch },
        uEmissive: { value: new T.Color(opt.emissive || '#000000') },
        uOpacity: { value: opt.opacity === undefined ? 1 : opt.opacity },
        uPx: shared.px,
        uHover: { value: 0 },
        uFlat: { value: opt.flat ? 1 : 0 },
        uDark: opt.lit ? { value: 0 } : shared.dark,
      },
      vertexShader: inkVert,
      fragmentShader: inkFrag,
      transparent: !!(opt.transparent || opt.useAlpha || (opt.opacity !== undefined && opt.opacity < 1)),
      side: opt.side === undefined ? T.FrontSide : opt.side,
      depthWrite: opt.depthWrite === undefined ? true : opt.depthWrite,
    });
    m.userData.ink = true;
    return m;
  }

  // normals + depth for the ink pass
  const ndMat = new T.ShaderMaterial({
    vertexShader: `
      varying vec3 vNv;
      void main() {
        vNv = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec3 vNv;
      void main() { gl_FragColor = vec4(normalize(vNv) * 0.5 + 0.5, 1.0); }`,
    side: T.DoubleSide,
  });

  const postFrag = `
    uniform sampler2D tColor;
    uniform sampler2D tNormal;
    uniform sampler2D tDepth;
    uniform vec2 uRes;
    uniform float uLine;
    uniform float uRange;
    uniform vec3 uInk;
    uniform float uVignette;
    uniform vec3 uTint;
    uniform float uTintA;
    uniform float uFade;
    uniform float uNight;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
    }
    float edgeAt(vec2 uv, float d0, vec3 n0, vec2 o) {
      float d = texture2D(tDepth, uv + o).x;
      vec3 n = texture2D(tNormal, uv + o).xyz * 2.0 - 1.0;
      float ed = smoothstep(0.18, 0.4, abs(d - d0) * uRange);
      float en = smoothstep(0.22, 0.42, 1.0 - dot(n, n0));
      return max(ed, en);
    }
    void main() {
      vec2 px = uLine / uRes;
      float d0 = texture2D(tDepth, vUv).x;
      vec3 n0 = texture2D(tNormal, vUv).xyz * 2.0 - 1.0;
      float e = 0.0;
      e = max(e, edgeAt(vUv, d0, n0, vec2(px.x, 0.0)));
      e = max(e, edgeAt(vUv, d0, n0, vec2(-px.x, 0.0)));
      e = max(e, edgeAt(vUv, d0, n0, vec2(0.0, px.y)));
      e = max(e, edgeAt(vUv, d0, n0, vec2(0.0, -px.y)));
      e = max(e, 0.7 * edgeAt(vUv, d0, n0, vec2(px.x, px.y) * 0.75));
      e = max(e, 0.7 * edgeAt(vUv, d0, n0, vec2(-px.x, px.y) * 0.75));
      vec3 col = texture2D(tColor, vUv).rgb;
      col = mix(col, uInk, e * 0.92);
      col = mix(col, uTint, uTintA);
      col = mix(col, col * vec3(0.55, 0.6, 0.95), uNight);
      vec2 fc = vUv * uRes;
      float grain = 1.0 - 0.025 * abs(hash(floor(fc / 2.0)) * 2.0 - 1.0) - 0.02 * noise(fc / 90.0);
      col *= grain;
      float r = length((vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0));
      col *= 1.0 - uVignette * smoothstep(0.35, 1.05, r);
      col = mix(col, vec3(0.043, 0.039, 0.078), uFade);
      gl_FragColor = vec4(col, 1.0);
    }`;

  class Pipeline {
    constructor(renderer) {
      this.r = renderer;
      this.rtColor = new T.WebGLRenderTarget(4, 4, { samples: 4 });
      this.rtND = new T.WebGLRenderTarget(4, 4);
      this.rtND.depthTexture = new T.DepthTexture(4, 4);
      this.rtND.depthTexture.type = T.UnsignedIntType;
      this.post = new T.ShaderMaterial({
        uniforms: {
          tColor: { value: this.rtColor.texture },
          tNormal: { value: this.rtND.texture },
          tDepth: { value: this.rtND.depthTexture },
          uRes: { value: new T.Vector2(4, 4) },
          uLine: { value: 1.4 },
          uRange: { value: 200 },
          uInk: { value: INK.clone() },
          uVignette: { value: 0.32 },
          uTint: { value: new T.Color(P.ALARM) },
          uTintA: { value: 0 },
          uFade: { value: 0 },
          uNight: shared.night,
        },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: postFrag,
        depthTest: false,
        depthWrite: false,
      });
      this.quad = new T.Mesh(new T.PlaneGeometry(2, 2), this.post);
      this.postScene = new T.Scene();
      this.postScene.add(this.quad);
      this.postCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    }

    setSize(w, h, dpr) {
      const W = Math.round(w * dpr), H = Math.round(h * dpr);
      this.rtColor.setSize(W, H);
      this.rtND.setSize(W, H);
      this.post.uniforms.uRes.value.set(W, H);
      this.post.uniforms.uLine.value = Math.max(1.0, 1.25 * H / 1080);
      shared.px.value = Math.max(1, H / 1080);
    }

    render(scene, camera) {
      const r = this.r;
      this.post.uniforms.uRange.value = camera.far - camera.near;
      r.setRenderTarget(this.rtColor);
      r.render(scene, camera);
      const bg = scene.background;
      const cc = r.getClearColor(new T.Color()), ca = r.getClearAlpha();
      scene.background = null;
      scene.overrideMaterial = ndMat;
      camera.layers.disable(1);
      r.setClearColor(0x8080ff, 1);
      r.setRenderTarget(this.rtND);
      r.render(scene, camera);
      camera.layers.enable(1);
      scene.overrideMaterial = null;
      scene.background = bg;
      r.setClearColor(cc, ca);
      r.setRenderTarget(null);
      r.render(this.postScene, this.postCam);
    }
  }

  CL.Ink = { ink, Pipeline, LIGHT, shared };
})(window.CL = window.CL || {});
