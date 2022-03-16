/* Copyright 2017 Google Inc. All Rights Reserved.

   Distributed under MIT license.
   See file LICENSE for detail or copy at https://opensource.org/licenses/MIT
*/

import { data, offsets, sizeBits } from "./dictionary.js";
import { CMD_LOOKUP } from "./commands.js";
import { RFC_TRANSFORMS } from "./transforms.js";
import { LOOKUP } from "./lookup.js";

/**
 * @constructor
 * @param {!Uint8Array} bytes
 * @struct
 */
function InputStream(bytes) {
  /** @type {!Uint8Array} */
  this.data = bytes;

  /** @type {!number} */
  this.offset = 0;
}

/* GENERATED CODE BEGIN */
const MAX_HUFFMAN_TABLE_SIZE = Int32Array.from([
  256, 402, 436, 468, 500, 534, 566, 598, 630, 662, 694, 726, 758, 790, 822,
  854, 886, 920, 952, 984, 1016, 1048, 1080,
]);

const CODE_LENGTH_CODE_ORDER = Int32Array.from([
  1, 2, 3, 4, 0, 5, 17, 6, 16, 7, 8, 9, 10, 11, 12, 13, 14, 15,
]);

const DISTANCE_SHORT_CODE_INDEX_OFFSET = Int32Array.from([
  0, 3, 2, 1, 0, 0, 0, 0, 0, 0, 3, 3, 3, 3, 3, 3,
]);

const DISTANCE_SHORT_CODE_VALUE_OFFSET = Int32Array.from([
  0, 0, 0, 0, -1, 1, -2, 2, -3, 3, -1, 1, -2, 2, -3, 3,
]);

const FIXED_TABLE = Int32Array.from([
  0x020000, 0x020004, 0x020003, 0x030002, 0x020000, 0x020004, 0x020003,
  0x040001, 0x020000, 0x020004, 0x020003, 0x030002, 0x020000, 0x020004,
  0x020003, 0x040005,
]);

const BLOCK_LENGTH_OFFSET = Int32Array.from([
  1, 5, 9, 13, 17, 25, 33, 41, 49, 65, 81, 97, 113, 145, 177, 209, 241, 305,
  369, 497, 753, 1265, 2289, 4337, 8433, 16625,
]);

const BLOCK_LENGTH_N_BITS = Int32Array.from([
  2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 7, 8, 9, 10, 11, 12, 13,
  24,
]);

/**
 * @param {number} i
 * @return {number}
 */
function log2floor(i) {
  let result = -1;
  let step = 16;
  while (step > 0) {
    if (i >>> step != 0) {
      result += step;
      i = i >>> step;
    }
    step = step >> 1;
  }
  return result + i;
}

/**
 * @param {number} npostfix
 * @param {number} ndirect
 * @param {number} maxndistbits
 * @return {number}
 */
function calculateDistanceAlphabetSize(npostfix, ndirect, maxndistbits) {
  return 16 + ndirect + 2 * (maxndistbits << npostfix);
}

/**
 * @param {number} maxDistance
 * @param {number} npostfix
 * @param {number} ndirect
 * @return {number}
 */
function calculateDistanceAlphabetLimit(maxDistance, npostfix, ndirect) {
  if (maxDistance < ndirect + (2 << npostfix)) {
    throw new Error("maxDistance is too small");
  }
  const offset = ((maxDistance - ndirect) >> npostfix) + 4;
  const ndistbits = log2floor(offset) - 1;
  const group = ((ndistbits - 1) << 1) | ((offset >> ndistbits) & 1);
  return ((group - 1) << npostfix) + (1 << npostfix) + ndirect + 16;
}

/**
 * @param {!State} s
 * @return {number}
 */
function decodeWindowBits(s) {
  const largeWindowEnabled = s.isLargeWindow;
  s.isLargeWindow = 0;
  if (s.bitOffset >= 16) {
    s.accumulator32 =
      (s.shortBuffer[s.halfOffset++] << 16) | (s.accumulator32 >>> 16);
    s.bitOffset -= 16;
  }
  if (readFewBits(s, 1) == 0) {
    return 16;
  }
  let n = readFewBits(s, 3);
  if (n != 0) {
    return 17 + n;
  }
  n = readFewBits(s, 3);
  if (n != 0) {
    if (n == 1) {
      if (largeWindowEnabled == 0) {
        return -1;
      }
      s.isLargeWindow = 1;
      if (readFewBits(s, 1) == 1) {
        return -1;
      }
      n = readFewBits(s, 6);
      if (n < 10 || n > 30) {
        return -1;
      }
      return n;
    } else {
      return 8 + n;
    }
  }
  return 17;
}

/**
 * @param {!State} s
 * @param {!InputStream} input
 * @return {void}
 */
function initState(s, input) {
  if (s.runningState != RunningState.UNINITIALIZED) {
    throw new Error("State MUST be uninitialized");
  }
  s.blockTrees = new Int32Array(3091);
  s.blockTrees[0] = 7;
  s.distRbIdx = 3;
  const maxDistanceAlphabetLimit = calculateDistanceAlphabetLimit(
    0x7ffffffc,
    3,
    15 << 3
  );
  s.distExtraBits = new Int8Array(maxDistanceAlphabetLimit);
  s.distOffset = new Int32Array(maxDistanceAlphabetLimit);
  s.input = input;
  initBitReader(s);
  s.runningState = RunningState.INITIALIZED;
}

/**
 * @param {!State} s
 * @return {void}
 */
function close(s) {
  if (s.runningState == RunningState.UNINITIALIZED) {
    throw new Error("State MUST be initialized");
  }
  if (s.runningState == RunningState.CLOSED) {
    return;
  }
  s.runningState = RunningState.CLOSED;
  if (s.input != null) {
    closeInput(s.input);
    s.input = null;
  }
}

/**
 * @param {!State} s
 * @return {number}
 */
function decodeVarLenUnsignedByte(s) {
  if (s.bitOffset >= 16) {
    s.accumulator32 =
      (s.shortBuffer[s.halfOffset++] << 16) | (s.accumulator32 >>> 16);
    s.bitOffset -= 16;
  }
  if (readFewBits(s, 1) != 0) {
    const n = readFewBits(s, 3);
    if (n == 0) {
      return 1;
    } else {
      return readFewBits(s, n) + (1 << n);
    }
  }
  return 0;
}

/**
 * @param {!State} s
 * @return {void}
 */
function decodeMetaBlockLength(s) {
  if (s.bitOffset >= 16) {
    s.accumulator32 =
      (s.shortBuffer[s.halfOffset++] << 16) | (s.accumulator32 >>> 16);
    s.bitOffset -= 16;
  }
  s.inputEnd = readFewBits(s, 1);
  s.metaBlockLength = 0;
  s.isUncompressed = 0;
  s.isMetadata = 0;
  if (s.inputEnd != 0 && readFewBits(s, 1) != 0) {
    return;
  }
  const sizeNibbles = readFewBits(s, 2) + 4;
  if (sizeNibbles == 7) {
    s.isMetadata = 1;
    if (readFewBits(s, 1) != 0) {
      throw new Error("Corrupted reserved bit");
    }
    const sizeBytes = readFewBits(s, 2);
    if (sizeBytes == 0) {
      return;
    }
    for (let i = 0; i < sizeBytes; i++) {
      if (s.bitOffset >= 16) {
        s.accumulator32 =
          (s.shortBuffer[s.halfOffset++] << 16) | (s.accumulator32 >>> 16);
        s.bitOffset -= 16;
      }
      const bits = readFewBits(s, 8);
      if (bits == 0 && i + 1 == sizeBytes && sizeBytes > 1) {
        throw new Error("Exuberant nibble");
      }
      s.metaBlockLength |= bits << (i * 8);
    }
  } else {
    for (let i = 0; i < sizeNibbles; i++) {
      if (s.bitOffset >= 16) {
        s.accumulator32 =
          (s.shortBuffer[s.halfOffset++] << 16) | (s.accumulator32 >>> 16);
        s.bitOffset -= 16;
      }
      const bits = readFewBits(s, 4);
      if (bits == 0 && i + 1 == sizeNibbles && sizeNibbles > 4) {
        throw new Error("Exuberant nibble");
      }
      s.metaBlockLength |= bits << (i * 4);
    }
  }
  s.metaBlockLength++;
  if (s.inputEnd == 0) {
    s.isUncompressed = readFewBits(s, 1);
  }
}

/**
 * @param {!Int32Array} tableGroup
 * @param {number} tableIdx
 * @param {!State} s
 * @return {number}
 */
