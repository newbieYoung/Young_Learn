function linkedNext(mapsLine, current, helper) {
    var exist = false;
    var currentPoint = mapsLine[current];
    var curNext = currentPoint.next;
    var curNextLen = curNext.length;
    for (var i = 0; i < curNextLen; i++) {
        if (curNext[i] === helper) {
            exist = true;
            break;
        }
    }
    if (!exist) {
        curNext.push(helper);
        mapsLine[helper].next.push(current);
    }
}
function getLineLen(start, index, maxLen) {
    var newIndex = index - start;
    if (newIndex < 0) {
        newIndex += maxLen;
    }
    return newIndex === 0 ? 0 : maxLen - newIndex;
}
function pointInPolygonNested(point, vs) {
    var x = point.x, y = point.y;
    var inside = false;
    var len = vs.length;
    for (var i = 0, j = len - 1; i < len; j = i++) {
        var xi = vs[i].x, yi = vs[i].y;
        var xj = vs[j].x, yj = vs[j].y;
        var intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersect)
            inside = !inside;
    }
    return inside;
}
function pairing(k1, k2) {
    return 0.5 * (k1 + k2) * (k1 + k2 + 1) + k2;
}
function cacheTrapezium(cache, trap) {
    var leftKey = pairing(trap.left[0], trap.left[1]);
    var rightKey = pairing(trap.right[0], trap.right[1]);
    cache.left[leftKey] = trap;
    cache.right[rightKey] = trap;
}
function getTrapeziumByLeft(cache, left0, left1) {
    return cache.left[pairing(left0, left1)];
}
function getTrapeziumByRight(cache, right0, right1) {
    return cache.right[pairing(right0, right1)];
}
function area(p, q, r) {
    return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
}
function appendTrapezium(end, target) {
    end.next = target;
    target.prev = end;
    target.next = undefined;
    return target;
}
function removeTrapezium(end, target) {
    var next = target.next;
    var prev = target.prev;
    prev.next = next;
    if (next) {
        next.prev = prev;
    }
    // target.next = undefined;
    // target.prev = undefined;
    if (end === target) {
        return prev;
    }
    else {
        return end;
    }
}
function decomposition(polygon, direction, sortedIndex, mapsLine) {
    var trapHead = {
        helper: -1,
        left: [],
        right: []
    };
    var trapEnd = trapHead;
    var points = polygon.points; // 逆时针
    var pointsLen = sortedIndex.length;
    var cache = { left: {}, right: {} };
    var doneIndex = [];
    for (var i = 0; i < pointsLen; i++) {
        var curIndex = direction === 1 ? sortedIndex[i] : sortedIndex[pointsLen - 1 - i];
        var nextIndex = (curIndex + 1) % pointsLen;
        var prevIndex = (curIndex + pointsLen - 1) % pointsLen;
        var curPointY = points[curIndex].y * direction;
        // 处理相等的情况
        var prevPointY = points[prevIndex].y * direction;
        if (prevPointY - curPointY === 0) {
            prevPointY += (doneIndex[prevIndex] || -1) * 0.001;
        }
        var nextPointY = points[nextIndex].y * direction;
        if (nextPointY - curPointY === 0) {
            nextPointY += (doneIndex[nextIndex] || -1) * 0.001;
        }
        doneIndex[curIndex] = 1;
        // 事件处理
        if (curPointY > prevPointY && curPointY > nextPointY) {
            var exist = false;
            var trap = trapEnd; // 倒序查找效率高
            // 分裂
            while (trap.helper !== -1) {
                var vs = [points[trap.left[0]], points[trap.left[1]], points[trap.right[0]], points[trap.right[1]]];
                if (pointInPolygonNested(points[curIndex], vs)) {
                    linkedNext(mapsLine, curIndex, trap.helper);
                    var newTrap = {
                        helper: curIndex,
                        left: [curIndex, nextIndex],
                        right: [trap.right[0], trap.right[1]]
                    };
                    trapEnd = appendTrapezium(trapEnd, newTrap);
                    trap.helper = curIndex;
                    trap.right[0] = prevIndex;
                    trap.right[1] = curIndex;
                    cacheTrapezium(cache, newTrap);
                    cacheTrapezium(cache, trap);
                    exist = true;
                    break;
                }
                trap = trap.prev;
            }
            if (!exist) {
                // 开始
                var newTrap = {
                    helper: curIndex,
                    left: [curIndex, nextIndex],
                    right: [prevIndex, curIndex]
                };
                trapEnd = appendTrapezium(trapEnd, newTrap);
                cacheTrapezium(cache, newTrap);
            }
        }
        else if (curPointY < prevPointY && curPointY < nextPointY) {
            var union1 = getTrapeziumByRight(cache, curIndex, nextIndex);
            var union2 = getTrapeziumByLeft(cache, prevIndex, curIndex);
            if (union2) {
                if (union1) {
                    // 合并
                    union1.helper = curIndex;
                    union1.right[0] = union2.right[0];
                    union1.right[1] = union2.right[1];
                    cacheTrapezium(cache, union1);
                }
                trapEnd = removeTrapezium(trapEnd, union2);
            }
        }
        else if (curPointY < prevPointY && curPointY > nextPointY) {
            // 左边界
            var trap = getTrapeziumByLeft(cache, prevIndex, curIndex);
            trap.helper = curIndex;
            trap.left[0] = curIndex;
            trap.left[1] = nextIndex;
            cacheTrapezium(cache, trap);
        }
        else if (curPointY > prevPointY && curPointY < nextPointY) {
            // 右边界
            var trap = getTrapeziumByRight(cache, curIndex, nextIndex);
            trap.helper = curIndex;
            trap.right[0] = prevIndex;
            trap.right[1] = curIndex;
            cacheTrapezium(cache, trap);
        }
    }
}
function sortMonotone(polygon, points) {
    var start = 1;
    var end = polygon.length - 1;
    var newPolygon = [polygon[0]];
    while (start !== end) {
        var startIndex = polygon[start];
        var endIndex = polygon[end];
        if (points[startIndex].y >= points[endIndex].y) {
            newPolygon.push(startIndex);
            start += 1;
        }
        else {
            newPolygon.push(endIndex);
            end -= 1;
        }
    }
    newPolygon.push(polygon[end]);
    return newPolygon;
}
function triangulateMonotone(polygon, sortedIndex, mapsLine, triangles) {
    var points = polygon.points;
    var pointsLen = points.length;
    var currentLen = pointsLen;
    var monotoneItem = [];
    var doneIndex = [];
    var head = 0;
    var headIndex = sortedIndex[head];
    var line = mapsLine[headIndex];
    while (currentLen >= 0) {
        monotoneItem.push(line.index);
        var startIndex = monotoneItem[0];
        if (line.next.length === 1) {
            doneIndex[line.index] = 1;
            if (line.index === headIndex) {
                head += 1;
                headIndex = sortedIndex[head];
            }
            currentLen -= 1;
            line = mapsLine[line.next[0]];
        }
        else {
            // 选取离起始点最近的点
            var prevIndex = monotoneItem[monotoneItem.length - 2];
            var nextLen = line.next.length;
            var minLenIndex = 0;
            var minLen = getLineLen(startIndex, line.next[0], pointsLen);
            for (var i = 1; i < nextLen; i++) {
                var itemIndex = line.next[i];
                var itemLen = getLineLen(startIndex, itemIndex, pointsLen);
                if (itemLen < minLen && (prevIndex !== itemIndex || (prevIndex === itemIndex && prevIndex === startIndex && monotoneItem.length >= 3))) {
                    minLenIndex = i;
                    minLen = itemLen;
                }
            }
            line = mapsLine[line.next.splice(minLenIndex, 1)[0]];
        }
        if (monotoneItem.length > 0 && startIndex === line.index) {
            var monotone = sortMonotone(monotoneItem, points);
            if (monotone.length > 3) {
                monotonePolygon(monotone, points, triangles);
            }
            else if (monotone.length === 3) {
                triangles.push(monotone[0], monotone[1], monotone[2]);
            }
            for (var i = head; i < pointsLen; i++) {
                headIndex = sortedIndex[i];
                if (!doneIndex[headIndex]) {
                    head = i;
                    break;
                }
            }
            line = mapsLine[headIndex];
            monotoneItem = [];
        }
    }
}
function monotonePolygon(polygon, points, triangles) {
    var stack = [polygon[0], polygon[1]];
    var pointsLen = points.length;
    var polygonLen = polygon.length;
    // 多边形顶点重置为 0，方便后续判断左右
    var polygonStart = polygon[0];
    var polygonSecond = polygon[1] - polygonStart;
    if (polygonSecond < 0) {
        polygonSecond += pointsLen;
    }
    var polygonEnd = polygon[polygonLen - 1] - polygonStart;
    if (polygonEnd < 0) {
        polygonEnd += pointsLen;
    }
    var isLeft = polygonSecond < polygonEnd ? true : false; // 初始左右判断
    for (var i = 2; i < polygonLen; i++) {
        var stackLastIndex = stack.length - 1;
        var curIndex = polygon[i];
        // 左右判断
        var polygonCur = curIndex - polygonStart;
        if (polygonCur < 0) {
            polygonCur += pointsLen;
        }
        var curIsLeft = polygonCur < polygonEnd ? true : false;
        // 异侧
        if (curIsLeft !== isLeft) {
            for (var j = 0; j < stackLastIndex; j++) {
                triangles.push(stack[stackLastIndex - j - 1], stack[stackLastIndex - j], curIndex);
            }
            isLeft = !isLeft;
            var stackEnd = stack[stackLastIndex];
            stack = [];
            stack.push(stackEnd, curIndex);
        }
        else {
            // 同侧
            var count = 0;
            var isConvex = false;
            do {
                isConvex = false;
                var curCount = stackLastIndex - count + 1;
                var first = stack[curCount - 1];
                var second = stack[curCount - 2];
                var pSecond = points[second];
                var pFirst = points[first];
                var pCurrent = points[curIndex];
                var vec1 = { x: pFirst.x - pSecond.x, y: pFirst.y - pSecond.y };
                var vec2 = { x: pCurrent.x - pFirst.x, y: pCurrent.y - pFirst.y };
                var result1 = vec1.x * vec2.y - vec2.x * vec1.y;
                var result2 = vec1.x * vec2.x;
                if ((isLeft && result1 > 0) || (!isLeft && result1 < 0) || (result1 === 0 && result2 <= 0)) {
                    triangles.push(second, first, curIndex);
                    isConvex = true;
                    count += 1;
                }
            } while ((stack.length - count) > 1 && isConvex);
            stack.length = stackLastIndex + 1 - count;
            stack.push(curIndex);
        }
    }
}
function triangulate(polygon) {
    var triangles = [];
    var points = polygon.points; // 逆时针
    var pointsLen = points.length;
    // 排序
    var mapsLine = [];
    var sortedIndex = [];
    for (var i = 0; i < pointsLen; i++) {
        mapsLine.push({
            index: i,
            next: [(i + 1) % pointsLen]
        });
        sortedIndex.push(i);
    }
    sortedIndex.sort(function (a, b) {
        return points[b].y - points[a].y; // 按 y 轴倒序
    });
    // 拆分单调多边形
    decomposition(polygon, 1, sortedIndex, mapsLine);
    decomposition(polygon, -1, sortedIndex, mapsLine);
    // 三角划分
    triangulateMonotone(polygon, sortedIndex, mapsLine, triangles);
    return triangles;
}
