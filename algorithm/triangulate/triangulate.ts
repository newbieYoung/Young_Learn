interface Vector2 {
    x: number;
    y: number;
}
interface Polygon {
    points: Vector2[];
    // holes: Vector2[][]
}

interface Trapezium {
    helper: number;
    left: number[],
    right: number[],
    next?: Trapezium,
    prev?: Trapezium,
}

interface LinkedPoint {
    index: number;
    next: number[],
}

function linkedNext(mapsLine: LinkedPoint[], current: number, helper: number) {
    let exist = false;
    const currentPoint = mapsLine[current];
    const curNext = currentPoint.next;
    const curNextLen = curNext.length;
    for (let i = 0; i < curNextLen; i++) {
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

function getLineLen(start: number, index: number, maxLen: number) {
    let newIndex = index - start;
    if (newIndex < 0) {
        newIndex += maxLen;
    }
    return newIndex === 0 ? 0 : maxLen - newIndex;
}

function pointInPolygonNested(point: Vector2, vs: Vector2[]) {
    const x = point.x,
        y = point.y;
    let inside = false;
    const len = vs.length;
    for (let i = 0, j = len - 1; i < len; j = i++) {
        const xi = vs[i].x,
            yi = vs[i].y;
        const xj = vs[j].x,
            yj = vs[j].y;
        const intersect =
            yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
}

function pairing(k1: number, k2: number) {
    return 0.5 * (k1 + k2) * (k1 + k2 + 1) + k2;
}

function cacheTrapezium(cache: { left: Record<number, Trapezium>, right: Record<number, Trapezium> }, trap: Trapezium) {
    const leftKey = pairing(trap.left[0], trap.left[1]);
    const rightKey = pairing(trap.right[0], trap.right[1]);
    cache.left[leftKey] = trap;
    cache.right[rightKey] = trap;
}

function getTrapeziumByLeft(cache: { left: Record<number, Trapezium>, right: Record<number, Trapezium> }, left0: number, left1: number) {
    return cache.left[pairing(left0, left1)];
}

function getTrapeziumByRight(cache: { left: Record<number, Trapezium>, right: Record<number, Trapezium> }, right0: number, right1: number) {
    return cache.right[pairing(right0, right1)];
}

function area(p: Vector2, q: Vector2, r: Vector2) {
    return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
}

function appendTrapezium(end: Trapezium, target: Trapezium) {
    end.next = target;
    target.prev = end;
    target.next = undefined;
    return target;
}

function removeTrapezium(end: Trapezium, target: Trapezium) {
    const next = target.next;
    const prev = target.prev;
    prev.next = next;
    if (next) {
        next.prev = prev;
    }
    // target.next = undefined;
    // target.prev = undefined;
    if (end === target) {
        return prev;
    } else {
        return end;
    }
}

function decomposition(polygon: Polygon, direction: 1 | -1, sortedIndex: number[], mapsLine: LinkedPoint[]) {
    const trapHead: Trapezium = {
        helper: -1,
        left: [],
        right: [],
    };
    let trapEnd = trapHead;
    const points = polygon.points; // 逆时针
    const pointsLen = sortedIndex.length;
    const cache: { left: Record<number, Trapezium>, right: Record<number, Trapezium> } = { left: {}, right: {} };
    const doneIndex = [];

    for (let i = 0; i < pointsLen; i++) {
        const curIndex = direction === 1 ? sortedIndex[i] : sortedIndex[pointsLen - 1 - i];
        const nextIndex = (curIndex + 1) % pointsLen;
        const prevIndex = (curIndex + pointsLen - 1) % pointsLen;
        const curPointY = points[curIndex].y * direction;
        // 处理相等的情况
        let prevPointY = points[prevIndex].y * direction;
        if (prevPointY - curPointY === 0) {
            prevPointY += (doneIndex[prevIndex] || -1) * 0.001
        }
        let nextPointY = points[nextIndex].y * direction;
        if (nextPointY - curPointY === 0) {
            nextPointY += (doneIndex[nextIndex] || -1) * 0.001
        }
        doneIndex[curIndex] = 1;

        // 事件处理
        if (curPointY > prevPointY && curPointY > nextPointY) {
            let exist = false;
            let trap = trapEnd; // 倒序查找效率高
            // 分裂
            while (trap.helper !== -1) {
                const vs = [points[trap.left[0]], points[trap.left[1]], points[trap.right[0]], points[trap.right[1]]];
                if (pointInPolygonNested(points[curIndex], vs)) {
                    linkedNext(mapsLine, curIndex, trap.helper);
                    const newTrap = {
                        helper: curIndex,
                        left: [curIndex, nextIndex],
                        right: [trap.right[0], trap.right[1]],
                    }
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
                const newTrap = {
                    helper: curIndex,
                    left: [curIndex, nextIndex],
                    right: [prevIndex, curIndex]
                }
                trapEnd = appendTrapezium(trapEnd, newTrap);
                cacheTrapezium(cache, newTrap);
            }
        } else if (curPointY < prevPointY && curPointY < nextPointY) {
            const union1 = getTrapeziumByRight(cache, curIndex, nextIndex);
            const union2 = getTrapeziumByLeft(cache, prevIndex, curIndex);
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
        } else if (curPointY < prevPointY && curPointY > nextPointY) {
            // 左边界
            const trap = getTrapeziumByLeft(cache, prevIndex, curIndex);
            trap.helper = curIndex;
            trap.left[0] = curIndex;
            trap.left[1] = nextIndex;
            cacheTrapezium(cache, trap);
        } else if (curPointY > prevPointY && curPointY < nextPointY) {
            // 右边界
            const trap = getTrapeziumByRight(cache, curIndex, nextIndex);
            trap.helper = curIndex;
            trap.right[0] = prevIndex;
            trap.right[1] = curIndex;
            cacheTrapezium(cache, trap);
        }
    }
}

function sortMonotone(polygon: number[], points: Vector2[]) {
    let start = 1;
    let end = polygon.length - 1;
    const newPolygon = [polygon[0]];
    while (start !== end) {
        const startIndex = polygon[start];
        const endIndex = polygon[end];
        if (points[startIndex].y >= points[endIndex].y) {
            newPolygon.push(startIndex);
            start += 1;
        } else {
            newPolygon.push(endIndex);
            end -= 1;
        }
    }
    newPolygon.push(polygon[end]);
    return newPolygon;
}

function triangulateMonotone(polygon: Polygon, sortedIndex: number[], mapsLine: Record<number, LinkedPoint>, triangles: number[]) {
    const points = polygon.points;
    const pointsLen = points.length;
    let currentLen = pointsLen;
    let monotoneItem: number[] = [];
    const doneIndex: number[] = [];
    let head = 0;
    let headIndex = sortedIndex[head];
    let line = mapsLine[headIndex];
    while (currentLen >= 0) {
        monotoneItem.push(line.index);
        const startIndex = monotoneItem[0];
        if (line.next.length === 1) {
            doneIndex[line.index] = 1;
            if (line.index === headIndex) {
                head += 1;
                headIndex = sortedIndex[head];
            }
            currentLen -= 1;
            line = mapsLine[line.next[0]];
        } else {
            // 选取离起始点最近的点
            const prevIndex = monotoneItem[monotoneItem.length - 2];
            const nextLen = line.next.length;
            let minLenIndex = 0;
            let minLen = getLineLen(startIndex, line.next[0], pointsLen);
            for (let i = 1; i < nextLen; i++) {
                const itemIndex = line.next[i];
                const itemLen = getLineLen(startIndex, itemIndex, pointsLen);
                if (itemLen < minLen && (prevIndex !== itemIndex || (prevIndex === itemIndex && prevIndex === startIndex && monotoneItem.length >= 3))) {
                    minLenIndex = i;
                    minLen = itemLen;
                }
            }
            line = mapsLine[line.next.splice(minLenIndex, 1)[0]];
        }
        if (monotoneItem.length > 0 && startIndex === line.index) {
            const monotone = sortMonotone(monotoneItem, points);
            if (monotone.length > 3) {
                monotonePolygon(monotone, points, triangles);
            } else if (monotone.length === 3) {
                triangles.push(monotone[0], monotone[1], monotone[2]);
            }
            for (let i = head; i < pointsLen; i++) {
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

function monotonePolygon(polygon: number[], points: Vector2[], triangles: number[]) {
    let stack = [polygon[0], polygon[1]];
    const pointsLen = points.length;
    const polygonLen = polygon.length;
    // 多边形顶点重置为 0，方便后续判断左右
    const polygonStart = polygon[0];
    let polygonSecond = polygon[1] - polygonStart;
    if (polygonSecond < 0) {
        polygonSecond += pointsLen;
    }
    let polygonEnd = polygon[polygonLen - 1] - polygonStart;
    if (polygonEnd < 0) {
        polygonEnd += pointsLen;
    }
    let isLeft = polygonSecond < polygonEnd ? true : false; // 初始左右判断
    for (let i = 2; i < polygonLen; i++) {
        const stackLastIndex = stack.length - 1;
        const curIndex = polygon[i];
        // 左右判断
        let polygonCur = curIndex - polygonStart;
        if (polygonCur < 0) {
            polygonCur += pointsLen;
        }
        let curIsLeft = polygonCur < polygonEnd ? true : false;
        // 异侧
        if (curIsLeft !== isLeft) {
            for (let j = 0; j < stackLastIndex; j++) {
                triangles.push(stack[stackLastIndex - j - 1], stack[stackLastIndex - j], curIndex);
            }
            isLeft = !isLeft;
            const stackEnd = stack[stackLastIndex];
            stack = [];
            stack.push(stackEnd, curIndex);
        } else {
            // 同侧
            let count = 0;
            let isConvex = false;
            do {
                isConvex = false;
                const curCount = stackLastIndex - count + 1;
                const first = stack[curCount - 1];
                const second = stack[curCount - 2];
                const pSecond = points[second];
                const pFirst = points[first];
                const pCurrent = points[curIndex];
                const vec1 = { x: pFirst.x - pSecond.x, y: pFirst.y - pSecond.y };
                const vec2 = { x: pCurrent.x - pFirst.x, y: pCurrent.y - pFirst.y };
                const result1 = vec1.x * vec2.y - vec2.x * vec1.y;
                const result2 = vec1.x * vec2.x;
                if ((isLeft && result1 > 0) || (!isLeft && result1 < 0) || (result1 === 0 && result2 <= 0)) {
                    triangles.push(second, first, curIndex);
                    isConvex = true;
                    count += 1;
                }
            } while ((stack.length - count) > 1 && isConvex)
            stack.length = stackLastIndex + 1 - count;
            stack.push(curIndex);
        }
    }
}

function triangulate(polygon: Polygon) {
    const triangles = [];
    const points = polygon.points; // 逆时针
    let pointsLen = points.length;

    // 排序
    const mapsLine: LinkedPoint[] = [];
    const sortedIndex = [];
    for (let i = 0; i < pointsLen; i++) {
        mapsLine.push({
            index: i,
            next: [(i + 1) % pointsLen],
        })
        sortedIndex.push(i);
    }
    sortedIndex.sort(function (a, b) {
        return points[b].y - points[a].y; // 按 y 轴倒序
    })

    // 拆分单调多边形
    decomposition(polygon, 1, sortedIndex, mapsLine);
    decomposition(polygon, -1, sortedIndex, mapsLine);

    // 三角划分
    triangulateMonotone(polygon, sortedIndex, mapsLine, triangles);

    return triangles;
}