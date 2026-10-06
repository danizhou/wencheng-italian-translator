// Stand-in for Node.js built-ins (fs, path) in the browser bundle. Piper's
// Emscripten code references them only on its Node.js branch, never run here.
const emptyModule = {};
export default emptyModule;
