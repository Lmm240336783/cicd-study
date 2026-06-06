import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { GAME_CONFIG } from '../core/GameConfig';
import { CabinetView } from './CabinetView';

export class CoinPusherMachine {
  private readonly cabinet: CabinetView;
  private plateBody!: RAPIER.RigidBody;
  private plateMesh!: THREE.Mesh;
  private platePhase = 0;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly world: RAPIER.World,
  ) {
    this.cabinet = new CabinetView(this.scene, this.world);
  }

  build() {
    const { plateBody, plateMesh } = this.cabinet.build();
    this.plateBody = plateBody;
    this.plateMesh = plateMesh;
  }

  update(delta: number, feverActive: boolean) {
    // 同一条位移曲线同时驱动碰撞体和可视推板，避免视觉节奏和物理结果脱节。
    const cycle = feverActive ? GAME_CONFIG.plate.feverCycle : GAME_CONFIG.plate.normalCycle;
    this.platePhase = (this.platePhase + delta / cycle) % 1;
    const wave = (1 - Math.cos(this.platePhase * Math.PI * 2)) / 2;
    const z = GAME_CONFIG.plate.backZ + wave * GAME_CONFIG.plate.travel;
    this.plateBody.setNextKinematicTranslation({ x: 0, y: 0.28, z });
    this.plateMesh.position.set(0, 0.28, z);
  }
}
