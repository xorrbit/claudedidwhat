// Mock for Monaco editor worker (?worker import) in tests
export default class MockWorker {
  postMessage() {}
  terminate() {}
}
