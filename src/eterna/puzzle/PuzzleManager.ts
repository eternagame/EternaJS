import { Puzzle, SolutionManager } from ".";
import { PuzzleOptionalParams, StateCondition, OligoFoldMode, MultistrandCondition } from "./Puzzle";
import { Sequence, SecondaryStructure, StrandSubset } from "../util/RNA";
import * as log from "loglevel";
import Booster, { BoosterType } from "eterna/boosters/Booster";
import Constraint from "eterna/constraints/Constraint";
import { AntiShapeConstraint, BarcodeConstraint, MultistrandBindingsConstraint, OligoBoundConstraint, OligoUnboundConstraint, ConsecutiveAConstraint, ConsecutiveCConstraint, ConsecutiveGConstraint, ConsecutiveUConstraint, MaximumAConstraint, MaximumCConstraint, MaximumGConstraint, MaximumUConstraint, MaximumMutationConstraint, MaximumAUConstraint, MaximumGCConstraint, MaximumGUConstraint, MinimumAConstraint, MinimumCConstraint, MinimumGConstraint, MinimumUConstraint, MinimumAUConstraint, MinimumGUConstraint, MinimumAnyPairConstraint, MinimumStackLengthConstraint, ScriptConstraint, ShapeConstraint, SynthesisConstraint, MinimumGCConstraint } from "eterna/constraints";
import Eterna from "eterna/Eterna";

enum TailMode {
    NONE = 0,
    LONG = 1,
    SHORT = 2
}

interface BoosterSpec {
    type: BoosterType;
    script: string;
    icons_b64?:string[];
    label?: string;
    tooltip?: string;
}

type StateType = "single" | "multistrand" | "aptamer" | "oligo" | "aptamer+oligo";

interface BaseObjectiveSpec {
    secstruct: string;
    structure_constrainted_bases?: number[];
    anti_secstruct?: string;
    anti_structure_constrained_bases?: number[];
    state_name?: string;
    IUPAC?: string;
    type: StateType
}

interface MultistrandOligoSpec {
    bind?: boolean;
    concentration: string | number;
    sequence: string;
    name?: string;
}

interface MultistrandSpec {
    type: "multistrand";
    oligos: MultistrandOligoSpec[];
}

interface LigandSpec {
    type: "aptamer" | "aptamer+oligo";
    site: number[];
    concentration: string | number;
    fold_version?: number;
}

interface OligoSpec {
    type: "oligo" | "aptamer+oligo";
    oligo_label: string;
    oligo_name: string;
    oligo_sequence: string;
    oligo_concentration: string | number;
    fold_mode: OligoFoldMode;
}

interface SingleSpec {
    type: "single";
}

type ObjectiveSpec = BaseObjectiveSpec & (SingleSpec|LigandSpec|OligoSpec|MultistrandSpec)

function isLigandSpec(spec: LigandSpec | ObjectiveSpec): spec is LigandSpec {
    return spec.type == "aptamer" || spec.type == "aptamer+oligo";
}

function isOligoSpec(spec: OligoSpec | ObjectiveSpec): spec is OligoSpec {
    return spec.type == "oligo" || spec.type == "aptamer+oligo";
}

export default class PuzzleManager {
    public static get instance(): PuzzleManager {
        if (PuzzleManager._instance == null) {
            PuzzleManager._instance = new PuzzleManager();
        }
        return PuzzleManager._instance;
    }

