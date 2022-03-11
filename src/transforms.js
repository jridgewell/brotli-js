export const RFC_TRANSFORMS = new Transforms(121, 167, 50);

/**
 * @constructor
 * @param {number} numTransforms
 * @param {number} prefixSuffixLen
 * @param {number} prefixSuffixCount
 * @struct
 */
export function Transforms(numTransforms, prefixSuffixLen, prefixSuffixCount) {
  /** @type {!number} */
  this.numTransforms = numTransforms;

  /** @type {!Int32Array} */
  this.triplets = new Int32Array(numTransforms * 3);

  /** @type {!Int8Array} */
  this.prefixSuffixStorage = new Int8Array(prefixSuffixLen);

  /** @type {!Int32Array} */
  this.prefixSuffixHeads = new Int32Array(prefixSuffixCount + 1);

  /** @type {!Int16Array} */
  this.params = new Int16Array(numTransforms);
}

/**
 * @param {!Int8Array} prefixSuffix
 * @param {!Int32Array} prefixSuffixHeads
 * @param {!Int32Array} transforms
 * @param {!string} prefixSuffixSrc
 * @param {!string} transformsSrc
 * @return {void}
 */
function unpackTransforms(
  prefixSuffix,
  prefixSuffixHeads,
  transforms,
  prefixSuffixSrc,
  transformsSrc
) {
  let index = 1;
  let j = 0;
  for (let i = 0; i < prefixSuffixSrc.length; ++i) {
    const c = prefixSuffixSrc.charCodeAt(i);
    if (c == 35) {
      prefixSuffixHeads[index++] = j;
    } else {
      prefixSuffix[j++] = c;
    }
  }
  for (let i = 0; i < transformsSrc.length; ++i) {
    transforms[i] = transformsSrc.charCodeAt(i) - 32;
  }
}

unpackTransforms(
  RFC_TRANSFORMS.prefixSuffixStorage,
  RFC_TRANSFORMS.prefixSuffixHeads,
  RFC_TRANSFORMS.triplets,
  '# #s #, #e #.# the #.com/#\xC2\xA0# of # and # in # to #"#">#\n#]# for # a # that #. # with #\'# from # by #. The # on # as # is #ing #\n\t#:#ed #(# at #ly #="# of the #. This #,# not #er #al #=\'#ful #ive #less #est #ize #ous #',
  "     !! ! ,  *!  &!  \" !  ) *   * -  ! # !  #!*!  +  ,$ !  -  %  .  / #   0  1 .  \"   2  3!*   4%  ! # /   5  6  7  8 0  1 &   $   9 +   :  ;  < '  !=  >  ?! 4  @ 4  2  &   A *# (   B  C& ) %  ) !*# *-% A +! *.  D! %'  & E *6  F  G% ! *A *%  H! D  I!+!  J!+   K +- *4! A  L!*4  M  N +6  O!*% +.! K *G  P +%(  ! G *D +D  Q +# *K!*G!+D!+# +G +A +4!+% +K!+4!*D!+K!*K"
);
