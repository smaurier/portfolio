import { readFileSync } from "node:fs";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Quaternion, Vector3 } from "three";

const buf = readFileSync("public/models/cihuateotl.glb");
const loader = new GLTFLoader();
const gltf = await new Promise((res, rej) => loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), "", res, rej));
const scene = gltf.scene;
scene.updateMatrixWorld(true);
const names = [];
scene.traverse((o) => { if (o.isBone) names.push(o.name); });
console.log("bones:", names.join(" "));
const clip = gltf.animations.find((c) => c.name.includes("Walk"));
console.log("walk tracks:", [...new Set(clip.tracks.map((t) => t.name.split(".")[0]))].join(" "));

function worldOf(name) { const v = new Vector3(); scene.getObjectByName(name).getWorldPosition(v); return v; }
function probe(boneName, tipName) {
  const bone = scene.getObjectByName(boneName);
  const rest = bone.quaternion.clone();
  const base = worldOf(tipName);
  const shoulder = worldOf(boneName);
  console.log(`${boneName} rest -> ${tipName} rel:`, base.clone().sub(shoulder).toArray().map((v) => v.toFixed(3)).join(","));
  for (const [label, axis] of [["X", new Vector3(1, 0, 0)], ["Y", new Vector3(0, 1, 0)], ["Z", new Vector3(0, 0, 1)]]) {
    bone.quaternion.copy(rest).multiply(new Quaternion().setFromAxisAngle(axis, 1));
    scene.updateMatrixWorld(true);
    const p = worldOf(tipName).sub(shoulder);
    console.log(`  +1rad ${label}:`, p.toArray().map((v) => v.toFixed(3)).join(","));
  }
  bone.quaternion.copy(rest);
  scene.updateMatrixWorld(true);
}
probe("UpperArmL", "WristL");
probe("UpperArmR", "WristR");
probe("LowerArmL", "WristL");
probe("LowerArmR", "WristR");
probe("Abdomen", "Head");
console.log("height range: head", worldOf("Head").toArray().map((v) => v.toFixed(3)).join(","), "hips", worldOf("Hips").toArray().map((v) => v.toFixed(3)).join(","));
