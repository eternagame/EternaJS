/**
 * SolverManager.ts - Registry and lazy loader for RNA inverse folding solvers
 *
 *
 * Usage:
 *   // At app startup - just register loaders (no WASM loaded yet)
 *   SolverManager.instance.registerSolver('CDSfold', () => CDSfold.create());
 *
 *   // When user interacts with UI - load on demand
 *   const solver = await SolverManager.instance.loadSolver('CDSfold');
 */

import log from 'loglevel';
import Solver from './Solver';
import type {SolverOptions} from './Solver';

/**
 * Factory function that asynchronously creates a solver instance.
 * Returns null if the solver fails to load.
 */
export type SolverLoader = () => Promise<Solver | null>;

/**
 * Interface implemented by solver-specific params UI components.
 * Each params component collects user input and exposes it via getParameters().
 */
export interface SolverParamsComponent {
    getParameters(): SolverOptions;
}

/**
 * Factory function that creates a solver's params UI component.
 * @param domParent - Optional DOM parent for HTML input elements
 */
export type SolverParamsFactory = (domParent?: HTMLElement) => SolverParamsComponent;

/**
 * Internal record for a registered solver
 */
interface RegisteredSolver {
    /** Display name of the solver */
    name: string;
    /** Factory function to create the solver */
    loader: SolverLoader;
    /** Optional factory for this solver's params UI component */
    paramsFactory?: SolverParamsFactory;
    /** Loaded instance (null until loaded) */
    instance: Solver | null;
    /** In-flight loading promise (null when not loading) */
    loading: Promise<Solver | null> | null;
}

/**
 * Singleton manager for RNA inverse folding solvers.
 * Handles registration, lazy loading, and retrieval of solver instances.
 */
export default class SolverManager {
    /**
     * Get the singleton instance
     */
    public static get instance(): SolverManager {
        if (SolverManager._instance == null) {
            SolverManager._instance = new SolverManager();
        }
        return SolverManager._instance;
    }

    // ==================== REGISTRATION ====================

    /**
     * Register a solver loader. Call this at app startup.
     * The solver won't be loaded until loadSolver() is called.
     *
     * @param name - Unique solver name (e.g., "CDSfold")
     * @param loader - Factory function that loads and returns the solver
     * @throws Error if a solver with this name is already registered
     */
    public registerSolver(name: string, loader: SolverLoader, paramsFactory?: SolverParamsFactory): void {
        const key = name.toLowerCase();
        if (this._solvers.has(key)) {
            throw new Error(`Solver already registered: '${name}'`);
        }
        this._solvers.set(key, {
            name,
            loader,
            paramsFactory,
            instance: null,
            loading: null
        });
        log.debug(`Registered solver: ${name}`);
    }

    /**
     * Unregister a solver. Useful for testing or dynamic reconfiguration.
     *
     * @param name - Solver name to unregister
     * @returns true if the solver was unregistered, false if not found
     */
    public unregisterSolver(name: string): boolean {
        return this._solvers.delete(name.toLowerCase());
    }

    // ==================== LOADING ====================

    /**
     * Load a solver on demand. Call this when the UI needs the solver.
     * Returns the cached instance if already loaded.
     * Returns the in-flight promise if currently loading.
     *
     * @param name - Name of the solver to load
     * @returns Promise resolving to the solver instance, or null if loading fails
     */
    public async loadSolver(name: string): Promise<Solver | null> {
        const entry = this._solvers.get(name.toLowerCase());
        if (!entry) {
            log.warn(`Unknown solver: ${name}`);
            return null;
        }

        // Already loaded - return cached instance
        if (entry.instance) {
            return entry.instance;
        }

        // Currently loading - return existing promise to avoid duplicate loads
        if (entry.loading) {
            return entry.loading;
        }

        // Start loading
        log.info(`Loading solver: ${name}...`);
        entry.loading = entry.loader()
            .then((solver) => {
                entry.instance = solver;
                entry.loading = null;
                if (solver) {
                    log.info(`Solver loaded: ${name} (functional: ${solver.isReady})`);
                } else {
                    log.warn(`Solver failed to load: ${name}`);
                }
                return solver;
            })
            .catch((err) => {
                entry.loading = null;
                log.error(`Error loading solver ${name}:`, err);
                return null;
            });

        return entry.loading;
    }

    // ==================== UTILS ====================

    /**
     * Create the params UI component for a registered solver, if one was registered.
     *
     * @param name - Solver name
     * @param domParent - Optional DOM parent for HTML input elements
     * @returns The params component, or null if none was registered
     */
    public createParams(name: string, domParent?: HTMLElement): SolverParamsComponent | null {
        const entry = this._solvers.get(name.toLowerCase());
        return entry?.paramsFactory ? entry.paramsFactory(domParent) : null;
    }

    /**
     * Get all registered solver names
     */
    public getRegisteredSolvers(): string[] {
        return Array.from(this._solvers.values()).map((e) => e.name);
    }

    /**
     * Get all loaded, functional solver names
     *
     * @param filterCB - Optional filter callback
     * @returns Array of solver names that are loaded and functional
     */
    public getLoadedSolvers(
        filterCB: ((solver: Solver) => boolean) | null = null
    ): string[] {
        return Array.from(this._solvers.values())
            .filter((e) => e.instance?.isReady
                && (filterCB === null || filterCB(e.instance)))
            .map((e) => e.name);
    }

    // ==================== LIFECYCLE ====================

    /**
     * Dispose the singleton instance and all loaded solvers
     */
    public static dispose(): void {
        if (SolverManager._instance) {
            SolverManager._instance._solvers.clear();
        }
        SolverManager._instance = null;
    }

    private _solvers: Map<string, RegisteredSolver> = new Map();
    private static _instance: SolverManager | null = null;
}