function readSymbol(tableGroup, tableIdx, s) {
  let offset = tableGroup[tableIdx];
  const val = s.accumulator32 >>> s.bitOffset;
  offset += val & 0xff;
  const bits = tableGroup[offset] >> 16;
  const sym = tableGroup[offset] & 0xffff;
  if (bits <= 8) {
    s.bitOffset += bits;
    return sym;
  }
  offset += sym;
  const mask = (1 << bits) - 1;
  offset += (val & mask) >>> 8;
  s.bitOffset += (tableGroup[offset] >> 16) + 8;
  return tableGroup[offset] & 0xffff;
}

/**
 * @param {!Int32Array} tableGroup
 * @param {number} tableIdx
 * @param {!State} s
 * @return {number}
 */
function readBlockLength(tableGroup, tableIdx, s) {
  if (s.bitOffset >= 16) {
    s.accumulator32 =
      (s.shortBuffer[s.halfOffset++] << 16) | (s.accumulator32 >>> 16);
    s.bitOffset -= 16;
  }
  const code = readSymbol(tableGroup, tableIdx, s);
  const n = BLOCK_LENGTH_N_BITS[code];
  if (s.bitOffset >= 16) {
    s.accumulator32 =
      (s.shortBuffer[s.halfOffset++] << 16) | (s.accumulator32 >>> 16);
    s.bitOffset -= 16;
  }
  return (
    BLOCK_LENGTH_OFFSET[code] +
    (n <= 16 ? readFewBits(s, n) : readManyBits(s, n))
  );
}

/**
 * @param {!Int32Array} v
 * @param {number} index
 * @return {void}
 */
function moveToFront(v, index) {
  const value = v[index];
  for (; index > 0; index--) {
    v[index] = v[index - 1];
  }
  v[0] = value;
}

/**
 * @param {!Int8Array} v
 * @param {number} vLen
 * @return {void}
 */
function inverseMoveToFrontTransform(v, vLen) {
  const mtf = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    mtf[i] = i;
  }
  for (let i = 0; i < vLen; i++) {
    const index = v[i] & 0xff;
    v[i] = mtf[index];
    if (index != 0) {
      moveToFront(mtf, index);
    }
  }
}

/**
 * @param {!Int32Array} codeLengthCodeLengths
 * @param {number} numSymbols
 * @param {!Int32Array} codeLengths
 * @param {!State} s
 * @return {void}
 */
function readHuffmanCodeLengths(
  codeLengthCodeLengths,
  numSymbols,
  codeLengths,
  s
) {
  let symbol = 0;
  let prevCodeLen = 8;
  let repeat = 0;
  let repeatCodeLen = 0;
  let space = 32768;
  const table = new Int32Array(32 + 1);
  const tableIdx = table.length - 1;
  buildHuffmanTable(table, tableIdx, 5, codeLengthCodeLengths, 18);
  while (symbol < numSymbols && space > 0) {
    if (s.halfOffset > 2030) {
      doReadMoreInput(s);
    }
    if (s.bitOffset >= 16) {
      s.accumulator32 =
        (s.shortBuffer[s.halfOffset++] << 16) | (s.accumulator32 >>> 16);
      s.bitOffset -= 16;
    }
    const p = (s.accumulator32 >>> s.bitOffset) & 31;
    s.bitOffset += table[p] >> 16;
    const codeLen = table[p] & 0xffff;
    if (codeLen < 16) {
      repeat = 0;
      codeLengths[symbol++] = codeLen;
      if (codeLen != 0) {
        prevCodeLen = codeLen;
        space -= 32768 >> codeLen;
      }
    } else {
      const extraBits = codeLen - 14;
      let newLen = 0;
      if (codeLen == 16) {
        newLen = prevCodeLen;
      }
      if (repeatCodeLen != newLen) {
        repeat = 0;
        repeatCodeLen = newLen;
      }
      const oldRepeat = repeat;
      if (repeat > 0) {
        repeat -= 2;
        repeat <<= extraBits;
      }
      if (s.bitOffset >= 16) {
        s.accumulator32 =
          (s.shortBuffer[s.halfOffset++] << 16) | (s.accumulator32 >>> 16);
        s.bitOffset -= 16;
      }
      repeat += readFewBits(s, extraBits) + 3;
      const repeatDelta = repeat - oldRepeat;
      if (symbol + repeatDelta > numSymbols) {
        throw new Error("symbol + repeatDelta > numSymbols");
      }
      for (let i = 0; i < repeatDelta; i++) {
        codeLengths[symbol++] = repeatCodeLen;
      }
      if (repeatCodeLen != 0) {
        space -= repeatDelta << (15 - repeatCodeLen);
      }
    }
  }
  if (space != 0) {
    throw new Error("Unused space");
  }
  codeLengths.fill(0, symbol, numSymbols);
}

/**
 * @param {!Int32Array} symbols
 * @param {number} length
 * @return {void}
 */
function checkDupes(symbols, length) {
  for (let i = 0; i < length - 1; ++i) {
    for (let j = i + 1; j < length; ++j) {
      if (symbols[i] == symbols[j]) {
        throw new Error("Duplicate simple Huffman code symbol");
      }
    }
  }
}

/**
 * @param {number} alphabetSizeMax
 * @param {number} alphabetSizeLimit
 * @param {!Int32Array} tableGroup
 * @param {number} tableIdx
 * @param {!State} s
 * @return {number}
 */
function readSimpleHuffmanCode(
  alphabetSizeMax,
  alphabetSizeLimit,
  tableGroup,
  tableIdx,
  s
) {
  const codeLengths = new Int32Array(alphabetSizeLimit);
  const symbols = new Int32Array(4);
  const maxBits = 1 + log2floor(alphabetSizeMax - 1);
  const numSymbols = readFewBits(s, 2) + 1;
  for (let i = 0; i < numSymbols; i++) {
    if (s.bitOffset >= 16) {
      s.accumulator32 =
        (s.shortBuffer[s.halfOffset++] << 16) | (s.accumulator32 >>> 16);
      s.bitOffset -= 16;
    }
    const symbol = readFewBits(s, maxBits);
    if (symbol >= alphabetSizeLimit) {
      throw new Error("Can't readHuffmanCode");
    }
    symbols[i] = symbol;
  }
  checkDupes(symbols, numSymbols);
  let histogramId = numSymbols;
  if (numSymbols == 4) {
    histogramId += readFewBits(s, 1);
  }
  switch (histogramId) {
    case 1:
      codeLengths[symbols[0]] = 1;
      break;
    case 2:
      codeLengths[symbols[0]] = 1;
      codeLengths[symbols[1]] = 1;
      break;
    case 3:
      codeLengths[symbols[0]] = 1;
      codeLengths[symbols[1]] = 2;
      codeLengths[symbols[2]] = 2;
      break;
    case 4:
      codeLengths[symbols[0]] = 2;
      codeLengths[symbols[1]] = 2;
      codeLengths[symbols[2]] = 2;
      codeLengths[symbols[3]] = 2;
      break;
    case 5:
      codeLengths[symbols[0]] = 1;
      codeLengths[symbols[1]] = 2;
      codeLengths[symbols[2]] = 3;
      codeLengths[symbols[3]] = 3;
      break;
    default:
      break;
  }
  return buildHuffmanTable(
    tableGroup,
    tableIdx,
    8,
    codeLengths,
    alphabetSizeLimit
  );
}

/**
 * @param {number} alphabetSizeLimit
 * @param {number} skip
 * @param {!Int32Array} tableGroup
 * @param {number} tableIdx
 * @param {!State} s
 * @return {number}
 */
function readComplexHuffmanCode(
  alphabetSizeLimit,
  skip,
  tableGroup,
  tableIdx,
  s
) {
  const codeLengths = new Int32Array(alphabetSizeLimit);
  const codeLengthCodeLengths = new Int32Array(18);
  let space = 32;
  let numCodes = 0;
  for (let i = skip; i < 18 && space > 0; i++) {
    const codeLenIdx = CODE_LENGTH_CODE_ORDER[i];
    if (s.bitOffset >= 16) {
      s.accumulator32 =
        (s.shortBuffer[s.halfOffset++] << 16) | (s.accumulator32 >>> 16);
      s.bitOffset -= 16;
    }
    const p = (s.accumulator32 >>> s.bitOffset) & 15;
    s.bitOffset += FIXED_TABLE[p] >> 16;
    const v = FIXED_TABLE[p] & 0xffff;
    codeLengthCodeLengths[codeLenIdx] = v;
    if (v != 0) {
      space -= 32 >> v;
      numCodes++;
    }
  }
  if (space != 0 && numCodes != 1) {
    throw new Error("Corrupted Huffman code histogram");
  }
  readHuffmanCodeLengths(
    codeLengthCodeLengths,
    alphabetSizeLimit,
    codeLengths,
    s
  );
  return buildHuffmanTable(
    tableGroup,
    tableIdx,
    8,
    codeLengths,
    alphabetSizeLimit
  );
}

