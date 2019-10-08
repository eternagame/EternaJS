export default interface Updatable {
    /** Update this object. dt is the number of seconds that have elapsed since the last update. */
    update(dt: number): void;
}
