import 'reflect-metadata';
import assert from 'assert';
import { Service } from '../example/app';
import { AccessControl, DECORATOR_KEY } from '../src';

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

// Run the tests
console.log('Starting tests...');
testServiceCreate();
testServiceUpdate();
testAccessControlMethodMetadata();
testAccessControlClassMetadata();
console.log('All tests passed!');