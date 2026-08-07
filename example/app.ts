import 'reflect-metadata';
import path from "path";
import {
	Action,
	Context,
	CoreSocketMiddleware,
	ErrorInterceptor,
	Injectable,
	Interceptor,
	NotFoundHandler,
	ResponseInterceptor,
	FactoryController,
	CoreMiddleware,
	HttpStatusCode,
	RouteInfo
} from "../src";
import dotenv from "dotenv";


dotenv.config();
import {Server, Socket, ExtendedError} from "socket.io";
import express, {
	NextFunction,
	Request,
	Response
} from "express";
import { UserDto } from "./controllers/user/dto/user-dto";
import { DemoAccessControlGuard } from "./guards/access-control-guard";
import { PosPlanAccessControlGuard } from "./guards/plan-access-control-guard";
import { verifyPosToken } from "./guards/pos-jwt";

@Injectable()
class GlobalErrorInterceptor implements ErrorInterceptor {
	catch({error}: Action) {
		const status = error.statusCode || 500;
		console.error(`[Error] ${error.message}`, error.stack);
		console.error('detail', error.details);
		
		const filteredStack = error.stack
			? error.stack
			.split('\n')
			.filter((line: any) => !line.includes('node_modules')) // Remove node_modules paths
			.join('\n')
			: '';
		
		return {
			status,
			message: error.message || 'Internal Server Error',
			stack: filteredStack,
			details: Array.isArray(error.details) ? error.details.map(function (detail: any) {
				return detail
			}) : error.details
		};
	}
}

@Injectable()
export class Service {
	
	create(_: UserDto) {
		return "dd"
	}
	
	update(_data: any) {
		return "Service updated";
	}
	
}

export class NotFoundInterceptor implements NotFoundHandler {
	handle(context: Context) {
		return {
			message: 'Route Not Found',
			method: context.request.method,
			route: context.request.path,
			success: false,
			statusCode: 404
		};
	}
}

@ResponseInterceptor()
export class ResponseTransformerInterceptor implements Interceptor {
	intercept(context: Context, data: any) {
		const before = Date.now();
		return {
			data,
			duration: `${Date.now() - before}ms`,
			method: context.request.method,
			route: context.request.path,
			success: true,
			statusCode: context.response.statusCode
		};
	}
}

@Injectable()
class Middleware implements CoreMiddleware {
	private routes: RouteInfo[] = [];
	
	use(req: Request, res: Response, next: NextFunction): void {
		console.log(`Route Not Found: ${req.url}`);
		
		next()
	}
	
	setRoutes(routes: RouteInfo[]): void {
		this.routes = routes;
	}
}

@Injectable()
class SocketAuthMiddleware implements CoreSocketMiddleware {
	use(socket: Socket, next: (err?: ExtendedError) => void): void {
		socket.data.user = "ME";
		// Decoded once at connection time (not per-event) so bindSocketEvent's
		// @RequirePlan check can read socket.data.plan cheaply on every event.
		const claims = verifyPosToken(socket.handshake.auth?.token);
		if (claims) {
			socket.data.plan = claims.plan;
			socket.data.storeId = claims.storeId;
		}
		next();
	}
}

export const PORT = 3100;

/**
 * Wires up the adapter/app/socketApp (controllers, middleware, interceptors,
 * guards) without binding a port. Shared by app.ts (single-process dev
 * server, which finishes bootstrapping via adapter.listen()) and cluster.ts
 * (each worker calls this, then hands port ownership to @socket.io/sticky
 * instead of listening directly — see cluster.ts for why).
 */
export function buildApp() {
	const adapter = FactoryController.createAdapter();

	const app = FactoryController.createServer({
		controllers: [
			path.join(__dirname, './controllers/**/*.{js,ts}')
		],
		providers: [
			Service,
		],
		enableLogging: true,
		adapter
	});

	// Same glob as the HTTP app — registerController on each side filters to
	// what it understands (@Controller vs @SocketController), so reusing it is safe.
	const socketApp = FactoryController.createSocketServer({
		controllers: [
			path.join(__dirname, './controllers/**/*.{js,ts}')
		],
		enableLogging: true,
		SocketIO: Server,
		adapter
	});

	app.enableCors({
		credentials: true,
		origin: '*'
	});

	app.enableRequestLogging();

	app.setRateLimit({
		windowMs: 15 * 60 * 1000, // 15 minutes
		limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
		standardHeaders: 'draft-8', // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
		legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
	})

	app.setBodyParserOptions({
		urlencoded: {
			extended: false
		}
	});
	app.useGlobalMiddleware(Middleware)
	app.useAccessControl(DemoAccessControlGuard);
	app.usePlanAccessControl(PosPlanAccessControlGuard);
	app.setGlobalPrefix('/api/v1');
	// Business-code errors thrown with `bodyOnly: true` (see RoleController.insufficientBalance)
	// respond with this HTTP status; the real code stays in the body.
	app.setDefaultErrorStatusCode(HttpStatusCode.OK);
	app.useGlobalInterceptors(
		ResponseTransformerInterceptor,
		GlobalErrorInterceptor
	);
	app.useNotFoundHandler(NotFoundInterceptor);
	socketApp.enableCors({
		origin: "*"
	});
	socketApp.useGlobalMiddleware(SocketAuthMiddleware);

	// UserSocketController ('/waiter') uses no @AccessControl/@RequirePlan today, so
	// socketApp doesn't need useAccessControl/usePlanAccessControl calls to boot; if a
	// future @SocketController event adds those decorators, register the matching
	// guard(s) on socketApp explicitly — guard state isn't shared between app and
	// socketApp even though they're attached to the same adapter/port.

	return { adapter, app, socketApp };
}

async function bootstrap() {
	const { adapter } = buildApp();
	// adapter.listen() automatically starts every app attached to it
	// (app, socketApp) before binding the port — no manual .start() calls needed.
	await adapter.listen(PORT, () => {
		console.log(`🚀 Server running at http://localhost:${PORT}`);
	});
}

// Only auto-boot single-process when run directly (`ts-node example/app.ts`),
// not when cluster.ts imports buildApp() for its own worker bootstrap.
if (require.main === module) {
	bootstrap().catch((err) => {
		console.error('Failed to start server', err);
		process.exit(1);
	});
}
