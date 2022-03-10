export async function testSuite(suite) {
  for (const key in suite) {
    console.log(key);
    await suite[key]();
  }
}

testSuite({
  bundle() {
    return import("./bundle_test.js");
  },

  decode_synth() {
    return import("./decode_synth_test.js");
  },

  decode() {
    return import("./decode_test.js");
  },
});
