/**
 * @param {WebGLRenderingContext} gl - The current WebGL context {WebGLProgram}
 * @param {Number} type - the type, can be either VERTEX_SHADER or FRAGMENT_SHADER
 * @param {string} src - The vertex shader source as an array of strings.
 * @return {WebGLShader} the shader
 */
 function compileShader(gl, type, src) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    return shader;
}


/**
 * generates a WebGL Program object from a high level Pixi Program.
 * @param gl - a rendering context on which to generate the program
 * @param program - the high level Pixi Program.
 */
 function generateProgram(gl, program) {
    var glVertShader = compileShader(gl, gl.VERTEX_SHADER, program.vertexSrc);
    var glFragShader = compileShader(gl, gl.FRAGMENT_SHADER, program.fragmentSrc);
    var webGLProgram = gl.createProgram();
    gl.attachShader(webGLProgram, glVertShader);
    gl.attachShader(webGLProgram, glFragShader);
    gl.linkProgram(webGLProgram);
    if (!gl.getProgramParameter(webGLProgram, gl.LINK_STATUS)) {
        if (!gl.getShaderParameter(glVertShader, gl.COMPILE_STATUS)) {
            console.log(gl.getShaderInfoLog(glVertShader));
        }
        if (!gl.getShaderParameter(glFragShader, gl.COMPILE_STATUS)) {
            console.log(gl.getShaderInfoLog(glFragShader));
        }
        return null;
    }
    //delete the shaders as they're linked into our program now and no longer necessary
    gl.deleteShader(glVertShader);
    gl.deleteShader(glFragShader);
    
    gl.useProgram(webGLProgram);
    return webGLProgram;
}