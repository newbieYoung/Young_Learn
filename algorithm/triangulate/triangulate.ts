interface Vector2 {
    x: number;
    y: number;
}
interface Polygon {
    points: Vector2[];
    // holes: Vector2[][]
}

interface DeCompItem {
    left: Array<number>,
    right: Array<number>,
    helper: number;
}

function includes(array: number[], num: number) {
    const len = array.length;
    for (let i = 0; i < len; i++) {
        if (array[i] == num) {
            return true;
        }
    }
    return false;
}

function pointInPolygonNested(point: Vector2, vs: Vector2[], start?: number, end?: number) {
    const x = point.x,
        y = point.y;
    let inside = false;
    if (start === undefined) start = 0;
    if (end === undefined) end = vs.length;
    const len = end - start;
    for (let i = 0, j = len - 1; i < len; j = i++) {
        const xi = vs[i + start].x,
            yi = vs[i + start].y;
        const xj = vs[j + start].x,
            yj = vs[j + start].y;
        const intersect =
            yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
}

function decomposition(divides: number[][], polygon: Polygon, sortedIndex: number[], direction: 1 | -1) {
    const deComps: DeCompItem[] = [];
    const points = polygon.points; // 逆时针
    const maxIndex = sortedIndex.length - 1;
    const doneIndex = {};

    for (let i = 0; i <= maxIndex; i++) {
        const curIndex = direction == 1 ? sortedIndex[i] : sortedIndex[maxIndex - i];
        let nextIndex = curIndex + 1;
        if (nextIndex > maxIndex) {
            nextIndex = 0;
        }
        let prevIndex = curIndex - 1;
        if (prevIndex < 0) {
            prevIndex = maxIndex;
        }
        const curPointY = points[curIndex].y * direction;
        // 处理相等的情况
        let prevPointY = points[prevIndex].y * direction;
        if (prevPointY === curPointY) {
            if (doneIndex[prevIndex]) {
                prevPointY = points[prevIndex].y * direction + 0.001;
            } else {
                prevPointY = points[prevIndex].y * direction - 0.001;
            }
        }
        let nextPointY = points[nextIndex].y * direction;
        if (nextPointY === curPointY) {
            if (doneIndex[nextIndex]) {
                nextPointY = points[nextIndex].y * direction + 0.001;
            } else {
                nextPointY = points[nextIndex].y * direction - 0.001;
            }
        }
        doneIndex[curIndex] = 1;

        // 事件处理
        if (curPointY > prevPointY && curPointY > nextPointY) {
            let inner = false;
            for (let j = 0; j < deComps.length; j++) {
                const deCompItem = deComps[j];
                const vs = [points[deCompItem.left[0]], points[deCompItem.left[1]], points[deCompItem.right[0]], points[deCompItem.right[1]]];
                inner = pointInPolygonNested(points[curIndex], vs);
                if (inner) {
                    // 分裂
                    inner = true;
                    // 划分至少满足一个三角形
                    if (prevIndex != deCompItem.helper && nextIndex != deCompItem.helper) {
                        // 小序号排前，方便后续分解多边形
                        if (curIndex <= deCompItem.helper) {
                            divides.push([curIndex, deCompItem.helper]);
                        } else {
                            divides.push([deCompItem.helper, curIndex]);
                        }
                        deComps.push({
                            helper: curIndex,
                            left: [curIndex, nextIndex],
                            right: deCompItem.right,
                        })
                        deCompItem.helper = curIndex;
                        deCompItem.right = [prevIndex, curIndex];
                    } else {
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
                })
            }
        } else if (curPointY < prevPointY && curPointY < nextPointY) {
            const unions = [-1, -1];
            const dels = [];
            const deCompsLen = deComps.length;
            for (let j = 0; j < deCompsLen; j++) {
                const deCompItem = deComps[j];
                if (deCompItem.left[1] == deCompItem.right[0] && deCompItem.right[0] === curIndex) {
                    // 结束
                    dels.push(j);
                    break;
                } else if (unions[0] <= -1 && deCompItem.right[0] == curIndex) {
                    unions[0] = j;
                } else if (unions[1] <= -1 && deCompItem.left[1] == curIndex) {
                    unions[1] = j;
                }
                // 避免无效遍历
                if (unions[0] >= 0 && unions[1] >= 0) {
                    break;
                }
            }
            if (dels.length > 0) {
                deComps.splice(dels[0], 1);
            } else if (unions[0] >= 0 && unions[1] >= 0) {
                // 合并
                const comp1 = deComps[unions[0]];
                const comp2 = deComps[unions[1]];
                comp1.helper = curIndex;
                comp1.right = comp2.right;
                deComps.splice(unions[1], 1);
            }
        } else if (curPointY < prevPointY && curPointY > nextPointY) {
            // 左边界
            for (let j = 0; j < deComps.length; j++) {
                const deCompItem = deComps[j];
                if (includes(deCompItem.left, curIndex) && includes(deCompItem.left, prevIndex)) {
                    deCompItem.helper = curIndex;
                    deCompItem.left = [curIndex, nextIndex];
                    break;
                }
            }
        } else if (curPointY > prevPointY && curPointY < nextPointY) {
            // 右边界
            for (let j = 0; j < deComps.length; j++) {
                const deCompItem = deComps[j];
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

function splitMonotones(lines: number[][], polygon: number[]) {
    let target = polygon;
    let lastLine;
    let lastSplits = [];
    const polygons = [];
    const linesLen = lines.length;
    for (let i = 0; i < linesLen; i++) {
        const curLine = lines[i];
        // 去掉重复划分
        if (!lastLine || (curLine[0] !== lastLine[0] || curLine[1] !== lastLine[1])) {
            // 选取拆分目标
            if (lastSplits.length >= 2) {
                const polygon1 = lastSplits[0];
                const polygon2 = lastSplits[1];
                // 顶点多的那部分为待拆分目标
                if (polygon1.length != polygon2.length) {
                    if (polygon1.length > polygon2.length) {
                        target = polygon1;
                        polygons.push(polygon2);
                    } else {
                        target = polygon2;
                        polygons.push(polygon1);
                    }
                } else {
                    if (polygon1.length < polygon2.length) {
                        // 优先遍历顶点少的那部分
                        if (includes(polygon1, curLine[0]) && includes(polygon1, curLine[1])) {
                            target = polygon1;
                            polygons.push(polygon2);
                        } else {
                            target = polygon2;
                            polygons.push(polygon1);
                        }
                    } else {
                        if (includes(polygon2, curLine[0]) && includes(polygon2, curLine[1])) {
                            target = polygon2;
                            polygons.push(polygon1);
                        } else {
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
        polygons.push(lastSplits[0], lastSplits[1]);
    }
    if (polygons.length == 0) {
        polygons.push(polygon);
    }

    return polygons;
}

function splitPolygon(polygon: number[], line: number[]) {
    let min = line[0];
    let max = line[1];
    const polygon1 = [];
    const polygon2 = [];
    const polygonLen = polygon.length;
    for (let i = 0; i < polygonLen; i++) {
        const item = polygon[i];
        if (item <= min || item >= max) {
            polygon2.push(item);
        }
        if (item >= min && item <= max) {
            polygon1.push(item);
        }
    }
    return [polygon1, polygon2];
}

function monotonePolygon(polygon: number[], points: Vector2[], triangles: number[]) {
    const stack = [polygon[0], polygon[1]];
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
            stack.length = 0;
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
                if ((isLeft && result1 > 0) || (!isLeft && result1 < 0) || (result1 == 0 && result2 < 0)) {
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
    const points = polygon.points; // 逆时针
    // 去掉尾部和头部重复点（不去掉会导致 bug）
    const startPoint = points[0];
    let pointsLen = points.length;
    for (let i = 0; i < pointsLen; i++) {
        const end = points[pointsLen - 1];
        if (end.x == startPoint.x && end.y == startPoint.y) {
            pointsLen -= 1
        } else {
            break;
        }
    }

    // 排序
    const sortedIndex = [];
    for (let i = 0; i < pointsLen; i++) {
        sortedIndex.push(i);
    }
    sortedIndex.sort(function (a, b) {
        return points[b].y - points[a].y; // 按 y 轴倒序
    })
    // console.log(sortedIndex);

    // 单调多边形分解
    const lines = [];
    decomposition(lines, polygon, sortedIndex, 1);
    decomposition(lines, polygon, sortedIndex, -1);
    // 划分线排序，后续只需要继续拆分多的那边
    lines.sort(function (a, b) {
        return (a[1] - a[0]) - (b[1] - b[0]);
    });
    const monotones = splitMonotones(lines, sortedIndex);
    // console.log(lines);
    // console.log(monotones);

    const triangles = [];
    for (let i = 0; i < monotones.length; i++) {
        const monotoneItem = monotones[i];
        if (monotoneItem.length >= 3) {
            monotonePolygon(monotoneItem, points, triangles);
        }
    }

    return triangles;
}