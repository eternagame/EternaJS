module.exports = () => [
    'nx workspace-lint --uncommitted',
    'nx affected --target=lint --uncommitted',
    'nx format:write --uncommitted',
];
