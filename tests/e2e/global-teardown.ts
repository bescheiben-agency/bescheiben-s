export default async function globalTeardown() {
  try {
    await fetch('http://127.0.0.1:4321/__test_shutdown__', { method: 'POST' });
  } catch {
    // The server may have been provided externally or may already be stopped.
  }
}
