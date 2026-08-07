# Development Guidelines for @libs/core

This document provides guidelines and information for developers working on the @libs/core project.

## Build/Configuration Instructions

### Development Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Development Mode**:
   ```bash
   npm run dev
   ```
   This will:
    - Watch for changes in the example directory
    - Compile TypeScript files to the dev-build directory
    - Restart the server using nodemon when changes are detected

3. **Production Build**:
   ```bash
   npm run build:prod
   ```
   This will:
    - Compile the src directory to the dist directory
    - Generate TypeScript declaration files

### Configuration Files

- **tsconfig.json**: Base TypeScript configuration
- **tsconfig.dev.json**: Development configuration (compiles example directory to dev-build)
- **tsconfig.prod.json**: Production configuration (compiles src directory to dist)

## Testing Information

### Running Tests

1. **Execute Tests**:
   ```bash
   npm test
   ```
   This runs the tests using ts-node.

### Adding New Tests

1. **Create Test Files**:
    - Place test files in the `test` directory
    - Use Node's built-in `assert` module for assertions

2. **Test File Structure**:
   ```typescript
   import assert from 'assert';
   import { ComponentToTest } from '../path/to/component';

   // Test function
   function testFeature() {
     console.log('Running test: Feature description');
     const component = new ComponentToTest();
     const result = component.methodToTest();

     assert.strictEqual(result, expectedValue, "Error message");
     console.log('✓ Test passed: Feature description');
   }

   // Run tests
   testFeature();
   ```

3. **Test Example**:
   See `test/simple-test.ts` for a working example that tests the Service class.

## Project Structure

```
@libs/
├── .junie/            # Project guidelines and documentation
├── dev-build/         # Development build output
├── dist/              # Production build output
├── example/           # Example application using the library
│   ├── controllers/   # Example controllers
│   └── app.ts         # Example application entry point
├── src/               # Library source code
│   ├── controller/    # Controller-related functionality
│   ├── core/          # Core functionality
│   ├── di/            # Dependency injection system
│   ├── enums/         # Enumeration types
│   ├── http-error-exception/ # HTTP error handling
│   ├── interface/     # Interface definitions
│   ├── type/          # Type definitions
│   └── index.ts       # Main entry point
└── test/              # Test files
```

## Code Style and Conventions

### Decorators

The library makes extensive use of decorators for:
- Controllers: `@Controller('/path')`
- HTTP Methods: `@Get()`, `@Post()`, `@Put()`, etc.
- Dependency Injection: `@Injectable()`, `@Inject()`
- Validation: `@IsString()`, `@IsNumber()`, etc. (from class-validator)

### Example Controller

```typescript
@Controller('/role')
export class RoleController {

    @Inject()
    private service: Service;

    @Get('/path')
    async methodName() {
        return "result";
    }

    @Post()
    create(@Body() body: UserDto) {
        return this.service.create();
    }
}
```

### DTOs (Data Transfer Objects)

DTOs are used for request validation:

```typescript
export class UserDto {

    @IsString()
    name?: string

    @IsNumber()
    phone?: number;
}
```

## Additional Development Information

### Server Configuration

HTTP and Socket.IO are two independent, single-responsibility apps — each is created by its own factory method and can run standalone on its own port. To run them together on one shared port, connect them with a `ServerAdapter`.

**HTTP**, via `ServerFactory.createServer()`:
- `controllers`: Array of controller paths (glob patterns)
- `providers`: Array of service providers
- `enableLogging`: Boolean to enable logging
- `adapter`: Optional `ServerAdapter` to share a port with a `SocketApplication`

**Socket.IO**, via `ServerFactory.createSocketServer()`:
- `controllers`: Array of controller paths (glob patterns)
- `providers`: Array of service providers
- `enableLogging`: Boolean to enable logging
- `SocketIO`: Socket.IO server class (required — keeps `socket.io` out of this library's hard dependencies)
- `socketOptions`: Socket.IO/Engine.IO server options
- `adapter`: Optional `ServerAdapter` to share a port with a `CoreApplication`

**Connecting them**, via `ServerFactory.createAdapter()`: create one `ServerAdapter`, pass it to both `createServer({ adapter })` and `createSocketServer({ adapter })`, then call `adapter.listen(port, callback)` once — it automatically calls `.start()` on every app attached to it (registering routes/namespaces) before binding the port, so you don't need to call `.start()` on each app yourself. Used standalone (no `adapter`), each app's `.start(port, callback)` registers and listens in one call, exactly as before.

### Cluster Mode

Running the HTTP side under Node's `cluster` module (or a process manager like PM2's `-i` mode) needs no special handling — each worker just calls `adapter.listen(port, ...)` and Node's cluster module shares the listening socket across workers transparently.

