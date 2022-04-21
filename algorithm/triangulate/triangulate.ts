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
    const maxIndex = points.length - 1;
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
        polygons.push(lastSplits[0]);
        polygons.push(lastSplits[1]);
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

function monotonePolygon(polygon: number[], points: Vector2[]) {
    const triangles = [];
    const polygonLen = polygon.length;
    const stack = [];
    let start = polygon[0];
    let end = polygon[polygonLen - 1];
    let isLeft = true;
    for (let i = 0; i < polygonLen; i++) {
        const stackLen = stack.length;
        const curIndex = polygon[i];
        if (stackLen <= 1) {
            stack.push(curIndex)
        } else {
            let curIsLeft = curIndex > start && curIndex < end ? true : false;
            // 异侧
            if (curIsLeft !== isLeft) {
                for (let j = 0; j < stackLen - 1; j++) {
                    triangles.push(stack[stackLen - j - 2]);
                    triangles.push(stack[stackLen - j - 1]);
                    triangles.push(curIndex);
                }
                start = stack[stackLen - 1];
                isLeft = !isLeft;
                stack.length = 0;
                stack.push(start);
                stack.push(curIndex);
            } else {
                // 同侧
                const first = stack[stackLen - 1];
                const second = stack[stackLen - 2];
                const pSecond = points[second];
                const pFirst = points[first];
                const pCurrent = points[first];
                const vec1 = {x: pSecond.x - pFirst.x, y: pSecond.y - pFirst.y};
                const vec2 = {x: pCurrent.x - pFirst.x, y: pCurrent.y - pFirst.y};
            }
        }
    }
}

function triangulate(polygon: Polygon) {
    const points = polygon.points; // 逆时针
    const sortedIndex = [];
    for (let i = 0; i < points.length; i++) {
        sortedIndex.push(i);
    }

    // 排序
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
    console.log(lines);
    console.log(monotones);
}