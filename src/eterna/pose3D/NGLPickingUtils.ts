import EPars from 'eterna/EPars';
import Sequence from 'eterna/rnatypes/Sequence';
import {PickingProxy} from 'ngl';

export default class NGLPickingUtils {
    /**
     * Checks if atom clicked in 3D is a base
     * @param pickingProxy PickingProxy passed to pick mouse action
     * @returns Picked base index if it is base, otherwise null
     */
    public static checkForBase(pickingProxy: PickingProxy): number | null {
        if (pickingProxy.bond) {
            if (
                (pickingProxy.bond.atom1.residueIndex === pickingProxy.bond.atom2.residueIndex)
                && pickingProxy.bond.atom1.atomname.includes("C4'")
                && (
                    pickingProxy.bond.atom2.atomname.includes('N1')
                    || pickingProxy.bond.atom2.atomname.includes('N3')
                )
            ) {
                return pickingProxy.bond.atom1.residueIndex;
            }
        }
        return null;
    }

    /**
     * Determines what the content of the label should be when hovering over a base
     * @param pickingProxy PickingProxy passed to pick mouse action
     * @returns The contents of the label
     */
    public static getLabel(
        pickingProxy: PickingProxy,
        sequence: Sequence,
        customNumbering: (number|null)[] | undefined
    ) {
        const clickedBase = NGLPickingUtils.checkForBase(pickingProxy);

        // For now we just won't label atoms that aren't bases. In the future, we may want to do
        // something like using pickingProxy.getLabel to get the default label instead.
        if (clickedBase === null) return '';

        let baseNumber: string = (pickingProxy.bond.atom1.residueIndex + 1).toString();
        if (customNumbering) {
            const customNumber = customNumbering[pickingProxy.bond.atom1.residueIndex];
            if (customNumber === null) baseNumber = 'N/A';
            else baseNumber = customNumber.toString();
        }

        const baseType = EPars.nucleotideToString(sequence.nt(pickingProxy.bond.atom1.residueIndex));

        return `${baseNumber}: ${baseType}`;
    }
}