Socket.IO needs two extra things cluster mode alone doesn't give it:
- **Session affinity** — a client's polling handshake (and its eventual websocket upgrade) must keep landing on the same worker that accepted the first request, or it fails with `Session ID unknown`.
- **A shared adapter** — so `io.to(room).emit()` (or a broadcast triggered from an HTTP route) reaches sockets connected to *other* workers, not just the emitting one.

[`@socket.io/sticky`](https://github.com/socketio/socket.io-sticky) solves the first, [`@socket.io/cluster-adapter`](https://github.com/socketio/socket.io-cluster-adapter) solves the second. Since a cluster worker's port is bound by `@socket.io/sticky` (the primary owns the real listening socket and hands connections to workers over IPC), a worker needs to run controller/middleware/interceptor registration *without* binding a port — that's what `ServerAdapter.startApps()` is for, split out from `adapter.listen()` for exactly this case:

```typescript
import cluster from "cluster";
import http from "http";
import os from "os";
import { setupMaster, setupWorker } from "@socket.io/sticky";
import { createAdapter, setupPrimary } from "@socket.io/cluster-adapter";
import { buildApp, PORT } from "./app"; // your ServerFactory wiring, factored into a function

if (cluster.isPrimary) {
	const httpServer = http.createServer();
	setupMaster(httpServer, { loadBalancingMethod: "least-connection" });
	cluster.setupPrimary({ serialization: "advanced" }); // required by @socket.io/cluster-adapter
	setupPrimary();

	for (let i = 0; i < os.cpus().length; i++) cluster.fork();
	cluster.on("exit", () => cluster.fork());

	httpServer.listen(PORT, () => console.log(`Primary balancing http://localhost:${PORT}`));
} else {
	const { adapter, socketApp } = buildApp();

	// Registers controllers/middleware and constructs socketApp.socketServer,
	// but does NOT bind PORT — the primary owns the real listening socket.
	adapter.startApps().then(() => {
		setupWorker(socketApp.socketServer);
		socketApp.socketServer.adapter(createAdapter());
	});
}
```

See `example/cluster.ts` for the full working version (run it with `npm run dev:cluster`, optionally `WORKERS=<n> npm run dev:cluster` to control the worker count — defaults to the number of CPUs).

### Middleware

Middleware can be added globally:
```typescript
app.useGlobalMiddleware(Middleware)
```

Middleware can optionally implement `setRoutes(routes: RouteInfo[])` to receive the full list of registered routes once controller registration completes, before the server starts listening:
```typescript
class Middleware implements CoreMiddleware {
    use(req: Request, res: Response, next: NextFunction): void {
        next();
    }
    setRoutes(routes: RouteInfo[]): void {
        console.log(routes);
    }
}
```

Socket middleware follows the same pattern, via `CoreSocketMiddleware` and `SocketApplication.useGlobalMiddleware()`:
```typescript
socketApp.useGlobalMiddleware(SocketAuthMiddleware);
```
```typescript
class SocketAuthMiddleware implements CoreSocketMiddleware {
    use(socket: Socket, next: (err?: ExtendedError) => void): void {
        next();
    }
    setRoutes(routes: RouteInfo[]): void {
        console.log(routes);
    }
}
```

### Interceptors

Response interceptors (classes implementing `Interceptor`, marked with `@ResponseInterceptor()`) and error interceptors (classes implementing `ErrorInterceptor`, detected automatically via their `catch()` method) are registered together:
```typescript
app.useGlobalInterceptors(
    ResponseTransformerInterceptor,
    GlobalErrorInterceptor
);
```

Multiple `@ResponseInterceptor()` classes chain in registration order, each receiving the previous one's output. Registering a class that implements `intercept()` without `@ResponseInterceptor()` throws immediately — it would otherwise silently never run.

### Not Found Handling

The fallback invoked when no route matches is a separate, single-purpose registration (unlike interceptors, only one can ever meaningfully fire, so it isn't a spreadable list):
```typescript
app.useNotFoundHandler(NotFoundInterceptor);
```

### Access Control

Two independent, composable gates are available for restricting routes and socket events — apply either alone or both together (a route can require a role *and* a plan at once):

**Role-based**, via `@AccessControl(...roles)` + an `AccessControlGuard` that resolves the caller's roles:
```typescript
class DemoAccessControlGuard implements AccessControlGuard {
    resolveRoles(context: AccessControlContext): string[] {
        // read from JWT/session/etc — demo reads a header
        const role = context.request?.headers['x-role'];
        return role ? [String(role)] : [];
    }
}

