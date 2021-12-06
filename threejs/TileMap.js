import * as THREE from "../node_modules/three/build/three.module.js";
import * as BufferGeometryUtils from "../node_modules/three/examples/jsm/utils/BufferGeometryUtils.js";
import { KDTree } from "../algorithm/kd-tree/KDTree.js";

// 瓦片地图
class TileMap {
  constructor(params) {
    this.viewport = params.viewport;
    if (!this.viewport) {
      throw new Error("tileMap viewport null");
    }
    this.size = params.size || { width: 100, height: 100 };
    this.mapGrid = params.mapGrid || { row: 1, column: 1 };
    this.textureGrid = params.textureGrid || { row: 1, column: 1 };
    this.uvs = this._updateUvs(this.textureGrid);
    this.texture = params.texture;

    // 层级函数（越大越在上层）
    this.zIndex =
      params.zIndex ||
      function (r, c) {
        const index = r * this.mapGrid.column + c;
        return -1.0 / (index + 2);
      };

    // 偏移函数（世界坐标系）
    this.offset =
      params.offset ||
      function () {
        return {
          x: 0,
          y: 0,
        };
      };

    // 中心函数
    this.center =
      params.center ||
      function () {
        return { x: 0.5, y: 0.5 };
      };

    // 区域函数（瓦片左上角为坐标原点，x轴水平向右，y轴水平向下）
    this.area = params.area;

    // 没有自定义偏移函数
    if (params.offset == null) {
      this._shapes = [];
    } else {
      this._shapes = this._getShapes(); // 拾取检测多边形
      this._kdTree = new KDTree(this._shapes, 2);
    }

    if (!this.texture) {
      throw new Error("tileMap texture null");
    }
    this.status = params.status || [];
    this._buffers = []; // bufferGeometry 缓存
    this.updateAll(this.status);
  }

