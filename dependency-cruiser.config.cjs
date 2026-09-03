module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-production-imports-from-tests",
      severity: "error",
      from: { path: "^(src|collector)/" },
      to: { path: "^tests/" },
    },
    {
      name: "domain-does-not-depend-on-outer-layers",
      severity: "error",
      from: { path: "^src/domain/" },
      to: {
        path: "^(src/(app|application|components|infrastructure|modules|worker)/|collector/)",
      },
    },
    {
      name: "domain-does-not-depend-on-frameworks",
      severity: "error",
      from: { path: "^src/domain/" },
      to: {
        dependencyTypes: ["npm", "npm-dev"],
        path: "^(next|react|react-dom|@prisma|better-auth|pg)(/|$)",
      },
    },
    {
      name: "application-does-not-depend-on-adapters-or-presentation",
      severity: "error",
      from: { path: "^src/application/" },
      to: {
        path: "^(src/(app|components|infrastructure|modules|worker)/|collector/)",
      },
    },
    {
      name: "shared-does-not-depend-on-business-or-platform-layers",
      severity: "error",
      from: { path: "^src/shared/" },
      to: {
        path: "^(src/(app|application|components|domain|infrastructure|modules|worker)/|collector/)",
      },
    },
    {
      name: "presentation-does-not-import-database-internals",
      severity: "error",
      from: { path: "^src/(app|components|modules)/" },
      to: { path: "^src/infrastructure/database/" },
    },
    {
      name: "infrastructure-does-not-depend-on-presentation",
      severity: "error",
      from: { path: "^src/infrastructure/" },
      to: { path: "^src/(app|components|modules)/" },
    },
    {
      name: "presentation-modules-do-not-depend-on-app-routes",
      severity: "error",
      from: { path: "^src/(components|modules)/" },
      to: { path: "^src/app/" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["types", "import", "require", "default"],
    },
    exclude: {
      path: "(^|/)(node_modules|\.next|dist-collector|generated)(/|$)",
    },
  },
};
