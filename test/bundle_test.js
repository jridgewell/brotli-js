/* Copyright 2017 Google Inc. All Rights Reserved.

   Distributed under MIT license.
   See file LICENSE for detail or copy at https://opensource.org/licenses/MIT
*/

import { BrotliDecode, BrotliPrepend } from "../src/decode.js";
import { makeTestData } from "./test_data.js";
import assert from "assert";

const CRC_64_POLY = new Uint32Array([0xd7870f42, 0xc96c5795]);

/**
 * @param {Uint8Array} bytes
 * @return {string}
 */
function toString(bytes) {
  // eslint-disable-next-line no-undef
  return new TextDecoder().decode(bytes);
}

/**
 * Calculates binary data footprint.
 *
 * @param {!Uint8Array} data binary data
 * @return {string} footprint
 */
function calculateCrc64(data) {
  let crc = new Uint32Array([0xffffffff, 0xffffffff]);
  let c = new Uint32Array(2);
  for (let i = 0; i < data.length; ++i) {
    c[1] = 0;
    c[0] = (crc[0] ^ data[i]) & 0xff;
    for (let k = 0; k < 8; ++k) {
      const isOdd = c[0] & 1;
      c[0] = (c[0] >>> 1) | ((c[1] & 1) << 31);
      c[1] = c[1] >>> 1;
      if (isOdd) {
        c[0] = c[0] ^ CRC_64_POLY[0];
        c[1] = c[1] ^ CRC_64_POLY[1];
      }
    }
    crc[0] = ((crc[0] >>> 8) | ((crc[1] & 0xff) << 24)) ^ c[0];
    crc[1] = (crc[1] >>> 8) ^ c[1];
  }
  crc[0] = ~crc[0];
  crc[1] = ~crc[1];

  let lo = crc[0].toString(16);
  lo = "0".repeat(8 - lo.length) + lo;
  let hi = crc[1].toString(16);
  hi = "0".repeat(8 - hi.length) + hi;

  return hi + lo;
}

/**
 * Decompresses data and checks that output footprint is correct.
 *
 * @param {string} entry filename including footprint prefix
 * @param {!Uint8Array} data compressed data
 * @param {!string} prepend
 */
function checkEntry(entry, data, prepend) {
  const prepended = BrotliPrepend(prepend, data);

  const decompressed = BrotliDecode(prepended);
  const head = decompressed.subarray(0, prepend.length);
  const tail = decompressed.subarray(prepend.length);

  assert.deepEqual(toString(head), prepend);

  const crc = calculateCrc64(tail);
  const expectedCrc = entry.substring(0, 16);
  assert.strictEqual(expectedCrc, crc);
}

describe("bundle", () => {
  const testData = makeTestData();
  const short = "a";
  const medium = short.repeat(1 << 13);
  const long = medium.repeat(1 << 3);

  for (let entry in testData) {
    const name = entry.substring(17);
    const data = testData[entry];
    it(`${name} - short prepend`, () => checkEntry(entry, data, short));
    it(`${name} - medium prepend`, () => checkEntry(entry, data, medium));
    // it(`${name} - long prepend`, () => checkEntry(entry, data, long));
  }
});
