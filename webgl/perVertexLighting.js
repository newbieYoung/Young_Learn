/* eslint-disable no-bitwise */
const canvas = document.querySelector('#webgl');
const width = canvas.width;
const height = canvas.height;
const gl = canvas.getContext('webgl');

gl.clearColor(0.0, 0.0, 0.0, 1.0); // 设置背景颜色
gl.enable(gl.DEPTH_TEST); // 开启隐藏面消除
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // 清空颜色和深度缓冲区

const program = {
  /**
   * 逐顶点点光源的原理在于 WebGL 系统会根据顶点颜色，内插出表面上每个片元的颜色；
   * 但实际上，点光源光照射到一个表面上所产生的效果（即每个片元获得的颜色）与简单使用4个顶点颜色（虽然这4个顶点的颜色也是由点光源产生）内插出的效果并不完全相同；
   * 在某些极端情况下甚至很不一样。
   */
  vertexSrc: `
            attribute vec4 a_position;
            attribute vec4 a_color;
            varying vec4 v_color;
            uniform mat4 u_modelMatrix; // 模型矩阵
            uniform mat4 u_ProjViewModelMatrix; // 投影矩阵 + 视图矩阵 + 模型矩阵

            attribute vec4 a_normal; // 表面法向量
            uniform vec3 u_lightColor; // 点光源颜色
            uniform vec3 u_lightPosition; // 点光源位置
            uniform mat4 u_normalMatrix; // 法向量变换矩阵
            uniform vec3 u_ambientLight; // 环境光

            void main() {
                gl_Position = u_ProjViewModelMatrix * a_position;

                vec3 normal = normalize(vec3(u_normalMatrix * a_normal));
                vec4 vertexPosition = u_modelMatrix * a_position;
                vec3 lightDirection = normalize(u_lightPosition - vec3(vertexPosition)); // 计算当前位置的入射光方向
                float nDotL = max(dot(lightDirection, normal), 0.0); // 如果反射角大于90度，则该光线无法照射到该片元。
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
var u_modelMatrix = gl.getUniformLocation(webglProgram, 'u_modelMatrix');
gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);

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
const u_ProjViewModelMatrix = gl.getUniformLocation(webglProgram, 'u_ProjViewModelMatrix');
gl.uniformMatrix4fv(u_ProjViewModelMatrix, false, prjViewModel.elements);

// pointLight
var u_lightColor = gl.getUniformLocation(webglProgram, 'u_lightColor');
gl.uniform3f(u_lightColor, 1.0, 1.0, 1.0);
var u_lightPosition = gl.getUniformLocation(webglProgram, 'u_lightPosition');
gl.uniform3f(u_lightPosition, 0.0, 1.0, 3.5);

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
  1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, // v0-v1-v2-v3 front
  1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, // v0-v3-v4-v5 right
  1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, // v0-v5-v6-v1 up
  1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, // v1-v6-v7-v2 left
  1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, // v7-v4-v3-v2 down
  1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, // v4-v7-v6-v5 back
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