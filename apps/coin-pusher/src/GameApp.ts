import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { gsap } from 'gsap';
import { AudioManager } from './audio/AudioManager';
import { ComboSystem } from './core/ComboSystem';
import { DROP_LANE_X, GAME_CONFIG } from './core/GameConfig';
import { GameStore, type SpecialCoinType } from './core/GameStore';
import type { SlotResult } from './core/SlotResolver';
import { CoinPusherMachine } from './machine/CoinPusherMachine';
import { SlotMachineController } from './slot/SlotMachineController';
import { SlotRewardBridge } from './slot/SlotRewardBridge';
import { UIManager } from './ui/UIManager';

type CoinKind = 'normal' | SpecialCoinType;

type PhysicsCoin = {
  body: RAPIER.RigidBody;
  mesh: THREE.Object3D;
  kind: CoinKind;
  resolved: boolean;
  settleTime: number;
  seeded?: boolean;
  triggerAt?: number;
  magnetEndsAt?: number;
};

type VisualParticle = {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  ttl: number;
};

const COLORS = {
  gold: 0xf7b733,
  cyan: 0x33f1ff,
  red: 0xff3d63,
  purple: 0x8d67ff,
  green: 0x3df2a2,
};

const COIN_STABILITY = {
  contactSkin: 0.003,
  solverIterations: 2,
  maxHeight: 0.42,
  maxHorizontalSpeed: 0.035,
  maxVerticalSpeed: 0.025,
  maxAngularSpeed: 0.16,
  settleSeconds: 0.18,
};

const OPTIONAL_COIN_MODEL_URLS = [
  `${import.meta.env.BASE_URL}assets/gold coin.glb`,
  ...(import.meta.env.DEV ? ['/src/assets/gold coin.glb'] : []),
];

