import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { DROP_LANE_X, GAME_CONFIG } from '../core/GameConfig';

const CABINET_COLORS = {
  platform: 0x163342,
  cabinetShell: 0xff7a00,
  topSign: 0xff4fa3,
  slotFrame: 0x2f6bff,
  glassShell: 0x5cf2c5,
  controlPanel: 0xffd84d,
  payoutTray: 0xff5b5b,
  sideRail: 0x33f1ff,
  laneGuide: 0xa86bff,
  pusherPlate: 0x00c2ff,
};

export type BuiltCabinet = {
  plateBody: RAPIER.RigidBody;
  plateMesh: THREE.Mesh;
};

export class CabinetView {
  constructor(
    private readonly scene: THREE.Scene,
    private readonly world: RAPIER.World,
  ) {}

  build(): BuiltCabinet {
    // 将接模方案里的外观部件拆成独立占位件，后续可以按名称逐个替换成正式模型。
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: CABINET_COLORS.platform,
      metalness: 0.72,
      roughness: 0.36,
    });
    const slotFrameMaterial = new THREE.MeshStandardMaterial({
      color: CABINET_COLORS.slotFrame,
      metalness: 0.72,
      roughness: 0.32,
    });
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: CABINET_COLORS.glassShell,
      transparent: true,
      opacity: 0.18,
      transmission: 0.62,
      roughness: 0.16,
    });

    this.addStaticBox([5.2, 0.18, 7], [0, -0.12, 0], floorMaterial, true, 'placeholderPlatform');
    this.addStaticBox([0.16, 0.9, 7.3], [-2.68, 0.35, 0], glassMaterial, true, 'placeholderGlassShellLeft');
    this.addStaticBox([0.16, 0.9, 7.3], [2.68, 0.35, 0], glassMaterial, true, 'placeholderGlassShellRight');
    this.addStaticBox([5.3, 1.5, 0.2], [0, 0.65, -3.58], slotFrameMaterial, true, 'placeholderSlotFrame');
    this.addStaticBox([6.5, 0.52, 0.75], [0, -0.55, 3.92], new THREE.MeshStandardMaterial({
      color: CABINET_COLORS.controlPanel,
      metalness: 0.62,
      roughness: 0.3,
    }), true, 'placeholderControlPanel');
    // 外壳只负责给模型对位，避免大体积装饰壳参与碰撞后把金币卡住。
    this.addStaticBox([7.4, 0.75, 8.5], [0, -1.05, 0], new THREE.MeshStandardMaterial({
      color: CABINET_COLORS.cabinetShell,
      metalness: 0.8,
      roughness: 0.32,
    }), false, 'placeholderCabinetShell');
    this.addTopSign();
    this.addPayoutTray();

    const plateMesh = new THREE.Mesh(
      new THREE.BoxGeometry(5, 0.58, 0.28),
      new THREE.MeshStandardMaterial({
        color: CABINET_COLORS.pusherPlate,
        metalness: 0.78,
        roughness: 0.22,
      }),
    );
    plateMesh.name = 'placeholderPusherPlate';
    plateMesh.castShadow = true;
    this.scene.add(plateMesh);
    const plateBody = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 0.28, GAME_CONFIG.plate.backZ),
    );
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(2.5, 0.29, 0.14).setFriction(0.7), plateBody);

    this.addNeonRail(-2.82, CABINET_COLORS.sideRail, 'placeholderSideRailLeft');
    this.addNeonRail(2.82, CABINET_COLORS.sideRail, 'placeholderSideRailRight');
    this.addBackPanel();
    this.addLaneGuides();

    return { plateBody, plateMesh };
  }

  private addStaticBox(
    size: [number, number, number],
    position: [number, number, number],
    material: THREE.Material,
    physical = true,
    name?: string,
  ) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    if (name) {
      mesh.name = name;
    }
    mesh.position.set(...position);
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    if (!physical) return;
    const collider = RAPIER.ColliderDesc.cuboid(size[0] / 2, size[1] / 2, size[2] / 2)
      .setTranslation(...position)
      .setFriction(0.7)
      .setRestitution(0.06);
    this.world.createCollider(collider);
  }

  private addNeonRail(x: number, color: number, name: string) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.06, 7.4),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 4 }),
    );
    mesh.name = name;
    mesh.position.set(x, 0.87, 0);
    this.scene.add(mesh);
  }

  private addTopSign() {
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.56, 0.3),
      new THREE.MeshStandardMaterial({
        color: CABINET_COLORS.topSign,
        emissive: CABINET_COLORS.topSign,
        emissiveIntensity: 1.4,
        metalness: 0.42,
        roughness: 0.36,
      }),
    );
    sign.name = 'placeholderTopSign';
    sign.position.set(0, 2.78, -3.52);
    this.scene.add(sign);
  }

  private addBackPanel() {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(5.9, 2.2, 0.24),
      new THREE.MeshStandardMaterial({
        color: CABINET_COLORS.slotFrame,
        metalness: 0.82,
        roughness: 0.24,
      }),
    );
    panel.name = 'placeholderSlotWindowPanel';
    panel.position.set(0, 1.7, -3.7);
    this.scene.add(panel);
    for (let index = -2; index <= 2; index += 1) {
      const light = new THREE.Mesh(
        new THREE.BoxGeometry(0.68, 0.05, 0.07),
        new THREE.MeshStandardMaterial({
          color: CABINET_COLORS.slotFrame,
          emissive: CABINET_COLORS.slotFrame,
          emissiveIntensity: 5,
        }),
      );
      light.name = `placeholderSlotWindowLight${index + 3}`;
      light.position.set(index * 1.1, 1.15, -3.53);
      this.scene.add(light);
    }
  }

  private addPayoutTray() {
    const tray = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.2, 0.46),
      new THREE.MeshStandardMaterial({
        color: CABINET_COLORS.payoutTray,
        metalness: 0.38,
        roughness: 0.42,
      }),
    );
    tray.name = 'placeholderPayoutTray';
    tray.position.set(0, -0.86, 4.18);
    this.scene.add(tray);
  }

  private addLaneGuides() {
    DROP_LANE_X.forEach((x, index) => {
      const guide = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 1.05, 18),
        new THREE.MeshStandardMaterial({
          color: CABINET_COLORS.laneGuide,
          emissive: CABINET_COLORS.laneGuide,
          emissiveIntensity: 1.8,
          transparent: true,
          opacity: 0.45,
        }),
      );
      guide.name = `placeholderLaneGuide${index + 1}`;
      guide.position.set(x, 1.65, -2.55);
      this.scene.add(guide);
    });
  }
}
