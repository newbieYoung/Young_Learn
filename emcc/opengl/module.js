var Module = {
  canvas: (function () {
    var canvas = document.getElementById("canvas");
    canvas.addEventListener(
      "webglcontextlost",
      function (e) {
        alert("WebGL context lost. You will need to reload the page.");
        e.preventDefault();
      },
      false
    );
    return canvas;
  })(),
};
