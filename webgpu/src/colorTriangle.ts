import vertex_shader from './shaders/position.vert.wgsl?raw';
import frag_shader from './shaders/color.frag.wgsl?raw';
import GUI from 'lil-gui';

interface IBufferObject {
    data: Float32Array,
    buffer: GPUBuffer,
    count: number
}

interface IBufferGroup {
    data: Float32Array,
    buffer: GPUBuffer,
    group: GPUBindGroup
}

async function initWebGPU(width: number, height: number, ratio?: number) {
    if (!navigator.gpu) {
        throw new Error('webgpu not supported!');
    }
    const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
    });
    if (!adapter) {
        throw new Error('webgpu requestAdapter null!');
    }

    const canvas = document.querySelector('canvas');
    if (!canvas) {
        throw new Error('canvas is not existed!');
    }
    const pixelRatio = ratio ? ratio : window.devicePixelRatio;
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;

    const context = canvas.getContext('webgpu');
    if (!context) {
        throw new Error('canvas get context null!');
    }

    const device = await adapter.requestDevice({
        requiredFeatures: [],
        requiredLimits: {}
    });
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        device,
        format,
    })

    return { adapter, device, context, format }
}

async function initPipeline(device: GPUDevice, format: GPUTextureFormat) {
    const vertex = new Float32Array([
        // xyz
        0, 0.5, 0,
        -0.5, -0.5, 0,
        0.5, -0.5, 0
    ]);
    const vertexBuffer = device.createBuffer({
        size: vertex.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(vertexBuffer, 0, vertex);

    const color = new Float32Array([1, 1, 1, 1]);
    const colorBuffer = device.createBuffer({
        size: color.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(colorBuffer, 0, color);

    const vetexShader = device.createShaderModule({
        code: vertex_shader
    });
    const fragShader = device.createShaderModule({
        code: frag_shader
    });
    const pipeline = await device.createRenderPipelineAsync({
        vertex: {
            module: vetexShader,
            entryPoint: 'main',
            buffers: [{
                arrayStride: 3 * Float32Array.BYTES_PER_ELEMENT,
                attributes: [{
                    shaderLocation: 0,
                    offset: 0,
                    format: 'float32x3'
                }]
            }]
        },
        fragment: {
            module: fragShader,
            entryPoint: 'main',
            targets: [{
                format
            }]
        },
        primitive: {
            topology: 'triangle-list'
        },
        layout: 'auto'
    });

    const group = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{
            binding: 0,
            resource: {
                buffer: colorBuffer
            }
        }]
    });

    const vertexObj: IBufferObject = {
        data: vertex,
        buffer: vertexBuffer,
        count: 3
    }
    const colorGroup: IBufferGroup = {
        data: color,
        buffer: colorBuffer,
        group,
    }
    return { vertexObj, pipeline, colorGroup };
}

function draw(device: GPUDevice, pipeline: GPURenderPipeline, context: GPUCanvasContext, vertex: IBufferObject, color: IBufferGroup) {
    const encoder = device.createCommandEncoder();
    const renderPass = encoder.beginRenderPass({
        colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            loadOp: 'clear',
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
            storeOp: 'store'
        }]
    });
    renderPass.setPipeline(pipeline);
    renderPass.setVertexBuffer(0, vertex.buffer);
    renderPass.setBindGroup(0, color.group);
    renderPass.draw(vertex.count);
    renderPass.end();
    const buffer = encoder.finish();
    device.queue.submit([buffer]);
}

async function main() {
    const { device, format, context } = await initWebGPU(window.innerWidth, window.innerHeight);
    const { pipeline, vertexObj, colorGroup } = await initPipeline(device, format);
    draw(device, pipeline, context, vertexObj, colorGroup);

    const params = {
        translate: 0,
        color: {
            string: '#ffffff',
            int: 0xffffff,
            object: { r: 1, g: 1, b: 1 },
            array: [1, 1, 1]
        },
    }
    const gui = new GUI();
    gui.add(params, 'translate', -0.5, 0.5).name('位移');
    gui.addColor(params.color, 'array').name('颜色');
    gui.onChange(value => {
        if (value.property === 'translate') {
            const translate = value.value;
            vertexObj.data[0] = 0 + translate;
            vertexObj.data[3] = -0.5 + translate;
            vertexObj.data[6] = 0.5 + translate;
            device.queue.writeBuffer(vertexObj.buffer, 0, vertexObj.data);
            draw(device, pipeline, context, vertexObj, colorGroup);
        } else if (value.property === 'array') {
            const color = value.value;
            colorGroup.data[0] = color[0];
            colorGroup.data[1] = color[1];
            colorGroup.data[2] = color[2];
            device.queue.writeBuffer(colorGroup.buffer, 0, colorGroup.data);
            draw(device, pipeline, context, vertexObj, colorGroup);
        }
    });
}

main();

