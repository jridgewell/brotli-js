export const LOOKUP = new Int32Array(2048);

/**
 * @param {!Int32Array} lookup
 * @param {!string} map
 * @param {!string} rle
 * @return {void}
 */
function unpackLookupTable(lookup, map, rle) {
  for (let i = 0; i < 256; ++i) {
    lookup[i] = i & 0x3f;
    lookup[512 + i] = i >> 2;
    lookup[1792 + i] = 2 + (i >> 6);
  }
  for (let i = 0; i < 128; ++i) {
    lookup[1024 + i] = 4 * (map.charCodeAt(i) - 32);
  }
  for (let i = 0; i < 64; ++i) {
    lookup[1152 + i] = i & 1;
    lookup[1216 + i] = 2 + (i & 1);
  }
  let offset = 1280;
  for (let k = 0; k < 19; ++k) {
    const value = k & 3;
    const rep = rle.charCodeAt(k) - 32;
    for (let i = 0; i < rep; ++i) {
      lookup[offset++] = value;
    }
  }
  for (let i = 0; i < 16; ++i) {
    lookup[1792 + i] = 1;
    lookup[2032 + i] = 6;
  }
  lookup[1792] = 0;
  lookup[2047] = 7;
  for (let i = 0; i < 256; ++i) {
    lookup[1536 + i] = lookup[1792 + i] << 3;
  }
}

unpackLookupTable(
  LOOKUP,
  "         !!  !                  \"#$##%#$&'##(#)#++++++++++((&*'##,---,---,-----,-----,-----&#'###.///.///./////./////./////&#'# ",
  "A/*  ':  & : $  \x81 @"
);
