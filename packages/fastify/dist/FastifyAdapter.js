"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Fas = exports.FastifyAdapter = void 0;
const point_of_view_1 = __importDefault(require("point-of-view"));
const fastify_static_1 = __importDefault(require("fastify-static"));
class FastifyAdapter {
    constructor() {
        this.basePath = '';
    }
    setBasePath(path) {
        this.basePath = path;
        return this;
    }
    setStaticPath(staticsRoute, staticsPath) {
        this.statics = { route: staticsRoute, path: staticsPath };
        return this;
    }
    setViewsPath(viewPath) {
        this.viewPath = viewPath;
        return this;
    }
    setErrorHandler(handler) {
        this.errorHandler = handler;
        return this;
    }
    setApiRoutes(routes) {
        this.apiRoutes = routes.reduce((result, routeRaw) => {
            const routes = Array.isArray(routeRaw.route) ? routeRaw.route : [routeRaw.route];
            const methods = Array.isArray(routeRaw.method) ? routeRaw.method : [routeRaw.method];
            routes.forEach((route) => {
                result.push({
                    method: methods.map((method) => method.toUpperCase()),
                    route,
                    handler: routeRaw.handler,
                });
            });
            return result;
        }, []);
        return this;
    }
    setEntryRoute(routeDef) {
        const { name } = routeDef.handler();
        this.entryRoute = {
            method: routeDef.method.toUpperCase(),
            routes: [].concat(routeDef.route),
            filename: name,
        };
        return this;
    }
    setQueues(bullBoardQueues) {
        this.bullBoardQueues = bullBoardQueues;
        return this;
    }
    registerPlugin() {
        return (fastify, _opts, next) => {
            if (!this.statics) {
                throw new Error(`Please call 'setStaticPath' before using 'registerPlugin'`);
            }
            else if (!this.entryRoute) {
                throw new Error(`Please call 'setEntryRoute' before using 'registerPlugin'`);
            }
            else if (!this.viewPath) {
                throw new Error(`Please call 'setViewsPath' before using 'registerPlugin'`);
            }
            else if (!this.apiRoutes) {
                throw new Error(`Please call 'setApiRoutes' before using 'registerPlugin'`);
            }
            else if (!this.bullBoardQueues) {
                throw new Error(`Please call 'setQueues' before using 'registerPlugin'`);
            }
            else if (!this.errorHandler) {
                throw new Error(`Please call 'setErrorHandler' before using 'registerPlugin'`);
            }
            fastify.register(point_of_view_1.default, {
                engine: {
                    ejs: require('ejs'),
                },
                root: this.viewPath,
            });
            fastify.register(fastify_static_1.default, {
                root: this.statics.path,
                prefix: this.statics.route,
            });
            const { method, routes, filename } = this.entryRoute;
            routes.forEach((url) => fastify.route({
                method,
                url,
                handler: (_req, reply) => {
                    reply.view(filename, {
                        basePath: this.basePath,
                    });
                },
            }));
            this.apiRoutes.forEach((route) => {
                fastify.route({
                    method: route.method,
                    url: route.route,
                    handler: async (request, reply) => {
                        const response = await route.handler({
                            queues: this.bullBoardQueues,
                            params: request.params,
                            query: request.query,
                        });
                        reply.status(response.status || 200).send(response.body);
                    },
                });
            });
            const errorHandler = this.errorHandler;
            fastify.setErrorHandler((error, _request, reply) => {
                const response = errorHandler(error);
                reply.status(response.status).send(response.body);
            });
            next();
        };
    }
}
exports.FastifyAdapter = FastifyAdapter;
class Fas {
}
exports.Fas = Fas;
//# sourceMappingURL=FastifyAdapter.js.map