/**
 * @param {number} alphabetSizeMax
 * @param {number} alphabetSizeLimit
 * @param {!Int32Array} tableGroup
 * @param {number} tableIdx
 * @param {!State} s
 * @return {number}
 */
function readHuffmanCode(
  alphabetSizeMax,
  alphabetSizeLimit,
  tableGroup,
  tableIdx,
  s
) {
  if (s.halfOffset > 2030) {
    doReadMoreInput(s);
  }
  if (s.bitOffset >= 16) {
    s.accumulator32 =
      (s.shortBuffer[s.halfOffset++] << 16) | (s.accumulator32 >>> 16);
    s.bitOffset -= 16;
  }
  const simpleCodeOrSkip = readFewBits(s, 2);
  if (simpleCodeOrSkip == 1) {
    return readSimpleHuffmanCode(
      alphabetSizeMax,
      alphabetSizeLimit,
      tableGroup,
      tableIdx,
      s
    );
  } else {
    return readComplexHuffmanCode(
      alphabetSizeLimit,
      simpleCodeOrSkip,
      tableGroup,
      tableIdx,
      s
    );
  }
}

/**
 * @param {number} contextMapSize
 * @param {!Int8Array} contextMap
 * @param {!State} s
 * @return {number}
 */
function decodeContextMap(contextMapSize, contextMap, s) {
  if (s.halfOffset > 2030) {
    doReadMoreInput(s);
  }
  const numTrees = decodeVarLenUnsignedByte(s) + 1;
  if (numTrees == 1) {
    contextMap.fill(0, 0, contextMapSize);
    return numTrees;
  }
  if (s.bitOffset >= 16) {
    s.accumulator32 =
      (s.shortBuffer[s.halfOffset++] << 16) | (s.accumulator32 >>> 16);
    s.bitOffset -= 16;
  }
  const useRleForZeros = readFewBits(s, 1);
  let maxRunLengthPrefix = 0;
  if (useRleForZeros != 0) {
    maxRunLengthPrefix = readFewBits(s, 4) + 1;
  }
  const alphabetSize = numTrees + maxRunLengthPrefix;
  const tableSize = MAX_HUFFMAN_TABLE_SIZE[(alphabetSize + 31) >> 5];
  const table = new Int32Array(tableSize + 1);
  const tableIdx = table.length - 1;
  readHuffmanCode(alphabetSize, alphabetSize, table, tableIdx, s);
  for (let i = 0; i < contextMapSize; ) {
    if (s.halfOffset > 2030) {
      doReadMoreInput(s);
    }
    if (s.bitOffset >= 16) {
      s.accumulator32 =
        (s.shortBuffer[s.halfOffset++] << 16) | (s.accumulator32 >>> 16);
      s.bitOffset -= 16;
    }
    const code = readSymbol(table, tableIdx, s);
    if (code == 0) {
      contextMap[i] = 0;
      i++;
    } else if (code <= maxRunLengthPrefix) {
      if (s.bitOffset >= 16) {
        s.accumulator32 =
          (s.shortBuffer[s.halfOffset++] << 16) | (s.accumulator32 >>> 16);
        s.bitOffset -= 16;
      }
      let reps = (1 << code) + readFewBits(s, code);
      while (reps != 0) {
        if (i >= contextMapSize) {
          throw new Error("Corrupted context map");
        }
        contextMap[i] = 0;
        i++;
        reps--;
      }
    } else {
      contextMap[i] = code - maxRunLengthPrefix;
      i++;
    }
  }
  if (s.bitOffset >= 16) {
    s.accumulator32 =
      (s.shortBuffer[s.halfOffset++] << 16) | (s.accumulator32 >>> 16);
    s.bitOffset -= 16;
  }
  if (readFewBits(s, 1) == 1) {
    inverseMoveToFrontTransform(contextMap, contextMapSize);
  }
  return numTrees;
}

/**
 * @param {!State} s
 * @param {number} treeType
 * @param {number} numBlockTypes
 * @return {number}
 */
function decodeBlockTypeAndLength(s, treeType, numBlockTypes) {
  const ringBuffers = s.rings;
  const offset = 4 + treeType * 2;
  if (s.bitOffset >= 16) {
    s.accumulator32 =
      (s.shortBuffer[s.halfOffset++] << 16) | (s.accumulator32 >>> 16);
    s.bitOffset -= 16;
  }
  let blockType = readSymbol(s.blockTrees, 2 * treeType, s);
  const result = readBlockLength(s.blockTrees, 2 * treeType + 1, s);
  if (blockType == 1) {
    blockType = ringBuffers[offset + 1] + 1;
  } else if (blockType == 0) {
    blockType = ringBuffers[offset];
  } else {
    blockType -= 2;
  }
  if (blockType >= numBlockTypes) {
    blockType -= numBlockTypes;
  }
  ringBuffers[offset] = ringBuffers[offset + 1];
  ringBuffers[offset + 1] = blockType;
  return result;
}

/**
 * @param {!State} s
 * @return {void}
 */
function decodeLiteralBlockSwitch(s) {
  s.literalBlockLength = decodeBlockTypeAndLength(s, 0, s.numLiteralBlockTypes);
  const literalBlockType = s.rings[5];
  s.contextMapSlice = literalBlockType << 6;
  s.literalTreeIdx = s.contextMap[s.contextMapSlice] & 0xff;
  const contextMode = s.contextModes[literalBlockType];
  s.contextLookupOffset1 = contextMode << 9;
  s.contextLookupOffset2 = s.contextLookupOffset1 + 256;
}

/**
 * @param {!State} s
 * @return {void}
 */
function decodeCommandBlockSwitch(s) {
  s.commandBlockLength = decodeBlockTypeAndLength(s, 1, s.numCommandBlockTypes);
  s.commandTreeIdx = s.rings[7];
}

/**
 * @param {!State} s
 * @return {void}
 */
function decodeDistanceBlockSwitch(s) {
  s.distanceBlockLength = decodeBlockTypeAndLength(
    s,
    2,
    s.numDistanceBlockTypes
  );
  s.distContextMapSlice = s.rings[9] << 2;
}

/**
 * @param {!State} s
 * @return {void}
 */
function maybeReallocateRingBuffer(s) {
  let newSize = s.maxRingBufferSize;
  if (newSize > s.expectedTotalSize) {
    const minimalNewSize = s.expectedTotalSize;
    while (newSize >> 1 > minimalNewSize) {
      newSize >>= 1;
    }
    if (s.inputEnd == 0 && newSize < 16384 && s.maxRingBufferSize >= 16384) {
      newSize = 16384;
    }
  }
  if (newSize <= s.ringBufferSize) {
    return;
  }
  const ringBufferSizeWithSlack = newSize + 37;
  const newBuffer = new Int8Array(ringBufferSizeWithSlack);
  if (s.ringBuffer.length != 0) {
    newBuffer.set(s.ringBuffer.subarray(0, 0 + s.ringBufferSize), 0);
  }
  s.ringBuffer = newBuffer;
  s.ringBufferSize = newSize;
}

/**
 * @param {!State} s
 * @return {void}
 */
function readNextMetablockHeader(s) {
  if (s.inputEnd != 0) {
    s.nextRunningState = RunningState.FINISHED;
    s.runningState = RunningState.INIT_WRITE;
    return;
  }
  s.literalTreeGroup = new Int32Array(0);
  s.commandTreeGroup = new Int32Array(0);
  s.distanceTreeGroup = new Int32Array(0);
  if (s.halfOffset > 2030) {
    doReadMoreInput(s);
  }
  decodeMetaBlockLength(s);
  if (s.metaBlockLength == 0 && s.isMetadata == 0) {
    return;
  }
  if (s.isUncompressed != 0 || s.isMetadata != 0) {
    jumpToByteBoundary(s);
    s.runningState = s.isMetadata != 0 ? RunningState.READ_METADATA : RunningState.COPY_UNCOMPRESSED;
  } else {
    s.runningState = RunningState.COMPRESSED_BLOCK_START;
  }
  if (s.isMetadata != 0) {
    return;
  }
  s.expectedTotalSize += s.metaBlockLength;
  if (s.expectedTotalSize > 1 << 30) {
    s.expectedTotalSize = 1 << 30;
  }
  if (s.ringBufferSize < s.maxRingBufferSize) {
    maybeReallocateRingBuffer(s);
  }
}

/**
 * @param {!State} s
 * @param {number} treeType
 * @param {number} numBlockTypes
 * @return {number}
 */
