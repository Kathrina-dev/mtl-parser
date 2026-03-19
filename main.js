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

// Shaders
const vsSource = `
attribute vec3 position;
attribute vec2 uv;
varying vec2 vUV;

uniform float angle;

void main() {
  float c = cos(angle);
  float s = sin(angle);

  mat4 rotation = mat4(
    c, 0, s, 0,
    0, 1, 0, 0,
   -s, 0, c, 0,
    0, 0, 0, 1
  );

  // move object slightly back
  vec4 pos = rotation * vec4(position, 1.0);
  pos.z -= 0.5;

  gl_Position = pos;
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

// Compile shader
function createShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

const vs = createShader(gl.VERTEX_SHADER, vsSource);
const fs = createShader(gl.FRAGMENT_SHADER, fsSource);

// Program
const program = gl.createProgram();
gl.attachShader(program, vs);
gl.attachShader(program, fs);
gl.linkProgram(program);
gl.useProgram(program);

// Cube data
const vertices = new Float32Array([
  // positions       // uvs
  -0.3,-0.3, 0.0,   0,0,
   0.3,-0.3, 0.0,   1,0,
   0.3, 0.3, 0.0,   1,1,
  -0.3, 0.3, 0.0,   0,1,
]);

const indices = new Uint16Array([
  0,1,2, 0,2,3
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

// Texture
function isPowerOf2(value) {
  return (value & (value - 1)) === 0;
}

function loadTexture(url) {
  const texture = gl.createTexture();
  const img = new Image();

  img.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);

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
  return texture;
}

// Use your parser
fetch("example.mtl")
  .then(res => res.text())
  .then(text => {
    const materials = parseMTL(text);

    console.log(materials);

    const mat = materials["TexturedMaterial"];
    const textureURL = mat?.map_Kd?.url;

    const texture = loadTexture(textureURL);

    const angleLoc = gl.getUniformLocation(program, "angle");

    let angle = 0;

    function render() {
      angle += 0.01;

      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.uniform1f(angleLoc, angle);

      gl.bindTexture(gl.TEXTURE_2D, texture);

      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

      requestAnimationFrame(render);
    }

    render();
  }
);