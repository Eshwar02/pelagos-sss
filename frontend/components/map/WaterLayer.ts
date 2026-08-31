import type maplibregl from "maplibre-gl";

// A MapLibre custom WebGL layer that fills the whole world (mercator 0..1 quad)
// with an animated, domain-warped fractal-noise water surface. Anchored to the
// map so it pans/zooms with geography; animated via a time uniform. This is the
// flowing "wavy water" look — not line arrows.

const VERT = `
attribute vec2 a_pos;
uniform mat4 u_matrix;
varying vec2 v_pos;
void main() {
  v_pos = a_pos;
  gl_Position = u_matrix * vec4(a_pos, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;
varying vec2 v_pos;
uniform float u_time;
uniform float u_zoom;
uniform float u_intensity;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 6; i++) { v += a * noise(p); p = p * 2.0 + vec2(37.0, 17.0); a *= 0.5; }
  return v;
}

void main(){
  // Keep the water's screen-space density roughly constant across zoom.
  float scale = 6.0 * pow(2.0, u_zoom * 0.6);
  vec2 p = v_pos * scale;
  float t = u_time * (0.35 + 0.5 * u_intensity);

  // Domain warp for a flowing, caustic-like surface.
  vec2 q = vec2(fbm(p + vec2(0.0, t * 0.15)), fbm(p + vec2(5.2, 1.3) - t * 0.12));
  vec2 r = vec2(fbm(p + 2.0 * q + vec2(1.7, 9.2) + t * 0.10),
                fbm(p + 2.0 * q + vec2(8.3, 2.8) - t * 0.10));
  float f = fbm(p + 2.0 * r);

  vec3 deep = vec3(0.015, 0.055, 0.11);
  vec3 mid  = vec3(0.04, 0.17, 0.30);
  vec3 hi   = vec3(0.24, 0.47, 0.64);

  vec3 col = mix(deep, mid, clamp(f * f * 2.2, 0.0, 1.0));
  col = mix(col, hi, clamp(length(r) * (0.45 + 0.35 * u_intensity), 0.0, 1.0));
  // Foamy crest highlights.
  col += vec3(0.35) * smoothstep(0.62, 0.72, f) * (0.4 + 0.6 * u_intensity);

  gl_FragColor = vec4(col, 1.0);
}
`;

export interface WaterHandle {
  layer: maplibregl.CustomLayerInterface;
  setIntensity: (v: number) => void;
  setRunning: (v: boolean) => void;
}

export function createWaterLayer(map: maplibregl.Map, id = "world-water"): WaterHandle {
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  let aPos = 0;
  let uMatrix: WebGLUniformLocation | null = null;
  let uTime: WebGLUniformLocation | null = null;
  let uZoom: WebGLUniformLocation | null = null;
  let uIntensity: WebGLUniformLocation | null = null;
  let start = performance.now();
  let intensity = 0.6;
  let running = true;
  let frozenTime = 0;

  function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error("water shader: " + gl.getShaderInfoLog(sh));
    }
    return sh;
  }

  const layer: maplibregl.CustomLayerInterface = {
    id,
    type: "custom",
    onAdd(_map, gl) {
      const vs = compile(gl, gl.VERTEX_SHADER, VERT);
      const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
      program = gl.createProgram()!;
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      aPos = gl.getAttribLocation(program, "a_pos");
      uMatrix = gl.getUniformLocation(program, "u_matrix");
      uTime = gl.getUniformLocation(program, "u_time");
      uZoom = gl.getUniformLocation(program, "u_zoom");
      uIntensity = gl.getUniformLocation(program, "u_intensity");
      // Two triangles covering the mercator world square (0..1, 0..1).
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1]),
        gl.STATIC_DRAW,
      );
      start = performance.now();
    },
    render(gl, matrix) {
      if (!program) return;
      const now = performance.now();
      const time = running ? (now - start) / 1000 : frozenTime;
      if (running) frozenTime = time;
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.uniformMatrix4fv(uMatrix, false, new Float32Array(matrix as number[]));
      gl.uniform1f(uTime, time);
      gl.uniform1f(uZoom, map.getZoom());
      gl.uniform1f(uIntensity, intensity);
      gl.disable(gl.DEPTH_TEST);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (running) map.triggerRepaint();
    },
  };

  return {
    layer,
    setIntensity: (v) => {
      intensity = v;
    },
    setRunning: (v) => {
      running = v;
      if (v) start = performance.now() - frozenTime * 1000;
      map.triggerRepaint();
    },
  };
}
