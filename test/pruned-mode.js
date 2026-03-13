const test = require('brittle')
const Hypercore = require('../')
const fs = require('fs')
const path = require('path')
const os = require('os')

// Helper to create temp directory
function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'hypercore-pruned-test-'))
}

test('basic - onBlockMissing not called when blocks exist', async (t) => {
  const dir = tmpdir()
  let callbackCalled = false

  const core = new Hypercore(dir, {
    onBlockMissing: async (index) => {
      callbackCalled = true
    }
  })

  await core.ready()
  await core.append(['block0', 'block1', 'block2'])

  // Blocks exist, callback should NOT be called
  const block = await core.get(0)
  t.is(block.toString(), 'block0')
  t.is(callbackCalled, false, 'onBlockMissing should not be called when blocks exist')

  await core.close()
  fs.rmSync(dir, { recursive: true })
})

test('basic - backwards compatibility without onBlockMissing', async (t) => {
  const dir = tmpdir()

  // Create core WITHOUT onBlockMissing (old behavior)
  const core = new Hypercore(dir)

  await core.ready()
  await core.append(['hello', 'world'])

  const b0 = await core.get(0)
  const b1 = await core.get(1)

  t.is(b0.toString(), 'hello')
  t.is(b1.toString(), 'world')
  t.is(core.length, 2)

  await core.close()
  fs.rmSync(dir, { recursive: true })
})

test('onBlockMissing callback is accessible on Core', async (t) => {
  const dir = tmpdir()
  let receivedIndex = null
  let receivedCore = null

  const mockCallback = async (index, coreInstance) => {
    receivedIndex = index
    receivedCore = coreInstance
  }

  const core = new Hypercore(dir, {
    onBlockMissing: mockCallback
  })

  await core.ready()
  
  // Verify the callback is set correctly through the chain
  t.ok(core.onBlockMissing, 'onBlockMissing is set on Hypercore session')
  t.ok(core.core.onBlockMissing, 'onBlockMissing is passed to Core')
  t.is(typeof core.core.onBlockMissing, 'function', 'onBlockMissing is a function on Core')
  t.is(core.core.onBlockMissing, mockCallback, 'Same callback reference on Core')

  await core.close()
  fs.rmSync(dir, { recursive: true })
})

test('can write and read data normally with pruned mode enabled', async (t) => {
  const dir = tmpdir()
  
  const core = new Hypercore(dir, {
    onBlockMissing: async (index) => {
      // This shouldn't be called since we're not clearing
    }
  })

  await core.ready()
  
  // Write data
  await core.append(Buffer.from('test-data-1'))
  await core.append(Buffer.from('test-data-2'))
  await core.append(Buffer.from('test-data-3'))

  // Read data back
  t.is((await core.get(0)).toString(), 'test-data-1')
  t.is((await core.get(1)).toString(), 'test-data-2')
  t.is((await core.get(2)).toString(), 'test-data-3')
  t.is(core.length, 3)

  await core.close()
  fs.rmSync(dir, { recursive: true })
})

test('clear() removes blocks from bitfield', async (t) => {
  const dir = tmpdir()
  
  const core = new Hypercore(dir)

  await core.ready()
  
  await core.append(['a', 'b', 'c'])
  
  // Verify blocks exist via bitfield
  t.ok(core.core.bitfield.get(0), 'Block 0 exists before clear')
  t.ok(core.core.bitfield.get(1), 'Block 1 exists before clear')
  
  // Clear blocks
  await core.clear(0, 3)
  
  // Verify blocks are cleared from bitfield
  t.absent(core.core.bitfield.get(0), 'Block 0 cleared from bitfield')
  t.absent(core.core.bitfield.get(1), 'Block 1 cleared from bitfield')

  await core.close()
  fs.rmSync(dir, { recursive: true })
})

test('replicator has access to onBlockMissing', async (t) => {
  const dir = tmpdir()
  
  const callback = async (index) => {}
  
  const core = new Hypercore(dir, {
    onBlockMissing: callback
  })

  await core.ready()
  
  // The replicator accesses onBlockMissing via core.core.onBlockMissing
  t.ok(core.core.replicator, 'Core has replicator')
  t.is(core.core.onBlockMissing, callback, 'Core.onBlockMissing accessible to replicator')

  await core.close()
  fs.rmSync(dir, { recursive: true })
})

test('session inherits onBlockMissing correctly', async (t) => {
  const dir = tmpdir()
  
  const callback = async (index) => {}
  
  const core = new Hypercore(dir, {
    onBlockMissing: callback
  })

  await core.ready()
  await core.append(['test'])
  
  // Create a session
  const session = core.session()
  await session.ready()
  
  // Session should share the same core
  t.is(session.core, core.core, 'Session shares Core with parent')
  t.is(session.core.onBlockMissing, callback, 'Session Core has onBlockMissing')

  await session.close()
  await core.close()
  fs.rmSync(dir, { recursive: true })
})

test('multiple cores work independently', async (t) => {
  const dir1 = tmpdir()
  const dir2 = tmpdir()
  
  let core1Calls = 0
  let core2Calls = 0
  
  const core1 = new Hypercore(dir1, {
    onBlockMissing: async () => { core1Calls++ }
  })
  
  const core2 = new Hypercore(dir2, {
    onBlockMissing: async () => { core2Calls++ }
  })
  
  // No onBlockMissing
  const core3 = new Hypercore(tmpdir())

  await Promise.all([core1.ready(), core2.ready(), core3.ready()])
  
  t.ok(core1.onBlockMissing, 'Core 1 has callback')
  t.ok(core2.onBlockMissing, 'Core 2 has callback')
  t.absent(core3.onBlockMissing, 'Core 3 has no callback')
  
  t.not(core1.core.onBlockMissing, core2.core.onBlockMissing, 'Different callbacks')

  await core1.close()
  await core2.close()
  await core3.close()
  fs.rmSync(dir1, { recursive: true })
  fs.rmSync(dir2, { recursive: true })
})

console.log('\n✓ All pruned mode unit tests defined\n')
