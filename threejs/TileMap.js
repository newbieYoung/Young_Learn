import * as THREE from "../node_modules/three/build/three.module.js";
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
        return -1.0 / (this._gridToIndex(r, c) + 2);
      };
    this.zIndexNeedsUpdate = true;

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
    this.matrices = [];
    this.mixedList = [];

    this._buffers = []; // bufferGeometry 缓存
    this._sortedBuffersIndex = []; // _buffers 按 zIndex 排序序号
    this._batchUpdateIndex = []; // 待更新序号
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
      const { r, c } = this._indexToGrid(i);
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
        const { r, c } = this._indexToGrid(index);
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

  _getMatrix(index, matrices) {
    return matrices && matrices[index] != null
      ? matrices[index]
      : new THREE.Matrix4();
  }

  _getMixed(index, mixedList) {
    return mixedList && mixedList[index] != null
      ? mixedList[index]
      : { state: -1, percent: 0 };
  }

  _indexToGrid(index) {
    const column = this.mapGrid.column;
    return {
      c: index % column,
      r: parseInt(index / column),
    };
  }

  _gridToIndex(r, c) {
    const column = this.mapGrid.column;
    return r * column + c;
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
   * @param {*} curMatrix
   * @param {*} curMixed
   */
  _updateIndex(index, state, curMatrix, curMixed) {
    const row = this.mapGrid.row;
    const column = this.mapGrid.column;
    const viewWidth = this.viewport.width;
    const viewHeight = this.viewport.height;
    const itemWidth = this.size.width / column;
    const itemHeight = this.size.height / row;
    const scaleX = itemWidth / viewWidth;
    const scaleY = itemHeight / viewHeight;

    const { r, c } = this._indexToGrid(index);
    const currentState = state != null ? state : 0;
    const currentMatrix =
      curMatrix != null ? curMatrix.clone() : new THREE.Matrix4();
    const currentMixed =
      curMixed != null
        ? {
            state: curMixed.state,
            percent: curMixed.percent,
          }
        : { state: -1, percent: 0 };
    const originState = this._getState(index, this.status);
    const originMatrix = this._getMatrix(index, this.matrices);
    const originMixed = this._getMixed(index, this.mixedList);
    // 每次状态更新都重新生成 geometry，后续可以优化更新变化的值
    // 此外每个 geometry 有不少相同的数据，后续可以优化共用
    if (
      originState != currentState ||
      !currentMatrix.equals(originMatrix) ||
      currentMixed.state != originMixed.state ||
      currentMixed.percent != originMixed.percent ||
      !this._buffers[index]
    ) {
      const lastColumn = column - 1;
      const lastRow = row - 1;
      const lastOffset = this.offset(
        lastRow,
        lastColumn,
        itemWidth,
        itemHeight
      );

      const meshMat = new THREE.Matrix4();
      if (this.mesh) {
        this.mesh.updateMatrixWorld();
        meshMat.copy(this.mesh.matrixWorld);
      }
      const meshTrans = this._splitMatrix(meshMat);

      const geometry = {};
      // 状态混合
      // mixed uv
      geometry.mixedCoord = this.uvs[currentMixed.state]
        ? this.uvs[currentMixed.state]
        : [-1, -1, -1, -1, -1, -1, -1, -1];
      // mixed opacity
      const ops = [1 - currentMixed.percent, currentMixed.percent];
      geometry.mixedOpacity = [
        ops[0],
        ops[1],
        ops[0],
        ops[1],
        ops[0],
        ops[1],
        ops[0],
        ops[1],
      ];
      // uv
      geometry.texCoord = this.uvs[currentState]
        ? this.uvs[currentState]
        : [-1, -1, -1, -1, -1, -1, -1, -1];
      // matrix
      const transform = this._splitMatrix(currentMatrix);
      const offset = this.offset(r, c, itemWidth, itemHeight);
      const translation = new THREE.Vector3(
        -((column - 1) / 2 - c) * itemWidth + offset.x,
        ((row - 1) / 2 - r) * itemHeight + offset.y,
        0
      );
      const mat4 = new THREE.Matrix4()
        .makeTranslation(-lastOffset.x / 2, -lastOffset.y / 2, 0) // 考虑下居中偏移
        .multiply(
          new THREE.Matrix4().makeScale(
            1 / meshTrans.scale.x,
            1 / meshTrans.scale.y,
            1
          )
        )
        .multiply(currentMatrix) // 暂时不更新顶点坐标以及 KdTree ！！！
        .multiply(
          new THREE.Matrix4().makeTranslation(
            (translation.x / transform.scale.x) * meshTrans.scale.x,
            (translation.y / transform.scale.y) * meshTrans.scale.y,
            translation.z
          )
        )
        .multiply(
          new THREE.Matrix4().makeScale(meshTrans.scale.x, meshTrans.scale.y, 1)
        )
        .multiply(
          new THREE.Matrix4().makeTranslation(
            lastOffset.x / 2,
            lastOffset.y / 2,
            0
          )
        );
      mat4.elements[12] +=
        (-meshTrans.position.x * (transform.scale.x - 1)) / meshTrans.scale.x;
      mat4.elements[13] +=
        (-meshTrans.position.y * (transform.scale.y - 1)) / meshTrans.scale.y;
      mat4.elements[12] /= viewWidth / 2;
      mat4.elements[13] /= viewHeight / 2;
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
        geometry[`mat_${i}`] = matrix[i];
      }
      // position
      const zIndex = this.zIndex(r, c);
      geometry.position = [
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
      // index
      geometry.index = [0, 1, 2, 3, 2, 1];
      this._buffers[index] = geometry;
      this.status[index] = currentState;
      this.matrices[index] = currentMatrix;
      this.mixedList[index] = currentMixed;
      this._batchUpdateIndex.push(index); // 加入待更新列表
    }
  }

  /**
   * 计算瓦片中心坐标
   * @param {*} r
   * @param {*} c
   * @returns
   */
  _getMapCenter(r, c) {
    const leftTop = this._getMapLeftTop(r, c);
    const center = this.center(r, c);
    return new THREE.Vector2(leftTop.x + center.x, leftTop.y + center.y);
  }

  /**
   * 拆解矩阵
   */
  _splitMatrix(matrix) {
    const mProps = matrix.elements;
    let scaleX = Math.sqrt(Math.pow(mProps[0], 2) + Math.pow(mProps[1], 2));
    let scaleY = Math.sqrt(Math.pow(mProps[4], 2) + Math.pow(mProps[5], 2));
    let rotate = Math.asin(mProps[1] / scaleX);
    // 拆解矩阵，判断缩放正负
    if (
      (mProps[0] * mProps[1] > 0 &&
        (rotate % Math.PI < 0 || rotate % Math.PI > Math.PI / 2)) ||
      (mProps[0] * mProps[1] < 0 &&
        rotate > 0 &&
        (rotate % Math.PI < Math.PI / 2 || rotate % Math.PI > Math.PI))
    ) {
      scaleX *= -1;
    }
    if (mProps[0] * mProps[1] === 0 && scaleX !== 0) {
      if (Math.sin(rotate % Math.PI) === 0) {
        scaleX = mProps[0] / Math.cos(rotate);
      } else if (Math.sin(Math.PI - (rotate % Math.PI)) === 1) {
        scaleX = mProps[1] / Math.sin(rotate);
      }
    }
    rotate = Math.asin(mProps[1] / scaleX);
    scaleY = mProps[5] / Math.cos(rotate);
    const posX = mProps[12];
    const posY = mProps[13];

    return {
      scale: new THREE.Vector3(scaleX, scaleY, 1),
      position: new THREE.Vector3(posX, posY, 0),
      rotate: rotate,
    };
  }

  /**
   * 计算瓦片左上坐标
   * @param {*} r
   * @param {*} c
   * @returns
   */
  _getMapLeftTop(r, c) {
    const row = this.mapGrid.row;
    const column = this.mapGrid.column;
    const itemWidth = this.size.width / column;
    const itemHeight = this.size.height / row;
    const offset = this.offset(r, c, itemWidth, itemHeight);
    const normalizedOffset = {
      x: offset.x / itemWidth,
      y: -offset.y / itemHeight,
    };
    return new THREE.Vector2(c + normalizedOffset.x, r + normalizedOffset.y);
  }

  /**
   * 屏幕坐标转 map 坐标
   * @param {*} point
   * @returns
   */
  _viewportToMap(point) {
    // this.mesh.updateWorldMatrix(false, false);
    this.mesh.updateMatrixWorld();
    const { scale, position } = this._splitMatrix(this.mesh.matrixWorld);
    const row = this.mapGrid.row;
    const column = this.mapGrid.column;
    const itemWidth = (this.size.width * scale.x) / column;
    const itemHeight = (this.size.height * scale.y) / row;
    const center = new THREE.Vector2(position.x, position.y);
    const current = new THREE.Vector2(
      point.x - this.viewport.width / 2,
      this.viewport.height / 2 - point.y
    );
    const lastColumn = this.mapGrid.column - 1;
    const lastRow = this.mapGrid.row - 1;
    const lastOffset = this.offset(lastRow, lastColumn, itemWidth, itemHeight);
    current.sub(center);
    const currentInd = new THREE.Vector2(
      column / 2 + (current.x + lastOffset.x / 2) / itemWidth,
      row / 2 - (current.y + lastOffset.y / 2) / itemHeight
    );

    return currentInd;
  }

  /**
   * map 坐标转屏幕坐标
   * @param {*} point
   * @returns
   */
  _mapToViewport(point) {
    this.mesh.updateMatrixWorld();
    const { scale, position } = this._splitMatrix(this.mesh.matrixWorld);
    const row = this.mapGrid.row;
    const column = this.mapGrid.column;
    const itemWidth = (this.size.width * scale.x) / column;
    const itemHeight = (this.size.height * scale.y) / row;
    const center = new THREE.Vector2(position.x, position.y);
    const lastColumn = this.mapGrid.column - 1;
    const lastRow = this.mapGrid.row - 1;
    const lastOffset = this.offset(lastRow, lastColumn, itemWidth, itemHeight);
    const current = new THREE.Vector2(
      (point.x - column / 2) * itemWidth - lastOffset.x / 2,
      (row / 2 - point.y) * itemHeight - lastOffset.y / 2
    ).add(center);
    return new THREE.Vector2(
      current.x + this.viewport.width / 2,
      this.viewport.height / 2 - current.y
    );
  }

  /**
   * 计算瓦片四个顶点屏幕坐标
   * @param {*} r
   * @param {*} c
   * @returns
   */
  getRectViewportPoints(r, c) {
    const leftTop = this._getMapLeftTop(r, c);
    const rightTop = new THREE.Vector2(leftTop.x + 1, leftTop.y);
    const rightBottom = new THREE.Vector2(leftTop.x + 1, leftTop.y + 1);
    const leftBottom = new THREE.Vector2(leftTop.x, leftTop.y + 1);
    return [
      this._mapToViewport(leftTop),
      this._mapToViewport(rightTop),
      this._mapToViewport(rightBottom),
      this._mapToViewport(leftBottom),
    ];
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
        const index = this._gridToIndex(r, c);
        const curState = this._getState(index, status);
        const curMatrix = this._getMatrix(index);
        const curMixed = this._getMixed(index);
        this._updateIndex(index, curState, curMatrix, curMixed);
      }
    }
    this.render();
  }

  /**
   * 局部网格更新
   * @param {row, column, state, matrix, mixed} grids
   */
  updateGrids(grids) {
    this.prepareGrids(grids);
    this.render();
  }
  prepareGrids(grids) {
    for (let i = 0; i < grids.length; i++) {
      const grid = grids[i];
      const r = grid.row;
      const c = grid.column;
      const index = this._gridToIndex(r, c);
      const curState = grid.state != null ? grid.state : 0;
      const curMatrix = grid.matrix != null ? grid.matrix : new THREE.Matrix4();
      const curMixed =
        grid.mixed != null ? grid.mixed : { state: -1, percent: 0 };
      this._updateIndex(index, curState, curMatrix, curMixed);
    }
  }

  // 销毁
  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.texture.dispose();
    this.mesh.removeFromParent();
    this.status = [];
    this.matrices = [];
    this.mixedList = [];
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
        const { r, c } = this._indexToGrid(targets[0].index);
        return {
          row: r,
          column: c,
          center: this._mapToViewport(this._getMapCenter(r, c)),
        };
      }
    }
  }

  // 渲染
  render() {
    // 存在自定义偏移函数，可能相互覆盖，需要先按层级排序，层级低的先绘制，否则会遮挡区域空白的情况
    const self = this;
    if (this.zIndexNeedsUpdate) {
      this._sortedBuffersIndex = [];
      for (let i = 0; i < this._buffers.length; i++) {
        this._sortedBuffersIndex.push(i);
      }
      this._sortedBuffersIndex.sort(function (a, b) {
        return self._buffers[b].position[2] - self._buffers[a].position[2];
      });
      this.zIndexNeedsUpdate = false;
    }
    const sorted = [];
    for (let i = 0; i < this._sortedBuffersIndex.length; i++) {
      sorted.push(this._buffers[this._sortedBuffersIndex[i]]);
    }

    // Buffer
    let interleavedFloat32Buffer;
    let uInt16Buffer;
    let newBuffer = true;
    let strideLen = 2 + 2 + 2 + 4 * 4 + 3;
    if (this.mesh) {
      const attrPos = this.mesh.geometry.attributes.position;
      if (
        attrPos &&
        attrPos.data.array &&
        attrPos.data.array.length >= sorted.length * 4 * strideLen
      ) {
        interleavedFloat32Buffer = attrPos.data.array;
        uInt16Buffer = this.mesh.geometry.index.array;
        newBuffer = false;
      }
    }
    if (newBuffer) {
      interleavedFloat32Buffer = new Float32Array(
        new ArrayBuffer(sorted.length * 4 * strideLen * 4)
      );
      uInt16Buffer = new Uint16Array(new ArrayBuffer(sorted.length * 6 * 2));
    }

    var float32List = [
      { key: "mixedCoord", len: 2, offset: 0 },
      { key: "mixedOpacity", len: 2, offset: 2 },
      { key: "texCoord", len: 2, offset: 4 },
      { key: "mat_0", len: 4, offset: 6 },
      { key: "mat_1", len: 4, offset: 10 },
      { key: "mat_2", len: 4, offset: 14 },
      { key: "mat_3", len: 4, offset: 18 },
      { key: "position", len: 3, offset: 22 },
    ];

    const indexList = [0, 1, 2, 3, 2, 1];
    for (let i = 0; i < sorted.length; i++) {
      // 仅更新需要更新的
      if (
        this._batchUpdateIndex.length <= 0 ||
        this._batchUpdateIndex.includes(this._sortedBuffersIndex[i])
      ) {
        const sortedItem = sorted[i];
        for (let j = 0; j < 4; j += 1) {
          for (let z = 0; z < float32List.length; z++) {
            const floatItem = float32List[z];
            for (let k = 0; k < floatItem.len; k++) {
              interleavedFloat32Buffer[
                strideLen * 4 * i + strideLen * j + k + floatItem.offset
              ] = sortedItem[floatItem.key][floatItem.len * j + k];
            }
          }
        }
        for (let j = 0; j < indexList.length; j += 1) {
          uInt16Buffer[6 * i + j] = i * 4 + indexList[j];
        }
      }
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

            // attribute mat4 matrix; // 变换矩阵
            attribute vec4 mat_0;
            attribute vec4 mat_1;
            attribute vec4 mat_2;
            attribute vec4 mat_3;
            
            attribute vec2 texCoord; // 纹理坐标
            attribute vec2 mixedCoord; // 混合纹理
            attribute vec2 mixedOpacity;
            varying vec2 vTexCoord;
            varying vec2 vMixedCoord;
            varying vec2 vMixedOpacity;

            void main() {
              // tilemap scale
              // 模拟缩放 viewport，避免重新生成 geometry
              float scaleX = modelMatrix[0][0];
              float scaleY = modelMatrix[1][1];
              float width = uWidth / scaleX;
              float height = uHeight / scaleY;
              vec4 pos = vec4(position.x * scaleX, position.y * scaleY, position.z, position.w);
              
              mat4 matrix = mat4(
                mat_0.x, mat_0.y, mat_0.z, mat_0.w,
                mat_1.x, mat_1.y, mat_1.z, mat_1.w,
                mat_2.x, mat_2.y, mat_2.z, mat_2.w,
                mat_3.x * scaleX, mat_3.y * scaleY, mat_3.z, mat_3.w);
              
              // 格式化模型矩阵
              mat4 normalizedMat = mat4(1.0, modelMatrix[0][1], modelMatrix[0][2], modelMatrix[0][3],
                modelMatrix[1][0], 1.0, modelMatrix[1][2], modelMatrix[1][3],
                modelMatrix[2][0], modelMatrix[2][1], modelMatrix[2][2], modelMatrix[2][3],
                (modelMatrix[3][0] / scaleX + uOffsetX) / width, (modelMatrix[3][1] / scaleY + uOffsetY) / height, modelMatrix[3][2], modelMatrix[3][3]);
              
              gl_Position = matrix * normalizedMat * pos;

              vTexCoord = texCoord;
              vMixedCoord = mixedCoord;
              vMixedOpacity = mixedOpacity;
            }
        `,
        fragmentShader: `
            precision mediump float;
            varying vec2 vTexCoord;
            varying vec2 vMixedCoord;
            varying vec2 vMixedOpacity;
            uniform sampler2D uSampler; // 纹理取样器

            vec4 realColor(float flag, vec4 color){
              vec4 newColor = vec4(1.0, 1.0, 1.0, 1.0);
              newColor.r = flag * color.r + 1.0 * (1.0 - flag);
              newColor.g = flag * color.g + 1.0 * (1.0 - flag);
              newColor.b = flag * color.b + 1.0 * (1.0 - flag);
              newColor.a = color.a;
              return newColor;
            }

            void main() {
              float vStep = step(0.0, vTexCoord.x);
              vec4 color = realColor(vStep, texture2D(uSampler, vTexCoord));
              float mStep = step(0.0, vMixedCoord.x);
              vec4 mixedColor = realColor(mStep, texture2D(uSampler, vMixedCoord));
              gl_FragColor = color * vMixedOpacity.x + mixedColor * vMixedOpacity.y;
            }
        `,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
    }

    var attributeItem;
    if (newBuffer) {
      var interleavedBuffer32 = new THREE.InterleavedBuffer(
        interleavedFloat32Buffer,
        strideLen
      );
      for (let i = 0; i < float32List.length; i += 1) {
        attributeItem = float32List[i];
        this.mesh.geometry.setAttribute(
          attributeItem.key,
          new THREE.InterleavedBufferAttribute(
            interleavedBuffer32,
            attributeItem.len,
            attributeItem.offset
          )
        );
        this.mesh.geometry.attributes[attributeItem.key].needsUpdate = true;
      }
      this.mesh.geometry.index = new THREE.Uint16BufferAttribute(
        uInt16Buffer,
        1
      );
      this.mesh.geometry.index.needsUpdate = true;
    } else {
      for (let i = 0; i < float32List.length; i += 1) {
        attributeItem = float32List[i];
        this.mesh.geometry.attributes[attributeItem.key].needsUpdate = true;
      }
    }

    this._batchUpdateIndex = []; // 待更新序号清空
  }
}

export { TileMap };
