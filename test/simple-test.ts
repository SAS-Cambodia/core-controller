import 'reflect-metadata';
import assert from 'assert';
import { IsString } from 'class-validator';
import { Service } from '../example/app';
import AppContext from '../src/core/factory/app-context';
import {
  AccessControl,
  CanActivate,
  Cookies,
  DECORATOR_KEY,
  Headers,
  HttpError,
  Ip,
  Param,
  Query,
  ResponseInterceptor,
  ServerFactory,
  SocketQuery,
  UseGuards
} from '../src';

// A simple test function
function testServiceCreate() {
  console.log('Running test: Service.create()');
  const service = new Service();
  const result = service.create({ name: 'Test', phone: 123 });
  
  assert.strictEqual(result, "Service created", "Service.create() should return 'Service created'");
  console.log('✓ Test passed: Service.create()');
}

// A simple test function
function testServiceUpdate() {
  console.log('Running test: Service.update()');
  const service = new Service();
  const result = service.update({ name: 'Test' });
  
  assert.strictEqual(result, "Service updated", "Service.update() should return 'Service updated'");
  console.log('✓ Test passed: Service.update()');
}

function testAccessControlMethodMetadata() {
  console.log('Running test: AccessControl method-level metadata');
  class Sample {
    @AccessControl('admin', 'editor')
    method() {}
  }
  const roles = Reflect.getMetadata(DECORATOR_KEY.ACCESS_CONTROL, Sample.prototype, 'method');

  assert.deepStrictEqual(roles, ['admin', 'editor'], 'AccessControl should store roles as method metadata');
  console.log('✓ Test passed: AccessControl method-level metadata');
}

function testAccessControlClassMetadata() {
  console.log('Running test: AccessControl class-level metadata');
  @AccessControl('admin')
  class Sample {}
  const roles = Reflect.getMetadata(DECORATOR_KEY.ACCESS_CONTROL, Sample);

  assert.deepStrictEqual(roles, ['admin'], 'AccessControl should store roles as class metadata');
  console.log('✓ Test passed: AccessControl class-level metadata');
}

function testHeadersDecoratorMetadata() {
  console.log('Running test: Headers decorator metadata');
  class Sample {
    method(@Headers('authorization') auth: string, @Headers() all: any) {}
  }
  const headers = Reflect.getMetadata(DECORATOR_KEY.HEADERS, Sample.prototype, 'method');

  assert.deepStrictEqual(
    headers,
    [{ headerKey: undefined, headerIndex: 1 }, { headerKey: 'authorization', headerIndex: 0 }],
    'Headers should store key + parameter index metadata'
  );
  console.log('✓ Test passed: Headers decorator metadata');
}

function testCookiesDecoratorMetadata() {
  console.log('Running test: Cookies decorator metadata');
  class Sample {
    method(@Cookies('session') session: string) {}
  }
  const cookies = Reflect.getMetadata(DECORATOR_KEY.COOKIES, Sample.prototype, 'method');

  assert.deepStrictEqual(cookies, [{ cookieKey: 'session', cookieIndex: 0 }], 'Cookies should store key + parameter index metadata');
  console.log('✓ Test passed: Cookies decorator metadata');
}

function testIpDecoratorMetadata() {
  console.log('Running test: Ip decorator metadata');
  class Sample {
    method(@Ip() ip: string) {}
  }
  const ipIndex = Reflect.getMetadata(DECORATOR_KEY.IP, Sample.prototype, 'method');

  assert.strictEqual(ipIndex, 0, 'Ip should store the parameter index');
  console.log('✓ Test passed: Ip decorator metadata');
}

function testSocketQueryDecoratorMetadata() {
  console.log('Running test: SocketQuery decorator metadata');
  class Sample {
    method(@SocketQuery('token') token: string) {}
  }
  const query = Reflect.getMetadata(DECORATOR_KEY.SOCKET_QUERY, Sample.prototype, 'method');

  assert.deepStrictEqual(query, [{ queryKey: 'token', queryIndex: 0 }], 'SocketQuery should store key + parameter index metadata');
  console.log('✓ Test passed: SocketQuery decorator metadata');
}

class GuardA implements CanActivate {
  canActivate() { return true; }
}

class GuardB implements CanActivate {
  canActivate() { return true; }
}

function testUseGuardsMethodMetadata() {
  console.log('Running test: UseGuards method-level metadata');
  class Sample {
    @UseGuards(GuardA, GuardB)
    method() {}
  }
  const guards = Reflect.getMetadata(DECORATOR_KEY.GUARDS, Sample.prototype, 'method');

  assert.deepStrictEqual(guards, [GuardA, GuardB], 'UseGuards should store guard classes as method metadata');
  console.log('✓ Test passed: UseGuards method-level metadata');
}