function readMetablockPartition(s, treeType, numBlockTypes) {
  let offset = s.blockTrees[2 * treeType];
  if (numBlockTypes <= 1) {
    s.blockTrees[2 * treeType + 1] = offset;
    s.blockTrees[2 * treeType + 2] = offset;
    return 1 << 28;
  }
  const blockTypeAlphabetSize = numBlockTypes + 2;
  offset += readHuffmanCode(
    blockTypeAlphabetSize,
    blockTypeAlphabetSize,
    s.blockTrees,
    2 * treeType,
    s
  );
  s.blockTrees[2 * treeType + 1] = offset;
  const blockLengthAlphabetSize = 26;
  offset += readHuffmanCode(
    blockLengthAlphabetSize,
    blockLengthAlphabetSize,
    s.blockTrees,
    2 * treeType + 1,
    s
  );
  s.blockTrees[2 * treeType + 2] = offset;
  return readBlockLength(s.blockTrees, 2 * treeType + 1, s);
}

/**
 * @param {!State} s
 * @param {number} alphabetSizeLimit
 * @return {void}
 */
function calculateDistanceLut(s, alphabetSizeLimit) {
  const distExtraBits = s.distExtraBits;
  const distOffset = s.distOffset;
  const npostfix = s.distancePostfixBits;
  const ndirect = s.numDirectDistanceCodes;
  const postfix = 1 << npostfix;
  let bits = 1;
  let half = 0;
  let i = 16;
  for (let j = 0; j < ndirect; ++j) {
    distExtraBits[i] = 0;
    distOffset[i] = j + 1;
    ++i;
  }
  while (i < alphabetSizeLimit) {
    const base = ndirect + ((((2 + half) << bits) - 4) << npostfix) + 1;
    for (let j = 0; j < postfix; ++j) {
      distExtraBits[i] = bits;
      distOffset[i] = base + j;
      ++i;
    }
    bits = bits + half;
    half = half ^ 1;
  }
}

/**
 * @param {!State} s
 * @return {void}
 */
function readMetablockHuffmanCodesAndContextMaps(s) {
  s.numLiteralBlockTypes = decodeVarLenUnsignedByte(s) + 1;
  s.literalBlockLength = readMetablockPartition(s, 0, s.numLiteralBlockTypes);
  s.numCommandBlockTypes = decodeVarLenUnsignedByte(s) + 1;
  s.commandBlockLength = readMetablockPartition(s, 1, s.numCommandBlockTypes);
  s.numDistanceBlockTypes = decodeVarLenUnsignedByte(s) + 1;
  s.distanceBlockLength = readMetablockPartition(s, 2, s.numDistanceBlockTypes);
  if (s.halfOffset > 2030) {
    doReadMoreInput(s);
  }
  if (s.bitOffset >= 16) {
    s.accumulator32 =
      (s.shortBuffer[s.halfOffset++] << 16) | (s.accumulator32 >>> 16);
    s.bitOffset -= 16;
  }
  s.distancePostfixBits = readFewBits(s, 2);
  s.numDirectDistanceCodes = readFewBits(s, 4) << s.distancePostfixBits;
  s.contextModes = new Int8Array(s.numLiteralBlockTypes);
  for (let i = 0; i < s.numLiteralBlockTypes; ) {
    const limit = min(i + 96, s.numLiteralBlockTypes);
    for (; i < limit; ++i) {
      if (s.bitOffset >= 16) {
        s.accumulator32 =
          (s.shortBuffer[s.halfOffset++] << 16) | (s.accumulator32 >>> 16);
        s.bitOffset -= 16;
      }
      s.contextModes[i] = readFewBits(s, 2);
    }
    if (s.halfOffset > 2030) {
      doReadMoreInput(s);
    }
  }
  s.contextMap = new Int8Array(s.numLiteralBlockTypes << 6);
  const numLiteralTrees = decodeContextMap(
    s.numLiteralBlockTypes << 6,
    s.contextMap,
    s
  );
  s.trivialLiteralContext = 1;
  for (let j = 0; j < s.numLiteralBlockTypes << 6; j++) {
    if (s.contextMap[j] != j >> 6) {
      s.trivialLiteralContext = 0;
      break;
    }
  }
  s.distContextMap = new Int8Array(s.numDistanceBlockTypes << 2);
  const numDistTrees = decodeContextMap(
    s.numDistanceBlockTypes << 2,
    s.distContextMap,
    s
  );
  s.literalTreeGroup = decodeHuffmanTreeGroup(256, 256, numLiteralTrees, s);
  s.commandTreeGroup = decodeHuffmanTreeGroup(
    704,
    704,
    s.numCommandBlockTypes,
    s
  );
  let distanceAlphabetSizeMax = calculateDistanceAlphabetSize(
    s.distancePostfixBits,
    s.numDirectDistanceCodes,
    24
  );
  let distanceAlphabetSizeLimit = distanceAlphabetSizeMax;
  if (s.isLargeWindow == 1) {
    distanceAlphabetSizeMax = calculateDistanceAlphabetSize(
      s.distancePostfixBits,
      s.numDirectDistanceCodes,
      62
    );
    distanceAlphabetSizeLimit = calculateDistanceAlphabetLimit(
      0x7ffffffc,
      s.distancePostfixBits,
      s.numDirectDistanceCodes
    );
  }
  s.distanceTreeGroup = decodeHuffmanTreeGroup(
    distanceAlphabetSizeMax,
    distanceAlphabetSizeLimit,
    numDistTrees,
    s
  );
  calculateDistanceLut(s, distanceAlphabetSizeLimit);
  s.contextMapSlice = 0;
  s.distContextMapSlice = 0;
  s.contextLookupOffset1 = s.contextModes[0] * 512;
  s.contextLookupOffset2 = s.contextLookupOffset1 + 256;
  s.literalTreeIdx = 0;
  s.commandTreeIdx = 0;
  s.rings[4] = 1;
  s.rings[5] = 0;
  s.rings[6] = 1;
  s.rings[7] = 0;
  s.rings[8] = 1;
  s.rings[9] = 0;
}

/**
 * @param {!State} s
 * @return {void}
 */
function copyUncompressedData(s) {
  const ringBuffer = s.ringBuffer;
  if (s.metaBlockLength <= 0) {
    reload(s);
    s.runningState = RunningState.BLOCK_START;
    return;
  }
  const chunkLength = min(s.ringBufferSize - s.pos, s.metaBlockLength);
  copyRawBytes(s, ringBuffer, s.pos, chunkLength);
  s.metaBlockLength -= chunkLength;
  s.pos += chunkLength;
  if (s.pos == s.ringBufferSize) {
    s.nextRunningState = RunningState.COPY_UNCOMPRESSED;
    s.runningState = RunningState.INIT_WRITE;
    return;
  }
  reload(s);
  s.runningState = RunningState.BLOCK_START;
}

/**
 * @param {!State} s
 * @return {number}
 */
function writeRingBuffer(s) {
  const toWrite = min(
    s.outputLength - s.outputUsed,
    s.ringBufferBytesReady - s.ringBufferBytesWritten
  );
  if (toWrite != 0) {
    s.output.set(
      s.ringBuffer.subarray(
        s.ringBufferBytesWritten,
        s.ringBufferBytesWritten + toWrite
      ),
      s.outputOffset + s.outputUsed
    );
    s.outputUsed += toWrite;
    s.ringBufferBytesWritten += toWrite;
  }
  if (s.outputUsed < s.outputLength) {
    return 1;
  } else {
    return 0;
  }
}

/**
 * @param {number} alphabetSizeMax
 * @param {number} alphabetSizeLimit
 * @param {number} n
 * @param {!State} s
 * @return {!Int32Array}
 */
function decodeHuffmanTreeGroup(alphabetSizeMax, alphabetSizeLimit, n, s) {
  const maxTableSize = MAX_HUFFMAN_TABLE_SIZE[(alphabetSizeLimit + 31) >> 5];
  const group = new Int32Array(n + n * maxTableSize);
  let next = n;
  for (let i = 0; i < n; ++i) {
    group[i] = next;
    next += readHuffmanCode(alphabetSizeMax, alphabetSizeLimit, group, i, s);
  }
  return group;
}

/**
 * @param {!State} s
 * @return {number}
 */
function calculateFence(s) {
  let result = s.ringBufferSize;
  if (s.isEager != 0) {
    result = min(
      result,
      s.ringBufferBytesWritten + s.outputLength - s.outputUsed
    );
  }
  return result;
}

/**
 * @param {!State} s
 * @param {number} fence
 * @return {void}
 */
