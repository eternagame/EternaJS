import {defineConfig} from '@playwright/test';

// Drives the locally-running EternaJS dev server (http://localhost:63343) in REAL Chrome.
// Headless by default for fast debug loops; set HEADFUL=1 to watch it.
export default defineConfig({
    testDir: '.',
    timeout: 240_000,
    expect: {timeout: 40_000},
    fullyParallel: false,
    workers: 1,
    reporter: [['list'], ['json', {outputFile: 'artifacts/results.json'}]],
    outputDir: 'artifacts/test-output',
    use: {
        channel: 'chrome',
        headless: !process.env.HEADFUL,
        baseURL: 'http://localhost:63343',
        viewport: {width: 1400, height: 900},
        trace: 'on',
        screenshot: 'only-on-failure',
        video: 'off',
        actionTimeout: 40_000,
        launchOptions: {
            // PixiJS + NGL need WebGL; force a software GL path that works headless.
            args: [
                '--enable-unsafe-swiftshader',
                '--ignore-gpu-blocklist',
                '--use-gl=angle',
                '--use-angle=swiftshader',
            ],
        },
    },
});
