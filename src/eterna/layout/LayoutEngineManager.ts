import Eterna from 'eterna/Eterna';
import RNApuzzler from './RNApuzzler';
import LayoutEngine from './LayoutEngine';

export default class LayoutEngineManager {
    public static get instance(): LayoutEngineManager {
        if (LayoutEngineManager._instance == null) {
            LayoutEngineManager._instance = new LayoutEngineManager();
        }
        return LayoutEngineManager._instance;
    }

    public addLayoutEngine(layoutEngine: LayoutEngine): void {
        for (let other of this._layoutEngines) {
            if (other.name === layoutEngine.name) {
                throw new Error(`Trying to generate layout engines with duplicate names ('${layoutEngine.name}')`);
            }
        }
        this._layoutEngines.push(layoutEngine);
    }

    public isLayoutEngine(name: string): boolean {
        for (let layoutEngine of this._layoutEngines) {
            if (layoutEngine.name.toLowerCase() === name.toLowerCase()) {
                return true;
            }
        }
        return false;
    }

    public getLayoutEngine(name: string): LayoutEngine | null {
        for (let layoutEngine of this._layoutEngines) {
            if (layoutEngine.name.toLowerCase() === name.toLowerCase()) {
                return layoutEngine;
            }
        }

        return null;
    }

    private _layoutEngines: LayoutEngine[] = [];
    private static _instance: LayoutEngineManager;
}
