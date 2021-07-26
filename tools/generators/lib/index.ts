import {
    Tree,
    formatFiles,
    installPackagesTask,
    readProjectConfiguration,
    updateProjectConfiguration,
} from '@nrwl/devkit';
import { libraryGenerator } from '@nrwl/workspace/generators';

export default async function (host: Tree, schema: any) {
    await libraryGenerator(host, {
        name: schema.name,
        setParserOptionsProject: true,
    });

    const projectConfig = readProjectConfiguration(host, schema.name);

    // Add custom target
    projectConfig.targets['typecheck'] = {
        executor: '@nrwl/workspace:run-commands',
        options: {
            cwd: projectConfig.root,
            command:
                'npx tsc --noEmit -p tsconfig.lib.json && npx tsc --noEmit -p tsconfig.spec.json',
        },
    };
    updateProjectConfiguration(host, schema.name, projectConfig);

    await formatFiles(host);
    return () => {
        installPackagesTask(host);
    };
}
