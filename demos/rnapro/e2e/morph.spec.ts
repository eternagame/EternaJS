import {test, expect} from '@playwright/test';
import * as fs from 'fs';

/* eslint-disable @typescript-eslint/no-explicit-any */
// Auto-refresh + morph: open 3D on the initial structure, change the sequence, and confirm the 3D
// view auto-updates (morph endpoints delivered, dialog stays open, no errors) while in natural mode.
test('3D auto-refreshes with morph on sequence change', async ({page}) => {
    const logs: string[] = [];
    page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
    page.on('pageerror', (e) => logs.push(`[PAGEERROR] ${e.message}`));
    fs.mkdirSync('artifacts', {recursive: true});

    await page.goto('/?rnaprodemo=1', {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => !!(window as any).app, null, {timeout: 120_000});
    await page.waitForFunction(() => !!(window as any).__rnaproLatest?.pdb, null, {timeout: 90_000});

    // The 3D view auto-opens once the first structure arrives (no button)
    await page.waitForFunction(() => (window as any).__eternaDemo?.get3DInfo?.()?.open === true,
        null, {timeout: 30_000});
    await page.waitForTimeout(5000);
    const canvasesWith3D = await page.evaluate(() => document.querySelectorAll('canvas').length);
    expect(canvasesWith3D).toBeGreaterThan(1);
    await page.screenshot({path: 'artifacts/morph-before.png'});

    // Confirm we're in natural mode (auto-refresh is gated on it) and capture the 3D's current state
    const info0 = await page.evaluate(() => (window as any).__eternaDemo.get3DInfo());
    console.log('3D before edit:', JSON.stringify(info0));
    expect(info0.open).toBeTruthy();
    expect(info0.naturalMode).toBeTruthy();
    expect(info0.sequence).toBe('GGGAAACC');

    // Change the sequence WITHOUT touching the 3D button -> should auto-refresh + morph.
    // Don't return the pasteSequence promise (fire-and-forget); we poll the stash below.
    await page.evaluate(() => { (window as any).__eternaDemo.setSequence('CGCGCGCG'); });
    await page.waitForFunction(
        () => (window as any).__rnaproLatest?.sequence === 'CGCGCGCG', null, {timeout: 90_000}
    );
    const latest = await page.evaluate(() => (window as any).__rnaproLatest);
    console.log('after edit:', JSON.stringify({seq: latest.sequence, ss: latest.secstruct}));
    expect(latest.sequence).toBe('CGCGCGCG');

    // let the morph animation play, then verify the 3D view AUTO-REFRESHED to the new structure
    // (without us clicking Show 3D again). The morph itself is exercised by sync.spec.ts.
    await page.waitForTimeout(3000);
    const info1 = await page.evaluate(() => (window as any).__eternaDemo.get3DInfo());
    console.log('3D after edit:', JSON.stringify(info1));
    expect(info1.open).toBeTruthy();
    expect(info1.sequence).toBe('CGCGCGCG'); // the open dialog now shows the new structure
    const canvasesAfter = await page.evaluate(() => document.querySelectorAll('canvas').length);
    expect(canvasesAfter).toBeGreaterThan(1);
    await page.screenshot({path: 'artifacts/morph-after.png'});

    fs.writeFileSync('artifacts/morph-console.log', logs.join('\n'));
    const errs = logs.filter((l) => l.startsWith('[PAGEERROR]'));
    console.log(`morph PAGEERRORS: ${errs.length}`);
    errs.forEach((e) => console.log(e));
    expect(errs.length).toBe(0);
});
/* eslint-enable @typescript-eslint/no-explicit-any */
