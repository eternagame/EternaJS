import {VertexShaderAttribs} from './Shader';
import Renderer from './Renderer';

type VertexAttribute = 'position';

interface VertexAttributes {
    [name: string]: number[];
}

interface VertexBufferProps {
    primitiveType: number;
}

interface VertexBufferMedadata {
    [name: string]: {
        buffer: WebGLBuffer | null;
        componentCount: number;
        needsUpdate: boolean;
    };
}

interface VertexIndices {
    data: number[];
    buffer: WebGLBuffer | null;
}

export default class VertexBuffer {
    private _isLoaded = false;
    private _props: VertexBufferProps;
    private _attributes: VertexAttributes = {};
    private _metadata: VertexBufferMedadata = {};
    private _indices?: VertexIndices;

    constructor(props: VertexBufferProps) {
        this._props = props;
    }

    public setAttribute(attribute: VertexAttribute, data: number[], componentCount: number) {
        this._attributes[attribute] = data;
        if (attribute in this._metadata) {
            this._metadata[attribute].needsUpdate = true;
        } else {
            this._metadata[attribute] = {
                buffer: null,
                needsUpdate: true,
                componentCount
            };
        }
    }

    public setIndices(indices: number[]) {
        this._indices = {
            data: indices,
            buffer: null
        };
    }

    public bind(vertexAttribs: VertexShaderAttribs) {
        const context = Renderer.context;
        if (!this._isLoaded) {
            Object.entries(this._attributes).forEach(([attribute, value]) => {
                const buffer = context.createBuffer();
                context.bindBuffer(context.ARRAY_BUFFER, buffer);
                context.bufferData(context.ARRAY_BUFFER, new Float32Array(value), context.DYNAMIC_DRAW);
                this._metadata[attribute].buffer = buffer;
                this._metadata[attribute].needsUpdate = false;
            });

            if (this._indices) {
                const buffer = context.createBuffer();
                context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, buffer);
                context.bufferData(
                    context.ELEMENT_ARRAY_BUFFER, 
                    new Uint16Array(this._indices.data), 
                    context.STATIC_DRAW
                );
                this._indices.buffer = buffer;
            }

            this._isLoaded = true;
        }

        if (this._indices) {
            context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, this._indices.buffer);
        }

        Object.entries(this._metadata).forEach(([attribute, {buffer, componentCount}]) => {
            if (!this.updateBufferDataIfNecessary(attribute)) {
                context.bindBuffer(context.ARRAY_BUFFER, buffer);
            }
            const location = vertexAttribs[attribute];
            context.enableVertexAttribArray(location);
            context.vertexAttribPointer(location, componentCount, context.FLOAT, false, 0, 0);
        });
    }

    public draw(vertexCount: number) {
        const context = Renderer.context;
        if (this._indices) {
            context.drawElements(this._props.primitiveType, vertexCount, context.UNSIGNED_SHORT, 0);
        } else {
            context.drawArrays(this._props.primitiveType, 0, vertexCount);
        }
    }

    private updateBufferDataIfNecessary(attribute: string) {
        const attr = this._metadata[attribute];
        if (!attr.needsUpdate) {
            return false;
        }
        const context = Renderer.context;
        context.bindBuffer(context.ARRAY_BUFFER, attr.buffer);
        context.bufferData(context.ARRAY_BUFFER, new Float32Array(this._attributes[attribute]), context.DYNAMIC_DRAW);
        attr.needsUpdate = false;
        return true;
    }
}
