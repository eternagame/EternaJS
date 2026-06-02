import {test, expect} from '@playwright/test';

/* eslint-disable @typescript-eslint/no-explicit-any */
// The 3D view should stay in sync with the 2D pose across ALL the same triggers 2D animates on:
// edits, CACHED structures (re-requesting a folded sequence), and UNDO/REDO.
const info = (page: any) => page.evaluate(() => (window as any).__eternaDemo.get3DInfo());

// wait until the open 3D view has caught up to the current 2D pose sequence (== target if given)
async function wait3DInSync(page: any, target?: string) {
    await page.waitForFunction((t: string | undefined) => {
        const i = (window as any).__eternaDemo?.get3DInfo?.();
        if (!i || !i.open) return false;
        if (i.sequence !== i.poseSequence) return false;
        return t ? i.sequence === t : true;
    }, target, {timeout: 60_000});
}

test('3D stays in sync with 2D on edit, cache, and undo/redo', async ({page}) => {
    const logs: string[] = [];
    page.on('pageerror', (e) => logs.push(`[PAGEERROR] ${e.message}`));

    await page.goto('/?rnaprodemo=1', {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => !!(window as any).app, null, {timeout: 120_000});
    await page.waitForFunction(() => (window as any).__eternaDemo?.get3DInfo?.()?.open === true,
        null, {timeout: 90_000});
    await wait3DInSync(page, 'GGGAAACC');

    // Edit to a new sequence -> folds -> 3D morphs to it
    await page.evaluate(() => (window as any).__eternaDemo.setSequence('CGCGCGCG'));
    await wait3DInSync(page, 'CGCGCGCG');

    // Re-request the ORIGINAL sequence: cached (no recompute) but 3D must still morph back to it
    await page.evaluate(() => (window as any).__eternaDemo.setSequence('GGGAAACC'));
    await wait3DInSync(page, 'GGGAAACC');
    expect((await info(page)).sequence).toBe('GGGAAACC');

    // UNDO -> 3D follows 2D back
    const beforeUndo = (await info(page)).sequence;
    await page.evaluate(() => (window as any).__eternaDemo.undo());
    await wait3DInSync(page);
    const afterUndo = await info(page);
    expect(afterUndo.sequence).toBe(afterUndo.poseSequence); // 3D == 2D
    expect(afterUndo.sequence).not.toBe(beforeUndo);          // it actually changed

    // REDO -> 3D follows 2D forward
    await page.evaluate(() => (window as any).__eternaDemo.redo());
    await wait3DInSync(page);
    const afterRedo = await info(page);
    expect(afterRedo.sequence).toBe(afterRedo.poseSequence);
    expect(afterRedo.sequence).toBe(beforeUndo);

    expect(logs.filter((l) => l.startsWith('[PAGEERROR]')).length).toBe(0);
});
/* eslint-enable @typescript-eslint/no-explicit-any */
