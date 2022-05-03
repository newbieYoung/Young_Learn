function generateNoisyLoop(count, ccw, radius, noiseSize) {
  var verts = new Array(count * 2);
  var thetaPer = (Math.PI * 2) / count;
  var backwards = ccw ? -1 : 1;
  for (var i = 0; i < count; i++) {
    var theta = thetaPer * i * backwards;
    var randomRadius = radius * (1 + Math.random() * noiseSize);
    verts[i * 2] = Math.cos(theta) * randomRadius;
    verts[i * 2 + 1] = Math.sin(theta) * randomRadius;
  }

  return verts;
}

const points = generateNoisyLoop(200, true, 200, 0.5);

const polygon = [[]];
for (let i = 0; i < points.length; i += 2) {
  polygon[0].push([points[i], points[i + 1]]);
}

polygon[0].reverse(); // 逆时针

export { polygon };