export class GameApp {
  private readonly store = new GameStore();
  private readonly slot = new SlotMachineController();
  private readonly slotRewards = new SlotRewardBridge();
  private readonly combo = new ComboSystem();
  private readonly audio = new AudioManager();
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  private readonly renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
  });
  private readonly clock = new THREE.Clock();
  private readonly coins: PhysicsCoin[] = [];
  private readonly visualParticles: VisualParticle[] = [];
  private readonly baseCameraPosition = new THREE.Vector3(0, 7.1, 10.5);
  private readonly lookAt = new THREE.Vector3(0, 0.15, 0.1);
  private readonly sharedCoinGeometry = new THREE.CylinderGeometry(0.18, 0.18, 0.09, 20);
  private readonly sharedVisualCoinGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.035, 12);
  private readonly coinMaterials = this.createCoinMaterials();
  private readonly visualCoinMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.gold,
    emissive: 0x7d4300,
    emissiveIntensity: 0.7,
    metalness: 0.85,
    roughness: 0.28,
  });
  private readonly ui: UIManager;
  private machine!: CoinPusherMachine;
  private world!: RAPIER.World;
  private composer!: EffectComposer;
  private bloom!: UnrealBloomPass;
  private coinModelTemplate?: THREE.Object3D;
  private coinModelSize?: THREE.Vector3;
  private accumulator = 0;
  private frameCount = 0;
  private fpsElapsed = 0;
  private feverRemaining = 0;
  private autoDropRemaining = 0;
  private multiplierRemaining = 0;
  private shake = 0;
  private spinning = false;
  private lowQuality = false;
  private userStarted = false;
  private lastDropAt = 0;
  private supplyAvailableAt = 0;
  private readonly handleResize = () => this.resize();

  constructor(private readonly root: HTMLElement) {
    this.ui = new UIManager(this.root, {
      spin: () => void this.spin(),
      drop: (lane) => this.dropSelectedCoin(lane),
      selectCoin: (coin) => this.store.selectCoin(coin),
      supply: () => this.claimSupply(),
      toggleAudio: () => {
        const enabled = this.audio.toggle();
        this.ui.showToast(enabled ? '音效已开启' : '音效已关闭');
      },
      toggleQuality: () => this.toggleQuality(),
    });
    this.store.subscribe((state) => this.ui.render(state));
  }

  async start() {
    await RAPIER.init();
    this.setupRenderer();
    this.setupScene();
    this.setupPhysics();
    await this.loadCoinModel();
    this.machine = new CoinPusherMachine(this.scene, this.world);
    this.machine.build();
    this.seedCoins();
    this.setupDebugApi();
    this.resize();
    window.addEventListener('resize', this.handleResize);
    this.clock.start();
    this.renderer.setAnimationLoop(() => this.update());
    this.ui.showToast('投下金币，积攒爆发');
  }

  destroy() {
    this.renderer.setAnimationLoop(null);
    window.removeEventListener('resize', this.handleResize);
    this.composer?.dispose();
    this.renderer.dispose();
    this.world?.free();
    this.root.innerHTML = '';
  }

  private setupDebugApi() {
    if (!import.meta.env.DEV) return;
    const debugApi = {
      addSpecial: (type: SpecialCoinType, amount = 1) => this.store.addSpecialCoin(type, amount),
      addCoins: (amount: number) => this.store.addCoins(amount),
      startFever: () => this.startFever(),
      state: () => ({ ...this.store.state, physicalCoins: this.coins.length }),
    };
    Object.assign(window, { __coinPusherDebug: debugApi });
  }

  private setupRenderer() {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.querySelector('#canvas-host')!.append(this.renderer.domElement);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.75,
      0.35,
      0.84,
    );
    this.composer.addPass(this.bloom);
  }

  private setupScene() {
    this.scene.background = new THREE.Color(0x03070c);
    this.scene.fog = new THREE.FogExp2(0x03070c, 0.048);
    this.camera.position.copy(this.baseCameraPosition);
    this.camera.lookAt(this.lookAt);

    const ambient = new THREE.HemisphereLight(0x7edfff, 0x030509, 1.05);
    this.scene.add(ambient);
    const key = new THREE.SpotLight(0xffd977, 58, 24, Math.PI / 5, 0.55, 1.2);
    key.position.set(-3, 8, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    this.scene.add(key);
    const cyan = new THREE.PointLight(COLORS.cyan, 18, 13);
    cyan.position.set(3.7, 2.8, -1.5);
    this.scene.add(cyan);
    const magenta = new THREE.PointLight(0xff3d9f, 15, 12);
    magenta.position.set(-3.8, 2, 1.8);
    this.scene.add(magenta);
  }

  private setupPhysics() {
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.world.integrationParameters.dt = 1 / 60;
    // 推币机有大量金币贴面接触，略提解算次数可以减少堆叠时的细碎抖动。
    this.world.integrationParameters.numSolverIterations = 6;
    this.world.integrationParameters.numAdditionalFrictionIterations = 6;
  }

  private async loadCoinModel() {
    const loader = new GLTFLoader();

    for (const url of OPTIONAL_COIN_MODEL_URLS) {
      try {
        const gltf = await loader.loadAsync(encodeURI(url));
        const template = gltf.scene;
        const box = new THREE.Box3().setFromObject(template);
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        box.getCenter(center);
        box.getSize(size);
        template.position.sub(center);
        template.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          child.castShadow = true;
          child.receiveShadow = true;
        });
        this.coinModelTemplate = template;
        this.coinModelSize = size;
        return;
      } catch {
        // 金币模型是可选大资源，缺失时继续尝试下一个候选路径。
      }
    }
  }

  private seedCoins() {
    for (let index = 0; index < GAME_CONFIG.coins.initialPlatformCount; index += 1) {
      const row = Math.floor(index / 7);
      const column = index % 7;
      this.spawnCoin('normal', 2, {
        x: -1.95 + column * 0.65 + (Math.random() - 0.5) * 0.12,
        y: 0.24 + (index % 3) * 0.08,
        z: -2.25 + row * 0.42 + (Math.random() - 0.5) * 0.12,
        seeded: true,
      });
    }
  }

  private spawnCoin(kind: CoinKind, lane: number, position?: { x: number; y: number; z: number; seeded?: boolean }) {
    // 普通币达到上限后只保留反馈特效，避免继续堆积把物理场景压垮。
    if (this.coins.length >= GAME_CONFIG.coins.hardLimit && kind === 'normal') {
      this.spawnVisualCoins(new THREE.Vector3(DROP_LANE_X[lane], 1.8, -2.4), 4, COLORS.gold);
      return;
    }
    const isGiant = kind === 'giant';
    const radius = isGiant ? 0.33 : GAME_CONFIG.coins.radius;
    const halfHeight = isGiant ? 0.07 : GAME_CONFIG.coins.halfHeight;
    const mesh = this.createCoinMesh(kind, radius, halfHeight);
    const spawn = position ?? { x: DROP_LANE_X[lane], y: 2.32, z: -2.45 };
    mesh.position.set(spawn.x, spawn.y, spawn.z);
    mesh.rotation.set((Math.random() - 0.5) * 0.14, Math.random() * Math.PI, (Math.random() - 0.5) * 0.14);
    mesh.castShadow = !this.lowQuality;
    this.scene.add(mesh);

    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(spawn.x, spawn.y, spawn.z)
        .setRotation({ x: mesh.quaternion.x, y: mesh.quaternion.y, z: mesh.quaternion.z, w: mesh.quaternion.w })
        .setLinearDamping(0.18)
        .setAngularDamping(0.42)
        .setAdditionalMass(isGiant ? 5 : 1)
        .setAdditionalSolverIterations(COIN_STABILITY.solverIterations),
    );
    this.world.createCollider(
      RAPIER.ColliderDesc.cylinder(halfHeight, radius)
        .setFriction(0.72)
        .setRestitution(0.04)
        .setContactSkin(COIN_STABILITY.contactSkin),
      body,
    );
    body.applyImpulse({ x: (Math.random() - 0.5) * 0.08, y: 0, z: 0.06 }, true);
    const now = performance.now();
    const coin: PhysicsCoin = { body, mesh, kind, resolved: false, settleTime: 0, seeded: position?.seeded };
    if (kind === 'bomb' || kind === 'multiplier') coin.triggerAt = now + 520;
    if (kind === 'magnet') coin.magnetEndsAt = now + GAME_CONFIG.special.magnetDuration * 1000;
    this.coins.push(coin);

    if (kind === 'giant') {
      this.audio.play('impact');
      this.shakeCamera(0.32);
      this.createRing(new THREE.Vector3(spawn.x, 0.12, spawn.z), COLORS.gold, 1.5);
    }
  }

  private async spin() {
    if (this.spinning || !this.store.spendSpin()) {
      this.ui.showToast('旋转能量不足');
      return;
    }
    this.userStarted = true;
    this.spinning = true;
    this.audio.play('spin');
    const result = this.slot.spin();
    await this.ui.animateSlot(result);
    this.audio.play(result.type === 'jackpot' || result.type === 'fever' ? 'win' : 'reel');
    this.applySlotResult(result);
    this.spinning = false;
    this.ui.render(this.store.state);
  }

  private applySlotResult(result: SlotResult) {
    const presentation = this.slotRewards.apply(result, this.store, {
      startFever: () => this.startFever(),
    });
    this.ui.showToast(presentation.label, presentation.tone);
    this.spawnVisualCoins(new THREE.Vector3(0, 2.2, -3.4), presentation.visualCoinCount, COLORS.gold);
  }

  private dropSelectedCoin(lane: number) {
    const now = performance.now();
    this.userStarted = true;
    if (now - this.lastDropAt < 230) return;
    const selected = this.store.state.selectedCoin;
    if (selected === 'normal') {
      if (!this.store.spendCoin()) {
        this.ui.showToast('金币不足');
        this.checkSupply();
        return;
      }
    } else if (!this.store.consumeSpecialCoin(selected)) {
      this.ui.showToast('特殊币不足');
      return;
    }
    this.lastDropAt = now;
    this.audio.play('click');
    this.ui.flashLane(lane);
    this.spawnCoin(selected, lane);
  }

  private update() {
    const delta = Math.min(this.clock.getDelta(), 0.05);
    this.accumulator += delta;
    this.frameCount += 1;
    this.fpsElapsed += delta;
    this.updatePlate(delta);
    this.updateSystems(delta);
    while (this.accumulator >= 1 / 60) {
      this.world.step();
      this.accumulator -= 1 / 60;
    }
    this.syncCoins(delta);
    this.updateParticles(delta);
    this.updateCamera(delta);
    if (this.fpsElapsed >= 0.5) {
      this.ui.setStats(this.frameCount / this.fpsElapsed, this.coins.length);
      this.frameCount = 0;
      this.fpsElapsed = 0;
    }
    this.composer.render();
  }

  private updatePlate(delta: number) {
    this.machine.update(delta, this.store.state.feverActive);
  }

  private updateSystems(delta: number) {
    if (!this.store.state.feverActive && this.store.state.feverEnergy >= 100) this.startFever();
    if (this.store.state.feverActive) {
      // 狂热期间自动补币，保证推板前持续有金币流动。
      this.feverRemaining -= delta;
      this.autoDropRemaining -= delta;
      if (this.autoDropRemaining <= 0) {
        this.autoDropRemaining = GAME_CONFIG.fever.autoDropInterval;
        this.spawnCoin('normal', Math.floor(Math.random() * DROP_LANE_X.length));
      }
      if (this.feverRemaining <= 0) this.stopFever();
    }
    if (this.multiplierRemaining > 0) {
      this.multiplierRemaining -= delta;
      this.store.setMultiplier(this.store.state.feverActive ? 3 : 2);
      this.ui.showMultiplier(this.store.state.multiplier, this.multiplierRemaining);
      if (this.multiplierRemaining <= 0) this.store.setMultiplier(this.store.state.feverActive ? 2 : 1);
    } else {
      this.ui.showMultiplier(this.store.state.multiplier);
    }
    if (this.combo.update(delta)) {
      this.store.setCombo(0);
      this.ui.setCombo(0);
    }
  }

  private syncCoins(delta: number) {
    const now = performance.now();
    for (let index = this.coins.length - 1; index >= 0; index -= 1) {
      const coin = this.coins[index];
      const position = coin.body.translation();
      this.stabilizeCoin(coin, delta, now);
      const rotation = coin.body.rotation();
      coin.mesh.position.set(position.x, position.y, position.z);
      coin.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);

      if (coin.kind === 'bomb' && coin.triggerAt && now >= coin.triggerAt) this.triggerBomb(coin);
      if (coin.kind === 'magnet' && coin.magnetEndsAt && now < coin.magnetEndsAt) {
        this.applyMagnet(coin, delta);
      }
      if (coin.kind === 'magnet' && coin.magnetEndsAt && now >= coin.magnetEndsAt) this.removeCoin(index);
      if (coin.kind === 'multiplier' && coin.triggerAt && now >= coin.triggerAt) this.triggerMultiplier(coin, index);

      if (!coin.resolved && (position.y < -0.32 || Math.abs(position.x) > 3.05 || position.z > 3.62)) {
        this.resolveDrop(coin, index);
      } else if (position.y < -3 || Math.abs(position.z) > 8) {
        this.removeCoin(index);
      }
    }
  }

  private stabilizeCoin(coin: PhysicsCoin, delta: number, now: number) {
    if (coin.resolved || coin.body.isSleeping()) {
      coin.settleTime = 0;
      return;
    }

    const magnetActive = coin.kind === 'magnet' && coin.magnetEndsAt && now < coin.magnetEndsAt;
    if (coin.triggerAt || magnetActive) {
      coin.settleTime = 0;
      return;
    }

    const position = coin.body.translation();
    const linear = coin.body.linvel();
    const angular = coin.body.angvel();
    const horizontalSpeed = Math.hypot(linear.x, linear.z);
    const verticalSpeed = Math.abs(linear.y);
    const angularSpeed = Math.hypot(angular.x, angular.y, angular.z);
    const stable =
      position.y <= COIN_STABILITY.maxHeight &&
      horizontalSpeed <= COIN_STABILITY.maxHorizontalSpeed &&
      verticalSpeed <= COIN_STABILITY.maxVerticalSpeed &&
      angularSpeed <= COIN_STABILITY.maxAngularSpeed;

    if (!stable) {
      coin.settleTime = 0;
      return;
    }

    coin.settleTime += delta;
    if (coin.settleTime < COIN_STABILITY.settleSeconds) return;

    // 多枚金币挤在一起时会产生不可见的小速度，归零后交给 Rapier 休眠避免上层金币持续晃动。
    coin.body.setLinvel({ x: 0, y: 0, z: 0 }, false);
    coin.body.setAngvel({ x: 0, y: 0, z: 0 }, false);
    coin.body.sleep();
    coin.settleTime = 0;
  }

  private resolveDrop(coin: PhysicsCoin, index: number) {
    coin.resolved = true;
    const position = coin.body.translation();
    // 预铺场金币在玩家真正开始前只负责造景，不能提前结算收益。
    if (coin.seeded && !this.userStarted) {
      this.removeCoin(index);
      return;
    }

    if (position.z > 3.45 && Math.abs(position.x) <= 2.65) {
      this.store.rewardDrop(
        position.x < -1.42
          ? { coins: 1, spinEnergy: 4, feverEnergy: 1 }
          : position.x > 1.42
            ? { coins: 1, spinEnergy: 1, feverEnergy: 3 }
            : { coins: 1, spinEnergy: 2, feverEnergy: 1 },
      );
      const comboReward = this.combo.registerDrop();
      this.store.setCombo(this.combo.count);
      this.store.addFeverEnergy(comboReward.feverEnergy ?? 0);
      this.store.addSpins(comboReward.spins ?? 0);
      this.ui.setCombo(this.combo.count);
      this.audio.play('coin');
      this.spawnVisualCoins(new THREE.Vector3(position.x, 0.2, position.z), comboReward.coinRain ? 70 : 8, COLORS.gold);
      if (comboReward.coinRain) this.ui.showToast('超级连击', 'hot');
    } else {
      this.store.addFeverEnergy(0.5);
    }
    this.removeCoin(index);
    this.checkSupply();
  }

  private removeCoin(index: number) {
    const coin = this.coins[index];
    if (!coin) return;
    this.world.removeRigidBody(coin.body);
    this.scene.remove(coin.mesh);
    if (coin.mesh.userData.disposeGeometry && coin.mesh instanceof THREE.Mesh) coin.mesh.geometry.dispose();
    this.coins.splice(index, 1);
  }

  private createCoinMesh(kind: CoinKind, radius: number, halfHeight: number): THREE.Object3D {
    if (!this.coinModelTemplate || !this.coinModelSize) {
      return this.createFallbackCoinMesh(kind, radius, halfHeight);
    }

    const model = this.coinModelTemplate.clone(true);
    const horizontalSize = Math.max(this.coinModelSize.x, this.coinModelSize.z) || 1;
    const height = this.coinModelSize.y || 1;
    model.scale.set((radius * 2) / horizontalSize, (halfHeight * 2) / height, (radius * 2) / horizontalSize);
    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = !this.lowQuality;
      child.receiveShadow = true;
    });
    this.applyCoinVariant(model, kind);
    return model;
  }

  private createFallbackCoinMesh(kind: CoinKind, radius: number, halfHeight: number): THREE.Mesh {
    const isGiant = kind === 'giant';
    const mesh = new THREE.Mesh(
      isGiant ? new THREE.CylinderGeometry(radius, radius, halfHeight * 2, 24) : this.sharedCoinGeometry,
      this.coinMaterials[kind],
    );
    mesh.userData.disposeGeometry = isGiant;
    return mesh;
  }

  private applyCoinVariant(model: THREE.Object3D, kind: CoinKind) {
    if (kind === 'normal') return;
    const tint = this.coinMaterials[kind];
    const strength = kind === 'giant' ? 0.22 : 0.58;
    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.material = Array.isArray(child.material)
        ? child.material.map((material) => this.createTintedMaterial(material, tint, strength))
        : this.createTintedMaterial(child.material, tint, strength);
    });
  }

  private createTintedMaterial(
    material: THREE.Material,
    tint: THREE.MeshStandardMaterial,
    strength: number,
  ): THREE.Material {
    const cloned = material.clone();
    const standard = cloned as THREE.MeshStandardMaterial;
    standard.color?.lerp(tint.color, strength);
    if (standard.emissive) {
      standard.emissive.copy(tint.emissive);
      standard.emissiveIntensity = tint.emissiveIntensity;
    }
    return cloned;
  }

  private triggerBomb(coin: PhysicsCoin) {
    coin.triggerAt = undefined;
    const origin = coin.body.translation();
    for (const target of this.coins) {
      if (target === coin) continue;
      const position = target.body.translation();
      const offset = new THREE.Vector3(position.x - origin.x, position.y - origin.y, position.z - origin.z);
      const distance = offset.length();
      if (distance === 0 || distance > GAME_CONFIG.special.bombRadius) continue;
      offset.normalize().multiplyScalar(GAME_CONFIG.special.bombImpulse * (1 - distance / 2.2));
      offset.z += 4.5;
      offset.y += 1.2;
      target.body.applyImpulse(offset, true);
    }
    this.audio.play('bomb');
    this.shakeCamera(0.44);
    this.createRing(new THREE.Vector3(origin.x, 0.16, origin.z), COLORS.red, 2.6);
    const index = this.coins.indexOf(coin);
    this.removeCoin(index);
  }

  private applyMagnet(coin: PhysicsCoin, delta: number) {
    const origin = coin.body.translation();
    for (const target of this.coins) {
      if (target === coin) continue;
      const position = target.body.translation();
      const offset = new THREE.Vector3(origin.x - position.x, 0, origin.z - position.z);
      const distance = offset.length();
      if (distance <= 0.1 || distance > GAME_CONFIG.special.magnetRadius) continue;
      offset.normalize().multiplyScalar((6 - distance) * delta);
      target.body.applyImpulse({ x: offset.x, y: 0, z: offset.z }, true);
    }
    if (Math.random() < 0.06) {
      this.spawnVisualCoins(new THREE.Vector3(origin.x, origin.y + 0.2, origin.z), 1, COLORS.purple);
    }
  }

  private triggerMultiplier(coin: PhysicsCoin, index: number) {
    this.multiplierRemaining = GAME_CONFIG.special.multiplierDuration;
    this.store.setMultiplier(this.store.state.feverActive ? 3 : 2);
    this.createRing(coin.mesh.position.clone(), COLORS.gold, 3.8);
    this.audio.play('win');
    this.ui.showToast('倍率已激活', 'hot');
    this.removeCoin(index);
  }

  private startFever() {
    if (this.store.state.feverActive) return;
    this.store.consumeFeverEnergy();
    this.store.setFeverActive(true);
    this.feverRemaining = GAME_CONFIG.fever.duration;
    this.autoDropRemaining = 0;
    this.ui.setFever(true);
    this.ui.showToast('狂热爆发', 'hot');
    this.audio.play('fever');
    this.shakeCamera(0.55);
    this.spawnVisualCoins(new THREE.Vector3(0, 3.2, -0.2), 150, COLORS.gold);
  }

  private stopFever() {
    this.store.setFeverActive(false);
    this.store.setMultiplier(this.multiplierRemaining > 0 ? 2 : 1);
    this.ui.setFever(false);
    this.ui.showToast('狂热结算完成');
  }

  private claimSupply() {
    if (Date.now() < this.supplyAvailableAt) return;
    this.supplyAvailableAt = Date.now() + 180_000;
    this.store.addCoins(25);
    this.ui.showSupply(false);
    this.ui.showToast('幸运补给 +25');
    this.spawnVisualCoins(new THREE.Vector3(0, 2, 1), 30, COLORS.gold);
  }

  private checkSupply() {
    this.ui.showSupply(
      this.store.state.coins < 10 &&
      this.store.state.spins === 0 &&
      this.store.state.spinEnergy < 100 &&
      Date.now() >= this.supplyAvailableAt,
    );
  }

  private spawnVisualCoins(origin: THREE.Vector3, count: number, color: number) {
    const material = color === COLORS.gold
      ? this.visualCoinMaterial
      : new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.5 });
    // 低画质模式主动限制粒子数量，避免奖励演出把帧率拉垮。
    for (let index = 0; index < Math.min(count, this.lowQuality ? 40 : 180); index += 1) {
      const mesh = new THREE.Mesh(this.sharedVisualCoinGeometry, material);
      mesh.position.copy(origin).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.8,
        Math.random() * 0.6,
        (Math.random() - 0.5) * 0.7,
      ));
      this.scene.add(mesh);
      this.visualParticles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 4.6,
          2.4 + Math.random() * 5,
          (Math.random() - 0.5) * 3.8,
        ),
        ttl: 0.75 + Math.random() * 1.15,
      });
    }
  }

  private updateParticles(delta: number) {
    for (let index = this.visualParticles.length - 1; index >= 0; index -= 1) {
      const particle = this.visualParticles[index];
      particle.ttl -= delta;
      particle.velocity.y -= 8 * delta;
      particle.mesh.position.addScaledVector(particle.velocity, delta);
      particle.mesh.rotation.x += delta * 7;
      particle.mesh.rotation.z += delta * 4;
      if (particle.ttl <= 0) {
        this.scene.remove(particle.mesh);
        this.visualParticles.splice(index, 1);
      }
    }
  }

  private createRing(position: THREE.Vector3, color: number, scale: number) {
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.18, 48), material);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(position);
    this.scene.add(ring);
    gsap.to(ring.scale, { x: scale * 7, y: scale * 7, z: scale * 7, duration: 0.55, ease: 'power2.out' });
    gsap.to(material, {
      opacity: 0,
      duration: 0.55,
      onComplete: () => {
        this.scene.remove(ring);
        ring.geometry.dispose();
        material.dispose();
      },
    });
  }

  private shakeCamera(amount: number) {
    this.shake = Math.min(0.7, this.shake + amount);
  }

  private updateCamera(delta: number) {
    this.shake = Math.max(0, this.shake - delta * 1.85);
    this.camera.position.copy(this.baseCameraPosition);
    if (this.shake > 0) {
      this.camera.position.add(new THREE.Vector3(
        (Math.random() - 0.5) * this.shake,
        (Math.random() - 0.5) * this.shake * 0.65,
        (Math.random() - 0.5) * this.shake,
      ));
    }
    this.camera.lookAt(this.lookAt);
  }

  private toggleQuality() {
    this.lowQuality = !this.lowQuality;
    this.bloom.enabled = !this.lowQuality;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.lowQuality ? 1 : 1.75));
    this.renderer.shadowMap.enabled = !this.lowQuality;
    this.ui.showToast(this.lowQuality ? '省电特效模式' : '完整特效模式');
    this.resize();
  }

  private resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;
    if (aspect < 0.75) {
      this.camera.fov = 57;
      this.baseCameraPosition.set(0, 8.8, 14.5);
      this.lookAt.set(0, 0.05, -0.1);
    } else {
      this.camera.fov = 42;
      this.baseCameraPosition.set(0, 7.1, 10.5);
      this.lookAt.set(0, 0.15, 0.1);
    }
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  }

  private createCoinMaterials(): Record<CoinKind, THREE.MeshStandardMaterial> {
    const create = (color: number, emissive: number, intensity = 0.45) =>
      new THREE.MeshStandardMaterial({
        color,
        emissive,
        emissiveIntensity: intensity,
        metalness: 0.9,
        roughness: 0.24,
      });
    return {
      normal: create(COLORS.gold, 0x5e3100),
      bomb: create(COLORS.red, 0x8f081c, 1.2),
      magnet: create(COLORS.purple, 0x2e116e, 1.2),
      multiplier: create(COLORS.green, 0x0f633e, 1.35),
      giant: create(0xffdf6d, 0x8f5b00, 1.05),
    };
  }
}
