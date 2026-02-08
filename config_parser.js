export function parseConfig(jsonConfig) {
  const menuStructure = [];

  if (!jsonConfig || !jsonConfig._embedded || !jsonConfig._embedded.programs) {
    return jsonConfig;
  }

  jsonConfig._embedded.programs.forEach(program => {
    const programName = program.name;
    const programId = program.id;
    const environments = [];

    if (program._embedded && program._embedded.environments) {
      program._embedded.environments.forEach(env => {
        const envName = env.name; // e.g., "rittal-prod" or "CIDEON Staging"
        const envType = env.type; // e.g., "prod", "stage", "dev"
        const instances = [];

        const links = env._links;
        
        // Map HAL links to instances
        if (links['http://ns.adobe.com/adobecloud/rel/author']) {
           instances.push({
             type: 'author',
             url: links['http://ns.adobe.com/adobecloud/rel/author'].href
           });
        }
        if (links['http://ns.adobe.com/adobecloud/rel/publish']) {
           instances.push({
             type: 'publish',
             url: links['http://ns.adobe.com/adobecloud/rel/publish'].href
           });
        }
         if (links['http://ns.adobe.com/adobecloud/rel/preview']) {
           instances.push({
             type: 'preview', // Treat as live/preview
             url: links['http://ns.adobe.com/adobecloud/rel/preview'].href
           });
        }

        environments.push({
          name: envName,
          type: envType,
          instances: instances
        });
      });
    }

    menuStructure.push({
      name: programName,
      id: programId,
      environments: environments
    });
  });

  return menuStructure;
}
