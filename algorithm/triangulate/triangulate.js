function includes(array, num) {
    var len = array.length;
    for (var i = 0; i < len; i++) {
        if (array[i] == num) {
            return true;
        }
    }
    return false;
}
function pointInPolygonNested(point, vs, start, end) {
    var x = point.x, y = point.y;
    var inside = false;
    if (start === undefined)
        start = 0;
    if (end === undefined)
        end = vs.length;
    var len = end - start;
    for (var i = 0, j = len - 1; i < len; j = i++) {
        var xi = vs[i + start].x, yi = vs[i + start].y;
        var xj = vs[j + start].x, yj = vs[j + start].y;
        var intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersect)
            inside = !inside;
    }
    return inside;
}
function decomposition(divides, polygon, sortedIndex, direction) {
    var deComps = [];
    var points = polygon.points; // 逆时针
    var maxIndex = points.length - 1;
    var doneIndex = {};
    for (var i = 0; i <= maxIndex; i++) {
        var curIndex = direction == 1 ? sortedIndex[i] : sortedIndex[maxIndex - i];
        var nextIndex = curIndex + 1;
        if (nextIndex > maxIndex) {
            nextIndex = 0;
        }
        var prevIndex = curIndex - 1;
        if (prevIndex < 0) {
            prevIndex = maxIndex;
        }
        var curPointY = points[curIndex].y * direction;
        // 处理相等的情况
        var prevPointY = points[prevIndex].y * direction;
        if (prevPointY === curPointY) {
            if (doneIndex[prevIndex]) {
                prevPointY = points[prevIndex].y * direction + 0.001;
            }
            else {
                prevPointY = points[prevIndex].y * direction - 0.001;
            }
        }
        var nextPointY = points[nextIndex].y * direction;
        if (nextPointY === curPointY) {
            if (doneIndex[nextIndex]) {
                nextPointY = points[nextIndex].y * direction + 0.001;
            }
            else {
                nextPointY = points[nextIndex].y * direction - 0.001;
            }
        }
        doneIndex[curIndex] = 1;
        // 事件处理
        if (curPointY > prevPointY && curPointY > nextPointY) {
            var inner = false;
            for (var j = 0; j < deComps.length; j++) {
                var deCompItem = deComps[j];
                var vs = [points[deCompItem.left[0]], points[deCompItem.left[1]], points[deCompItem.right[0]], points[deCompItem.right[1]]];
                inner = pointInPolygonNested(points[curIndex], vs);
                if (inner) {
                    // 分裂
                    inner = true;
                    // 划分至少满足一个三角形
                    if (prevIndex != deCompItem.helper && nextIndex != deCompItem.helper) {
                        // 小序号排前，方便后续分解多边形
                        if (curIndex <= deCompItem.helper) {
                            divides.push([curIndex, deCompItem.helper]);
                        }
                        else {
                            divides.push([deCompItem.helper, curIndex]);
                        }
                        deComps.push({
                            helper: curIndex,
                            left: [curIndex, nextIndex],
                            right: deCompItem.right
                        });
                        deCompItem.helper = curIndex;
                        deCompItem.right = [prevIndex, curIndex];
                    }
                    else {
                        deCompItem.helper = curIndex;
                        deCompItem.left = [curIndex, nextIndex];
                    }
                    break;
                }
            }
            if (!inner) {
                // 开始
                deComps.push({
                    helper: curIndex,
                    left: [curIndex, nextIndex],
                    right: [prevIndex, curIndex]
                });
            }
        }
        else if (curPointY < prevPointY && curPointY < nextPointY) {
            var unions = [-1, -1];
            var dels = [];
            var deCompsLen = deComps.length;
            for (var j = 0; j < deCompsLen; j++) {
                var deCompItem = deComps[j];
                if (deCompItem.left[1] == deCompItem.right[0] && deCompItem.right[0] === curIndex) {
                    // 结束
                    dels.push(j);
                    break;
                }
                else if (unions[0] <= -1 && deCompItem.right[0] == curIndex) {
                    unions[0] = j;
                }
                else if (unions[1] <= -1 && deCompItem.left[1] == curIndex) {
                    unions[1] = j;
                }
                // 避免无效遍历
                if (unions[0] >= 0 && unions[1] >= 0) {
                    break;
                }
            }
            if (dels.length > 0) {
                deComps.splice(dels[0], 1);
            }
            else if (unions[0] >= 0 && unions[1] >= 0) {
                // 合并
                var comp1 = deComps[unions[0]];
                var comp2 = deComps[unions[1]];
                comp1.helper = curIndex;
                comp1.right = comp2.right;
                deComps.splice(unions[1], 1);
            }
        }
        else if (curPointY < prevPointY && curPointY > nextPointY) {
            // 左边界
            for (var j = 0; j < deComps.length; j++) {
                var deCompItem = deComps[j];
                if (includes(deCompItem.left, curIndex) && includes(deCompItem.left, prevIndex)) {
                    deCompItem.helper = curIndex;
                    deCompItem.left = [curIndex, nextIndex];
                    break;
                }
            }
        }
        else if (curPointY > prevPointY && curPointY < nextPointY) {
            // 右边界
            for (var j = 0; j < deComps.length; j++) {
                var deCompItem = deComps[j];
                if (includes(deCompItem.right, curIndex) && includes(deCompItem.right, nextIndex)) {
                    deCompItem.helper = curIndex;
                    deCompItem.right = [prevIndex, curIndex];
                    break;
                }
            }
        }
        // console.log(deComps);
    }
}
function splitMonotones(lines, polygon) {
    var target = polygon;
    var lastLine;
    var lastSplits = [];
    var polygons = [];
    var linesLen = lines.length;
    for (var i = 0; i < linesLen; i++) {
        var curLine = lines[i];
        // 去掉重复划分
        if (!lastLine || (curLine[0] !== lastLine[0] || curLine[1] !== lastLine[1])) {
            // 选取拆分目标
            if (lastSplits.length >= 2) {
                var polygon1 = lastSplits[0];
                var polygon2 = lastSplits[1];
                // 顶点多的那部分为待拆分目标
                if (polygon1.length != polygon2.length) {
                    if (polygon1.length > polygon2.length) {
                        target = polygon1;
                        polygons.push(polygon2);
                    }
                    else {
                        target = polygon2;
                        polygons.push(polygon1);
                    }
                }
                else {
                    if (polygon1.length < polygon2.length) {
                        // 优先遍历顶点少的那部分
                        if (includes(polygon1, curLine[0]) && includes(polygon1, curLine[1])) {
                            target = polygon1;
                            polygons.push(polygon2);
                        }
                        else {
                            target = polygon2;
                            polygons.push(polygon1);
                        }
                    }
                    else {
                        if (includes(polygon2, curLine[0]) && includes(polygon2, curLine[1])) {
                            target = polygon2;
                            polygons.push(polygon1);
                        }
                        else {
                            target = polygon1;
                            polygons.push(polygon2);
                        }
                    }
                }
            }
            lastLine = curLine;
            lastSplits = splitPolygon(target, curLine);
        }
    }
    if (lastSplits.length >= 2) {
        polygons.push(lastSplits[0]);
        polygons.push(lastSplits[1]);
    }
    if (polygons.length == 0) {
        polygons.push(polygon);
    }
    return polygons;
}
function splitPolygon(polygon, line) {
    var min = line[0];
    var max = line[1];
    var polygon1 = [];
    var polygon2 = [];
    var polygonLen = polygon.length;
    for (var i = 0; i < polygonLen; i++) {
        var item = polygon[i];
        if (item <= min || item >= max) {
            polygon2.push(item);
        }
        if (item >= min && item <= max) {
            polygon1.push(item);
        }
    }
    return [polygon1, polygon2];
}
function triangulate(polygon) {
    var points = polygon.points; // 逆时针
    var sortedIndex = [];
    for (var i = 0; i < points.length; i++) {
        sortedIndex.push(i);
    }
    // 排序
    sortedIndex.sort(function (a, b) {
        return points[b].y - points[a].y; // 按 y 轴倒序
    });
    // console.log(sortedIndex);
    // 单调多边形分解
    var lines = [];
    decomposition(lines, polygon, sortedIndex, 1);
    decomposition(lines, polygon, sortedIndex, -1);
    // 划分线排序，后续只需要继续拆分多的那边
    lines.sort(function (a, b) {
        return (a[1] - a[0]) - (b[1] - b[0]);
    });
    var monotones = splitMonotones(lines, sortedIndex);
    console.log(lines);
    console.log(monotones);
}
