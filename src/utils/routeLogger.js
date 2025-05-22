import { logger } from './logger.js';

/**
 * Logs all registered routes in an Express app
 * @param {object} app - Express app instance
 */
export const logRoutes = (app) => {
  const routes = [];
  
  // Function to recursively collect routes
  const print = (path, layer) => {
    if (layer.route) {
      // Routes registered directly on the app
      layer.route.stack.forEach(printRoute.bind(null, path, layer.route.path));
    } else if (layer.name === 'router' && layer.handle.stack) {
      // Router middleware
      layer.handle.stack.forEach(print.bind(null, path + (path ? '' : '') + (layer.regexp ? layer.regexp.toString() : '')));
    } else if (layer.method) {
      // Route handlers
      routes.push({
        method: layer.method.toUpperCase(),
        path: path + (layer.regexp ? layer.regexp.toString() : '*')
      });
    }
  };
  
  const printRoute = (path, route, layer) => {
    routes.push({
      method: layer.method ? layer.method.toUpperCase() : 'ALL',
      path: path + route
    });
  };
  
  app._router.stack.forEach(print.bind(null, ''));
  
  // Clean up route paths for better readability
  const cleanRoutes = routes.map(route => {
    let path = route.path;
    
    // Clean up Express route regexps
    if (path.includes('?')) {
      path = path.replace(/\(\?:\(\[\^\\\/]\+\?\)\)/g, ':param');
    }
    path = path.replace(/\\/g, '');
    
    if (path.includes('(?:')) {
      path = path.replace(/\(\?:\(\[\^\\\/]\+\?\)\)/g, ':param');
    }
    
    // Clean up Express router regexps
    path = path.replace(/\(\?:\\\//g, '/:');
    path = path.replace(/\(\?:/g, '(:');
    path = path.replace(/\)\(\?/g, ')(?');
    path = path.replace(/\)\?/g, ')?');
    path = path.replace(/\\\//g, '/');
    path = path.replace(/\?\(.*\)/g, '');
    path = path.replace(/\)/g, '');
    path = path.replace(/\^/g, '');
    path = path.replace(/\$/g, '');
    
    return {
      method: route.method,
      path
    };
  });
  
  // Sort routes by path
  cleanRoutes.sort((a, b) => a.path.localeCompare(b.path));
  
  logger.info('Registered Routes:', { routes: cleanRoutes });
  console.log('==== REGISTERED ROUTES ====');
  cleanRoutes.forEach(route => {
    console.log(`${route.method.padEnd(7)} ${route.path}`);
  });
  console.log('===========================');
};