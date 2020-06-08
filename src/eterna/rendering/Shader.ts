import Renderer from './Renderer';

interface ShaderUniforms {
    [name: string]: WebGLUniformLocation;
}

interface ShaderProps {
    vertexProgram: string;
    fragmentProgram: string;
    uniforms: string[];
    vertexAttribs: string[];
}

export interface VertexShaderAttribs {
    [name: string]: number;
}

export default class Shader {
    public get vertexAttribs() { return this._vertexAttribs; }

    private _program?: WebGLProgram;
    private _props: ShaderProps;
    private _uniforms: ShaderUniforms = {};
    private _vertexAttribs: VertexShaderAttribs = {};
    private _bindingFailed = false;

    constructor(props: ShaderProps) {
        this._props = props;
    }

    public getUniformLocation(uniform: string) {
        return this._uniforms[uniform];
    }

    public bind() {
        if (this._bindingFailed) {
            return false;
        }

        const context = Renderer.context;
        if (this._program) {
            context.useProgram(this._program);
            return true;
        }

        const program = context.createProgram() as WebGLProgram;
        const vertexShader = this.createShader(context.VERTEX_SHADER, this._props.vertexProgram, 'vertex');
        if (!vertexShader) {
            return false;
        }
        const fragmentShader = this.createShader(context.FRAGMENT_SHADER, this._props.fragmentProgram, 'fragment');
        if (!fragmentShader) {
            return false;
        }
        context.attachShader(program, vertexShader as WebGLShader);
        context.attachShader(program, fragmentShader as WebGLShader);
        context.linkProgram(program);
        if (!context.getProgramParameter(program, context.LINK_STATUS)) {
            console.error(context.getProgramInfoLog(program) as string);
            this._bindingFailed = true;
            return false;
        }

        context.useProgram(program);
        for (const uniform of this._props.uniforms) {
            const location = context.getUniformLocation(program, uniform);
            if (!location) {
                console.warn(`Shader uniform '${uniform}' not found`);
                this._bindingFailed = true;
                return false;
            }
            this._uniforms[uniform] = location;
        }

        for (const vertexAttrib of this._props.vertexAttribs) {
            const location = context.getAttribLocation(program, vertexAttrib);
            if (location < 0) {
                console.warn(`Shader vertex attribute '${vertexAttrib}' not found`);
                this._bindingFailed = true;
                return false;
            }
            this._vertexAttribs[vertexAttrib] = location;
        }

        this._program = program;
        return true;
    }

    private createShader(type: number, code: string, logTypeName: string) {
        const context = Renderer.context;
        const shader = context.createShader(type) as WebGLShader;
        context.shaderSource(shader, code);
        context.compileShader(shader);

        if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
            console.error(context.getShaderInfoLog(shader) as string);
            this._bindingFailed = true;
            return null;
        }

        return shader;
    }
}
