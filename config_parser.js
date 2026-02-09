export function parseConfig(jsonConfig) {
  const menuStructure = [];

  if (!jsonConfig || !jsonConfig._embedded || !jsonConfig._embedded.programs) {
    return [];
  }

  jsonConfig._embedded.programs.forEach(program => {
    const programName = program.name;
    // Removed ID from model per requirement
    const environments = [];

    if (program._embedded && program._embedded.environments) {
      program._embedded.environments.forEach(env => {
        const envName = env.name; 
        const envType = env.type;
        // Removed ID from model
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
             type: 'preview', 
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
      environments: environments
    });
  });

  return menuStructure;
}