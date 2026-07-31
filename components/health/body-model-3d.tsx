"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { mergeVertices, SkeletonUtils } from "three-stdlib";
import { LoopSubdivision } from "three-subdivide";

const MODEL_URL = "/models/body.glb";
const BODY_HEIGHT = 1.75;
const BIN_COUNT = 64;

/** Rotate an upper-arm bone so the arm hangs down in a relaxed A-pose. */
function lowerArm(bone: THREE.Bone) {
  const child = bone.children.find((item) => (item as THREE.Bone).isBone);
  if (!child) return;
  const bonePos = new THREE.Vector3();
  const childPos = new THREE.Vector3();
  bone.getWorldPosition(bonePos);
  child.getWorldPosition(childPos);
  const dir = childPos.sub(bonePos).normalize();
  const lateral = new THREE.Vector3(dir.x, 0, dir.z).normalize();
  const target = lateral.multiplyScalar(0.24).add(new THREE.Vector3(0, -0.97, 0)).normalize();
  const delta = new THREE.Quaternion().setFromUnitVectors(dir, target);
  const parentWorld = new THREE.Quaternion();
  bone.parent?.getWorldQuaternion(parentWorld);
  bone.quaternion.copy(
    parentWorld.clone().invert().multiply(delta).multiply(parentWorld).multiply(bone.quaternion)
  );
  bone.updateMatrixWorld(true);
}

/**
 * Bake the posed low-poly base mesh into a smooth, high-density geometry:
 * pose arms down → bake skeleton → weld verts → loop-subdivide twice.
 * Returns geometry standing on y=0, facing +z, 1.75 units tall.
 */
