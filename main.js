import { parseMTL } from "./src/parserMTL.js";

const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

gl.viewport(0, 0, canvas.width, canvas.height);

if (!gl) {
  alert("WebGL not supported");
}

gl.enable(gl.DEPTH_TEST);

// Matrix Helpers
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

function rotateY(angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);

  return new Float32Array([
    c,0,s,0,
    0,1,0,0,
   -s,0,c,0,
    0,0,0,1
  ]);
}

function rotateX(angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);

  return new Float32Array([
    1,0,0,0,
    0,c,-s,0,
    0,s,c,0,
    0,0,0,1
  ]);
}

function multiply(a, b) {
  const out = new Float32Array(16);

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      out[i * 4 + j] =
        a[i * 4 + 0] * b[0 * 4 + j] +
        a[i * 4 + 1] * b[1 * 4 + j] +
        a[i * 4 + 2] * b[2 * 4 + j] +
        a[i * 4 + 3] * b[3 * 4 + j];
    }
  }

  return out;
}

// Shaders
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

function createShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

const vs = createShader(gl.VERTEX_SHADER, vsSource);
const fs = createShader(gl.FRAGMENT_SHADER, fsSource);

const program = gl.createProgram();
gl.attachShader(program, vs);
gl.attachShader(program, fs);
gl.linkProgram(program);
gl.useProgram(program);

// Cube Geometry
const vertices = new Float32Array([
  // FRONT
  -0.5,-0.5, 0.5, 0,0,
   0.5,-0.5, 0.5, 1,0,
   0.5, 0.5, 0.5, 1,1,
  -0.5, 0.5, 0.5, 0,1,

  // BACK
   0.5,-0.5,-0.5, 0,0,
  -0.5,-0.5,-0.5, 1,0,
  -0.5, 0.5,-0.5, 1,1,
   0.5, 0.5,-0.5, 0,1,

  // LEFT
  -0.5,-0.5,-0.5, 0,0,
  -0.5,-0.5, 0.5, 1,0,
  -0.5, 0.5, 0.5, 1,1,
  -0.5, 0.5,-0.5, 0,1,

  // RIGHT
   0.5,-0.5, 0.5, 0,0,
   0.5,-0.5,-0.5, 1,0,
   0.5, 0.5,-0.5, 1,1,
   0.5, 0.5, 0.5, 0,1,

  // TOP
  -0.5, 0.5, 0.5, 0,0,
   0.5, 0.5, 0.5, 1,0,
   0.5, 0.5,-0.5, 1,1,
  -0.5, 0.5,-0.5, 0,1,

  // BOTTOM
  -0.5,-0.5,-0.5, 0,0,
   0.5,-0.5,-0.5, 1,0,
   0.5,-0.5, 0.5, 1,1,
  -0.5,-0.5, 0.5, 0,1,
]);

const indices = new Uint16Array([
  0,1,2, 0,2,3,        // front
  4,5,6, 4,6,7,        // back
  8,9,10, 8,10,11,     // left
  12,13,14, 12,14,15,  // right
  16,17,18, 16,18,19,  // top
  20,21,22, 20,22,23   // bottom
]);

// Buffers
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

// Attributes
const positionLoc = gl.getAttribLocation(program, "position");
const uvLoc = gl.getAttribLocation(program, "uv");

gl.enableVertexAttribArray(positionLoc);
gl.enableVertexAttribArray(uvLoc);

gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 20, 0);
gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 20, 12);

// Uniforms
const modelLoc = gl.getUniformLocation(program, "model");
const viewLoc = gl.getUniformLocation(program, "view");
const projLoc = gl.getUniformLocation(program, "projection");

const projection = createPerspective(
  Math.PI / 4,
  canvas.width / canvas.height,
  0.1,
  100
);

const view = createIdentity();
view[14] = -3;

gl.uniformMatrix4fv(viewLoc, false, view);
gl.uniformMatrix4fv(projLoc, false, projection);

// Texture
let texture = null;

function isPowerOf2(value) {
  return (value & (value - 1)) === 0;
}

function loadTexture(url) {
  const tex = gl.createTexture();
  const img = new Image();

  img.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, tex);

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      img
    );

    if (isPowerOf2(img.width) && isPowerOf2(img.height)) {
      gl.generateMipmap(gl.TEXTURE_2D);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  };

  img.src = url;
  return tex;
}

// Load MTL
fetch("example.mtl")
  .then(res => res.text())
  .then(text => {
    const materials = parseMTL(text);
    console.log(materials);

    const mat = materials["TexturedMaterial"];
    const textureURL = mat?.map_Kd?.url;

    texture = loadTexture(textureURL);
  });

// Render Loop
let angle = 0;

function render() {
  angle += 0.01;

  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if (!texture) {
    requestAnimationFrame(render);
    return;
  }

  const rotY = rotateY(angle);
  const rotX = rotateX(angle * 0.7);
  const model = multiply(rotY, rotX);

  gl.uniformMatrix4fv(modelLoc, false, model);

  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

  requestAnimationFrame(render);
}

render();