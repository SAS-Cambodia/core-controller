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

The server is created using `ServerFactory.createServer()` with options:
- `controllers`: Array of controller paths (glob patterns)
- `providers`: Array of service providers
- `enableLogging`: Boolean to enable logging
- `SocketIO`: Socket.IO server class (optional)

### Middleware

Middleware can be added globally:
```typescript
app.useGlobalMiddleware(Middleware)
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
	ErrorInterceptor,
	Injectable,
	Interceptor,
	NotFoundHandler,
	ResponseInterceptor,
	ServerFactory,
	CoreMiddleware
} from "@libs/core";
import dotenv from "dotenv";

dotenv.config();
import { Server } from "socket.io";
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
}

const app = ServerFactory.createServer({
	controllers: [
		path.join(__dirname, './controllers/**/*.{js,ts}')
	],
	providers: [
		Service,
	],
	enableLogging: true,
	SocketIO: Server,
	socketMiddleware: (socket, next) => {
		next();
	},
	socketOptions: {
		cors: {
			origin: "*"
		}
	}
});

app.enableCors({
	credentials: true,
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

const PORT = 3100;
app.start(PORT, () => {
	console.log(`🚀 Server running at http://localhost:${PORT}`);
});
```