function doUseDictionary(s, fence) {
  if (s.distance > 0x7ffffffc) {
    throw new Error("Invalid backward reference");
  }
  const address = s.distance - s.maxDistance - 1;
  const dictionaryData = data;
  const wordLength = s.copyLength;
  if (wordLength > 31) {
    throw new Error("Invalid backward reference");
  }
  const shift = sizeBits[wordLength];
  if (shift == 0) {
    throw new Error("Invalid backward reference");
  }
  let offset = offsets[wordLength];
  const mask = (1 << shift) - 1;
  const wordIdx = address & mask;
  const transformIdx = address >>> shift;
  offset += wordIdx * wordLength;
  const transforms = RFC_TRANSFORMS;
  if (transformIdx >= transforms.numTransforms) {
    throw new Error("Invalid backward reference");
  }
  const len = transformDictionaryWord(
    s.ringBuffer,
    s.pos,
    dictionaryData,
    offset,
    wordLength,
    transforms,
    transformIdx
  );
  s.pos += len;
  s.metaBlockLength -= len;
  if (s.pos >= fence) {
    s.nextRunningState = RunningState.MAIN_LOOP;
    s.runningState = RunningState.INIT_WRITE;
    return;
  }
  s.runningState = RunningState.MAIN_LOOP;
}

/**
 * @param {!State} s
 * @return {void}
 */
function decompress(s) {
  if (s.runningState == RunningState.UNINITIALIZED) {
    throw new Error("Can't decompress until initialized");
  }
  if (s.runningState == RunningState.CLOSED) {
    throw new Error("Can't decompress after close");
  }
  if (s.runningState == RunningState.INITIALIZED) {
    const windowBits = decodeWindowBits(s);
    if (windowBits == -1) {
      throw new Error("Invalid 'windowBits' code");
    }
    s.maxRingBufferSize = 1 << windowBits;
    s.maxBackwardDistance = s.maxRingBufferSize - 16;
    s.runningState = RunningState.BLOCK_START;
  }
  let fence = calculateFence(s);
  let ringBufferMask = s.ringBufferSize - 1;
  let ringBuffer = s.ringBuffer;
  while (s.runningState != RunningState.FINISHED) {
    switch (s.runningState) {
      case RunningState.BLOCK_START:
        if (s.metaBlockLength < 0) {
          throw new Error("Invalid metablock length");
        }
        readNextMetablockHeader(s);
        fence = calculateFence(s);
        ringBufferMask = s.ringBufferSize - 1;
        ringBuffer = s.ringBuffer;
        continue;
      case RunningState.COMPRESSED_BLOCK_START:
        readMetablockHuffmanCodesAndContextMaps(s);
        s.runningState = RunningState.MAIN_LOOP;
      // fall through
      case RunningState.MAIN_LOOP: {
        if (s.metaBlockLength <= 0) {
          s.runningState = RunningState.BLOCK_START;
          continue;
        }
        if (s.halfOffset > 2030) {
          doReadMoreInput(s);
        }
        if (s.commandBlockLength == 0) {
          decodeCommandBlockSwitch(s);
        }
        s.commandBlockLength--;
        if (s.bitOffset >= 16) {
          s.accumulator32 =
            (s.shortBuffer[s.halfOffset++] << 16) | (s.accumulator32 >>> 16);
          s.bitOffset -= 16;
        }
        const cmdCode =
          readSymbol(s.commandTreeGroup, s.commandTreeIdx, s) << 2;
        const insertAndCopyExtraBits = CMD_LOOKUP[cmdCode];
        const insertLengthOffset = CMD_LOOKUP[cmdCode + 1];
        const copyLengthOffset = CMD_LOOKUP[cmdCode + 2];
        s.distanceCode = CMD_LOOKUP[cmdCode + 3];
        if (s.bitOffset >= 16) {
          s.accumulator32 =
            (s.shortBuffer[s.halfOffset++] << 16) | (s.accumulator32 >>> 16);
          s.bitOffset -= 16;
        }
        const insertLengthExtraBits = insertAndCopyExtraBits & 0xff;
        s.insertLength =
          insertLengthOffset +
          (insertLengthExtraBits <= 16
            ? readFewBits(s, insertLengthExtraBits)
            : readManyBits(s, insertLengthExtraBits));
        if (s.bitOffset >= 16) {
          s.accumulator32 =
            (s.shortBuffer[s.halfOffset++] << 16) | (s.accumulator32 >>> 16);
          s.bitOffset -= 16;
        }
        const copyLengthExtraBits = insertAndCopyExtraBits >> 8;
        s.copyLength =
          copyLengthOffset +
          (copyLengthExtraBits <= 16
            ? readFewBits(s, copyLengthExtraBits)
            : readManyBits(s, copyLengthExtraBits));
        s.j = 0;
        s.runningState = RunningState.INSERT_LOOP;
        // fall through
      }
      case RunningState.INSERT_LOOP: {
        if (s.trivialLiteralContext != 0) {
          while (s.j < s.insertLength) {
            if (s.halfOffset > 2030) {
              doReadMoreInput(s);
            }
            if (s.literalBlockLength == 0) {
              decodeLiteralBlockSwitch(s);
            }
            s.literalBlockLength--;
            if (s.bitOffset >= 16) {
              s.accumulator32 =
                (s.shortBuffer[s.halfOffset++] << 16) |
                (s.accumulator32 >>> 16);
              s.bitOffset -= 16;
            }
            ringBuffer[s.pos] = readSymbol(
              s.literalTreeGroup,
              s.literalTreeIdx,
              s
            );
            s.pos++;
            s.j++;
            if (s.pos >= fence) {
              s.nextRunningState = RunningState.INSERT_LOOP;
              s.runningState = RunningState.INIT_WRITE;
              break;
            }
          }
        } else {
          let prevByte1 = ringBuffer[(s.pos - 1) & ringBufferMask] & 0xff;
          let prevByte2 = ringBuffer[(s.pos - 2) & ringBufferMask] & 0xff;
          while (s.j < s.insertLength) {
            if (s.halfOffset > 2030) {
              doReadMoreInput(s);
            }
            if (s.literalBlockLength == 0) {
              decodeLiteralBlockSwitch(s);
            }
            const literalContext =
              LOOKUP[s.contextLookupOffset1 + prevByte1] |
              LOOKUP[s.contextLookupOffset2 + prevByte2];
            const literalTreeIdx =
              s.contextMap[s.contextMapSlice + literalContext] & 0xff;
            s.literalBlockLength--;
            prevByte2 = prevByte1;
            if (s.bitOffset >= 16) {
              s.accumulator32 =
                (s.shortBuffer[s.halfOffset++] << 16) |
                (s.accumulator32 >>> 16);
              s.bitOffset -= 16;
            }
            prevByte1 = readSymbol(s.literalTreeGroup, literalTreeIdx, s);
            ringBuffer[s.pos] = prevByte1;
            s.pos++;
            s.j++;
            if (s.pos >= fence) {
              s.nextRunningState = RunningState.INSERT_LOOP;
              s.runningState = RunningState.INIT_WRITE;
              break;
            }
          }
        }
        if (s.runningState != RunningState.INSERT_LOOP) {
          continue;
        }
        s.metaBlockLength -= s.insertLength;
        if (s.metaBlockLength <= 0) {
          s.runningState = RunningState.MAIN_LOOP;
          continue;
        }
        let distanceCode = s.distanceCode;
        if (distanceCode < 0) {
          s.distance = s.rings[s.distRbIdx];
        } else {
          if (s.halfOffset > 2030) {
            doReadMoreInput(s);
          }
          if (s.distanceBlockLength == 0) {
            decodeDistanceBlockSwitch(s);
          }
          s.distanceBlockLength--;
          if (s.bitOffset >= 16) {
            s.accumulator32 =
              (s.shortBuffer[s.halfOffset++] << 16) | (s.accumulator32 >>> 16);
            s.bitOffset -= 16;
          }
          const distTreeIdx =
            s.distContextMap[s.distContextMapSlice + distanceCode] & 0xff;
          distanceCode = readSymbol(s.distanceTreeGroup, distTreeIdx, s);
          if (distanceCode < 16) {
            const index =
              (s.distRbIdx + DISTANCE_SHORT_CODE_INDEX_OFFSET[distanceCode]) &
              0x3;
            s.distance =
              s.rings[index] + DISTANCE_SHORT_CODE_VALUE_OFFSET[distanceCode];
            if (s.distance < 0) {
              throw new Error("Negative distance");
            }
          } else {
            const extraBits = s.distExtraBits[distanceCode];
            let /** @type{number} */ bits;
            if (s.bitOffset + extraBits <= 32) {
              bits = readFewBits(s, extraBits);
            } else {
              if (s.bitOffset >= 16) {
                s.accumulator32 =
                  (s.shortBuffer[s.halfOffset++] << 16) |
                  (s.accumulator32 >>> 16);
                s.bitOffset -= 16;
              }
              bits =
                extraBits <= 16
                  ? readFewBits(s, extraBits)
                  : readManyBits(s, extraBits);
            }
            s.distance =
              s.distOffset[distanceCode] + (bits << s.distancePostfixBits);
          }
        }
        if (
          s.maxDistance != s.maxBackwardDistance &&
          s.pos < s.maxBackwardDistance
        ) {
          s.maxDistance = s.pos;
        } else {
          s.maxDistance = s.maxBackwardDistance;
        }
        if (s.distance > s.maxDistance) {
          s.runningState = RunningState.USE_DICTIONARY;
          continue;
        }
        if (distanceCode > 0) {
          s.distRbIdx = (s.distRbIdx + 1) & 0x3;
          s.rings[s.distRbIdx] = s.distance;
        }
        if (s.copyLength > s.metaBlockLength) {
          throw new Error("Invalid backward reference");
        }
        s.j = 0;
        s.runningState = RunningState.COPY_LOOP;
        // fall through
      }
      case RunningState.COPY_LOOP: {
        let src = (s.pos - s.distance) & ringBufferMask;
        let dst = s.pos;
        const copyLength = s.copyLength - s.j;
        const srcEnd = src + copyLength;
        const dstEnd = dst + copyLength;
        if (srcEnd < ringBufferMask && dstEnd < ringBufferMask) {
          if (copyLength < 12 || (srcEnd > dst && dstEnd > src)) {
            for (let k = 0; k < copyLength; k += 4) {
              ringBuffer[dst++] = ringBuffer[src++];
              ringBuffer[dst++] = ringBuffer[src++];
              ringBuffer[dst++] = ringBuffer[src++];
              ringBuffer[dst++] = ringBuffer[src++];
            }
          } else {
            ringBuffer.copyWithin(dst, src, srcEnd);
          }
          s.j += copyLength;
          s.metaBlockLength -= copyLength;
          s.pos += copyLength;
        } else {
          for (; s.j < s.copyLength; ) {
            ringBuffer[s.pos] =
              ringBuffer[(s.pos - s.distance) & ringBufferMask];
            s.metaBlockLength--;
            s.pos++;
            s.j++;
            if (s.pos >= fence) {
              s.nextRunningState = RunningState.COPY_LOOP;
              s.runningState = RunningState.INIT_WRITE;
              break;
            }
          }
        }
        if (s.runningState == RunningState.COPY_LOOP) {
          s.runningState = RunningState.MAIN_LOOP;
        }
        continue;
      }
      case RunningState.USE_DICTIONARY:
        doUseDictionary(s, fence);
        continue;
      case RunningState.READ_METADATA:
        while (s.metaBlockLength > 0) {
          if (s.halfOffset > 2030) {
            doReadMoreInput(s);
          }
          if (s.bitOffset >= 16) {
            s.accumulator32 =
              (s.shortBuffer[s.halfOffset++] << 16) | (s.accumulator32 >>> 16);
            s.bitOffset -= 16;
          }
          readFewBits(s, 8);
          s.metaBlockLength--;
        }
        s.runningState = RunningState.BLOCK_START;
        continue;
      case RunningState.COPY_UNCOMPRESSED:
        copyUncompressedData(s);
        continue;
      case RunningState.INIT_WRITE:
        s.ringBufferBytesReady = min(s.pos, s.ringBufferSize);
        s.runningState = RunningState.WRITE;
      // fall through
      case RunningState.WRITE:
        if (writeRingBuffer(s) == 0) {
          return;
        }
        if (s.pos >= s.maxBackwardDistance) {
          s.maxDistance = s.maxBackwardDistance;
        }
        if (s.pos >= s.ringBufferSize) {
          if (s.pos > s.ringBufferSize) {
            ringBuffer.copyWithin(0, s.ringBufferSize, s.pos);
          }
          s.pos &= ringBufferMask;
          s.ringBufferBytesWritten = 0;
        }
        s.runningState = s.nextRunningState;
        continue;
      default:
        throw new Error("Unexpected state " + s.runningState);
    }
  }
  if (s.runningState == RunningState.FINISHED) {
    if (s.metaBlockLength < 0) {
      throw new Error("Invalid metablock length");
    }
    jumpToByteBoundary(s);
    checkHealth(s, 1);
  }
}

