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

Interceptors can be added globally:
```typescript
app.useGlobalInterceptors(
    ResponseTransformerInterceptor,
    GlobalErrorInterceptor,
    NotFoundInterceptor
);
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