  /**
   * 点是否在多边形内
   * @param {[x, y]} point 点
   * @param {[[x1, y1], [x2, y2]]} vs 多边形依次连接的顶点
   * @param {*} start
   * @param {*} end
   * @returns
   */
  _pointInPolygonNested(point, vs, start, end) {
    const x = point[0],
      y = point[1];
    let inside = false;
    if (start === undefined) start = 0;
    if (end === undefined) end = vs.length;
    const len = end - start;
    for (let i = 0, j = len - 1; i < len; j = i++) {
      const xi = vs[i + start][0],
        yi = vs[i + start][1];
      const xj = vs[j + start][0],
        yj = vs[j + start][1];
      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * 根据雪碧图网格计算 uv 坐标
   * @param {row, column} grid 网格行列信息
   * @returns
   */
  _updateUvs(grid) {
    const row = grid.row;
    const column = grid.column;
    const itemWidth = 1 / column;
    const itemHeight = 1 / row;
    const uvs = [];
    for (let i = 0; i < row; i++) {
      for (let j = 0; j < column; j++) {
        // [0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 0.0],
        const leftTop = [j * itemWidth, 1 - i * itemHeight];
        const leftBottom = [leftTop[0], leftTop[1] - itemHeight];
        const rightTop = [leftTop[0] + itemWidth, leftTop[1]];
        const rightBottom = [leftTop[0] + itemWidth, leftTop[1] - itemHeight];
        uvs.push([
          leftTop[0],
          leftTop[1],
          leftBottom[0],
          leftBottom[1],
          rightTop[0],
          rightTop[1],
          rightBottom[0],
          rightBottom[1],
        ]);
      }
    }
    return uvs;
  }

  // 计算瓦片单位坐标
  _getShapes() {
    const row = this.mapGrid.row;
    const column = this.mapGrid.column;
    const itemWidth = this.size.width / column;
    const itemHeight = this.size.height / row;
    const uvs = this._updateUvs({
      row,
      column,
    });
    const shapes = [];
    for (let i = 0; i < uvs.length; i++) {
      const r = parseInt(i / column);
      const c = i % column;
      shapes.push({
        index: i,
        zIndex: this.zIndex(r, c), // 序号
        points: [],
      });
      const offset = this.offset(r, c, itemWidth, itemHeight);
      const normalizedOffset = {
        x: offset.x / itemWidth,
        y: -offset.y / itemHeight,
      };
      for (let j = 0; j < uvs[i].length; j += 2) {
        uvs[i][j] = uvs[i][j] * column + normalizedOffset.x; // x
        uvs[i][j + 1] = (1 - uvs[i][j + 1]) * row + normalizedOffset.y; // y
        shapes[i].points.push([uvs[i][j], uvs[i][j + 1]]);
      }
    }
    // 自定义区域
    if (this.area) {
      for (let i = 0; i < shapes.length; i++) {
        const shape = shapes[i];
        const index = shape.index;
        const r = parseInt(index / column);
        const c = index % column;
        const leftTop = shape.points[0];
        const points = this.area(r, c);
        for (let j = 0; j < points.length; j++) {
          points[j][0] += leftTop[0];
          points[j][1] += leftTop[1];
        }
        shape.points = points;
      }
    } else {
      // 默认矩形点按逆时针顺序
      for (let i = 0; i < shapes.length; i++) {
        const temp = shapes[i].points[2];
        shapes[i].points[2] = shapes[i].points[3];
        shapes[i].points[3] = temp;
      }
    }

    return shapes;
  }

  /**
   * 获取瓦片状态值，状态不存在则默认为 0
   * @param {*} index 瓦片序号
   * @param {[0, 1, 0, 0...]} status 状态数组
   * @returns
   */
  _getState(index, status) {
    return status && status[index] != null ? status[index] : 0;
  }

  /**
   * KDTree 触摸检测
   * @param {*} point
   * @param {*} tree
   * @param {*} list
   */
  _kdTreeCast(point, tree, list) {
    const box = tree.box;
    const minX = box[0][0];
    const maxX = box[0][1];
    const minY = box[1][0];
    const maxY = box[1][1];
    const points = [
      [minX, minY],
      [maxX, minY],
      [maxX, maxY],
      [minX, maxY],
    ];
    if (this._pointInPolygonNested(point, points)) {
      if (tree.left) {
        this._kdTreeCast(point, tree.left, list);
      }
      if (tree.right) {
        this._kdTreeCast(point, tree.right, list);
      }
      if (!tree.left && !tree.right) {
        for (let i = 0; i < tree.polygons.length; i++) {
          const shape = tree.polygons[i];
          if (this._pointInPolygonNested(point, shape.points)) {
            list.push(shape);
          }
        }
      }
    }
  }

  /**
   * 按序号更新瓦片状态
   * @param {*} index
   * @param {*} state
   */
  _updateIndex(index, state) {
    const row = this.mapGrid.row;
    const column = this.mapGrid.column;
    const viewWidth = this.viewport.width;
    const viewHeight = this.viewport.height;
    const itemWidth = this.size.width / column;
    const itemHeight = this.size.height / row;
    const scaleX = itemWidth / viewWidth;
    const scaleY = itemHeight / viewHeight;

    const c = index % column;
    const r = parseInt(index / column);
    const currentState = state != null ? state : 0;
    const originState = this._getState(index, this.status);
    // 每次状态更新都重新生成 geometry，后续可以优化更新变化的值
    // 此外每个 geometry 有不少相同的数据，后续可以优化共用
    if (originState != currentState || !this._buffers[index]) {
      const geometry = new THREE.BufferGeometry();
      // uv
      const uv = this.uvs[currentState]
        ? this.uvs[currentState]
        : [0, 0, 0, 0, 0, 0, 0, 0];
      geometry.setAttribute(
        "texCoord",
        new THREE.Float32BufferAttribute(uv, 2)
      );
      // matrix
      const mat4 = new THREE.Matrix4();
      const offset = this.offset(r, c, itemWidth, itemHeight);
      const translation = new THREE.Vector3(
        -((column - 1) / 2 - c) * itemWidth + offset.x,
        ((row - 1) / 2 - r) * itemHeight + offset.y,
        0
      );
      mat4.makeTranslation(
        (translation.x / viewWidth) * 2,
        (translation.y / viewHeight) * 2,
        translation.z
      );
      let matrix = [[], [], [], []];
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          matrix[j].push(
            mat4.elements[j * 4 + 0],
            mat4.elements[j * 4 + 1],
            mat4.elements[j * 4 + 2],
            mat4.elements[j * 4 + 3]
          );
        }
      }
      for (let i = 0; i < 4; i++) {
        geometry.setAttribute(
          `mat_${i}`,
          new THREE.Float32BufferAttribute(matrix[i], 4)
        );
      }
      // position
      const zIndex = this.zIndex(r, c);
      let position = [
        -1.0 * scaleX,
        1.0 * scaleY,
        -zIndex,
        -1.0 * scaleX,
        -1.0 * scaleY,
        -zIndex,
        1.0 * scaleX,
        1.0 * scaleY,
        -zIndex,
        1.0 * scaleX,
        -1.0 * scaleY,
        -zIndex,
      ];
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(position, 3)
      );
      // index
      geometry.index = new THREE.Uint16BufferAttribute([0, 1, 2, 3, 2, 1], 1);
      this._buffers[index] = geometry;
      this.status[index] = currentState;
    }
  }

  /**
   * 计算瓦片中心坐标
   * @param {*} r
   * @param {*} c
   * @returns
   */
  _getMapCenter(r, c) {
    const row = this.mapGrid.row;
    const column = this.mapGrid.column;
    const itemWidth = this.size.width / column;
    const itemHeight = this.size.height / row;
    const offset = this.offset(r, c, itemWidth, itemHeight);
    const normalizedOffset = {
      x: offset.x / itemWidth,
      y: -offset.y / itemHeight,
    };
    const center = this.center(r, c);
    return new THREE.Vector2(
      c + center.x + normalizedOffset.x,
      r + center.y + normalizedOffset.y
    );
  }

  /**
   * 屏幕坐标转 map 坐标
   * @param {*} point
   * @returns
   */
  _viewportToMap(point) {
    const row = this.mapGrid.row;
    const column = this.mapGrid.column;
    const itemWidth = this.size.width / column;
    const itemHeight = this.size.height / row;
    const center = new THREE.Vector2(
      this.mesh.position.x,
      this.mesh.position.y
    );
    const current = new THREE.Vector2(
      point.x - this.viewport.width / 2,
      this.viewport.height / 2 - point.y
    );
    current.sub(center);
    const currentInd = new THREE.Vector2(
      column / 2 +
        (current.x - this.mesh.material.uniforms.uOffsetX.value) / itemWidth,
      row / 2 -
        (current.y - this.mesh.material.uniforms.uOffsetY.value) / itemHeight
    );

    return currentInd;
  }

  /**
   * map 坐标转屏幕坐标
   * @param {*} point
   * @returns
   */
  _mapToViewport(point) {
    const row = this.mapGrid.row;
    const column = this.mapGrid.column;
    const itemWidth = this.size.width / column;
    const itemHeight = this.size.height / row;
    const center = new THREE.Vector2(
      this.mesh.position.x,
      this.mesh.position.y
    );
    const current = new THREE.Vector2(
      (point.x - column / 2) * itemWidth +
        this.mesh.material.uniforms.uOffsetX.value,
      (row / 2 - point.y) * itemHeight +
        this.mesh.material.uniforms.uOffsetY.value
    ).add(center);
    return new THREE.Vector2(
      current.x + this.viewport.width / 2,
      this.viewport.height / 2 - current.y
    );
  }

  /**
   * 全部更新
   * @param {[0, 1, 0, 0...]} status 状态数组
   */
  updateAll(status) {
    const row = this.mapGrid.row;
    const column = this.mapGrid.column;
    for (let r = 0; r < row; r += 1) {
      for (let c = 0; c < column; c += 1) {
        const index = r * column + c;
        const currentState = this._getState(index, status);
        this._updateIndex(index, currentState);
      }
    }
    this.render();
  }

  /**
   * 局部网格更新
   * @param {row, column, state} grids
   */
  updateGrids(grids) {
    const column = this.mapGrid.column;
    for (let i = 0; i < grids.length; i++) {
      const grid = grids[i];
      const r = grid.row;
      const c = grid.column;
      const index = r * column + c;
      const currentState = grid.state != null ? grid.state : 0;
      this._updateIndex(index, currentState);
    }
    this.render();
  }

  // 销毁
  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.texture.dispose();
    this.mesh.removeFromParent();
    this.status = [];
    this._buffers = [];
    this._shapes = [];
    this._kdTree = null;
  }

  /**
   * 触摸拾取
   * @param {x, y} point
   * @returns
   */
  touchCast(point) {
    const row = this.mapGrid.row;
    const column = this.mapGrid.column;
    const currentInd = this._viewportToMap(point);
    // 没有自定义偏移函数时，触摸拾取比较简单
    if (this._shapes.length <= 0) {
      if (
        currentInd.x < 0 ||
        currentInd.x >= column ||
        currentInd.y < 0 ||
        currentInd.y >= row
      ) {
        return null;
      } else {
        const targetRow = parseInt(currentInd.y);
        const targetColumn = parseInt(currentInd.x);
        return {
          row: targetRow,
          column: targetColumn,
          center: this._mapToViewport(
            this._getMapCenter(targetRow, targetColumn)
          ),
        };
      }
    } else {
      const targets = [];
      // 先暴力穷举（后续进行空间划分优化）
      // for (let i = 0; i < this._shapes.length; i++) {
      //   const shape = this._shapes[i];
      //   if (
      //     this._pointInPolygonNested([currentInd.x, currentInd.y], shape.points)
      //   ) {
      //     targets.push(shape);
      //   }
      // }
      this._kdTreeCast(
        [currentInd.x, currentInd.y],
        this._kdTree.tree,
        targets
      );
      targets.sort(function (a, b) {
        return b.zIndex - a.zIndex;
      });
      if (targets.length <= 0) {
        return null;
      } else {
        const targetIndex = targets[0].index;
        const targetRow = parseInt(targetIndex / column);
        const targetColumn = targetIndex % column;
        return {
          row: targetRow,
          column: targetColumn,
          center: this._mapToViewport(
            this._getMapCenter(targetRow, targetColumn)
          ),
        };
      }
    }
  }

  // 渲染
  render() {
    let geometry;
    if (this._shapes.length <= 0) {
      geometry = BufferGeometryUtils.mergeBufferGeometries(this._buffers);
    } else {
      // 存在自定义偏移函数，可能相互覆盖，需要先按层级排序，层级低的先绘制，否则会遮挡区域空白的情况
      const sorted = [];
      for (let i = 0; i < this._buffers.length; i++) {
        sorted.push(this._buffers[i]);
      }
      sorted.sort(function (a, b) {
        return b.attributes.position.array[2] - a.attributes.position.array[2];
      });
      geometry = BufferGeometryUtils.mergeBufferGeometries(sorted);
    }

    if (!this.mesh) {
      // 偏移居中
      const itemWidth = this.size.width / this.mapGrid.column;
      const itemHeight = this.size.height / this.mapGrid.row;
      const lastColumn = this.mapGrid.column - 1;
      const lastRow = this.mapGrid.row - 1;
      const lastOffset = this.offset(
        lastRow,
        lastColumn,
        itemWidth,
        itemHeight
      );
      const material = new THREE.RawShaderMaterial({
        uniforms: {
          uSampler: {
            type: "t",
            value: this.texture,
          },
          uWidth: { value: this.viewport.width / 2 },
          uHeight: { value: this.viewport.height / 2 },
          uOffsetX: { value: -lastOffset.x / 2 },
          uOffsetY: { value: -lastOffset.y / 2 },
        },
        vertexShader: `
            uniform mat4 modelMatrix; // three.js 模型矩阵
            uniform float uWidth;
            uniform float uHeight;
            uniform float uOffsetX; // 居中偏移
            uniform float uOffsetY;
            attribute vec4 position;
            attribute vec2 texCoord; // 纹理坐标

            // attribute mat4 matrix; // 变换矩阵
            attribute vec4 mat_0;
            attribute vec4 mat_1;
            attribute vec4 mat_2;
            attribute vec4 mat_3;
            
            varying vec2 vTexCoord;
            void main() {
              mat4 matrix = mat4(
                mat_0.x, mat_0.y, mat_0.z, mat_0.w,
                mat_1.x, mat_1.y, mat_1.z, mat_1.w,
                mat_2.x, mat_2.y, mat_2.z, mat_2.w,
                mat_3.x, mat_3.y, mat_3.z, mat_3.w);
              // 格式化模型矩阵
              mat4 normalizedMat = mat4(modelMatrix[0][0], modelMatrix[0][1], modelMatrix[0][2], modelMatrix[0][3],
                modelMatrix[1][0], modelMatrix[1][1], modelMatrix[1][2], modelMatrix[1][3],
                modelMatrix[2][0], modelMatrix[2][1], modelMatrix[2][2], modelMatrix[2][3],
                (modelMatrix[3][0] + uOffsetX) / uWidth, (modelMatrix[3][1] + uOffsetY) / uHeight, modelMatrix[3][2], modelMatrix[3][3]);
              gl_Position = matrix * normalizedMat * position;
              vTexCoord = texCoord;
            }
        `,
        fragmentShader: `
            precision mediump float;
            varying vec2 vTexCoord;
            uniform sampler2D uSampler; // 纹理取样器
            void main() {
              vec4 color = texture2D(uSampler, vTexCoord);
              gl_FragColor = color;
            }
        `,
        transparent: true,
      });
      this.mesh = new THREE.Mesh(geometry, material);
    } else {
      // this.mesh.geometry.copy(geometry);
      this.mesh.geometry.setIndex(geometry.index.clone());
      const attributeKeys = Object.keys(geometry.attributes);
      for (let i = 0; i < attributeKeys.length; i += 1) {
        const attributeName = attributeKeys[i];
        this.mesh.geometry.setAttribute(
          attributeName,
          geometry.attributes[attributeName].clone()
        );
      }
    }
  }
}

export { TileMap };