app.useAccessControl(DemoAccessControlGuard);
```
```typescript
@AccessControl('admin')
@Get('/admin-only')
adminOnly() { /* ... */ }
```

**Plan-based**, via `@RequirePlan(...plans)` + a `PlanAccessControlGuard` that resolves the caller's subscription plan — for gating features behind a subscription tier. A plan usually belongs to the account/tenant (e.g. a POS store), not the individual end user, so it's typically resolved from an auth token/API key rather than a per-request header — see `example/guards/plan-access-control-guard.ts` (`PosPlanAccessControlGuard`) for a JWT-based implementation: the store's plan is embedded in its auth token (`Authorization: Bearer <token>` for HTTP, `socket.handshake.auth.token` for sockets, decoded once into `socket.data.plan` by a `CoreSocketMiddleware` registered via `socketApp.useGlobalMiddleware(...)`), and `example/controllers/pos/` shows gating a reports/multi-store feature set behind it (mint a demo token via `POST /api/v1/auth/token`).
```typescript
class DemoPlanAccessControlGuard implements PlanAccessControlGuard {
    resolvePlans(context: AccessControlContext): string[] {
        // read from your billing/subscription lookup — demo reads a header
        const plan = context.request?.headers['x-plan'];
        return plan ? [String(plan)] : [];
    }
}

app.usePlanAccessControl(DemoPlanAccessControlGuard);
```
```typescript
@RequirePlan('pro', 'enterprise')
@Get('/pro-feature')
proFeature() { /* ... */ }
```

Both work identically: an empty list (`@AccessControl()` / `@RequirePlan()`) just requires the resolver to return something non-empty; a non-empty list requires the resolved value to intersect it. Method-level metadata overrides class-level metadata (not merged). Denial throws a 403 `Forbidden` `HttpError`, handled the same way as any other thrown error — by your `ErrorInterceptor`. A route/event using either decorator without its corresponding `useAccessControl()`/`usePlanAccessControl()` guard registered throws at startup, not silently passing every request.

For checks that aren't role- or plan-based (feature flags, resource ownership, etc.), use `@UseGuards(...)` with classes implementing `CanActivate` — these compose with both class- and method-level guards all running, unlike `@AccessControl`'s method-overrides-class fallback.

### Error Handling

Custom error handling is implemented through the `ErrorInterceptor` interface:
```typescript
@Injectable()
class GlobalErrorInterceptor implements ErrorInterceptor {
    catch({error}: Action) {
        // Error handling logic
    }
}
```

## Example Usage

Below is a complete example of how to set up a server using @libs/core:

```typescript
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
	ServerFactory,
	CoreMiddleware,
	RouteInfo
} from "@libs/core";
import dotenv from "dotenv";

dotenv.config();
import { Server, Socket, ExtendedError } from "socket.io";
import {
	NextFunction,
	Request,
	Response
} from "express";

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

	create() {
		return "Service created";
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
	use(req: Request, res: Response, next: NextFunction): void {
		next()
	}
	setRoutes(routes: RouteInfo[]): void {
		console.log(`[Middleware] Registered ${routes.length} routes:`, routes);
	}
}

@Injectable()
class SocketAuthMiddleware implements CoreSocketMiddleware {
	use(socket: Socket, next: (err?: ExtendedError) => void): void {
		next();
	}
}

const adapter = ServerFactory.createAdapter();

const app = ServerFactory.createServer({
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
const socketApp = ServerFactory.createSocketServer({
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

socketApp.enableCors({
	origin: '*'
});

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
app.setGlobalPrefix('/api/v1');
app.useGlobalInterceptors(
	ResponseTransformerInterceptor,
	GlobalErrorInterceptor
);
app.useNotFoundHandler(NotFoundInterceptor);

socketApp.useGlobalMiddleware(SocketAuthMiddleware);

const PORT = 3100;

async function bootstrap() {
	// adapter.listen() automatically starts every app attached to it
	// (app, socketApp) before binding the port — no manual .start() calls needed.
	await adapter.listen(PORT, () => {
		console.log(`🚀 Server running at http://localhost:${PORT}`);
	});
}

bootstrap();
```

To run either app standalone on its own port (no adapter), just call `.start(port, callback)` directly on it — e.g. a Socket.IO-only process with no Express app at all:
```typescript
const socketApp = ServerFactory.createSocketServer({
	controllers: [path.join(__dirname, './controllers/socket.controller.ts')],
	enableLogging: true,
	SocketIO: Server
});
socketApp.start(4000, () => console.log('Socket server running on 4000'));
```
