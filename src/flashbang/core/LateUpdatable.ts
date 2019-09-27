export default interface LateUpdatable {
    /**
     * Update this object. dt is the number of seconds that have elapsed since the last update.
     * (lateUpdate() is called after all update() functions have completed. They're a good place
     * to handle rendering logic.)s
     */
    lateUpdate(dt: number): void;
}
