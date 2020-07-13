import {Point} from 'pixi.js';

/** A 2D vector */
export default class Vector2 {
    public x: number = 0;
    public y: number = 0;

    /** Returns the distance between two points */
    public static distance(x1: number, y1: number, x2: number, y2: number): number {
        const xx = x2 - x1;
        const yy = y2 - y1;
        return Math.sqrt(xx * xx + yy * yy);
    }

    /** Returns the length of a vector */
    public static lengthOf(x: number, y: number): number {
        return Math.sqrt(x * x + y * y);
    }

    /** Returns the angle of a vector, in radians */
    public static angleOf(x: number, y: number): number {
        const val: number = Math.atan2(y, x);
        return (val >= 0 ? val : val + (2 * Math.PI));
    }

    /** Converts Point p to a Vector2. */
    public static fromPoint(p: Point, out: Vector2 | null = null): Vector2 {
        return (out || new Vector2()).set(p.x, p.y);
    }

    /** Creates a vector that points from a to b */
    public static fromPoints(a: Point, b: Point, out: Vector2 | null = null): Vector2 {
        return (out || new Vector2()).set(b.x - a.x, b.y - a.y);
    }

    /** Creates a vector from polar coordinates */
    public static fromPolar(magnitude: number, angle: number, out: Vector2 | null = null): Vector2 {
        return (out || new Vector2()).set(
            Math.cos(angle) * magnitude, // === mag * (cos(angle)*x - sin(angle)*y)
            Math.sin(angle) * magnitude
        ); // === mag * (sin(angle)*x + cos(angle)*y)
    }

    /**
     * Returns a new vector that is the linear interpolation of vectors a and b
     * at proportion p, where p is in [0, 1], p = 0 means the result is equal to a,
     * and p = 1 means the result is equal to b.
     */
    public static interpolate(a: Vector2, b: Vector2, p: number, out: Vector2 | null = null): Vector2 {
        out = (out || new Vector2());
        const q: number = 1 - p;
        return out.set(
            q * a.x + p * b.x,
            q * a.y + p * b.y
        );
    }

    /**
     * Returns the smaller of the two angles between v1 and v2, in radians.
     * Result will be in range [0, pi].
     */
    public static smallerAngleBetween(v1: Vector2, v2: Vector2): number {
        // v1 dot v2 === |v1||v2|cos(theta)
        // theta = acos ((v1 dot v2) / (|v1||v2|))

        const dot: number = v1.dot(v2);
        const len1: number = v1.length;
        const len2: number = v2.length;

        return Math.acos(dot / (len1 * len2));
    }

    /** Constructs a Vector2 from the given values. */
    constructor(x: number = 0, y: number = 0) {
        this.x = x;
        this.y = y;
    }

    /** Return true if this is the zero Vector */
    public get isZero(): boolean {
        return (this.x === 0 && this.y === 0);
    }

    /** Sets the vector's components to the given values. */
    public set(x: number, y: number): Vector2 {
        this.x = x;
        this.y = y;
        return this;
    }

    /** Returns the dot product of this vector with vector v. */
    public dot(v: Vector2): number {
        return this.x * v.x + this.y * v.y;
    }

    /** Converts the Vector2 to a Point. */
    public toPoint(out: Point | null = null): Point {
        out = (out || new Point());
        out.set(this.x, this.y);
        return out;
    }

    /**
     * Returns a copy of this Vector2.
     * If 'out' is not null, it will be used for the clone.
     */
    public clone(out: Vector2 | null = null): Vector2 {
        return (out || new Vector2()).set(this.x, this.y);
    }

    /** Returns the angle represented by this Vector2, in radians. */
    public get angle(): number {
        return Vector2.angleOf(this.x, this.y);
    }

    /** Returns this vector's length. */
    public get length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    /** Sets this vector's length. */
    public set length(newLen: number) {
        const scale: number = newLen / this.length;
        this.x *= scale;
        this.y *= scale;
    }

    /** Returns the square of this vector's length. */
    public get lengthSquared(): number {
        return (this.x * this.x + this.y * this.y);
    }

    /**
     * Rotates the vector in place by 'radians'.
     * Returns a reference to 'this', for chaining.
     */
    public rotateLocal(radians: number): Vector2 {
        const cosTheta: number = Math.cos(radians);
        const sinTheta: number = Math.sin(radians);

        const oldX: number = this.x;
        this.x = (cosTheta * oldX) - (sinTheta * this.y);
        this.y = (sinTheta * oldX) + (cosTheta * this.y);

        return this;
    }

