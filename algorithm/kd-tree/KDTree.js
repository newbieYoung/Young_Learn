class KDTree {
  /**
   * [{
   *  index: 序号
   *  zIndex: 层级
   *  points: 点集
   * }]
   */
  constructor(polygons, index) {
    this.index = index;
    this.maxLen = Math.ceil(400 / polygons[0].points.length); // 暂定为每棵子树最多 400 个顶点，如果多边形为矩形，那么最多 100 个矩形
    this.tree = {
      polygons: polygons,
      left: null,
      right: null,
      parent: null,
    };
    this._split(this.tree, 0);
  }

  // 拆分
  _split(tree, depth) {
    const polygons = tree.polygons;
    tree.box = this._getBox(polygons, this.index);
    if (polygons.length > this.maxLen) {
      const center = Math.floor(polygons.length / 2);
      const index = depth % this.index;
      const self = this;
      polygons.sort(function (a, b) {
        const maxA = self._findMax(a.points, index);
        const maxB = self._findMax(b.points, index);
        return maxA - maxB;
      });
      const leftTree = {
        polygons: [],
        left: null,
        right: null,
        parent: tree,
      };
      const rightTree = {
        polygons: [],
        left: null,
        right: null,
        parent: tree,
      };
      for (let i = 0; i < polygons.length; i++) {
        if (i <= center) {
          leftTree.polygons.push(polygons[i]);
        } else {
          rightTree.polygons.push(polygons[i]);
        }
      }
      tree.left = leftTree;
      tree.right = rightTree;
      this._split(tree.left, depth + 1);
      this._split(tree.right, depth + 1);
    }
  }

  // 计算整体包围盒
  _getBox(polygons, index) {
    const box = []; // 2d [[minX, maxX],[minY, maxY]]
    const start = polygons[0].points;
    for (let i = 0; i < index; i++) {
      box.push([start[0][i], start[0][i]]);
    }
    for (let i = 0; i < polygons.length; i++) {
      const polygon = polygons[i].points;
      for (let j = 0; j < polygon.length; j++) {
        const point = polygon[j];
        for (let k = 0; k < index; k++) {
          if (point[k] < box[k][0]) {
            box[k][0] = point[k];
          }
          if (point[k] > box[k][1]) {
            box[k][1] = point[k];
          }
        }
      }
    }

    return box;
  }

  // 查找多边形顶点中 x、y、z 的最大值
  _findMax(points, index) {
    let max = points[0][index];
    for (let i = 1; i < points.length; i++) {
      if (points[i][index] > max) {
        max = points[i][index];
      }
    }
    return max;
  }

  // 查找多边形顶点中 x、y、z 的最小值
  _findMin(points, index) {
    let min = points[0][index];
    for (let i = 1; i < points.length; i++) {
      if (points[i][index] < min) {
        min = points[i][index];
      }
    }
    return min;
  }
}

export { KDTree };
