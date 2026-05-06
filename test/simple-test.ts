import assert from 'assert';
import { Service } from '../example/app';

// A simple test function
function testServiceCreate() {
  console.log('Running test: Service.create()');
  const service = new Service();
  const result = service.create();
  
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

// Run the tests
console.log('Starting tests...');
testServiceCreate();
testServiceUpdate();
console.log('All tests passed!');