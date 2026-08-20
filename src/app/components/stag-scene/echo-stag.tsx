"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import EchoStagModel, { type EchoClip } from "./echo-stag-model";
import styles from "./echo-stag.module.css";

export type EchoMood = {
  clip: EchoClip;
  rimColor: string;
  ambientColor: string;
  ambientIntensity: number;
  directionalColor: string;
  directionalIntensity: number;
};

/**
 * Le cerf rejoué sur Services/Projets/Contact, en fenêtre décorative
 * plutôt qu'en scène plein écran (cf memory project-nahual-da, section
 * "Audit narration visuelle" — garde-fou du Codex : "recharger toute la
 * scène 3D sur Contact irait contre cette page doit rester frictionless
 * pour convertir"). Chargé via `dynamic(..., { ssr: false })` par la page
 * appelante (pas ici) — ce composant lui-même reste un simple client
 * component, le lazy-loading est la responsabilité de l'appelant.
 *
 * `aria-hidden` : décoratif/atmosphérique, comme la Piedra del Sol sur la
 * home — le vrai contenu (le pitch, les projets, le contact) reste dans le
 * texte de la page, jamais derrière le WebGL (garde-fou d'accessibilité du
 * Codex, déjà respecté partout ailleurs dans ce projet).
 */
export default function EchoStag({ mood }: { mood: EchoMood }) {
  return (
    <div className={styles.frame} aria-hidden="true">
      <Canvas
        camera={{ fov: 38, position: [0, 1.6, 4.4] }}
        dpr={[1, 1.5]}
        onCreated={(state) => state.camera.lookAt(0, 1, 0)}
      >
        <ambientLight color={mood.ambientColor} intensity={mood.ambientIntensity} />
        <directionalLight
          color={mood.directionalColor}
          intensity={mood.directionalIntensity}
          position={[3, 4, 3]}
        />
        {/* Suspense obligatoire ici, pas optionnel : useGLTF (dans
            EchoStagModel) suspend le temps du chargement du glb. Sans
            boundary locale, la suspension remonte hors de l'arbre géré par
            le reconciler R3F — le premier commit du root Canvas ne se
            termine jamais, et le <canvas> reste bloqué à sa taille HTML par
            défaut (300x150) au lieu d'être redimensionné sur son conteneur.
            Diagnostiqué le 20/08 par inspection DOM directe (les divs
            wrapper de Canvas faisaient bien 320x320, seul le <canvas> lui
            restait à 300x150) — pas un problème de rim-light ni
            d'épuisement de contextes WebGL comme suspecté un temps pendant
            le debug, cf memory project-nahual-da. */}
        <Suspense fallback={null}>
          <EchoStagModel clip={mood.clip} rimColor={mood.rimColor} />
        </Suspense>
      </Canvas>
    </div>
  );
}