function buildBaseGeometry(scene: THREE.Group): THREE.BufferGeometry {
  const root = SkeletonUtils.clone(scene) as THREE.Group;
  let skinned: THREE.SkinnedMesh | undefined;
  root.traverse((object) => {
    if ((object as THREE.SkinnedMesh).isSkinnedMesh) skinned = object as THREE.SkinnedMesh;
  });

  let geometry: THREE.BufferGeometry;
  if (skinned) {
    root.updateMatrixWorld(true);
    skinned.skeleton.bones
      .filter((bone) => /upper_arm/i.test(bone.name))
      .forEach(lowerArm);
    root.updateMatrixWorld(true);
    skinned.geometry = skinned.geometry.clone();
    geometry = skinned.geometry;
    const posed = geometry.attributes.position as THREE.BufferAttribute;
    const vertex = new THREE.Vector3();
    for (let i = 0; i < posed.count; i++) {
      vertex.fromBufferAttribute(posed, i);
      skinned.applyBoneTransform(i, vertex);
      posed.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    posed.needsUpdate = true;
    geometry.applyMatrix4(skinned.matrixWorld);
  } else {
    let mesh: THREE.Mesh | undefined;
    root.traverse((object) => {
      if (!mesh && (object as THREE.Mesh).isMesh) mesh = object as THREE.Mesh;
    });
    if (!mesh) return new THREE.BufferGeometry();
    root.updateMatrixWorld(true);
    geometry = mesh.geometry.clone();
    geometry.applyMatrix4(mesh.matrixWorld);
  }

  for (const key of Object.keys(geometry.attributes)) {
    if (key !== "position") geometry.deleteAttribute(key);
  }
  geometry = mergeVertices(geometry, 1e-4);
  geometry = LoopSubdivision.modify(geometry, 2, {
    split: false,
    preserveEdges: false,
    flatOnly: false,
  });

  // Normalize: feet on the floor, centered, lateral axis = x, 1.75 tall.
  geometry.computeBoundingBox();
  let box = geometry.boundingBox!;
  const size = new THREE.Vector3();
  box.getSize(size);
  if (size.x < size.z) {
    geometry.rotateY(Math.PI / 2);
    geometry.computeBoundingBox();
    box = geometry.boundingBox!;
    box.getSize(size);
  }
  geometry.translate(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  const scale = BODY_HEIGHT / size.y;
  geometry.scale(scale, scale, scale);

  // Face +z: toes stick out forward, so low vertices lean toward the front.
  const positions = geometry.attributes.position;
  let feetLean = 0;
  for (let i = 0; i < positions.count; i++) {
    if (positions.getY(i) < BODY_HEIGHT * 0.09) feetLean += positions.getZ(i);
  }
  if (feetLean < 0) geometry.rotateY(Math.PI);

  geometry.computeVertexNormals();
  return geometry;
}

interface LimbCenter {
  x: number;
  z: number;
}

interface BaseStats {
  /** Ellipse half-width (x) and half-depth (z) of the torso at waist height. */
  waistA: number;
  waistB: number;
  /** Approximate waist circumference of the unmorphed mesh, in model units. */
  waistCirc: number;
  /** Per-height-bin centerlines for radial limb thickening: [left, right]. */
  armCenters: [Array<LimbCenter | null>, Array<LimbCenter | null>];
  legCenters: [Array<LimbCenter | null>, Array<LimbCenter | null>];
}

function gauss(y: number, center: number, sigma: number) {
  return Math.exp(-((y - center) ** 2) / (2 * sigma ** 2));
}

/** Ramanujan approximation of an ellipse perimeter. */
function ellipseCircumference(a: number, b: number) {
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
}

/**
 * Measure the base mesh once: waist cross-section (so the morph can be anchored
 * to a real waist measurement) and per-height centerlines of arms and legs
 * (so limbs can thicken radially with muscle/fat).
 */
function analyzeBase(base: Float32Array): BaseStats {
  const H = BODY_HEIGHT;
  const emptySums = () => ({
    x: new Float64Array(BIN_COUNT),
    z: new Float64Array(BIN_COUNT),
    n: new Uint32Array(BIN_COUNT),
  });
  const armSums = [emptySums(), emptySums()];
  const legSums = [emptySums(), emptySums()];
  let waistA = 0;
  let waistZMin = Infinity;
  let waistZMax = -Infinity;

  for (let i = 0; i < base.length; i += 3) {
    const x = base[i];
    const y = base[i + 1];
    const z = base[i + 2];
    const bin = Math.min(BIN_COUNT - 1, Math.max(0, Math.floor((y / H) * BIN_COUNT)));
    const side = x < 0 ? 0 : 1;

    if (Math.abs(x) > 0.19 && y > 0.35 * H && y < 0.88 * H) {
      armSums[side].x[bin] += x;
      armSums[side].z[bin] += z;
      armSums[side].n[bin] += 1;
    }
    if (y < 0.48 * H) {
      legSums[side].x[bin] += x;
      legSums[side].z[bin] += z;
      legSums[side].n[bin] += 1;
    }
    if (y > 0.55 * H && y < 0.6 * H && Math.abs(x) < 0.18) {
      waistA = Math.max(waistA, Math.abs(x));
      waistZMin = Math.min(waistZMin, z);
      waistZMax = Math.max(waistZMax, z);
    }
  }

  const toCenters = (sums: ReturnType<typeof emptySums>) =>
    Array.from({ length: BIN_COUNT }, (_, bin) =>
      sums.n[bin] >= 4 ? { x: sums.x[bin] / sums.n[bin], z: sums.z[bin] / sums.n[bin] } : null
    );

  const waistB = waistZMax > waistZMin ? (waistZMax - waistZMin) / 2 : 0;
  return {
    waistA,
    waistB,
    waistCirc: waistA > 0 && waistB > 0 ? ellipseCircumference(waistA, waistB) : 0,
    armCenters: [toCenters(armSums[0]), toCenters(armSums[1])],
    legCenters: [toCenters(legSums[0]), toCenters(legSums[1])],
  };
}

export interface MorphInput {
  /** Body fat percent. */
  bodyFat: number;
  /** Waist circumference in inches — the anchor for the midsection. */
  waist: number;
  /** Lean body mass in pounds — drives muscle regions. */
  lean: number;
  /** Real-world height in inches, used to convert waist inches → model units. */
  heightInches: number;
}

/**
 * Reshape the figure from measured values. The midsection is anchored so the
 * mesh's waist circumference matches the target waist; body fat drives soft
 * tissue (belly, hips, glutes, chest, neck, thighs) and lean mass drives
 * muscle (shoulders, chest, lats, arms, quads, calves).
 */
function applyMorph(
  geometry: THREE.BufferGeometry,
  base: Float32Array,
  stats: BaseStats,
  input: MorphInput
) {
  const H = BODY_HEIGHT;
  const fat = THREE.MathUtils.clamp((input.bodyFat - 10) / 20, 0, 1.25);
  const muscle = THREE.MathUtils.clamp((input.lean - 128) / 42, 0, 1.4);

  // Waist anchor: how much the torso girth must change to hit the target.
  const inchesPerUnit = input.heightInches / H;
  const targetCirc = input.waist / inchesPerUnit;
  const girth = stats.waistCirc > 0 ? targetCirc / stats.waistCirc - 1 : 0;
  const d = THREE.MathUtils.clamp(girth, -0.4, 0.6);
  // Split the girth change: sides, back, and (mostly) a forward belly bulge,
  // sized so the resulting circumference still lands on the target.
  const bellyAmp = 2 * d * (0.6 * stats.waistA + 0.8 * stats.waistB);

  const waistY = 0.575 * H;
  const waistSigma = 0.1 * H;

  const positions = geometry.attributes.position as THREE.BufferAttribute;

  for (let i = 0; i < positions.count; i++) {
    const x = base[i * 3];
    const y = base[i * 3 + 1];
    const z = base[i * 3 + 2];

    const gWaist = gauss(y, waistY, waistSigma);
    const gBelly = gauss(y, 0.55 * H, 0.07 * H);
    const gHip = gauss(y, 0.48 * H, 0.05 * H);
    const gLats = gauss(y, 0.66 * H, 0.055 * H);
    const gChest = gauss(y, 0.715 * H, 0.05 * H);
    const gShoulder = gauss(y, 0.79 * H, 0.05 * H);
    const gNeck = gauss(y, 0.885 * H, 0.03 * H);

    let scaleX = 1;
    let scaleZBack = 1;
    let offsetFront = 0;
    let offsetBack = 0;

    // Midsection: waist-anchored, biased toward a forward belly bulge.
    scaleX += 0.4 * d * gWaist;
    scaleZBack += 0.28 * d * gWaist;
    offsetFront += bellyAmp * gWaist;

    // Fat regions: soft tissue rounds the stomach far more than the chest.
    scaleX += 0.05 * fat * gHip + 0.05 * fat * gNeck;
    scaleZBack += 0.04 * fat * gNeck;
    offsetFront += 0.035 * fat * gBelly + 0.02 * fat * gChest + 0.02 * fat * gNeck;
    offsetBack += (0.05 * fat + 0.02 * muscle + 0.06 * Math.max(d, 0)) * gHip;

    // Muscle regions: lats, chest, shoulder frame.
    scaleX += 0.07 * muscle * gLats + 0.07 * muscle * gChest + 0.1 * muscle * gShoulder;
    offsetFront += 0.025 * muscle * gChest;

    // Fade torso-band effects out on the arms.
    const torso = THREE.MathUtils.clamp(1 - (Math.abs(x) - 0.16) / 0.06, 0, 1);
    scaleX = 1 + (scaleX - 1) * torso;
    scaleZBack = 1 + (scaleZBack - 1) * torso;
    offsetFront *= torso;
    offsetBack *= torso;

    let nx = x * scaleX;
    let nz = z;
    if (z < 0) nz *= scaleZBack;
    const front = THREE.MathUtils.clamp(z / 0.08, 0, 1);
    const frontBlend = front * front * (3 - 2 * front);
    const backRaw = THREE.MathUtils.clamp(-z / 0.07, 0, 1);
    const backBlend = backRaw * backRaw * (3 - 2 * backRaw);
    nz += offsetFront * frontBlend - offsetBack * backBlend;

    const bin = Math.min(BIN_COUNT - 1, Math.max(0, Math.floor((y / H) * BIN_COUNT)));
    const side = x < 0 ? 0 : 1;

    // Arms: radial thickening around the limb centerline (delts, biceps).
    const armMask =
      (1 - torso) *
      THREE.MathUtils.clamp((y - 0.36 * H) / (0.04 * H), 0, 1) *
      THREE.MathUtils.clamp((0.87 * H - y) / (0.04 * H), 0, 1);
    if (armMask > 0) {
      const center = stats.armCenters[side][bin];
      if (center) {
        const armR =
          muscle * (0.11 + 0.12 * gauss(y, 0.8 * H, 0.045 * H) + 0.09 * gauss(y, 0.665 * H, 0.07 * H)) +
          0.04 * fat;
        nx += (x - center.x) * armR * armMask;
        nz += (z - center.z) * armR * armMask;
      }
    }

    // Legs: quads and calves with muscle, thighs with fat.
    const legMask = THREE.MathUtils.clamp((0.47 * H - y) / (0.03 * H), 0, 1);
    if (legMask > 0) {
      const center = stats.legCenters[side][bin];
      if (center) {
        const legR =
          (0.09 * muscle + 0.08 * fat) * gauss(y, 0.36 * H, 0.085 * H) +
          0.07 * muscle * gauss(y, 0.145 * H, 0.045 * H);
        nx += (x - center.x) * legR * legMask;
        nz += (z - center.z) * legR * legMask;
      }
    }

    positions.setXYZ(i, nx, y, nz);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
}

interface FigureProps {
  bodyFat: number;
  weight: number;
  waist: number;
  leanMass?: number;
  heightInches: number;
}

function Figure({ bodyFat, weight, waist, leanMass, heightInches }: FigureProps) {
  const { scene } = useGLTF(MODEL_URL);
  const baseGeometry = useMemo(() => buildBaseGeometry(scene), [scene]);
  const basePositions = useMemo(
    () => Float32Array.from((baseGeometry.attributes.position as THREE.BufferAttribute).array),
    [baseGeometry]
  );
  const stats = useMemo(() => analyzeBase(basePositions), [basePositions]);
  const geometry = useMemo(() => baseGeometry.clone(), [baseGeometry]);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#f3f1ed",
        roughness: 0.38,
        metalness: 0.06,
      }),
    []
  );
  const meshRef = useRef<THREE.Mesh>(null);

  const lean = leanMass ?? weight * (1 - bodyFat / 100);
  const targetRef = useRef<MorphInput>({ bodyFat, waist, lean, heightInches });
  targetRef.current = { bodyFat, waist, lean, heightInches };
  const currentRef = useRef<MorphInput | null>(null);

  useEffect(() => {
    if (!currentRef.current) {
      currentRef.current = { ...targetRef.current };
      applyMorph(geometry, basePositions, stats, currentRef.current);
    }
  }, [geometry, basePositions, stats]);

  // Smoothly animate between stages so the change is visible.
  useFrame((_, delta) => {
    const current = currentRef.current;
    if (!current) return;
    const target = targetRef.current;
    const keys = ["bodyFat", "waist", "lean", "heightInches"] as const;
    let maxDiff = 0;
    for (const key of keys) maxDiff = Math.max(maxDiff, Math.abs(current[key] - target[key]));
    if (maxDiff < 0.02) return;
    for (const key of keys) {
      current[key] = THREE.MathUtils.damp(current[key], target[key], 5, delta);
    }
    applyMorph(geometry, basePositions, stats, current);
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} />;
}

export function BodyModel3D({
  bodyFat,
  weight,
  waist,
  leanMass,
  heightInches = 71,
}: {
  bodyFat: number;
  weight: number;
  waist: number;
  leanMass?: number;
  heightInches?: number;
}) {
  return (
    <Canvas
      camera={{ position: [0.5, 1.3, 2.8], fov: 36 }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 2]}
    >
      <hemisphereLight intensity={1.1} color="#ffffff" groundColor="#cfccc6" />
      <directionalLight position={[3, 5, 2]} intensity={1.6} />
      <directionalLight position={[-4, 2.5, -3]} intensity={0.55} color="#ffe9dd" />
      <Suspense fallback={null}>
        <Figure
          bodyFat={bodyFat}
          weight={weight}
          waist={waist}
          leanMass={leanMass}
          heightInches={heightInches}
        />
        <ContactShadows position={[0, 0.01, 0]} opacity={0.38} scale={4.2} blur={2.6} far={2.2} />
      </Suspense>
      <OrbitControls
        target={[0, 0.95, 0]}
        enablePan={false}
        minDistance={1.3}
        maxDistance={4.6}
        maxPolarAngle={Math.PI * 0.62}
        autoRotate
        autoRotateSpeed={0.9}
      />
    </Canvas>
  );
}

useGLTF.preload(MODEL_URL);
