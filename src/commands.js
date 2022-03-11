/** @type {!Int16Array} */
export let CMD_LOOKUP = new Int16Array(2816);

/** @type {!Int16Array} */
let INSERT_LENGTH_N_BITS = Int16Array.from([
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x01, 0x02, 0x02, 0x03, 0x03, 0x04,
  0x04, 0x05, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0c, 0x0e, 0x18,
]);
/** @type {!Int16Array} */
let COPY_LENGTH_N_BITS = Int16Array.from([
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x01, 0x02, 0x02, 0x03,
  0x03, 0x04, 0x04, 0x05, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x18,
]);

/**
 * @param {!Int16Array} cmdLookup
 * @return {void}
 */
function unpackCommandLookupTable(cmdLookup) {
  let /** @type{!Int16Array} */ insertLengthOffsets = new Int16Array(24);
  let /** @type{!Int16Array} */ copyLengthOffsets = new Int16Array(24);
  copyLengthOffsets[0] = 2;
  for (let /** @type{number} */ i = 0; i < 23; ++i) {
    insertLengthOffsets[i + 1] =
      insertLengthOffsets[i] + (1 << INSERT_LENGTH_N_BITS[i]);
    copyLengthOffsets[i + 1] =
      copyLengthOffsets[i] + (1 << COPY_LENGTH_N_BITS[i]);
  }
  for (let /** @type{number} */ cmdCode = 0; cmdCode < 704; ++cmdCode) {
    let /** @type{number} */ rangeIdx = cmdCode >>> 6;
    let /** @type{number} */ distanceContextOffset = -4;
    if (rangeIdx >= 2) {
      rangeIdx -= 2;
      distanceContextOffset = 0;
    }
    let /** @type{number} */ insertCode =
        (((0x29850 >>> (rangeIdx * 2)) & 0x3) << 3) | ((cmdCode >>> 3) & 7);
    let /** @type{number} */ copyCode =
        (((0x26244 >>> (rangeIdx * 2)) & 0x3) << 3) | (cmdCode & 7);
    let /** @type{number} */ copyLengthOffset = copyLengthOffsets[copyCode];
    let /** @type{number} */ distanceContext =
        distanceContextOffset +
        (copyLengthOffset > 4 ? 3 : copyLengthOffset - 2);
    let /** @type{number} */ index = cmdCode * 4;
    cmdLookup[index + 0] =
      INSERT_LENGTH_N_BITS[insertCode] | (COPY_LENGTH_N_BITS[copyCode] << 8);
    cmdLookup[index + 1] = insertLengthOffsets[insertCode];
    cmdLookup[index + 2] = copyLengthOffsets[copyCode];
    cmdLookup[index + 3] = distanceContext;
  }
}

unpackCommandLookupTable(CMD_LOOKUP);
