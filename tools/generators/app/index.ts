import {
    Tree,
    formatFiles,
    installPackagesTask,
    readProjectConfiguration,
    updateProjectConfiguration,
} from '@nrwl/devkit';
import { applicationGenerator } from '@nrwl/web';

export default async function (host: Tree, schema: any) {
    await applicationGenerator(host, { name: schema.name });

    const projectConfig = readProjectConfiguration(host, schema.name);
    const e2eConfig = readProjectConfiguration(host, `${schema.name}-e2e`);

    // Add custom target
    projectConfig.targets['typecheck'] = {
        executor: '@nrwl/workspace:run-commands',
        options: {
            cwd: projectConfig.root,
            command:
                'npx tsc --noEmit -p tsconfig.app.json && npx tsc --noEmit -p tsconfig.spec.json',
        },
    };
    updateProjectConfiguration(host, schema.name, projectConfig);
    e2eConfig.targets['typecheck'] = {
        executor: '@nrwl/workspace:run-commands',
        options: {
            cwd: projectConfig.root,
            command: 'npx tsc --noEmit -p tsconfig.e2e.json',
        },
    };
    updateProjectConfiguration(host, `${schema.name}-e2e`, e2eConfig);

    await formatFiles(host);
    return () => {
        installPackagesTask(host);
    };
}
