/* Copyright 2017 Google Inc. All Rights Reserved.

   Distributed under MIT license.
   See file LICENSE for detail or copy at https://opensource.org/licenses/MIT
*/
import { BrotliDecode } from "../src/decode.js";
import assert from "assert";

/**
 * @param {!Uint8Array} bytes
 * @return {string}
 */
function bytesToString(bytes) {
  return String.fromCharCode(...bytes);
}

describe("decode", () => {
  it("testMetadata", () => {
    assert.strictEqual(
      "",
      bytesToString(BrotliDecode(Uint8Array.from([1, 11, 0, 42, 3])))
    );
  });
});
