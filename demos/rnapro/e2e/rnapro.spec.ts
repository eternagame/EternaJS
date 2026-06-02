import {test, expect} from '@playwright/test';
import * as fs from 'fs';

/* eslint-disable @typescript-eslint/no-explicit-any */
const DAEMON = 'http://127.0.0.1:8765';
const BRIDGE = 'http://127.0.0.1:8788';

// Suite B — RNAPro end-to-end: daemon, bridge, client 2D, 3D, download, and a second sequence.
test('Suite B: RNAPro 3D demo end-to-end', async ({page, request}) => {
    const logs: string[] = [];
    page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
    page.on('pageerror', (e) => logs.push(`[PAGEERROR] ${e.message}`));
    fs.mkdirSync('artifacts', {recursive: true});

    // B1: daemon health + predict
    expect((await (await request.get(`${DAEMON}/health`)).json()).ok).toBeTruthy();
    const pred = await (await request.post(`${DAEMON}/predict`, {
        data: {target_id: 'suiteB', sequence: 'GGGAAACC', n_cycle: 4, n_step: 50},
    })).json();
    expect(pred.ok).toBeTruthy();
    expect(pred.pdb).toBeTruthy();

    // B2: bridge /fold -> dssr 2D + PDB text + c1 coords
    const fold = await (await request.get(`${BRIDGE}/fold?id=suiteB&seq=GGGAAACC`)).json();
    expect(fold.ok).toBeTruthy();
    expect(fold.secstruct).toHaveLength(8);
    expect(fold.pdb).toMatch(/ATOM/);
    expect(Array.isArray(fold.c1_coords) && fold.c1_coords.length).toBe(8);

    // B3: client load with RNAPro selected
    await page.goto('/?rnaprodemo=1', {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => !!(window as any).app, null, {timeout: 120_000});
    await page.waitForFunction(
        () => !!(window as any).__rnaproLatest?.pdb, null, {timeout: 90_000}
    );
    await page.waitForTimeout(1500);
    const folder = await page.evaluate(() => (window as any).__eternaDemo?.getFolderName?.());
    expect(folder).toBe('RNAPro');

    // B4: 2D consistency — displayed dssr structure equals the bridge's for the same sequence
    const latest1 = await page.evaluate(() => (window as any).__rnaproLatest);
    expect(latest1.sequence).toBe('GGGAAACC');
    expect(latest1.secstruct).toBe(fold.secstruct);
    await page.screenshot({path: 'artifacts/rnapro-2d.png'});

    // B5: 3D auto-shows (no button) and renders (NGL adds a canvas)
    await page.waitForFunction(() => (window as any).__eternaDemo?.get3DInfo?.()?.open === true,
        null, {timeout: 30_000});
    await page.waitForTimeout(8000);
    const canvases = await page.evaluate(() => document.querySelectorAll('canvas').length);
    expect(canvases).toBeGreaterThan(1);
    await page.screenshot({path: 'artifacts/rnapro-3d.png'});

    // B6: download PDB (via the in-panel button's handler)
    const [download] = await Promise.all([
        page.waitForEvent('download', {timeout: 30_000}),
        page.evaluate(() => (window as any).__eternaDemo.downloadPDB()),
    ]);
    const pdbText = fs.readFileSync(await download.path(), 'utf8');
    expect(pdbText).toMatch(/ATOM/);
    expect(download.suggestedFilename()).toContain('GGGAAACC');

    // B7: a second, distinct sequence round-trips (edit -> re-fold -> 2D/3D update, no stale cache)
    await page.evaluate(() => (window as any).__eternaDemo.setSequence('GGGAAACC'.replace(/./g, 'A')));
    // ^ 'AAAAAAAA' — fold it; wait until the stash reflects the new sequence
    await page.waitForFunction(
        () => (window as any).__rnaproLatest?.sequence === 'AAAAAAAA', null, {timeout: 90_000}
    );
    const latest2 = await page.evaluate(() => (window as any).__rnaproLatest);
    expect(latest2.sequence).toBe('AAAAAAAA');
    expect(latest2.pdb).toMatch(/ATOM/);
    // the open 3D view auto-refreshed to the new structure
    await page.waitForFunction(
        () => (window as any).__eternaDemo?.get3DInfo?.()?.sequence === 'AAAAAAAA',
        null, {timeout: 30_000}
    );
    await page.screenshot({path: 'artifacts/rnapro-2d-seq2.png'});

    fs.writeFileSync('artifacts/rnapro-console.log', logs.join('\n'));
    const errs = logs.filter((l) => l.startsWith('[PAGEERROR]'));
    console.log(`RNAPro PAGEERRORS: ${errs.length}`);
    errs.forEach((e) => console.log(e));
    expect(errs.length).toBe(0);
});
/* eslint-enable @typescript-eslint/no-explicit-any */