/**
 * @param {!Int8Array} dst
 * @param {number} dstOffset
 * @param {!Int8Array} src
 * @param {number} srcOffset
 * @param {number} len
 * @param {!import('./transforms').Transforms} transforms
 * @param {number} transformIndex
 * @return {number}
 */
function transformDictionaryWord(
  dst,
  dstOffset,
  src,
  srcOffset,
  len,
  transforms,
  transformIndex
) {
  let offset = dstOffset;
  const triplets = transforms.triplets;
  const prefixSuffixStorage = transforms.prefixSuffixStorage;
  const prefixSuffixHeads = transforms.prefixSuffixHeads;
  const transformOffset = 3 * transformIndex;
  const prefixIdx = triplets[transformOffset];
  const transformType = triplets[transformOffset + 1];
  const suffixIdx = triplets[transformOffset + 2];
  let prefix = prefixSuffixHeads[prefixIdx];
  const prefixEnd = prefixSuffixHeads[prefixIdx + 1];
  let suffix = prefixSuffixHeads[suffixIdx];
  const suffixEnd = prefixSuffixHeads[suffixIdx + 1];
  let omitFirst = transformType - 11;
  let omitLast = transformType - 0;
  if (omitFirst < 1 || omitFirst > 9) {
    omitFirst = 0;
  }
  if (omitLast < 1 || omitLast > 9) {
    omitLast = 0;
  }
  while (prefix != prefixEnd) {
    dst[offset++] = prefixSuffixStorage[prefix++];
  }
  if (omitFirst > len) {
    omitFirst = len;
  }
  srcOffset += omitFirst;
  len -= omitFirst;
  len -= omitLast;
  let i = len;
  while (i > 0) {
    dst[offset++] = src[srcOffset++];
    i--;
  }
  if (transformType == 10 || transformType == 11) {
    let uppercaseOffset = offset - len;
    if (transformType == 10) {
      len = 1;
    }
    while (len > 0) {
      const c0 = dst[uppercaseOffset] & 0xff;
      if (c0 < 0xc0) {
        if (c0 >= 97 && c0 <= 122) {
          dst[uppercaseOffset] ^= 32;
        }
        uppercaseOffset += 1;
        len -= 1;
      } else if (c0 < 0xe0) {
        dst[uppercaseOffset + 1] ^= 32;
        uppercaseOffset += 2;
        len -= 2;
      } else {
        dst[uppercaseOffset + 2] ^= 5;
        uppercaseOffset += 3;
        len -= 3;
      }
    }
  } else if (transformType == 21 || transformType == 22) {
    let shiftOffset = offset - len;
    const param = transforms.params[transformIndex];
    let scalar = (param & 0x7fff) + (0x1000000 - (param & 0x8000));
    while (len > 0) {
      let step = 1;
      const c0 = dst[shiftOffset] & 0xff;
      if (c0 < 0x80) {
        scalar += c0;
        dst[shiftOffset] = scalar & 0x7f;
      } else if (c0 < 0xc0) {
        // noop
      } else if (c0 < 0xe0) {
        if (len >= 2) {
          const c1 = dst[shiftOffset + 1];
          scalar += (c1 & 0x3f) | ((c0 & 0x1f) << 6);
          dst[shiftOffset] = 0xc0 | ((scalar >> 6) & 0x1f);
          dst[shiftOffset + 1] = (c1 & 0xc0) | (scalar & 0x3f);
          step = 2;
        } else {
          step = len;
        }
      } else if (c0 < 0xf0) {
        if (len >= 3) {
          const c1 = dst[shiftOffset + 1];
          const c2 = dst[shiftOffset + 2];
          scalar += (c2 & 0x3f) | ((c1 & 0x3f) << 6) | ((c0 & 0x0f) << 12);
          dst[shiftOffset] = 0xe0 | ((scalar >> 12) & 0x0f);
          dst[shiftOffset + 1] = (c1 & 0xc0) | ((scalar >> 6) & 0x3f);
          dst[shiftOffset + 2] = (c2 & 0xc0) | (scalar & 0x3f);
          step = 3;
        } else {
          step = len;
        }
      } else if (c0 < 0xf8) {
        if (len >= 4) {
          const c1 = dst[shiftOffset + 1];
          const c2 = dst[shiftOffset + 2];
          const c3 = dst[shiftOffset + 3];
          scalar +=
            (c3 & 0x3f) |
            ((c2 & 0x3f) << 6) |
            ((c1 & 0x3f) << 12) |
            ((c0 & 0x07) << 18);
          dst[shiftOffset] = 0xf0 | ((scalar >> 18) & 0x07);
          dst[shiftOffset + 1] = (c1 & 0xc0) | ((scalar >> 12) & 0x3f);
          dst[shiftOffset + 2] = (c2 & 0xc0) | ((scalar >> 6) & 0x3f);
          dst[shiftOffset + 3] = (c3 & 0xc0) | (scalar & 0x3f);
          step = 4;
        } else {
          step = len;
        }
      }
      shiftOffset += step;
      len -= step;
      if (transformType == 21) {
        len = 0;
      }
    }
  }
  while (suffix != suffixEnd) {
    dst[offset++] = prefixSuffixStorage[suffix++];
  }
  return offset - dstOffset;
}

