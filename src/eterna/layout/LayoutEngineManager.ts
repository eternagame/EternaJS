import LayoutEngine from './LayoutEngine';

export default class LayoutEngineManager {
    public static get instance(): LayoutEngineManager {
        if (LayoutEngineManager._instance == null) {
            LayoutEngineManager._instance = new LayoutEngineManager();
        }
        return LayoutEngineManager._instance;
    }

    public addLayoutEngine(layoutEngine: LayoutEngine): void {
        for (const other of this._layoutEngines) {
            if (other.name === layoutEngine.name) {
                throw new Error(`Trying to generate layout engines with duplicate names ('${layoutEngine.name}')`);
            }
        }
        this._layoutEngines.push(layoutEngine);
    }

    public isLayoutEngine(name: string): boolean {
        for (const layoutEngine of this._layoutEngines) {
            if (layoutEngine.name.toLowerCase() === name.toLowerCase()) {
                return true;
            }
        }
        return false;
    }

    public getLayoutEngine(name: string): LayoutEngine | null {
        for (const layoutEngine of this._layoutEngines) {
            if (layoutEngine.name.toLowerCase() === name.toLowerCase()) {
                return layoutEngine;
            }
        }

        return null;
    }

    public static dispose() {
        LayoutEngineManager._instance = null;
    }

    private _layoutEngines: LayoutEngine[] = [];
    private static _instance: LayoutEngineManager | null;
}
