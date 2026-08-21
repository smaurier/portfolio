import { describe, expect, it } from "vitest";
import { Object3D, Quaternion, Vector3 } from "three";
import { applyHeadLook } from "./head-look";

function makeBone() {
  const parent = new Object3D();
  parent.position.set(1, 2, 3);
  parent.rotation.set(0.3, 0.6, -0.2);
  const bone = new Object3D();
  bone.position.set(0, 0.5, 0); // au-dessus du parent, comme Head par rapport à Neck3
  bone.rotation.set(0.1, 0.2, 0.3); // pose "animée" arbitraire avant le look
  parent.add(bone);
  parent.updateMatrixWorld(true);
  return { parent, bone };
}

describe("applyHeadLook", () => {
  it("à blend=1, l'axe local Y du bone pointe vers la cible en world space", () => {
    const { bone } = makeBone();
    const target = new Vector3(5, 10, -3);

    applyHeadLook(bone, target, 1);
    bone.updateMatrixWorld(true);

    const boneWorldPos = new Vector3();
    bone.getWorldPosition(boneWorldPos);
    const expectedDir = target.clone().sub(boneWorldPos).normalize();

    const actualForward = new Vector3(0, 1, 0).applyQuaternion(bone.getWorldQuaternion(new Quaternion()));

    expect(actualForward.dot(expectedDir)).toBeCloseTo(1, 4);
  });

  it("à blend=0, la pose existante n'est pas modifiée", () => {
    const { bone } = makeBone();
    const before = bone.quaternion.clone();

    applyHeadLook(bone, new Vector3(1, 1, 1), 0);

    expect(bone.quaternion.equals(before)).toBe(true);
  });

  it("un blend intermédiaire est plus proche du regard complet qu'un blend plus faible", () => {
    const target = new Vector3(5, 10, -3);

    const { bone: boneLow } = makeBone();
    applyHeadLook(boneLow, target, 0.3);

    const { bone: boneHigh } = makeBone();
    applyHeadLook(boneHigh, target, 0.8);

    const { bone: boneFull } = makeBone();
    applyHeadLook(boneFull, target, 1);

    expect(boneHigh.quaternion.angleTo(boneFull.quaternion)).toBeLessThan(
      boneLow.quaternion.angleTo(boneFull.quaternion),
    );
  });

  it("blend est saturé dans [0, 1] (pas de dépassement si appelé avec des valeurs hors bornes)", () => {
    const { bone: boneOver } = makeBone();
    applyHeadLook(boneOver, new Vector3(5, 10, -3), 1.5);

    const { bone: boneFull } = makeBone();
    applyHeadLook(boneFull, new Vector3(5, 10, -3), 1);

    expect(boneOver.quaternion.equals(boneFull.quaternion)).toBe(true);
  });

  it("ne lève pas si le bone n'a pas de parent (garde défensive)", () => {
    const orphan = new Object3D();
    expect(() => applyHeadLook(orphan, new Vector3(1, 1, 1), 1)).not.toThrow();
  });
});
