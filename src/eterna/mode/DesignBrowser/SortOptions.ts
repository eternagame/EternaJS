import {UnitSignal} from "../../../signals/UnitSignal";
import {Solution} from "../../puzzle/Solution";

export enum SortOrder {
    INCREASING = 1,
    DECREASING = -1,
    NONE = 0
}

export class SortCriterion {
    public readonly category: string;
    public sortOrder: SortOrder;
    public arg: string;

    public constructor(category: string, order: SortOrder, arg: string = null) {
        this.category = category;
        this.sortOrder = order;
        this.arg = arg;
    }
}

export class SortOptions {
    /** Emitted when any of our sort options have changed */
    public readonly sortChanged = new UnitSignal();

    public constructor(sortNames: string[]) {
        if (sortNames == null || sortNames.length == 0) {
            throw new Error("Sort names length can't be 0");
        }

        this._sortNames = sortNames.slice();
    }

    public get sortNames(): ReadonlyArray<string> { return this._sortNames; }
    public get sortCriteria(): ReadonlyArray<SortCriterion> { return this._criteria; }

    public getCriterion(category: string): SortCriterion | null {
        return this._criteria.find(value => value.category === category);
    }

    public getCriterionIdx(category: string): number {
        return this._criteria.findIndex(value => value.category === category);
    }

    public getSortOrder(category: string): SortOrder {
        let criterion = this.getCriterion(category);
        return criterion != null ? criterion.sortOrder : SortOrder.NONE;
    }

    public compareSolutions(a: Solution, b: Solution): number {
        for (let criterion of this._criteria) {
            let aProperty: any;
            let bProperty: any;

            if (criterion.category.indexOf("Sequence") >= 0) {
                let anchor_sequence: string = criterion.arg;
                let a_string: string = a.sequence;
                if (a_string == null) throw new Error("solution " + a.nodeID + " invalid");
                let b_string: string = b.sequence;
                if (b_string == null) throw new Error("solution " + b.nodeID + " invalid");
                if (a_string.length != anchor_sequence.length || b_string.length != anchor_sequence.length) {
                    throw new Error("Wrong anchor sequence length");
                }

                let a_score: number = 0;
                let b_score: number = 0;

                for (let jj = 0; jj < a_string.length; jj++) {
                    if (a_string.charAt(jj) != anchor_sequence.charAt(jj)) {
                        a_score++;
                    }

                    if (b_string.charAt(jj) != anchor_sequence.charAt(jj)) {
                        b_score++;
                    }
                }

                aProperty = a_score;
                bProperty = b_score;

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

            } else {
                if (aProperty < bProperty) {
                    return -1;
                } else if (aProperty > bProperty) {
                    return 1;
                }
            }

        }

        if (a.nodeID < b.nodeID) {
            return 1;
        } else if (a.nodeID > b.nodeID) {
            return -1;
        }

        return 0;
    }

    public addCriteria(category: string, sortOrder: SortOrder, sortArgs: any = null): void {
        let cur = this.getCriterion(category);
        if (cur != null) {
            cur.sortOrder = sortOrder;
            cur.arg = sortArgs;
            this.setCriteriaIdx(category, 0);

        } else {
            this._criteria.unshift(new SortCriterion(category, sortOrder, sortArgs));
        }

        this.sortChanged.emit();
    }

    public removeCriteria(category: string): void {
        let idx = this.getCriterionIdx(category);
        if (idx < 0) {
            throw new Error("Can't find sort_category " + category);
        }

        this._criteria.splice(idx, 1);

        this.sortChanged.emit();
    }

    public toggleSort(category: string): SortOrder {
        let criterion = this.getCriterion(category);
        if (criterion == null) {
            throw new Error("Can't find category " + category);
        }

        criterion.sortOrder *= -1;
        this.sortChanged.emit();

        return criterion.sortOrder;
    }

    public setCriteriaIdx(category: string, newIdx: number): void {
        let curIdx = this.getCriterionIdx(category);
        if (curIdx < 0) {
            throw new Error("Can't find sort_category " + category);
        }

        if (newIdx === curIdx || newIdx < 0 || newIdx >= this._criteria.length) {
            return;
        }

        SortOptions.swap(this._criteria, curIdx, newIdx);

        this.sortChanged.emit();
    }

    private static swap<T>(array: T[], i: number, j: number): void {
        let temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }

    private readonly _sortNames: string[];
    private readonly _criteria: SortCriterion[] = [];
}
