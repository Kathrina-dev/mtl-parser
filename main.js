import { parseMTL } from "./src/parserMTL.js";

const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

gl.viewport(0, 0, canvas.width, canvas.height);

if (!gl) alert("WebGL not supported");

gl.enable(gl.DEPTH_TEST);

// Mode toggle
let mode = 0;
window.addEventListener("keydown", () => {
  mode = (mode + 1) % 2;
});

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

const texLoc = gl.getUniformLocation(program, "tex");
gl.uniform1i(texLoc, 0);

// GEOMETRY
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
  0,1,2,0,2,3,
  4,5,6,4,6,7,
  8,9,10,8,10,11,
  12,13,14,12,14,15,
  16,17,18,16,18,19,
  20,21,22,20,22,23
]);

// buffers
const buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

const ibuf = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuf);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

// attributes
const posLoc = gl.getAttribLocation(program, "position");
const uvLoc = gl.getAttribLocation(program, "uv");

gl.enableVertexAttribArray(posLoc);
gl.enableVertexAttribArray(uvLoc);

gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 20, 0);
gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 20, 12);

// CAMERA
const modelLoc = gl.getUniformLocation(program, "model");
const viewLoc = gl.getUniformLocation(program, "view");
const projLoc = gl.getUniformLocation(program, "projection");

const projection = createPerspective(
  Math.PI/4,
  canvas.width/canvas.height,
  0.1,
  100
);

const view = createIdentity();
view[14] = -3;

gl.uniformMatrix4fv(viewLoc,false,view);
gl.uniformMatrix4fv(projLoc,false,projection);

// TEXTURES
let textures = {};
let faceMaterials = ["Front","Back","Left","Right","Top","Bottom"];
let ready = false;

function isPowerOf2(v){ return (v&(v-1))===0; }

function loadTexture(url){
  const t = gl.createTexture();
  const img = new Image();

  img.onload = ()=>{
    gl.bindTexture(gl.TEXTURE_2D,t);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);

    if(isPowerOf2(img.width)&&isPowerOf2(img.height)){
      gl.generateMipmap(gl.TEXTURE_2D);
    }else{
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    }
  };

  img.src = url;
  return t;
}

// load MTL
fetch("example.mtl")
.then(r=>r.text())
.then(text=>{
  const materials = parseMTL(text);

  for(const name in materials){
    const url = materials[name]?.map_Kd?.url;
    if(url) textures[name] = loadTexture(url);
  }

  ready = true;
});

// RENDER
let angle = 0;

function render(){
  requestAnimationFrame(render);

  if(!ready) return;

  angle += 0.01;

  gl.clearColor(0,0,0,1);
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

  const model = multiply(rotateY(angle), rotateX(angle*0.7));
  gl.uniformMatrix4fv(modelLoc,false,model);

  if(mode===0){
    // multi
    for(let i=0;i<6;i++){
      const tex = textures[faceMaterials[i]];
      if(!tex) continue;

      gl.bindTexture(gl.TEXTURE_2D,tex);
      gl.drawElements(gl.TRIANGLES,6,gl.UNSIGNED_SHORT,i*6*2);
    }
  }else{
    // single
    const tex = textures[faceMaterials[0]];
    gl.bindTexture(gl.TEXTURE_2D,tex);
    gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
  }
}

render();