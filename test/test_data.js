/* Copyright 2017 Google Inc. All Rights Reserved.

   Distributed under MIT license.
   See file LICENSE for detail or copy at https://opensource.org/licenses/MIT
*/
import { readdirSync, readFileSync } from "fs";
import {dirname, join} from "path";
import {fileURLToPath} from "url";


/** @type {function(): !Object<string, !Uint8Array>} */
export let makeTestData = () => {
  const data = /** @type {!Object<string, !Uint8Array>} */({});
  const dir = join(dirname(fileURLToPath(import.meta.url)), 'testdata');
  const files = readdirSync(dir);
  for (const file of files) {
    data[file] = readFileSync(join(dir, file));
  }
  return data;
};
