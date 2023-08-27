import vertex from './shaders/triangle.vert.wgsl?raw';
import frag from './shaders/red.frag.wgsl?raw';

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
    const vetexShader = device.createShaderModule({
        code: vertex
    });
    const fragShader = device.createShaderModule({
        code: frag
    });
    const pipeline = await device.createRenderPipelineAsync({
        vertex: {
            module: vetexShader,
            entryPoint: 'main'
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
    return pipeline;
}

function draw(device: GPUDevice, pipeline: GPURenderPipeline, context: GPUCanvasContext) {
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
    renderPass.draw(3);
    renderPass.end();
    const buffer = encoder.finish();
    device.queue.submit([buffer]);
}

async function main() {
    const { device, format, context } = await initWebGPU(window.innerWidth, window.innerHeight);
    const pipeline = await initPipeline(device, format);
    draw(device, pipeline, context);
}

main();