    public async parsePuzzle(jsonResponse: string): Promise<Puzzle> {
        let optionalParams:PuzzleOptionalParams = {};

        let json = JSON.parse(jsonResponse);

        if (json["folder"] && json["folder"].length > 0) {
            optionalParams.defaultFolder = json["folder"];
        }

        if (json["reward"] && json["reward"].length > 0) {
            optionalParams.reward = Number(json["reward"]);
        }

        if (json["ui-specs"]) {
            // New style UI elements (scripted) are identified as JSON objects
            if (json["ui-specs"].substr(0, 1) === "{") {
                let uiSpecs = JSON.parse(json["ui-specs"]);
                if (uiSpecs['mission']) optionalParams.missionText = uiSpecs['mission']['text'];
                if (uiSpecs['mission_cleared']) {
                    optionalParams.missionClearedMessage = uiSpecs['mission_cleared']['info'];
                    optionalParams.missionClearedExtraInfo = uiSpecs['mission_cleared']['more'];
                }

                if (uiSpecs['paint_tools'] || uiSpecs['actions']) {
                    optionalParams.boosters = await Promise.all(
                        (uiSpecs['paint_tools'] || []).concat(uiSpecs['actions'] || [])
                            .map((spec: BoosterSpec) => Booster.create(
                                spec.type, Number(spec.script), {label: spec.label, tooltip: spec.tooltip, b64Icons: spec.icons_b64}
                            ))
                    );
                }
            } else {
                // Old tutorials - TODO: Drop old tuts from DB (or remove specs, or move to rscript) and remove this check
                log.warn("Old tutorial specification is no longer supported");
            }
        }

        if (json["next-puzzle"]) {
            optionalParams.nextPuzzleID = Number(json["next-puzzle"]);
        }

        if (json["last-round"] != null) {
            optionalParams.round = Number(json["last-round"]) + 1;
        }
        

        let stateConditions: StateCondition[];
        if (json["objective"] && json["objective"].length > 0) {
            stateConditions = json["objective"].map((spec: ObjectiveSpec): StateCondition => {
                let condition:StateCondition = {
                    targetStructure: new SecondaryStructure(spec.secstruct),
                    structureRequiredBases: spec.structure_constrainted_bases ? 
                        StrandSubset.fromRanges(spec.structure_constrainted_bases) : undefined,
                    targetAntiStructure: spec.anti_secstruct ?
                        new SecondaryStructure(spec.anti_secstruct) : undefined,
                    antiStructureRequiredBases: spec.anti_secstruct && spec.anti_structure_constrained_bases ?
                        StrandSubset.fromRanges(spec.anti_structure_constrained_bases) : undefined,
                    stateName: spec.state_name,
                    IUPACBaseRestrictions: spec.IUPAC
                }

                if (condition.antiStructureRequiredBases && !condition.targetAntiStructure) {
                    log.warn("Anti-structure required bases are specified, but no target ant-structure");
                }

                if (
                    condition.targetAntiStructure
                    && condition.targetAntiStructure.fullLength != condition.targetStructure.fullLength
                ) {
                    throw new Error("Target anti-structure length and target structure length don't match");
                }

                if (isLigandSpec(spec)) {
                    condition.ligandCondition = {
                        bindingSiteBases: spec.site,
                        concentration: Number(spec.concentration),
                        foldVersion: spec.fold_version,
                        bindingPairs: spec.site.map(baseIndex => condition.targetStructure.pairmap[baseIndex]),
                        bonus: -0.6 * Math.log(Number(spec.concentration) / 3) * 100
                    }
                }

                const BOLTZMANN = 0.0019872041; // kcal/mol/K
                const KELVIN_0C = 273.15;
                const DEFAULT_OLIGO_CONCENTRATION = 1;

                if (isOligoSpec(spec)) {
                    condition.oligoCondition = {
                        label: spec.oligo_label,
                        name: spec.oligo_name,
                        sequence: new Sequence(spec.oligo_sequence),
                        concentration: Number(spec.oligo_concentration) || DEFAULT_OLIGO_CONCENTRATION,
                        foldMode: spec.fold_mode || OligoFoldMode.DIMER,
                        malus: -BOLTZMANN * (KELVIN_0C + 37) * Math.log(Number(spec.oligo_concentration) || DEFAULT_OLIGO_CONCENTRATION)
                    }
                }

                if (spec.type == "multistrand") {
                    condition.multistrandConditions = spec.oligos.map((oligoSpec: MultistrandOligoSpec): MultistrandCondition => {
                        return {
                            name: oligoSpec.name,
                            concentration: Number(oligoSpec.concentration) || DEFAULT_OLIGO_CONCENTRATION,
                            sequence: new Sequence(oligoSpec.sequence),
                            bind: oligoSpec.bind,
                            malus: -BOLTZMANN * (KELVIN_0C + 37) * Math.log(Number(oligoSpec.concentration) || DEFAULT_OLIGO_CONCENTRATION)
                        }
                    })
                }

                return condition;
            });
        } else {
            stateConditions = [
                {targetStructure: new SecondaryStructure(json['secstruct'])}
            ]
        }

        if (json["locks"] && json["locks"].length > 0) {
            let lockString: string = json["locks"];
            optionalParams.locks = new StrandSubset(
                lockString.split('').map(char => char == 'x' ? true : false)
            );
        } else {
            optionalParams.locks = new StrandSubset();
        }

        if (json["beginseq"] && json["beginseq"].length > 0) {
            if (json["beginseq"].length !== json["secstruct"].length) {
                throw new Error(`Beginning sequence length doesn't match pair length for puzzle ${json["Title"]}`);
            }
            optionalParams.beginningSequence = new Sequence(json["beginseq"]);
        } else {
            optionalParams.beginningSequence = new Sequence('A'.repeat(stateConditions[0].targetStructure.strandLength));
        }

        if (json["num-submissions"] != null) {
            optionalParams.submissionsRemaining = Number(json["num-submissions"]);
        }

        if (json["rscript"] || json["events"]) {
            // TODO: Refactor RNAScript to not rely on passing Puzzle/Mode?
            //optionalParams.rscript = new RNAScript(json["rscript"] || json["events"]);
        }

        if (json["hint"]) {
            optionalParams.hint = json["hint"];
        }

        let constraints: Constraint[] = [];
        if (json["constraints"] && json["constraints"].length > 0) {
            let constraintDefs = json["constraints"].split(',');
            if (constraintDefs.length % 2 === 1) {
                throw new Error("Invalid constraint definition - uneven number of constraints and parameters");
            }

            let rawConstraints: Constraint[] = [];
            let shapeConstraints: ShapeConstraint[] = [];
            let antiShapeConstraints: AntiShapeConstraint[] = [];

            for (let i=0; i<constraintDefs.length; i+=2) {
                switch (constraintDefs[i]) {
                    case "SOFT":
                        optionalParams.softConstraints = true;
                        break;
                    case AntiShapeConstraint.NAME:
                        antiShapeConstraints[Number(constraintDefs[i+1])] = new AntiShapeConstraint(Number(constraintDefs[i+1]));
                        break;
                    case MultistrandBindingsConstraint.NAME:
                        rawConstraints.push(new MultistrandBindingsConstraint(Number(constraintDefs[i+1])));
                        break;
                    case OligoBoundConstraint.NAME:
                        rawConstraints.push(new OligoBoundConstraint(Number(constraintDefs[i+1])));
                        break;
                    case OligoUnboundConstraint.NAME:
                        rawConstraints.push(new OligoUnboundConstraint(Number(constraintDefs[i+1])));
                        break;
                    case ConsecutiveAConstraint.NAME:
                        rawConstraints.push(new ConsecutiveAConstraint(Number(constraintDefs[i+1])));
                        break;
                    case ConsecutiveCConstraint.NAME:
                        rawConstraints.push(new ConsecutiveCConstraint(Number(constraintDefs[i+1])));
                        break;
                    case ConsecutiveGConstraint.NAME:
                        rawConstraints.push(new ConsecutiveGConstraint(Number(constraintDefs[i+1])));
                        break;
                    case ConsecutiveUConstraint.NAME:
                        rawConstraints.push(new ConsecutiveUConstraint(Number(constraintDefs[i+1])));
                        break;
                    case MaximumAConstraint.NAME:
                        rawConstraints.push(new MaximumAConstraint(Number(constraintDefs[i+1])));
                        break;
                    case MaximumCConstraint.NAME:
                        rawConstraints.push(new MaximumCConstraint(Number(constraintDefs[i+1])));
                        break;
                    case MaximumGConstraint.NAME:
                        rawConstraints.push(new MaximumGConstraint(Number(constraintDefs[i+1])));
                        break;
                    case MaximumUConstraint.NAME:
                        rawConstraints.push(new MaximumUConstraint(Number(constraintDefs[i+1])));
                        break;
                    case MaximumMutationConstraint.NAME:
                        rawConstraints.push(new MaximumMutationConstraint(Number(constraintDefs[i+1])));
                        break;
                    case MaximumAUConstraint.NAME:
                        rawConstraints.push(new MaximumAUConstraint(Number(constraintDefs[i+1])));
                        break;
                    case MaximumGCConstraint.NAME:
                        rawConstraints.push(new MaximumGCConstraint(Number(constraintDefs[i+1])));
                        break;
                    case MaximumGUConstraint.NAME:
                        rawConstraints.push(new MaximumGUConstraint(Number(constraintDefs[i+1])));
                        break;
                    case MinimumAConstraint.NAME:
                        rawConstraints.push(new MinimumAConstraint(Number(constraintDefs[i+1])));
                        break;
                    case MinimumCConstraint.NAME:
                        rawConstraints.push(new MinimumCConstraint(Number(constraintDefs[i+1])));
                        break;
                    case MinimumGConstraint.NAME:
                        rawConstraints.push(new MinimumGConstraint(Number(constraintDefs[i+1])));
                        break;
                    case MinimumUConstraint.NAME:
                        rawConstraints.push(new MinimumUConstraint(Number(constraintDefs[i+1])));
                        break;
                    case MinimumAUConstraint.NAME:
                        rawConstraints.push(new MinimumAUConstraint(Number(constraintDefs[i+1])));
                        break;
                    case MinimumGCConstraint.NAME:
                        rawConstraints.push(new MinimumGCConstraint(Number(constraintDefs[i+1])));
                        break;
                    case MinimumGUConstraint.NAME:
                        rawConstraints.push(new MinimumGUConstraint(Number(constraintDefs[i+1])));
                        break;
                    case MinimumAnyPairConstraint.NAME:
                        rawConstraints.push(new MinimumAnyPairConstraint(Number(constraintDefs[i+1])));
                        break;
                    case MinimumStackLengthConstraint.NAME:
                        rawConstraints.push(new MinimumStackLengthConstraint(Number(constraintDefs[i+1])));
                        break;
                    case ScriptConstraint.NAME:
                        rawConstraints.push(new ScriptConstraint(Number(constraintDefs[i+1])));
                        break;
                    case ShapeConstraint.NAME:
                        shapeConstraints[Number(constraintDefs[i+1])] = new ShapeConstraint(Number(constraintDefs[i+1]));
                        break;
                    case SynthesisConstraint.NAME:
                        rawConstraints.push(new SynthesisConstraint());
                        break;
                    default:
                        log.warn(`Unknown constraint ${constraintDefs[i]} - skipping`);
                }
            }

            // Antishape/shape constraints should be first in the constraint list, in order of state
            for (let i=0; i<Math.max(antiShapeConstraints.length, shapeConstraints.length); i++) {
                if (antiShapeConstraints[i]) {
                    constraints.push(antiShapeConstraints[i]);
                }

                if (shapeConstraints[i]) {
                    constraints.push(shapeConstraints[i]);
                }
            }

            constraints = constraints.concat(rawConstraints);
        }

        if (json["check_hairpin"] && Number(json["check_hairpin"])) {
            constraints.push(new BarcodeConstraint());
            let strandLength = stateConditions[0].targetStructure.strandLength;
            optionalParams.barcodeIndices = new StrandSubset(new Array(strandLength).fill(true, strandLength-20, strandLength-1));
        }

        let tailMode:TailMode = Number(json["usetails"]);

        // NOTE: While target structure and antistructure are modified, the constrained bases are not
        // Maybe this should change? If so, we'd need to adjust all the existing puzzles accordingly
        if (tailMode !== TailMode.NONE) {
            let strandLength = stateConditions[0].targetStructure.strandLength;
            let oldLocks = optionalParams.locks;

            if (tailMode === TailMode.LONG) {
                optionalParams.locks = StrandSubset.fromRanges([0,4, ...optionalParams.locks.ranges, strandLength-20, strandLength-1]);
                optionalParams.beginningSequence = new Sequence("GGAAA" + optionalParams.beginningSequence + "AAAGAAACAACAACAACAAC");
                optionalParams.barcodeIndices = StrandSubset.fromRanges(optionalParams.barcodeIndices.ranges.map(baseNum => baseNum + 5));
                for (let condition of stateConditions) {
                    condition.targetStructure = new SecondaryStructure('.....' + condition.targetStructure.dotBracket + '.'.repeat(20));
                    if (condition.targetAntiStructure) {
                        condition.targetAntiStructure = new SecondaryStructure('.....' + condition.targetAntiStructure.dotBracket + '.'.repeat(20));
                    }
                }
            } else if (tailMode === TailMode.SHORT) {
                optionalParams.locks = StrandSubset.fromRanges([0,1, ...optionalParams.locks.ranges, strandLength-20, strandLength-1]);
                optionalParams.beginningSequence = new Sequence("GG" + optionalParams.beginningSequence + "AAAGAAACAACAACAACAAC");
                optionalParams.barcodeIndices = StrandSubset.fromRanges(optionalParams.barcodeIndices.ranges.map(baseNum => baseNum + 2));
                for (let condition of stateConditions) {
                    condition.targetStructure = new SecondaryStructure('..' + condition.targetStructure.dotBracket + '.'.repeat(20));
                    if (condition.targetAntiStructure) {
                        condition.targetAntiStructure = new SecondaryStructure('..' + condition.targetAntiStructure.dotBracket + '.'.repeat(20));
                    }
                }
            }
        }
        
        optionalParams.nid = Number(json["id"]);
        optionalParams.name = json["title"];
        optionalParams.puzzleType = json["type"];

        return new Puzzle(
            stateConditions,
            constraints,
            optionalParams
        )
    }

    public async getPuzzleByID(puznid: number, scriptid: number = -1): Promise<Puzzle> {
        log.info(`Loading puzzle [nid=${puznid}, scriptid=${scriptid}...]`);

        let json = await Eterna.client.getPuzzle(puznid, scriptid);
        let data: any = json["data"];

        if (data["hairpins"]) {
            SolutionManager.instance.addHairpins(data["hairpins"]);
        }

        let puzzle = await this.parsePuzzle(data["puzzle"]);
        log.info(`Loaded puzzle [name=${puzzle.name}]`);
        return puzzle;
    }

    private static _instance: PuzzleManager;
}