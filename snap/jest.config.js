module.exports = {
    preset: "@metamask/snaps-jest",
    testTimeout: 30000,
    transform: {
        "^.+\\.(ts|tsx)$": "ts-jest",
    },
    transformIgnorePatterns: [
        "node_modules/(?!(@metamask)/)",
    ],
};
