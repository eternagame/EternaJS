import {test, expect} from '@playwright/test';
import * as fs from 'fs';

// Suite A — baseline: prove the toolchain (Node + prebuilt engines + dev server + 2D + the
// existing 3D viewer) works on documented paths, before any RNAPro code. Gates Suite B.
test('Suite A: stock EternaJS baseline loads and renders', async ({page, request}) => {
    const logs: string[] = [];
    page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
    page.on('pageerror', (e) => logs.push(`[PAGEERROR] ${e.message}`));

    // A1: dev server responds
    const root = await request.get('http://localhost:63343/');
    expect(root.status()).toBe(200);
    expect(await root.text()).toMatch(/main\.[a-f0-9]+\.js/);

    // A2: clean load + window.app
    await page.goto('/?puzzle=4350940', {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => !!(window as unknown as {app?: unknown}).app, null, {timeout: 120_000});
    await page.waitForTimeout(18_000); // auth (guest) + engines + fetch + render puzzle

    // A3: Pixi canvas mounted, non-zero
    const canvas = await page.evaluate(() => {
        const c = document.querySelector('canvas') as HTMLCanvasElement | null;
        return c ? {w: c.width, h: c.height} : null;
    });
    expect(canvas).not.toBeNull();
    expect(canvas!.w).toBeGreaterThan(0);
    expect(canvas!.h).toBeGreaterThan(0);

    // A4: puzzle reached a real mode (MissionIntro or PoseEdit), not a fatal error
    const topMode = await page.evaluate(() => {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const app = (window as any).app;
        const ms = app._modeStack;
        const modes = ms?.modes || ms?._modes;
        return (Array.isArray(modes) ? modes[modes.length - 1] : null)?.constructor?.name ?? null;
        /* eslint-enable @typescript-eslint/no-explicit-any */
    });
    console.log('baseline topMode:', topMode);
    expect(['MissionIntroMode', 'PoseEditMode']).toContain(topMode);

    fs.mkdirSync('artifacts', {recursive: true});
    await page.screenshot({path: 'artifacts/baseline-loaded.png'});
    fs.writeFileSync('artifacts/baseline-console.log', logs.join('\n'));

    // No uncaught errors during load
    const errs = logs.filter((l) => l.startsWith('[PAGEERROR]'));
    console.log(`baseline PAGEERRORS: ${errs.length}`);
    errs.forEach((e) => console.log(e));
    expect(errs.length).toBe(0);
});
