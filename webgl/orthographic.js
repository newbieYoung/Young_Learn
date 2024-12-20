/* eslint-disable no-bitwise */
const canvas = document.querySelector('#webgl');
const width = canvas.width;
const height = canvas.height;
const gl = canvas.getContext('webgl');

gl.clearColor(0.0, 0.0, 1.0, 1.0); // 设置背景颜色
gl.enable(gl.DEPTH_TEST); // 开启隐藏面消除
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // 清空颜色和深度缓冲区

const program = {
  vertexSrc: `
            attribute vec4 a_position;
            attribute vec4 a_color;

            uniform mat4 u_projViewModelMatrix; // 投影矩阵 + 视图矩阵 + 模型矩阵

            varying vec4 v_color;
   
            void main() {
                gl_Position = u_projViewModelMatrix * a_position;
                v_color = a_color; // 将数据传给片元着色器
            }
        `,
  fragmentSrc: `
            precision mediump float; // 不写会报错 No precision specified for (float)，缺少精度描述
            
            varying vec4 v_color;

            void main() {
                gl_FragColor = v_color; // 从顶点着色器接收数据
            }
        `,
};
const webglProgram = generateProgram(gl, program);

var EyePoint = { // 视点以及默认位置
  x: 0.0,
  y: 0.0,
  z: 2.0,
};
var OrthoParams = { // 正交投影参数
  g_near: 0.0,
  g_far: 10.0,
};

var viewMatrix = new Matrix4();
viewMatrix.setLookAt(EyePoint.x, EyePoint.y, EyePoint.z, 0, 0, 0, 0, 1, 0);
var modelMatrix = new Matrix4();
modelMatrix.setRotate(45, 45, 45, 1);
var projMatrix = new Matrix4();
projMatrix.setOrtho(-4, 4, -4, 4, OrthoParams.g_near, OrthoParams.g_far);

var prjViewModel = projMatrix.multiply(viewMatrix).multiply(modelMatrix);

const u_projViewModelMatrix = gl.getUniformLocation(webglProgram, 'u_projViewModelMatrix');
gl.uniformMatrix4fv(u_projViewModelMatrix, false, prjViewModel.elements);

// Create a cube
//    v6----- v5
//   /|      /|
//  v1------v0|
//  | |     | |
//  | |v7---|-|v4
//  |/      |/
//  v2------v3

// 顶点
var vertices = new Float32Array([
  1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, // v0-v1-v2-v3 front
  1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, // v0-v3-v4-v5 right
  1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, // v0-v5-v6-v1 up
  -1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, // v1-v6-v7-v2 left
  -1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0, // v7-v4-v3-v2 down
  1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, // v4-v7-v6-v5 back
]);
const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
const a_position = gl.getAttribLocation(webglProgram, 'a_position');
gl.vertexAttribPointer(a_position, 3, gl.FLOAT, false, 4 * 3, 0);
gl.enableVertexAttribArray(a_position);

// 颜色
var colors = new Float32Array([
  0.4, 0.4, 1.0, 0.4, 0.4, 1.0, 0.4, 0.4, 1.0, 0.4, 0.4, 1.0, // v0-v1-v2-v3 front
  0.4, 1.0, 0.4, 0.4, 1.0, 0.4, 0.4, 1.0, 0.4, 0.4, 1.0, 0.4, // v0-v3-v4-v5 right
  1.0, 0.4, 0.4, 1.0, 0.4, 0.4, 1.0, 0.4, 0.4, 1.0, 0.4, 0.4, // v0-v5-v6-v1 up
  1.0, 1.0, 0.4, 1.0, 1.0, 0.4, 1.0, 1.0, 0.4, 1.0, 1.0, 0.4, // v1-v6-v7-v2 left
  1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, // v7-v4-v3-v2 down
  0.4, 1.0, 1.0, 0.4, 1.0, 1.0, 0.4, 1.0, 1.0, 0.4, 1.0, 1.0, // v4-v7-v6-v5 back
]);
const colorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
const a_color = gl.getAttribLocation(webglProgram, 'a_color');
gl.vertexAttribPointer(a_color, 3, gl.FLOAT, false, 4 * 3, 0);
gl.enableVertexAttribArray(a_color);

// 索引
var indices = new Uint8Array([
  0, 1, 2, 0, 2, 3, // front
  4, 5, 6, 4, 6, 7, // right
  8, 9, 10, 8, 10, 11, // up
  12, 13, 14, 12, 14, 15, // left
  16, 17, 18, 16, 18, 19, // down
  20, 21, 22, 20, 22, 23, // back
]);

const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

gl.clear(gl.COLOR_BUFFER_BIT);
gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_BYTE, 0);
