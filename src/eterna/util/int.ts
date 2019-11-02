/**
 *
 * Emulates the int() function in AS3: casts the given value to a number and floors it
 *
 * @param value either a string or number to be rounded.
 */
export default function int(value: string | number): number {
    return Math.floor(Number(value));
}