    /** Returns a rotated copy of this vector. */
    public rotate(radians: number, out: Vector2 | null = null): Vector2 {
        return this.clone(out).rotateLocal(radians);
    }

    /** Normalizes the vector in place and returns its original length. */
    public normalizeLocalAndGetLength(): number {
        const {length} = this;

        this.x /= length;
        this.y /= length;

        return length;
    }

    /**
     * Normalizes this vector in place.
     * Returns a reference to 'this', for chaining.
     */
    public normalizeLocal(): Vector2 {
        const invLength: number = 1.0 / this.length;
        this.x *= invLength;
        this.y *= invLength;
        return this;
    }

    /** Returns a normalized copy of the vector. */
    public normalize(): Vector2 {
        return this.clone().normalizeLocal();
    }

    /**
     * Adds another Vector2 to this, in place.
     * Returns a reference to 'this', for chaining.
     */
    public addLocal(v: Vector2): Vector2 {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    /** Returns a copy of this vector added to 'v'. */
    public add(v: Vector2, out: Vector2 | null = null): Vector2 {
        return this.clone(out).addLocal(v);
    }

    /**
     * Subtracts another vector from this one, in place.
     * Returns a reference to 'this', for chaining.
     */
    public subtractLocal(v: Vector2): Vector2 {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }

    /** Returns (this - v). */
    public subtract(v: Vector2, out: Vector2 | null = null): Vector2 {
        return this.clone(out).subtractLocal(v);
    }

    /**
     * Offsets this Vector2's values by the specified amounts.
     * Returns a reference to 'this', for chaining.
     */
    public offsetLocal(xOffset: number, yOffset: number): Vector2 {
        this.x += xOffset;
        this.y += yOffset;
        return this;
    }

    /** Returns a copy of this Vector2, offset by the specified amount. */
    public offset(xOffset: number, yOffset: number, out: Vector2 | null = null): Vector2 {
        return this.clone(out).offsetLocal(xOffset, yOffset);
    }

    /**
     * Returns a vector that is perpendicular to this one.
     * If ccw = true, the perpendicular vector is rotated 90 degrees counter-clockwise from this
     * vector, otherwise it's rotated 90 degrees clockwise.
     */
    public getPerp(ccw: boolean = true, out: Vector2 | null = null): Vector2 {
        out = (out || new Vector2());
        if (ccw) {
            return out.set(-this.y, this.x);
        } else {
            return out.set(this.y, -this.x);
        }
    }

    /** Scales this vector by value. */
    public scaleLocal(value: number): Vector2 {
        this.x *= value;
        this.y *= value;
        return this;
    }

    /** Returns (this * value). */
    public scale(value: number, out: Vector2 | null = null): Vector2 {
        return this.clone(out).scaleLocal(value);
    }

    /** Multiplies this vector's components by the given vector's components. */
    public multLocal(v: Vector2): Vector2 {
        this.x *= v.x;
        this.y *= v.y;
        return this;
    }

    /** Returns a copy of this vector, multiplied by the given vector's components. */
    public mult(v: Vector2, out: Vector2 | null = null): Vector2 {
        return this.clone(out).multLocal(v);
    }

    /** Inverts the vector. */
    public invertLocal(): Vector2 {
        this.x = -this.x;
        this.y = -this.y;
        return this;
    }

    /** Returns a copy of the vector, inverted. */
    public invert(out: Vector2 | null = null): Vector2 {
        return this.clone(out).invertLocal();
    }

    /** Returns true if this vector is exactly equal to v.
     * AMW: I am going to assert that we are never going to need the
     * crazy version where we are passing a Record for no reason.
     * The only other place we use the Record type is in getCache and putCache
     * in Folder, and that is because we don't have a schema for what that
     * cache should be yet.
     */
    public equals(v: Vector2): boolean {
        return (v != null && this.x === v.x && this.y === v.y);
    }

    /** Returns true if this Vector's components are equal to v within epsilon */
    public epsilonEquals(v: Vector2, epsilon = 0.00001): boolean {
        return this.similar(v, epsilon);
    }

    /**
     * Returns true if the components of v are equal to the components of this Vector2,
     * within the given epsilon.
     */
    public similar(v: Vector2, epsilon: number): boolean {
        return ((Math.abs(this.x - v.x) <= epsilon) && (Math.abs(this.y - v.y) <= epsilon));
    }

    /** Returns a string representation of the Vector2. */
    public toString(): string {
        return `${this.x},${this.y}`;
    }
}
