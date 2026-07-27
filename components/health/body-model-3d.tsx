"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { mergeVertices, SkeletonUtils } from "three-stdlib";
import { LoopSubdivision } from "three-subdivide";

const MODEL_URL = "/models/body.glb";
const BODY_HEIGHT = 1.75;

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

/** Gaussian bands that widen the hips, belly, and chest with fat/build. */
function morphBands(fat: number, build: number) {
  return [
    { center: 0.47, sigma: 0.065, x: 0.1 * fat, z: 0.14 * fat, belly: 0.06 * fat },
    { center: 0.57, sigma: 0.09, x: 0.12 * fat + 0.02 * build, z: 0.22 * fat, belly: 0.22 * fat },
    { center: 0.72, sigma: 0.06, x: 0.06 * fat + 0.11 * build, z: 0.1 * fat + 0.07 * build, belly: 0.05 * fat },
  ];
}

function applyMorph(
  geometry: THREE.BufferGeometry,
  base: Float32Array,
  bodyFat: number,
  weight: number
) {
  const fat = THREE.MathUtils.clamp((bodyFat - 12) / 18, 0, 1);
  const build = Math.max(0, (weight - 170) / 30);
  const bands = morphBands(fat, build).map((band) => ({
    ...band,
    center: band.center * BODY_HEIGHT,
    sigma: band.sigma * BODY_HEIGHT,
  }));
  const positions = geometry.attributes.position as THREE.BufferAttribute;

  for (let i = 0; i < positions.count; i++) {
    const x = base[i * 3];
    const y = base[i * 3 + 1];
    const z = base[i * 3 + 2];
    let scaleX = 1;
    let scaleZ = 1;
    let belly = 0;
    for (const band of bands) {
      const weightY = Math.exp(-((y - band.center) ** 2) / (2 * band.sigma ** 2));
      scaleX += band.x * weightY;
      scaleZ += band.z * weightY;
      belly += band.belly * weightY;
    }
    // Fade the effect out on the arms so only the torso reshapes.
    const torso = THREE.MathUtils.clamp(1 - (Math.abs(x) - 0.16) / 0.06, 0, 1);
    scaleX = 1 + (scaleX - 1) * torso;
    scaleZ = 1 + (scaleZ - 1) * torso;
    belly *= torso;
    // Smoothly blend the belly offset in over the front half of the body.
    const front = THREE.MathUtils.clamp(z / 0.08, 0, 1);
    const frontBlend = front * front * (3 - 2 * front);
    positions.setXYZ(i, x * scaleX, y, z * scaleZ + belly * frontBlend);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
}

function Figure({ bodyFat, weight }: { bodyFat: number; weight: number }) {
  const { scene } = useGLTF(MODEL_URL);
  const baseGeometry = useMemo(() => buildBaseGeometry(scene), [scene]);
  const basePositions = useMemo(
    () => Float32Array.from((baseGeometry.attributes.position as THREE.BufferAttribute).array),
    [baseGeometry]
  );
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

  useEffect(() => {
    applyMorph(geometry, basePositions, bodyFat, weight);
  }, [geometry, basePositions, bodyFat, weight]);

  return <mesh ref={meshRef} geometry={geometry} material={material} />;
}

export function BodyModel3D({ bodyFat, weight }: { bodyFat: number; weight: number }) {
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
        <Figure bodyFat={bodyFat} weight={weight} />
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