function testUseGuardsClassMetadata() {
  console.log('Running test: UseGuards class-level metadata');
  @UseGuards(GuardA)
  class Sample {}
  const guards = Reflect.getMetadata(DECORATOR_KEY.GUARDS, Sample);

  assert.deepStrictEqual(guards, [GuardA], 'UseGuards should store guard classes as class metadata');
  console.log('✓ Test passed: UseGuards class-level metadata');
}

function testUseGuardsStacking() {
  console.log('Running test: UseGuards stacking across repeated calls');
  class Sample {
    @UseGuards(GuardA)
    @UseGuards(GuardB)
    method() {}
  }
  const guards = Reflect.getMetadata(DECORATOR_KEY.GUARDS, Sample.prototype, 'method');

  assert.deepStrictEqual(guards, [GuardB, GuardA], 'Repeated UseGuards() calls should concatenate rather than overwrite existing guards');
  console.log('✓ Test passed: UseGuards stacking across repeated calls');
}

class ListQueryDto {
  @IsString()
  search: string;
}

function testQueryValidationMetadata() {
  console.log('Running test: Query DTO validation metadata');
  class Sample {
    method(@Query() dto: ListQueryDto, @Query('page') page: string) {}
  }
  const query = Reflect.getMetadata(DECORATOR_KEY.QUERY, Sample.prototype, 'method');
  const dtoEntry = query.find((entry: any) => entry.queryIndex === 0);
  const keyedEntry = query.find((entry: any) => entry.queryIndex === 1);

  assert.strictEqual(dtoEntry.type, ListQueryDto, 'Bare @Query() with a class type should attach the DTO type');
  assert.strictEqual(keyedEntry.type, undefined, 'Keyed @Query(key) should not attach a DTO type');
  console.log('✓ Test passed: Query DTO validation metadata');
}

function testParamValidationMetadata() {
  console.log('Running test: Param DTO validation metadata');
  class Sample {
    method(@Param() dto: ListQueryDto, @Param('id') id: string) {}
  }
  const params = Reflect.getMetadata(DECORATOR_KEY.PARAM, Sample.prototype, 'method');
  const dtoEntry = params.find((entry: any) => entry.parameterIndex === 0);
  const keyedEntry = params.find((entry: any) => entry.parameterIndex === 1);

  assert.strictEqual(dtoEntry.type, ListQueryDto, 'Bare @Param() with a class type should attach the DTO type');
  assert.strictEqual(keyedEntry.type, undefined, 'Keyed @Param(key) should not attach a DTO type');
  console.log('✓ Test passed: Param DTO validation metadata');
}

function testResponseInterceptorDecoratorMetadata() {
  console.log('Running test: ResponseInterceptor decorator metadata');
  @ResponseInterceptor()
  class SampleInterceptor {}
  const isResponseInterceptor = Reflect.getMetadata(DECORATOR_KEY.RESPONSE_INTERCEPTOR, SampleInterceptor);

  assert.strictEqual(isResponseInterceptor, true, 'ResponseInterceptor should mark the class with RESPONSE_INTERCEPTOR metadata');
  console.log('✓ Test passed: ResponseInterceptor decorator metadata');
}

function testUseGlobalInterceptorsThrowsWithoutDecorator() {
  console.log('Running test: useGlobalInterceptors throws for undecorated interceptor');
  class UndecoratedInterceptor {
    intercept() { return {}; }
  }
  const app = ServerFactory.createServer({ controllers: [] });

  assert.throws(
    () => app.useGlobalInterceptors(UndecoratedInterceptor),
    /has no @ResponseInterceptor\(\) applied/,
    'useGlobalInterceptors should throw when a class implements intercept() without @ResponseInterceptor()'
  );
  console.log('✓ Test passed: useGlobalInterceptors throws for undecorated interceptor');
}

function testUseGlobalInterceptorsAcceptsDecorated() {
  console.log('Running test: useGlobalInterceptors accepts decorated interceptor');
  @ResponseInterceptor()
  class DecoratedInterceptor {
    intercept(_: any, data: any) { return data; }
  }
  const app = ServerFactory.createServer({ controllers: [] });

  assert.doesNotThrow(
    () => app.useGlobalInterceptors(DecoratedInterceptor),
    'useGlobalInterceptors should accept a class with @ResponseInterceptor() applied'
  );
  console.log('✓ Test passed: useGlobalInterceptors accepts decorated interceptor');
}

function testHttpErrorBodyOnly() {
  console.log('Running test: HttpError bodyOnly flag');
  const defaultError = new HttpError('Not found', 404);
  const bodyOnlyError = new HttpError('Insufficient balance', 40001, { reason: 'low balance' }, { bodyOnly: true });

  assert.strictEqual(defaultError.bodyOnly, false, 'bodyOnly should default to false when omitted');
  assert.strictEqual(bodyOnlyError.bodyOnly, true, 'bodyOnly should be true when passed { bodyOnly: true }');
  assert.strictEqual(bodyOnlyError.statusCode, 40001, 'statusCode should still be stored as-is for the interceptor to read');
  console.log('✓ Test passed: HttpError bodyOnly flag');
}