/**
 * @param {number} key
 * @param {number} len
 * @return {number}
 */
function getNextKey(key, len) {
  let step = 1 << (len - 1);
  while ((key & step) != 0) {
    step >>= 1;
  }
  return (key & (step - 1)) + step;
}

/**
 * @param {!Int32Array} table
 * @param {number} offset
 * @param {number} step
 * @param {number} end
 * @param {number} item
 * @return {void}
 */
function replicateValue(table, offset, step, end, item) {
  do {
    end -= step;
    table[offset + end] = item;
  } while (end > 0);
}

/**
 * @param {!Int32Array} count
 * @param {number} len
 * @param {number} rootBits
 * @return {number}
 */
function nextTableBitSize(count, len, rootBits) {
  let left = 1 << (len - rootBits);
  while (len < 15) {
    left -= count[len];
    if (left <= 0) {
      break;
    }
    len++;
    left <<= 1;
  }
  return len - rootBits;
}

/**
 * @param {!Int32Array} tableGroup
 * @param {number} tableIdx
 * @param {number} rootBits
 * @param {!Int32Array} codeLengths
 * @param {number} codeLengthsSize
 * @return {number}
 */
function buildHuffmanTable(
  tableGroup,
  tableIdx,
  rootBits,
  codeLengths,
  codeLengthsSize
) {
  const tableOffset = tableGroup[tableIdx];
  let /** @type{number} */ key;
  const sorted = new Int32Array(codeLengthsSize);
  const count = new Int32Array(16);
  const offset = new Int32Array(16);
  let /** @type{number} */ symbol;
  for (symbol = 0; symbol < codeLengthsSize; symbol++) {
    count[codeLengths[symbol]]++;
  }
  offset[1] = 0;
  for (let len = 1; len < 15; len++) {
    offset[len + 1] = offset[len] + count[len];
  }
  for (symbol = 0; symbol < codeLengthsSize; symbol++) {
    if (codeLengths[symbol] != 0) {
      sorted[offset[codeLengths[symbol]]++] = symbol;
    }
  }
  let tableBits = rootBits;
  let tableSize = 1 << tableBits;
  let totalSize = tableSize;
  if (offset[15] == 1) {
    for (key = 0; key < totalSize; key++) {
      tableGroup[tableOffset + key] = sorted[0];
    }
    return totalSize;
  }
  key = 0;
  symbol = 0;
  for (let len = 1, step = 2; len <= rootBits; len++, step <<= 1) {
    for (; count[len] > 0; count[len]--) {
      replicateValue(
        tableGroup,
        tableOffset + key,
        step,
        tableSize,
        (len << 16) | sorted[symbol++]
      );
      key = getNextKey(key, len);
    }
  }
  const mask = totalSize - 1;
  let low = -1;
  let currentOffset = tableOffset;
  for (let len = rootBits + 1, step = 2; len <= 15; len++, step <<= 1) {
    for (; count[len] > 0; count[len]--) {
      if ((key & mask) != low) {
        currentOffset += tableSize;
        tableBits = nextTableBitSize(count, len, rootBits);
        tableSize = 1 << tableBits;
        totalSize += tableSize;
        low = key & mask;
        tableGroup[tableOffset + low] =
          ((tableBits + rootBits) << 16) | (currentOffset - tableOffset - low);
      }
      replicateValue(
        tableGroup,
        currentOffset + (key >> rootBits),
        step,
        tableSize,
        ((len - rootBits) << 16) | sorted[symbol++]
      );
      key = getNextKey(key, len);
    }
  }
  return totalSize;
}

/**
 * @param {!State} s
 * @return {void}
 */
function doReadMoreInput(s) {
  if (s.endOfStreamReached != 0) {
    if (halfAvailable(s) >= -2) {
      return;
    }
    throw new Error("No more input");
  }
  const readOffset = s.halfOffset << 1;
  let bytesInBuffer = 4096 - readOffset;
  s.byteBuffer.copyWithin(0, readOffset, 4096);
  s.halfOffset = 0;
  while (bytesInBuffer < 4096) {
    const spaceLeft = 4096 - bytesInBuffer;
    const len = readInput(s.input, s.byteBuffer, bytesInBuffer, spaceLeft);
    if (len <= 0) {
      s.endOfStreamReached = 1;
      s.tailBytes = bytesInBuffer;
      bytesInBuffer += 1;
      break;
    }
    bytesInBuffer += len;
  }
  bytesToNibbles(s, bytesInBuffer);
}

/**
 * @param {!State} s
 * @param {number} endOfStream
 * @return {void}
 */
function checkHealth(s, endOfStream) {
  if (s.endOfStreamReached == 0) {
    return;
  }
  const byteOffset = (s.halfOffset << 1) + ((s.bitOffset + 7) >> 3) - 4;
  if (byteOffset > s.tailBytes) {
    throw new Error("Read after end");
  }
  if (endOfStream != 0 && byteOffset != s.tailBytes) {
    throw new Error("Unused bytes after end");
  }
}

/**
 * @param {!State} s
 * @param {number} n
 * @return {number}
 */
function readFewBits(s, n) {
  const val = (s.accumulator32 >>> s.bitOffset) & ((1 << n) - 1);
  s.bitOffset += n;
  return val;
}

/**
 * @param {!State} s
 * @param {number} n
 * @return {number}
 */
function readManyBits(s, n) {
  const low = readFewBits(s, 16);
  s.accumulator32 =
    (s.shortBuffer[s.halfOffset++] << 16) | (s.accumulator32 >>> 16);
  s.bitOffset -= 16;
  return low | (readFewBits(s, n - 16) << 16);
}

/**
 * @param {!State} s
 * @return {void}
 */
function initBitReader(s) {
  s.byteBuffer = new Int8Array(4160);
  s.accumulator32 = 0;
  s.shortBuffer = new Int16Array(2080);
  s.bitOffset = 32;
  s.halfOffset = 2048;
  s.endOfStreamReached = 0;
  prepare(s);
}

/**
 * @param {!State} s
 * @return {void}
 */
function prepare(s) {
  if (s.halfOffset > 2030) {
    doReadMoreInput(s);
  }
  checkHealth(s, 0);
  s.accumulator32 =
    (s.shortBuffer[s.halfOffset++] << 16) | (s.accumulator32 >>> 16);
  s.bitOffset -= 16;
  s.accumulator32 =
    (s.shortBuffer[s.halfOffset++] << 16) | (s.accumulator32 >>> 16);
  s.bitOffset -= 16;
}

/**
 * @param {!State} s
 * @return {void}
 */
function reload(s) {
  if (s.bitOffset == 32) {
    prepare(s);
  }
}

/**
 * @param {!State} s
 * @return {void}
 */
function jumpToByteBoundary(s) {
  const padding = (32 - s.bitOffset) & 7;
  if (padding != 0) {
    const paddingBits = readFewBits(s, padding);
    if (paddingBits != 0) {
      throw new Error("Corrupted padding bits");
    }
  }
}

/**
 * @param {!State} s
 * @return {number}
 */
function halfAvailable(s) {
  let limit = 2048;
  if (s.endOfStreamReached != 0) {
    limit = (s.tailBytes + 1) >> 1;
  }
  return limit - s.halfOffset;
}

/**
 * @param {!State} s
 * @param {!Int8Array} data
 * @param {number} offset
 * @param {number} length
 * @return {void}
 */
