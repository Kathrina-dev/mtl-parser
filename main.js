import { parseMTL } from "./src/parserMTL.js";

const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

gl.viewport(0, 0, canvas.width, canvas.height);

if (!gl) alert("WebGL not supported");

gl.enable(gl.DEPTH_TEST);

// UI
let ready = false;
let mode = 0;
const ui = document.getElementById("ui");

function updateUI() {
  if (!ready) {
    ui.textContent = "Loading textures...";
    return;
  }

  const modes = ["Single Material", "Multi Material", "UV Debug"];
  ui.textContent = `Mode: ${modes[mode]} (press any key)`;
}

window.addEventListener("keydown", () => {
  if (!ready) return;
  mode = (mode + 1) % 3;
  updateUI();
});

updateUI();

// MATRIX
function createPerspective(fov, aspect, near, far) {
  const f = 1.0 / Math.tan(fov / 2);
  const nf = 1 / (near - far);

  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, (2 * far * near) * nf, 0
  ]);
}

function createIdentity() {
  return new Float32Array([
    1,0,0,0,
    0,1,0,0,
    0,0,1,0,
    0,0,0,1
  ]);
}

function rotateY(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return new Float32Array([
    c,0,s,0,
    0,1,0,0,
   -s,0,c,0,
    0,0,0,1
  ]);
}

function rotateX(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return new Float32Array([
    1,0,0,0,
    0,c,-s,0,
    0,s,c,0,
    0,0,0,1
  ]);
}

function multiply(a, b) {
  const out = new Float32Array(16);
  for (let i=0;i<4;i++) {
    for (let j=0;j<4;j++) {
      out[i*4+j] =
        a[i*4+0]*b[0*4+j] +
        a[i*4+1]*b[1*4+j] +
        a[i*4+2]*b[2*4+j] +
        a[i*4+3]*b[3*4+j];
    }
  }
  return out;
}

// SHADERS
const vsSource = `
attribute vec3 position;
attribute vec2 uv;

varying vec2 vUV;

uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;

void main() {
  gl_Position = projection * view * model * vec4(position, 1.0);
  vUV = uv;
}
`;

const fsSource = `
precision mediump float;
varying vec2 vUV;
uniform sampler2D tex;

void main() {
  gl_FragColor = texture2D(tex, vUV);
}
`;

function createShader(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

const program = gl.createProgram();
gl.attachShader(program, createShader(gl.VERTEX_SHADER, vsSource));
gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fsSource));
gl.linkProgram(program);
gl.useProgram(program);

gl.uniform1i(gl.getUniformLocation(program, "tex"), 0);

// GEOMETRY
const vertices = new Float32Array([
  -0.5,-0.5, 0.5, 0,0,  0.5,-0.5, 0.5, 1,0,  0.5, 0.5, 0.5, 1,1,  -0.5, 0.5, 0.5, 0,1,
   0.5,-0.5,-0.5, 0,0, -0.5,-0.5,-0.5, 1,0, -0.5, 0.5,-0.5, 1,1,   0.5, 0.5,-0.5, 0,1,
  -0.5,-0.5,-0.5, 0,0, -0.5,-0.5, 0.5, 1,0, -0.5, 0.5, 0.5, 1,1,  -0.5, 0.5,-0.5, 0,1,
   0.5,-0.5, 0.5, 0,0,  0.5,-0.5,-0.5, 1,0,  0.5, 0.5,-0.5, 1,1,   0.5, 0.5, 0.5, 0,1,
  -0.5, 0.5, 0.5, 0,0,  0.5, 0.5, 0.5, 1,0,  0.5, 0.5,-0.5, 1,1,  -0.5, 0.5,-0.5, 0,1,
  -0.5,-0.5,-0.5, 0,0,  0.5,-0.5,-0.5, 1,0,  0.5,-0.5, 0.5, 1,1,  -0.5,-0.5, 0.5, 0,1,
]);

const indices = new Uint16Array([
  0,1,2,0,2,3, 4,5,6,4,6,7,
  8,9,10,8,10,11, 12,13,14,12,14,15,
  16,17,18,16,18,19, 20,21,22,20,22,23
]);

gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

const posLoc = gl.getAttribLocation(program, "position");
const uvLoc = gl.getAttribLocation(program, "uv");

gl.enableVertexAttribArray(posLoc);
gl.enableVertexAttribArray(uvLoc);

gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 20, 0);
gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 20, 12);

// CAMERA
gl.uniformMatrix4fv(gl.getUniformLocation(program, "view"), false, (() => {
  const v = createIdentity(); v[14] = -3; return v;
})());

gl.uniformMatrix4fv(
  gl.getUniformLocation(program, "projection"),
  false,
  createPerspective(Math.PI/4, canvas.width/canvas.height, 0.1, 100)
);

// TEXTURES
let textures = {};
let faceMaterials = ["Front","Back","Left","Right","Top","Bottom"];

function isPowerOf2(v){ return (v&(v-1))===0; }

function loadTexture(url) {
  return new Promise((resolve) => {
    const texture = gl.createTexture();
    const img = new Image();

    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

      if (isPowerOf2(img.width) && isPowerOf2(img.height)) {
        gl.generateMipmap(gl.TEXTURE_2D);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }

      resolve(texture);
    };

    img.onerror = () => {
      console.error("Failed:", url);
      resolve(null); // IMPORTANT: don’t block
    };

    img.src = url;
  });
}

// LOAD TEXTURES
let uvTexture = null;

(async function init() {
  const text = await fetch("example.mtl").then(r => r.text());
  const materials = parseMTL(text);

  const promises = [];

  for (const name in materials) {
    const url = materials[name]?.map_Kd?.url;
    if (url) {
      promises.push(
        loadTexture(url).then(tex => textures[name] = tex)
      );
    }
  }

  promises.push(
    loadTexture("uv.jpg").then(tex => uvTexture = tex)
  );

  await Promise.allSettled(promises); // never freeze

  ready = true;
  updateUI();
  console.log("Textures ready");
})();

// RENDER
let angle = 0;

function render(){
  requestAnimationFrame(render);
  if (!ready || !uvTexture) return;

  angle += 0.01;

  gl.clearColor(0,0,0,1);
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

  const model = multiply(rotateY(angle), rotateX(angle*0.7));
  gl.uniformMatrix4fv(gl.getUniformLocation(program, "model"), false, model);

  if (mode === 0) {
    const tex = textures[faceMaterials[0]];
    if (!tex) return;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

  } else if (mode === 1) {
    for (let i = 0; i < 6; i++) {
      const tex = textures[faceMaterials[i]];
      if (!tex) continue;

      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, i * 6 * 2);
    }
  } else {
    gl.bindTexture(gl.TEXTURE_2D, uvTexture);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
  }
}

render();