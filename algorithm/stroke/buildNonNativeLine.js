// pixi.js buildNonNativeLine
var buildNonNativeLine = (function () {
  const GRAPHICS_CURVES = {
    epsilon: 0.0001,
  };
  /**
   * Buffers vertices to draw a square cap.
   *
   * Ignored from docs since it is not directly exposed.
   *
   * @ignore
   * @private
   * @param {number} x - X-coord of end point
   * @param {number} y - Y-coord of end point
   * @param {number} nx - X-coord of line normal pointing inside
   * @param {number} ny - Y-coord of line normal pointing inside
   * @param {Array<number>} verts - vertex buffer
   * @returns {}
   */
  function square(
    x,
    y,
    nx,
    ny,
    innerWeight,
    outerWeight,
    clockwise,
    /* rotation for square (true at left end, false at right end) */ verts
  ) {
    var ix = x - nx * innerWeight;
    var iy = y - ny * innerWeight;
    var ox = x + nx * outerWeight;
    var oy = y + ny * outerWeight;
    /* Rotate nx,ny for extension vector */
    var exx;
    var eyy;
    if (clockwise) {
      exx = ny;
      eyy = -nx;
    } else {
      exx = -ny;
      eyy = nx;
    }
    /* [i|0]x,y extended at cap */
    var eix = ix + exx;
    var eiy = iy + eyy;
    var eox = ox + exx;
    var eoy = oy + eyy;
    /* Square itself must be inserted clockwise */
    verts.push(eix, eiy);
    verts.push(eox, eoy);
    return 2;
  }

  /**
   * Buffers vertices to draw an arc at the line joint or cap.
   *
   * Ignored from docs since it is not directly exposed.
   *
   * @ignore
   * @private
   * @param {number} cx - X-coord of center
   * @param {number} cy - Y-coord of center
   * @param {number} sx - X-coord of arc start
   * @param {number} sy - Y-coord of arc start
   * @param {number} ex - X-coord of arc end
   * @param {number} ey - Y-coord of arc end
   * @param {Array<number>} verts - buffer of vertices
   * @param {boolean} clockwise - orientation of vertices
   * @returns {number} - no. of vertices pushed
   */
  function round(cx, cy, sx, sy, ex, ey, verts, clockwise) {
    var cx2p0x = sx - cx;
    var cy2p0y = sy - cy;
    var angle0 = Math.atan2(cx2p0x, cy2p0y);
    var angle1 = Math.atan2(ex - cx, ey - cy);
    if (clockwise && angle0 < angle1) {
      angle0 += Math.PI * 2;
    } else if (!clockwise && angle0 > angle1) {
      angle1 += Math.PI * 2;
    }
    var startAngle = angle0;
    var angleDiff = angle1 - angle0;
    var absAngleDiff = Math.abs(angleDiff);
    /* if (absAngleDiff >= PI_LBOUND && absAngleDiff <= PI_UBOUND)
    {
        const r1x = cx - nxtPx;
        const r1y = cy - nxtPy;

        if (r1x === 0)
        {
            if (r1y > 0)
            {
                angleDiff = -angleDiff;
            }
        }
        else if (r1x >= -GRAPHICS_CURVES.epsilon)
        {
            angleDiff = -angleDiff;
        }
    } */
    var radius = Math.sqrt(cx2p0x * cx2p0x + cy2p0y * cy2p0y);
    var segCount = (((15 * absAngleDiff * Math.sqrt(radius)) / Math.PI) >> 0) + 1; // eslint-disable-line no-bitwise
    var angleInc = angleDiff / segCount;
    startAngle += angleInc;
    var i;
    var angle;
    if (clockwise) {
      verts.push(cx, cy);
      verts.push(sx, sy);
      for (i = 1, angle = startAngle;
        i < segCount;
        i += 1, angle += angleInc
      ) {
        verts.push(cx, cy);
        verts.push(
          cx + Math.sin(angle) * radius,
          cy + Math.cos(angle) * radius
        );
      }
      verts.push(cx, cy);
      verts.push(ex, ey);
    } else {
      verts.push(sx, sy);
      verts.push(cx, cy);
      for (i = 1, angle = startAngle;
        i < segCount;
        i += 1, angle += angleInc
      ) {
        verts.push(
          cx + Math.sin(angle) * radius,
          cy + Math.cos(angle) * radius
        );
        verts.push(cx, cy);
      }
      verts.push(ex, ey);
      verts.push(cx, cy);
    }
    return segCount * 2;
  }

  return function (graphicsData, graphicsGeometry) {
    var shape = graphicsData.shape;
    var points = graphicsData.points || shape.points.slice();
    if (points.length === 0) {
      return;
    }
    // if the line width is an odd number add 0.5 to align to a whole pixel
    // commenting this out fixes #711 and #1620
    // if (graphicsData.lineWidth%2)
    // {
    //     for (i = 0; i < points.length; i++)
    //     {
    //         points[i] += 0.5;
    //     }
    // }
    var style = graphicsData.lineStyle;
    var verts = graphicsGeometry.points;
    var length = points.length / 2;
    var indexCount = points.length;
    var indexStart = verts.length / 2;
    // Max. inner and outer width
    var width = style.width / 2;
    var widthSquared = width * width;
    var miterLimitSquared = style.miterLimit * style.miterLimit;
    /* Line segments of interest where (x1,y1) forms the corner. */
    var x0 = points[0];
    var y0 = points[1];
    var x1 = points[2];
    var y1 = points[3];
    var x2 = 0;
    var y2 = 0;
    /* perp[?](x|y) = the line normal with magnitude lineWidth. */
    var perpx = -(y0 - y1);
    var perpy = x0 - x1;
    var perp1x = 0;
    var perp1y = 0;
    var dist = Math.sqrt(perpx * perpx + perpy * perpy);
    perpx /= dist;
    perpy /= dist;
    perpx *= width;
    perpy *= width;
    var ratio = style.alignment; // 0.5;
    var innerWeight = (1 - ratio) * 2;
    var outerWeight = ratio * 2;
    if (style.cap === 'round') {
      indexCount
        += round(
          x0 - perpx * (innerWeight - outerWeight) * 0.5,
          y0 - perpy * (innerWeight - outerWeight) * 0.5,
          x0 - perpx * innerWeight,
          y0 - perpy * innerWeight,
          x0 + perpx * outerWeight,
          y0 + perpy * outerWeight,
          verts,
          true
        ) + 2;
    } else if (style.cap === 'square') {
      indexCount += square(
        x0,
        y0,
        perpx,
        perpy,
        innerWeight,
        outerWeight,
        true,
        verts
      );
    }
    // Push first point (below & above vertices)
    verts.push(x0 - perpx * innerWeight, y0 - perpy * innerWeight);
    verts.push(x0 + perpx * outerWeight, y0 + perpy * outerWeight);
    var i;
    for (i = 1; i < length - 1; i += 1) {
      x0 = points[(i - 1) * 2];
      y0 = points[(i - 1) * 2 + 1];
      x1 = points[i * 2];
      y1 = points[i * 2 + 1];
      x2 = points[(i + 1) * 2];
      y2 = points[(i + 1) * 2 + 1];
      perpx = -(y0 - y1);
      perpy = x0 - x1;
      dist = Math.sqrt(perpx * perpx + perpy * perpy);
      perpx /= dist;
      perpy /= dist;
      perpx *= width;
      perpy *= width;
      perp1x = -(y1 - y2);
      perp1y = x1 - x2;
      dist = Math.sqrt(perp1x * perp1x + perp1y * perp1y);
      perp1x /= dist;
      perp1y /= dist;
      perp1x *= width;
      perp1y *= width;
      /* d[x|y](0|1) = the component displacement between points p(0,1|1,2) */
      var dx0 = x1 - x0;
      var dy0 = y0 - y1;
      var dx1 = x1 - x2;
      var dy1 = y2 - y1;
      /* +ve if internal angle counterclockwise, -ve if internal angle clockwise. */
      var cross = dy0 * dx1 - dy1 * dx0;
      var clockwise = cross < 0;
      /* Going nearly straight? */
      if (Math.abs(cross) < 0.1) {
        verts.push(x1 - perpx * innerWeight, y1 - perpy * innerWeight);
        verts.push(x1 + perpx * outerWeight, y1 + perpy * outerWeight);
        continue; // eslint-disable-line no-continue
      }
      /* p[x|y] is the miter point. pdist is the distance between miter point and p1. */
      var c1 = (-perpx + x0) * (-perpy + y1) - (-perpx + x1) * (-perpy + y0);
      var c2 = (-perp1x + x2) * (-perp1y + y1) - (-perp1x + x1) * (-perp1y + y2);
      var px = (dx0 * c2 - dx1 * c1) / cross;
      var py = (dy1 * c1 - dy0 * c2) / cross;
      var pdist = (px - x1) * (px - x1) + (py - y1) * (py - y1);
      /* Inner miter point */
      var imx = x1 + (px - x1) * innerWeight;
      var imy = y1 + (py - y1) * innerWeight;
      /* Outer miter point */
      var omx = x1 - (px - x1) * outerWeight;
      var omy = y1 - (py - y1) * outerWeight;
      /* Is the inside miter point too far away, creating a spike? */
      var smallerInsideSegmentSq = Math.min(
        dx0 * dx0 + dy0 * dy0,
        dx1 * dx1 + dy1 * dy1
      );
      var insideWeight = clockwise ? innerWeight : outerWeight;
      var smallerInsideDiagonalSq = smallerInsideSegmentSq + insideWeight * insideWeight * widthSquared;
      var insideMiterOk = pdist <= smallerInsideDiagonalSq;
      if (insideMiterOk) {
        if (
          style.join === 'bevel'
          || pdist / widthSquared > miterLimitSquared
        ) {
          if (clockwise) {
            /* rotating at inner angle */ verts.push(imx, imy); // inner miter point
            verts.push(x1 + perpx * outerWeight, y1 + perpy * outerWeight); // first segment's outer vertex
            verts.push(imx, imy); // inner miter point
            verts.push(x1 + perp1x * outerWeight, y1 + perp1y * outerWeight); // second segment's outer vertex
          } /* rotating at outer angle */ else {
            verts.push(x1 - perpx * innerWeight, y1 - perpy * innerWeight); // first segment's inner vertex
            verts.push(omx, omy); // outer miter point
            verts.push(x1 - perp1x * innerWeight, y1 - perp1y * innerWeight); // second segment's outer vertex
            verts.push(omx, omy); // outer miter point
          }
          indexCount += 2;
        } else if (style.join === 'round') {
          if (clockwise) {
            /* arc is outside */ verts.push(imx, imy);
            verts.push(x1 + perpx * outerWeight, y1 + perpy * outerWeight);
            indexCount
              += round(
                x1,
                y1,
                x1 + perpx * outerWeight,
                y1 + perpy * outerWeight,
                x1 + perp1x * outerWeight,
                y1 + perp1y * outerWeight,
                verts,
                true
              ) + 4;
            verts.push(imx, imy);
            verts.push(x1 + perp1x * outerWeight, y1 + perp1y * outerWeight);
          } /* arc is inside */ else {
            verts.push(x1 - perpx * innerWeight, y1 - perpy * innerWeight);
            verts.push(omx, omy);
            indexCount
              += round(
                x1,
                y1,
                x1 - perpx * innerWeight,
                y1 - perpy * innerWeight,
                x1 - perp1x * innerWeight,
                y1 - perp1y * innerWeight,
                verts,
                false
              ) + 4;
            verts.push(x1 - perp1x * innerWeight, y1 - perp1y * innerWeight);
            verts.push(omx, omy);
          }
        } else {
          verts.push(imx, imy);
          verts.push(omx, omy);
        }
      } else {
        verts.push(x1 - perpx * innerWeight, y1 - perpy * innerWeight); // first segment's inner vertex
        verts.push(x1 + perpx * outerWeight, y1 + perpy * outerWeight); // first segment's outer vertex
        if (style.join === 'bevel' || pdist / widthSquared > miterLimitSquared);
        else if (style.join === 'round') {
          if (clockwise) {
            /* arc is outside */ indexCount
              += round(
                x1,
                y1,
                x1 + perpx * outerWeight,
                y1 + perpy * outerWeight,
                x1 + perp1x * outerWeight,
                y1 + perp1y * outerWeight,
                verts,
                true
              ) + 2;
          } /* arc is inside */ else {
            indexCount
              += round(
                x1,
                y1,
                x1 - perpx * innerWeight,
                y1 - perpy * innerWeight,
                x1 - perp1x * innerWeight,
                y1 - perp1y * innerWeight,
                verts,
                false
              ) + 2;
          }
        } else {
          if (clockwise) {
            verts.push(omx, omy); // inner miter point
            verts.push(omx, omy); // inner miter point
          } else {
            verts.push(imx, imy); // outer miter point
            verts.push(imx, imy); // outer miter point
          }
          indexCount += 2;
        }
        verts.push(x1 - perp1x * innerWeight, y1 - perp1y * innerWeight); // second segment's inner vertex
        verts.push(x1 + perp1x * outerWeight, y1 + perp1y * outerWeight); // second segment's outer vertex
        indexCount += 2;
      }
    }
    x0 = points[(length - 2) * 2];
    y0 = points[(length - 2) * 2 + 1];
    x1 = points[(length - 1) * 2];
    y1 = points[(length - 1) * 2 + 1];
    perpx = -(y0 - y1);
    perpy = x0 - x1;
    dist = Math.sqrt(perpx * perpx + perpy * perpy);
    perpx /= dist;
    perpy /= dist;
    perpx *= width;
    perpy *= width;
    verts.push(x1 - perpx * innerWeight, y1 - perpy * innerWeight);
    verts.push(x1 + perpx * outerWeight, y1 + perpy * outerWeight);
    if (style.cap === 'round') {
      indexCount
        += round(
          x1 - perpx * (innerWeight - outerWeight) * 0.5,
          y1 - perpy * (innerWeight - outerWeight) * 0.5,
          x1 - perpx * innerWeight,
          y1 - perpy * innerWeight,
          x1 + perpx * outerWeight,
          y1 + perpy * outerWeight,
          verts,
          false
        ) + 2;
    } else if (style.cap === 'square') {
      indexCount += square(
        x1,
        y1,
        perpx,
        perpy,
        innerWeight,
        outerWeight,
        false,
        verts
      );
    }
    var indices = graphicsGeometry.indices;
    var eps2 = GRAPHICS_CURVES.epsilon * GRAPHICS_CURVES.epsilon;
    // indices.push(indexStart);
    for (i = indexStart; i < indexCount + indexStart - 2; i += 1) {
      x0 = verts[i * 2];
      y0 = verts[i * 2 + 1];
      x1 = verts[(i + 1) * 2];
      y1 = verts[(i + 1) * 2 + 1];
      x2 = verts[(i + 2) * 2];
      y2 = verts[(i + 2) * 2 + 1];
      /* Skip zero area triangles */
      if (Math.abs(x0 * (y1 - y2) + x1 * (y2 - y0) + x2 * (y0 - y1)) < eps2) {
        continue; // eslint-disable-line no-continue
      }
      if ((i - indexStart) % 2 === 1) {
        indices.push(i + 2, i + 1, i);
      } else {
        indices.push(i, i + 1, i + 2);
      }
    }
  };
}());

export { buildNonNativeLine };