function copyRawBytes(s, data, offset, length) {
  if ((s.bitOffset & 7) != 0) {
    throw new Error("Unaligned copyBytes");
  }
  while (s.bitOffset != 32 && length != 0) {
    data[offset++] = s.accumulator32 >>> s.bitOffset;
    s.bitOffset += 8;
    length--;
  }
  if (length == 0) {
    return;
  }
  const copyNibbles = min(halfAvailable(s), length >> 1);
  if (copyNibbles > 0) {
    const readOffset = s.halfOffset << 1;
    const delta = copyNibbles << 1;
    data.set(s.byteBuffer.subarray(readOffset, readOffset + delta), offset);
    offset += delta;
    length -= delta;
    s.halfOffset += copyNibbles;
  }
  if (length == 0) {
    return;
  }
  if (halfAvailable(s) > 0) {
    if (s.bitOffset >= 16) {
      s.accumulator32 =
        (s.shortBuffer[s.halfOffset++] << 16) | (s.accumulator32 >>> 16);
      s.bitOffset -= 16;
    }
    while (length != 0) {
      data[offset++] = s.accumulator32 >>> s.bitOffset;
      s.bitOffset += 8;
      length--;
    }
    checkHealth(s, 0);
    return;
  }
  while (length > 0) {
    const len = readInput(s.input, data, offset, length);
    if (len == -1) {
      throw new Error("Unexpected end of input");
    }
    offset += len;
    length -= len;
  }
}

/**
 * @param {!State} s
 * @param {number} byteLen
 * @return {void}
 */
function bytesToNibbles(s, byteLen) {
  const byteBuffer = s.byteBuffer;
  const halfLen = byteLen >> 1;
  const shortBuffer = s.shortBuffer;
  for (let i = 0; i < halfLen; ++i) {
    shortBuffer[i] =
      (byteBuffer[i * 2] & 0xff) | ((byteBuffer[i * 2 + 1] & 0xff) << 8);
  }
}

/** @enum {Symbol} */
const RunningState = {
  UNINITIALIZED: Symbol(0),
  INITIALIZED: Symbol(1),
  BLOCK_START: Symbol(2),
  COMPRESSED_BLOCK_START: Symbol(3),
  MAIN_LOOP: Symbol(4),
  READ_METADATA: Symbol(5),
  COPY_UNCOMPRESSED: Symbol(6),
  INSERT_LOOP: Symbol(7),
  COPY_LOOP: Symbol(8),
  USE_DICTIONARY: Symbol(9),
  FINISHED: Symbol(10),
  CLOSED: Symbol(11),
  INIT_WRITE: Symbol(12),
  WRITE: Symbol(13),
  COPY_FROM_COMPOUND_DICTIONARY: Symbol(14),
};

/**
 * @constructor
 * @struct
 */
function State() {
  /** @type {!Int8Array} */
  this.ringBuffer = new Int8Array(0);

  /** @type {!Int8Array} */
  this.contextModes = new Int8Array(0);

  /** @type {!Int8Array} */
  this.contextMap = new Int8Array(0);

  /** @type {!Int8Array} */
  this.distContextMap = new Int8Array(0);

  /** @type {!Int8Array} */
  this.distExtraBits = new Int8Array(0);

  /** @type {!Int8Array} */
  this.output = new Int8Array(0);

  /** @type {!Int8Array} */
  this.byteBuffer = new Int8Array(0);

  /** @type {!Int16Array} */
  this.shortBuffer = new Int16Array(0);

  /** @type {!Int32Array} */
  this.intBuffer = new Int32Array(0);

  /** @type {!Int32Array} */
  this.rings = new Int32Array(0);

  /** @type {!Int32Array} */
  this.blockTrees = new Int32Array(0);

  /** @type {!Int32Array} */
  this.literalTreeGroup = new Int32Array(0);

  /** @type {!Int32Array} */
  this.commandTreeGroup = new Int32Array(0);

  /** @type {!Int32Array} */
  this.distanceTreeGroup = new Int32Array(0);

  /** @type {!Int32Array} */
  this.distOffset = new Int32Array(0);

  /** @type {RunningState} */
  this.runningState = RunningState.UNINITIALIZED;

  /** @type {RunningState} */
  this.nextRunningState = RunningState.UNINITIALIZED;

  /** @type {!number} */
  this.accumulator32 = 0;

  /** @type {!number} */
  this.bitOffset = 0;

  /** @type {!number} */
  this.halfOffset = 0;

  /** @type {!number} */
  this.tailBytes = 0;

  /** @type {!number} */
  this.endOfStreamReached = 0;

  /** @type {!number} */
  this.metaBlockLength = 0;

  /** @type {!number} */
  this.inputEnd = 0;

  /** @type {!number} */
  this.isUncompressed = 0;

  /** @type {!number} */
  this.isMetadata = 0;

  /** @type {!number} */
  this.literalBlockLength = 0;

  /** @type {!number} */
  this.numLiteralBlockTypes = 0;

  /** @type {!number} */
  this.commandBlockLength = 0;

  /** @type {!number} */
  this.numCommandBlockTypes = 0;

  /** @type {!number} */
  this.distanceBlockLength = 0;

  /** @type {!number} */
  this.numDistanceBlockTypes = 0;

  /** @type {!number} */
  this.pos = 0;

  /** @type {!number} */
  this.maxDistance = 0;

  /** @type {!number} */
  this.distRbIdx = 0;

  /** @type {!number} */
  this.trivialLiteralContext = 0;

  /** @type {!number} */
  this.literalTreeIdx = 0;

  /** @type {!number} */
  this.commandTreeIdx = 0;

  /** @type {!number} */
  this.j = 0;

  /** @type {!number} */
  this.insertLength = 0;

  /** @type {!number} */
  this.contextMapSlice = 0;

  /** @type {!number} */
  this.distContextMapSlice = 0;

  /** @type {!number} */
  this.contextLookupOffset1 = 0;

  /** @type {!number} */
  this.contextLookupOffset2 = 0;

  /** @type {!number} */
  this.distanceCode = 0;

  /** @type {!number} */
  this.numDirectDistanceCodes = 0;

  /** @type {!number} */
  this.distancePostfixBits = 0;

  /** @type {!number} */
  this.distance = 0;

  /** @type {!number} */
  this.copyLength = 0;

  /** @type {!number} */
  this.maxBackwardDistance = 0;

  /** @type {!number} */
  this.maxRingBufferSize = 0;

  /** @type {!number} */
  this.ringBufferSize = 0;

  /** @type {!number} */
  this.expectedTotalSize = 0;

  /** @type {!number} */
  this.outputOffset = 0;

  /** @type {!number} */
  this.outputLength = 0;

  /** @type {!number} */
  this.outputUsed = 0;

  /** @type {!number} */
  this.ringBufferBytesWritten = 0;

  /** @type {!number} */
  this.ringBufferBytesReady = 0;

  /** @type {!number} */
  this.isEager = 0;

  /** @type {!number} */
  this.isLargeWindow = 0;

  /** @type {!InputStream|null} */
  this.input = null;

  /** @type {!Int8Array} */
  this.ringBuffer = new Int8Array(0);

  /** @type {!Int32Array} */
  this.rings = new Int32Array(10);
  this.rings[0] = 16;
  this.rings[1] = 15;
  this.rings[2] = 11;
  this.rings[3] = 4;
}

/* GENERATED CODE END */

/**
 * @param {!number} a
 * @param {!number} b
 * @return {!number}
 */
function min(a, b) {
  return a <= b ? a : b;
}

/**
 * @param {!InputStream|null} src
 * @param {!Int8Array} dst
 * @param {!number} offset
 * @param {!number} length
 * @return {!number}
 */
function readInput(src, dst, offset, length) {
  if (src == null) return -1;
  const end = min(src.offset + length, src.data.length);
  const bytesRead = end - src.offset;
  dst.set(src.data.subarray(src.offset, end), offset);
  src.offset += bytesRead;
  return bytesRead;
}

/**
 * @param {!InputStream} _src
 * @return {!number}
 */
function closeInput(_src) {
  return 0;
}

/**
 * @param {!Uint8Array} bytes
 * @return {!Uint8Array}
 */
function decode(bytes) {
  const s = new State();
  initState(s, new InputStream(bytes));
  let totalOutput = 0;
  const /** @type {!Array<!Int8Array>} */ chunks = [];
  while (true) {
    const chunk = new Int8Array(16384);
    chunks.push(chunk);
    s.output = chunk;
    s.outputOffset = 0;
    s.outputLength = 16384;
    s.outputUsed = 0;
    decompress(s);
    totalOutput += s.outputUsed;
    if (s.outputUsed < 16384) break;
  }
  close(s);
  const result = new Uint8Array(totalOutput);
  let offset = 0;
  for (let i = 0; i < chunks.length; ++i) {
    const chunk = chunks[i];
    const end = min(totalOutput, offset + 16384);
    const len = end - offset;
    if (len < 16384) {
      result.set(chunk.subarray(0, len), offset);
    } else {
      result.set(chunk, offset);
    }
    offset += len;
  }
  return result;
}

export { decode as BrotliDecode };
