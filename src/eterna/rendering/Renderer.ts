
export default class Renderer {
    public static get instance() { return Renderer._instance; }
    public static get context() { return Renderer._instance._context; }

    public static create(canvas: HTMLCanvasElement) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        const webgl2 = canvas.getContext('webgl2');
        const context = (
            webgl2
            ?? canvas.getContext('webgl')
            ?? canvas.getContext('experimental-webgl')
        ) as WebGLRenderingContext;

        if (!context) {
            throw new Error("Couldn't create WebGL context");
        }

        context.clearColor(0, 0, 0, 0);
        context.disable(context.DEPTH_TEST);
        Renderer._instance = new Renderer(context);
    }

    private static _instance: Renderer;
    private _context: WebGLRenderingContext;

    constructor(context: WebGLRenderingContext) {
        this._context = context;
    }

    public clear() {
        const context = Renderer.context;
        context.clearColor(0, 0, 0, 0);
        context.clear(context.COLOR_BUFFER_BIT);
    }
}