function testAppContextInterceptorNotSharedAcrossConcurrentRequests() {
  console.log('Running test: AppContext interceptor isolation across concurrent requests');
  const ctx = new AppContext();
  ctx.start();

  const captured: Record<string, any> = {};
  const makeResponse = (id: string): any => ({
    statusCode: 200,
    status() { return this; },
    json(body: any) { captured[id] = body; }
  });

  const reqA: any = { method: 'GET', url: '/a' };
  const reqB: any = { method: 'GET', url: '/b' };
  const interceptorA = { intercept: (_: any, data: any) => ({ tag: 'A', data }) };
  const interceptorB = { intercept: (_: any, data: any) => ({ tag: 'B', data }) };

  // Simulate two concurrent requests' "before" interceptor middleware firing interleaved
  ctx.onEmitInterceptor({ method: 'GET', url: '/a', startTime: new Date(), interceptor: interceptorA, request: reqA, response: makeResponse('a') });
  ctx.onEmitInterceptor({ method: 'GET', url: '/b', startTime: new Date(), interceptor: interceptorB, request: reqB, response: makeResponse('b') });

  // B's controller resolves first, then A's — order must not matter
  ctx.sendJsonResponse({ data: 'payloadB', request: reqB, response: makeResponse('b') });
  ctx.sendJsonResponse({ data: 'payloadA', request: reqA, response: makeResponse('a') });

  assert.deepStrictEqual(captured.a, { tag: 'A', data: 'payloadA' }, "Request A's response should be shaped by interceptor A, not B");
  assert.deepStrictEqual(captured.b, { tag: 'B', data: 'payloadB' }, "Request B's response should be shaped by interceptor B, not A");
  console.log('✓ Test passed: AppContext interceptor isolation across concurrent requests');
}

function testAppContextInterceptorChaining() {
  console.log('Running test: AppContext chains multiple before-interceptors in registration order');
  const ctx = new AppContext();
  ctx.start();

  let captured: any;
  const response: any = {
    statusCode: 200,
    status() { return this; },
    json(body: any) { captured = body; }
  };
  const req: any = { method: 'GET', url: '/chain' };
  const interceptorA = { intercept: (_: any, data: any) => ({ tag: 'A', data }) };
  const interceptorB = { intercept: (_: any, data: any) => ({ tag: 'B', data }) };

  ctx.onEmitInterceptor({ method: 'GET', url: '/chain', startTime: new Date(), interceptor: interceptorA, request: req, response });
  ctx.onEmitInterceptor({ method: 'GET', url: '/chain', startTime: new Date(), interceptor: interceptorB, request: req, response });

  ctx.sendJsonResponse({ data: 'raw', request: req, response });

  assert.deepStrictEqual(
    captured,
    { tag: 'B', data: { tag: 'A', data: 'raw' } },
    'Multiple before-interceptors on the same request should compose in registration order, not last-wins'
  );
  console.log('✓ Test passed: AppContext chains multiple before-interceptors in registration order');
}

function testAppContextClearsInterceptorAfterResponse() {
  console.log('Running test: AppContext clears interceptor state after response is sent');
  const ctx = new AppContext();
  ctx.start();

  const results: any[] = [];
  const response: any = {
    statusCode: 200,
    status() { return this; },
    json(body: any) { results.push(body); }
  };
  const req: any = { method: 'GET', url: '/once' };
  const interceptor = { intercept: (_: any, data: any) => ({ tagged: data }) };

  ctx.onEmitInterceptor({ method: 'GET', url: '/once', startTime: new Date(), interceptor, request: req, response });
  ctx.sendJsonResponse({ data: 'first', request: req, response });
  ctx.sendJsonResponse({ data: 'second', request: req, response });

  assert.deepStrictEqual(results[0], { tagged: 'first' }, 'First response should be shaped by the captured interceptor');
  assert.strictEqual(results[1], 'second', 'Second response for the same request should get raw data — interceptor state must not leak past its use');
  console.log('✓ Test passed: AppContext clears interceptor state after response is sent');
}

// Run the tests
console.log('Starting tests...');
testServiceCreate();
testServiceUpdate();
testAccessControlMethodMetadata();
testAccessControlClassMetadata();
testHeadersDecoratorMetadata();
testCookiesDecoratorMetadata();
testIpDecoratorMetadata();
testSocketQueryDecoratorMetadata();
testUseGuardsMethodMetadata();
testUseGuardsClassMetadata();
testUseGuardsStacking();
testQueryValidationMetadata();
testParamValidationMetadata();
testResponseInterceptorDecoratorMetadata();
testUseGlobalInterceptorsThrowsWithoutDecorator();
testUseGlobalInterceptorsAcceptsDecorated();
testHttpErrorBodyOnly();
testAppContextInterceptorNotSharedAcrossConcurrentRequests();
testAppContextInterceptorChaining();
testAppContextClearsInterceptorAfterResponse();
console.log('All tests passed!');