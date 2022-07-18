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
            attribute vec4 a_normal;
            
            uniform mat4 u_projViewModelMatrix; // 投影矩阵 + 视图矩阵 + 模型矩阵
            
            uniform vec3 u_lightColor; // 平行光颜色
            uniform vec3 u_lightDirection; // 归一化的平行光方向
            uniform mat4 u_normalMatrix; // 法向量变换矩阵
            uniform vec3 u_ambientLight; // 环境光

            varying vec4 v_color;

            void main() {
                gl_Position = u_projViewModelMatrix * a_position;

                vec3 normal = normalize(vec3(u_normalMatrix * a_normal));
                float nDotL = max(dot(u_lightDirection, normal), 0.0); // 如果反射角大于90度，则该光线无法照射到该片元。
                vec3 diffuse = u_lightColor * vec3(a_color) * nDotL;
                vec3 ambient = u_ambientLight * vec3(a_color);
                v_color = vec4(diffuse + ambient, a_color.a); // 漫反射 + 环境光
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
  z: 15.0,
};
var PerspParams = { // 正交投影参数
  g_near: 1.0,
  g_far: 100.0,
};

var viewMatrix = new Matrix4();
viewMatrix.setLookAt(EyePoint.x, EyePoint.y, EyePoint.z, 0, 0, 0, 0, 1, 0);

var modelMatrix = new Matrix4();
modelMatrix.setRotate(45, 45, 45, 1);

// 法向量变换矩阵是模型矩阵的逆转置矩阵
var normalMatrix = new Matrix4();
normalMatrix.setInverseOf(modelMatrix);
normalMatrix.transpose();
var u_normalMatrix = gl.getUniformLocation(webglProgram, 'u_normalMatrix');
gl.uniformMatrix4fv(u_normalMatrix, false, normalMatrix.elements);

var projMatrix = new Matrix4();
projMatrix.setPerspective(30, width / height, PerspParams.g_near, PerspParams.g_far);
// projMatrix.setOrtho(-4, 4, -4, 4, OrthoParams.g_near, OrthoParams.g_far);

var prjViewModel = projMatrix.multiply(viewMatrix).multiply(modelMatrix);
const u_projViewModelMatrix = gl.getUniformLocation(webglProgram, 'u_projViewModelMatrix');
gl.uniformMatrix4fv(u_projViewModelMatrix, false, prjViewModel.elements);

// directionalLight
var u_lightColor = gl.getUniformLocation(webglProgram, 'u_lightColor');
gl.uniform3f(u_lightColor, 1.0, 1.0, 1.0);
var u_lightDirection = gl.getUniformLocation(webglProgram, 'u_lightDirection');
var lightDirection = new Vector3([0.5, 3.0, 4.0]);
lightDirection.normalize();
gl.uniform3fv(u_lightDirection, lightDirection.elements);

// ambientLight
var u_ambientLight = gl.getUniformLocation(webglProgram, 'u_ambientLight');
gl.uniform3f(u_ambientLight, 0.2, 0.2, 0.2);

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

// 法向量
var normals = new Float32Array([
  0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, // v0-v1-v2-v3 front
  1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, // v0-v3-v4-v5 right
  0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, // v0-v5-v6-v1 up
  -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, // v1-v6-v7-v2 left
  0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, // v7-v4-v3-v2 down
  0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, // v4-v7-v6-v5 back
]);
const normalBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
const a_normal = gl.getAttribLocation(webglProgram, 'a_normal');
gl.vertexAttribPointer(a_normal, 3, gl.FLOAT, false, 4 * 3, 0);
gl.enableVertexAttribArray(a_normal);

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
