import {UnitSignal} from 'signals';
import {Arrays} from 'flashbang';
import Solution from 'eterna/puzzle/Solution';
import {DesignCategory} from './DesignBrowserMode';

export enum SortOrder {
    INCREASING = 1,
    DECREASING = -1,
    NONE = 0
}

export class SortCriterion {
    public readonly category: DesignCategory;
    public sortOrder: SortOrder;
    public arg?: string;

    constructor(category: DesignCategory, order: SortOrder, arg?: string) {
        this.category = category;
        this.sortOrder = order;
        this.arg = arg;
    }
}

export default class SortOptions {
    /** Emitted when any of our sort options have changed */
    public readonly sortChanged = new UnitSignal();

    constructor(validCategories: DesignCategory[]) {
        if (validCategories == null || validCategories.length === 0) {
            throw new Error("Sort names length can't be 0");
        }

        this._validCategories = validCategories.slice();
    }

    public get validCategories(): readonly DesignCategory[] { return this._validCategories; }
    public get sortCriteria(): readonly SortCriterion[] { return this._criteria; }

    public getUnusedCategories(): DesignCategory[] {
        return this._validCategories.filter((category) => !this.hasCriterion(category));
    }

    public getCriterion(category: DesignCategory): SortCriterion | undefined {
        return this._criteria.find((value) => value.category === category);
    }

    public hasCriterion(category: DesignCategory): boolean {
        return this.getCriterionIdx(category) >= 0;
    }

    public getCriterionIdx(category: DesignCategory): number {
        return this._criteria.findIndex((value) => value.category === category);
    }

    public getSortOrder(category: DesignCategory): SortOrder {
        let criterion = this.getCriterion(category);
        return criterion !== undefined ? criterion.sortOrder : SortOrder.NONE;
    }

    public compareSolutions(a: Solution, b: Solution): number {
        for (let criterion of this._criteria) {
            let aProperty: number | string;
            let bProperty: number | string;

            if (criterion.category === DesignCategory.SEQUENCE) {
                let anchorSequence: string | undefined = criterion.arg;
                if (anchorSequence === undefined) {
                    throw new Error('Cannot sort by sequence if the criterion argument is null!');
                }
                let aString: string = a.sequence;
                if (aString == null) throw new Error(`solution ${a.nodeID} invalid`);
                let bString: string = b.sequence;
                if (bString == null) throw new Error(`solution ${b.nodeID} invalid`);
                if (aString.length !== anchorSequence.length || bString.length !== anchorSequence.length) {
                    throw new Error('Wrong anchor sequence length');
                }

                let aScore = 0;
                let bScore = 0;

                for (let jj = 0; jj < aString.length; jj++) {
                    if (aString.charAt(jj) !== anchorSequence.charAt(jj)) {
                        aScore++;
                    }

                    if (bString.charAt(jj) !== anchorSequence.charAt(jj)) {
                        bScore++;
                    }
                }

                aProperty = aScore;
                bProperty = bScore;
            } else {
                aProperty = a.getProperty(criterion.category);
                bProperty = b.getProperty(criterion.category);
            }

            if (criterion.sortOrder < 0) {
                if (aProperty < bProperty) {
                    return 1;
                } else if (aProperty > bProperty) {
                    return -1;
                }
            } else if (aProperty < bProperty) {
                return -1;
            } else if (aProperty > bProperty) {
                return 1;
            }
        }

        if (a.nodeID < b.nodeID) {
            return 1;
        } else if (a.nodeID > b.nodeID) {
            return -1;
        }

        return 0;
    }

    public addCriteria(category: DesignCategory, sortOrder: SortOrder, sortArgs?: string): void {
        let cur = this.getCriterion(category);
        if (cur !== undefined) {
            cur.sortOrder = sortOrder;
            cur.arg = sortArgs;
            this.setCriteriaIdx(category, 0);
        } else {
            this._criteria.unshift(new SortCriterion(category, sortOrder, sortArgs));
        }

        this.sortChanged.emit();
    }

    public removeCriteria(category: DesignCategory): void {
        let idx = this.getCriterionIdx(category);
        if (idx < 0) {
            throw new Error(`Can't find sort_category ${category}`);
        }

        this._criteria.splice(idx, 1);

        this.sortChanged.emit();
    }

    public toggleSort(category: DesignCategory): SortOrder {
        let criterion = this.getCriterion(category);
        if (criterion === undefined) {
            throw new Error(`Can't find category ${category}`);
        }

        criterion.sortOrder *= -1;
        this.sortChanged.emit();

        return criterion.sortOrder;
    }

    public setCriteriaIdx(category: DesignCategory, newIdx: number): void {
        let curIdx = this.getCriterionIdx(category);
        if (curIdx < 0) {
            throw new Error(`Can't find sort_category ${category}`);
        }

        if (newIdx === curIdx || newIdx < 0 || newIdx >= this._criteria.length) {
            return;
        }

        Arrays.swap(this._criteria, curIdx, newIdx);

        this.sortChanged.emit();
    }

    private readonly _validCategories: DesignCategory[];
    private readonly _criteria: SortCriterion[] = [];
}
