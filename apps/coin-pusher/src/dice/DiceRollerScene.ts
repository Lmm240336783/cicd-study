import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

type DieItem = {
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  mesh: THREE.Group;
  locked: boolean;
  cornerStandElapsed: number;
  cornerAssistCooldown: number;
  cornerAssistAttempts: number;
  airborneElapsed: number;
  airborneRecoveryCooldown: number;
  debugLastY: number;
  debugLastLinearY: number;
};

type DiceAssistDebugEvent = {
  rollId: number;
  dieIndex: number;
  assistCount: number;
  upwardImpulse: number;
  lateralImpulse: number;
  torqueImpulse: number;
  height: number;
  topFaceDot: number;
  angle: number;
  at: number;
};

type DicePhysicsBounceDebugEvent = {
  rollId: number;
  dieIndex: number;
  at: number;
  height: number;
  previousHeight: number;
  restingHeight: number;
  previousLinearY: number;
  linearY: number;
};

type DiceBoundsCorrectionDebugEvent = {
  rollId: number;
  dieIndex: number;
  at: number;
  fromY: number;
  toY: number;
  radial: number;
  vertical: boolean;
  horizontal: boolean;
  linearYBefore: number;
  linearYAfter: number;
};

type DiceCorrectionMotionDebugEvent = {
  rollId: number;
  dieIndex: number;
  at: number;
  startHeight: number;
  targetHeight: number;
  verticalDistance: number;
};

type DiceImpactDebugEvent = {
  rollId: number;
  at: number;
  strength: number;
};

type DiceDebugState = {
  rollId: number;
  startedAt: number;
  assistCounts: number[];
  physicsBounceCounts: number[];
  boundsCorrectionCounts: number[];
  correctionMotionCounts: number[];
  diceStates: DicePoseDebugState[];
  assists: DiceAssistDebugEvent[];
  physicsBounces: DicePhysicsBounceDebugEvent[];
  boundsCorrections: DiceBoundsCorrectionDebugEvent[];
  correctionMotions: DiceCorrectionMotionDebugEvent[];
  impacts: DiceImpactDebugEvent[];
  finalFaces?: number[];
  finishedAt?: number;
};

type DicePoseDebugState = {
  dieIndex: number;
  height: number;
  restingHeight: number;
  stableRestingHeight: number;
  topFaceDot: number;
  linearSpeed: number;
  angularSpeed: number;
  nearTrayBase: boolean;
  hasTrayContact: boolean;
  hasStackSupport: boolean;
  isCornerStanding: boolean;
  isFinalPoseInvalid: boolean;
  isNearGroundCornerStand: boolean;
  isUnsupportedAirborne: boolean;
};

declare global {
  interface Window {
    __diceDebug?: DiceDebugState;
  }
}

type DiceRollerSceneOptions = {
  onFacesChange: (faces: number[]) => void;
  onImpact: (strength: number) => void;
  onRollingChange: (rolling: boolean) => void;
};

const DIE_SIZE = 0.62;
const DIE_HALF_SIZE = DIE_SIZE / 2;
const DIE_COLLIDER_HALF_SIZE = DIE_HALF_SIZE * 0.98;
const TRAY_RADIUS = 2.65;
const TRAY_INNER_RADIUS = TRAY_RADIUS - 0.42;
const DIE_SPAWN_RADIUS = 1.18;
const DIE_SPAWN_BASE_Y = 0.78;
const DIE_SPAWN_STEP_Y = 0.05;
const WALL_RING_RADIUS = TRAY_INNER_RADIUS - 0.14;
const WALL_CENTER_Y = 1.02;
const WALL_HALF_WIDTH = 0.26;
const WALL_HALF_HEIGHT = 1.9;
const WALL_HALF_DEPTH = 0.32;
const WALL_FRICTION = 0.02;
const WALL_ESCAPE_RADIUS = WALL_RING_RADIUS - DIE_HALF_SIZE * 0.42;
const WALL_ESCAPE_MIN_Y = 1.1;
const COVER_CLOSED_Y = 1.35;
const COVER_OPEN_Y = 3.95;
const COVER_HEIGHT = COVER_OPEN_Y - COVER_CLOSED_Y;
const TRAY_TOP_Y = 0.06;
const COLLISION_SOUND_COOLDOWN = 90;
const SLEEP_FALLBACK_SECONDS = 0.72;
const MAX_DIE_CENTER_HEIGHT = 2.52;
const MIN_DIE_CENTER_HEIGHT = TRAY_TOP_Y + DIE_COLLIDER_HALF_SIZE;
const BOUNDS_MIN_DIE_CENTER_HEIGHT = MIN_DIE_CENTER_HEIGHT - 0.018;
const DIE_SUPPORT_OFFSET = MIN_DIE_CENTER_HEIGHT - TRAY_TOP_Y;
const STACKED_REST_CENTER_DISTANCE = DIE_SUPPORT_OFFSET * 2;
const VISUAL_SETTLE_DELAY_SECONDS = 0.22;
const VISUAL_STILL_SECONDS = 0.12;
const VISUAL_LINEAR_SPEED = 0.18;
const VISUAL_ANGULAR_SPEED = 0.22;
const SETTLE_LINEAR_SPEED = 0.08;
const SETTLE_ANGULAR_SPEED = 0.12;
const CORNER_STAND_FACE_DOT = 0.965;
const FINAL_FACE_DOT = 0.985;
const CORNER_STAND_HEIGHT_SLACK = 0.3;
const STACK_SUPPORT_VERTICAL_MIN = DIE_SIZE * 0.52;
const STACK_SUPPORT_VERTICAL_MAX = DIE_SIZE * 1.08;
const STACK_SUPPORT_OVERLAP_RATIO = 0.7;
const STACK_SUPPORT_CANDIDATE_OVERLAP_RATIO = 0.42;
const STACK_SUPPORT_NORMAL_DOT = 0.75;
const TRAY_SUPPORT_NORMAL_DOT = 0.8;
const CORNER_STAND_CONFIRM_SECONDS = 0.42;
const CORNER_STAND_SNAP_LINEAR_SPEED = 0.06;
const CORNER_STAND_SNAP_ANGULAR_SPEED = 0.08;
const CORNER_ASSIST_COOLDOWN_SECONDS = 0.2;
const CORNER_ASSIST_MAX_ATTEMPTS = 5;
const FINAL_POSE_RECOVERY_ATTEMPTS = 4;
const CORNER_ASSIST_UPWARD_IMPULSE_MIN = 0.001;
const CORNER_ASSIST_UPWARD_IMPULSE_MAX = 0.003;
const CORNER_ASSIST_LATERAL_IMPULSE_MIN = 0.005;
const CORNER_ASSIST_LATERAL_IMPULSE_MAX = 0.026;
const CORNER_ASSIST_TORQUE_IMPULSE_MIN = 0.012;
const CORNER_ASSIST_TORQUE_IMPULSE_MAX = 0.08;
const AIRBORNE_RECOVERY_CONFIRM_SECONDS = 0.18;
const AIRBORNE_RECOVERY_COOLDOWN_SECONDS = 0.1;
const AIRBORNE_RECOVERY_MAX_LINEAR_SPEED = 0.55;
const AIRBORNE_RECOVERY_DOWNWARD_SPEED = 1.05;
const AIRBORNE_RECOVERY_LATERAL_SPEED = 0.46;
const AIRBORNE_RECOVERY_TORQUE_IMPULSE = 0.08;
const AIRBORNE_STACK_RECOVERY_DOWNWARD_SPEED = 0.34;
const REST_HEIGHT_SNAP_SLACK = 0.06;
const RIGHT_ANGLE = Math.PI / 2;
const DICE_DEBUG_STORAGE_KEY = 'coin-pusher:dice-debug';
const DICE_DEBUG_DATASET_KEY = 'diceDebug';
const DEBUG_MAX_EVENTS = 80;
const DEBUG_BOUNCE_MIN_UPWARD_SPEED = 0.035;
const DEBUG_BOUNCE_MIN_PREVIOUS_DOWNWARD_SPEED = -0.025;
const DEBUG_BOUNCE_HEIGHT_SLACK = 0.14;

const WORLD_UP = new THREE.Vector3(0, 1, 0);

const FACE_AXES = [
  { face: 1, axis: new THREE.Vector3(0, 1, 0) },
  { face: 6, axis: new THREE.Vector3(0, -1, 0) },
  { face: 2, axis: new THREE.Vector3(1, 0, 0) },
  { face: 5, axis: new THREE.Vector3(-1, 0, 0) },
  { face: 3, axis: new THREE.Vector3(0, 0, 1) },
  { face: 4, axis: new THREE.Vector3(0, 0, -1) },
];

const SUPPORT_CORNERS = [
  new THREE.Vector3(-DIE_HALF_SIZE, -DIE_SUPPORT_OFFSET, -DIE_HALF_SIZE),
  new THREE.Vector3(-DIE_HALF_SIZE, -DIE_SUPPORT_OFFSET, DIE_HALF_SIZE),
  new THREE.Vector3(DIE_HALF_SIZE, -DIE_SUPPORT_OFFSET, -DIE_HALF_SIZE),
  new THREE.Vector3(DIE_HALF_SIZE, -DIE_SUPPORT_OFFSET, DIE_HALF_SIZE),
];

const PIP_PATTERNS: Record<number, Array<[number, number]>> = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};

const CUBE_ORIENTATIONS = createCubeOrientations();

const randomInTray = (index = 0, count = 1) => {
  const spreadAngle = count > 1 ? (index / count) * Math.PI * 2 : Math.random() * Math.PI * 2;
  const angle = spreadAngle + (Math.random() - 0.5) * 0.48;
  const radius = THREE.MathUtils.lerp(DIE_SPAWN_RADIUS * 0.48, DIE_SPAWN_RADIUS, Math.random());
  return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
};

const randomTossStartQuaternion = () => {
  const base = CUBE_ORIENTATIONS[Math.floor(Math.random() * CUBE_ORIENTATIONS.length)].clone();
  const yaw = new THREE.Quaternion().setFromAxisAngle(WORLD_UP, Math.random() * Math.PI * 2);
  const tiltAngle = Math.random() * 0.16;
  const tiltAxisAngle = Math.random() * Math.PI * 2;
  const tiltAxis = new THREE.Vector3(Math.cos(tiltAxisAngle), 0, Math.sin(tiltAxisAngle));
  const tilt = new THREE.Quaternion().setFromAxisAngle(tiltAxis, tiltAngle);

  return tilt.multiply(yaw).multiply(base).normalize();
};

const randomHorizontalImpulse = () => {
  const angle = Math.random() * Math.PI * 2;
  const magnitude = THREE.MathUtils.lerp(0.46, 0.72, Math.random());
  return { x: Math.cos(angle) * magnitude, z: Math.sin(angle) * magnitude };
};

const randomTorqueImpulse = () => {
  const angle = Math.random() * Math.PI * 2;
  const tumble = THREE.MathUtils.lerp(1.05, 1.48, Math.random());
  return {
    x: Math.cos(angle) * tumble,
    y: (Math.random() - 0.5) * 1.18,
    z: Math.sin(angle) * tumble,
  };
};

function createCubeOrientations() {
  const orientations: THREE.Quaternion[] = [];
  const seen = new Set<string>();

  for (let x = 0; x < 4; x += 1) {
    for (let y = 0; y < 4; y += 1) {
      for (let z = 0; z < 4; z += 1) {
        const quaternion = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(x * RIGHT_ANGLE, y * RIGHT_ANGLE, z * RIGHT_ANGLE),
        );
        const key = [
          quaternion.x.toFixed(4),
          quaternion.y.toFixed(4),
          quaternion.z.toFixed(4),
          quaternion.w.toFixed(4),
        ].join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        orientations.push(quaternion);
      }
    }
  }

  return orientations;
}

function clamp01(value: number) {
  return THREE.MathUtils.clamp(value, 0, 1);
}

export class DiceRollerScene {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  private readonly renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  private readonly clock = new THREE.Clock();
  private readonly dice: DieItem[] = [];
  private readonly cover = new THREE.Group();
  private readonly dieGeometry = new RoundedBoxGeometry(DIE_SIZE, DIE_SIZE, DIE_SIZE, 5, 0.08);
  private readonly pipGeometry = new THREE.CircleGeometry(DIE_SIZE * 0.055, 18);
  private readonly trayGeometry = new THREE.CylinderGeometry(TRAY_RADIUS, TRAY_RADIUS, 0.34, 96);
  private readonly coverWallGeometry = new THREE.CylinderGeometry(2.14, 2.36, 2.5, 80, 1, true);
  private readonly coverTopGeometry = new THREE.CylinderGeometry(2.14, 2.14, 0.16, 80);
  private readonly coverKnobGeometry = new THREE.CylinderGeometry(0.56, 0.64, 0.24, 64);
  private readonly trayMaterial = new THREE.MeshStandardMaterial({
    color: 0x0b4057,
    metalness: 0.28,
    roughness: 0.42,
  });
  private readonly coverMaterial = new THREE.MeshStandardMaterial({
    color: 0x12364a,
    metalness: 0.18,
    roughness: 0.48,
    transparent: true,
    opacity: 0.96,
  });
  private readonly dieMaterial = new THREE.MeshStandardMaterial({
    color: 0xf4f4ef,
    metalness: 0.05,
    roughness: 0.34,
  });
  private readonly blackPipMaterial = new THREE.MeshStandardMaterial({
    color: 0x101010,
    roughness: 0.42,
  });
  private readonly redPipMaterial = new THREE.MeshStandardMaterial({
    color: 0xe6172c,
    roughness: 0.36,
  });
  private eventQueue?: RAPIER.EventQueue;
  private world?: RAPIER.World;
  private trayCollider?: RAPIER.Collider;
  private frameId = 0;
  private diceCount = 5;
  private lastImpactAt = 0;
  private rolling = false;
  private rollingElapsed = 0;
  private visualStillElapsed = 0;
  private disposed = false;
  private coverProgress = 1;
  private impactSuppressedUntil = 0;
  private debugRollId = 0;

  constructor(
    private readonly host: HTMLElement,
    private readonly options: DiceRollerSceneOptions,
  ) {}

  async init() {
    await RAPIER.init();
    if (this.disposed) return;

    this.setupRenderer();
    this.setupScene();
    this.setupPhysics();
    this.buildTray();
    this.buildCover();
    this.setDiceCount(this.diceCount);
    this.animate();
  }

  setDiceCount(count: number) {
    this.diceCount = count;
    if (!this.world) return;
    while (this.dice.length > count) this.removeDie(this.dice.length - 1);
    while (this.dice.length < count) this.addDie(this.dice.length, false);
    this.publishFaces();
  }

  setLocked(locked: boolean[]) {
    this.dice.forEach((die, index) => {
      if (die.locked === locked[index]) return;
      this.recreateDieBody(index, Boolean(locked[index]));
    });
  }

  setCoverOpen(open: boolean) {
    this.setCoverProgress(open ? 1 : 0);
  }

  setCoverProgress(progress: number) {
    this.coverProgress = Math.min(1, Math.max(0, progress));
    const coverY = COVER_CLOSED_Y + COVER_HEIGHT * this.coverProgress;
    this.cover.position.y = coverY;
    // Suppress impact audio briefly while dragging the cover to avoid false hits near the end of the gesture.
    this.impactSuppressedUntil = performance.now() + 180;
  }

  roll() {
    const startedFromIdle = !this.rolling;
    this.rolling = true;
    this.rollingElapsed = 0;
    this.visualStillElapsed = 0;
    this.resetDiceDebug();
    if (startedFromIdle) this.options.onRollingChange(true);

    for (let index = 0; index < this.dice.length; index += 1) {
      const die = this.dice[index];
      if (die.locked) continue;

      this.removeDie(index);
      this.addDie(index, false);
      const nextDie = this.dice[index];
      const horizontalImpulse = randomHorizontalImpulse();
      const torqueImpulse = randomTorqueImpulse();
      nextDie.body.wakeUp();
      nextDie.body.applyImpulse({
        x: horizontalImpulse.x,
        y: 0.24 + Math.random() * 0.08,
        z: horizontalImpulse.z,
      }, true);
      nextDie.body.applyTorqueImpulse({
        x: torqueImpulse.x,
        y: torqueImpulse.y,
        z: torqueImpulse.z,
      }, true);
    }
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', this.resize);
    this.renderer.dispose();
    this.dieGeometry.dispose();
    this.pipGeometry.dispose();
    this.trayGeometry.dispose();
    this.coverWallGeometry.dispose();
    this.coverTopGeometry.dispose();
    this.coverKnobGeometry.dispose();
    this.trayMaterial.dispose();
    this.coverMaterial.dispose();
    this.dieMaterial.dispose();
    this.blackPipMaterial.dispose();
    this.redPipMaterial.dispose();
    this.eventQueue?.free();
    this.world?.free();
    this.host.innerHTML = '';
  }

  private setupRenderer() {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.host.append(this.renderer.domElement);
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  private setupScene() {
    this.scene.background = new THREE.Color(0x20252a);
    this.camera.position.set(0, 4.8, 6.9);
    this.camera.lookAt(0, 0.52, 0);

    const ambient = new THREE.HemisphereLight(0x9fd8ff, 0x08131b, 1.8);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(-3, 6, 4);
    key.castShadow = true;
    this.scene.add(key);

    const rim = new THREE.PointLight(0x4fd6ff, 8, 9);
    rim.position.set(2.8, 2.2, -2.4);
    this.scene.add(rim);
  }

  private setupPhysics() {
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.eventQueue = new RAPIER.EventQueue(true);
    this.world.integrationParameters.dt = 1 / 60;
    this.world.integrationParameters.numSolverIterations = 8;
    this.world.integrationParameters.numAdditionalFrictionIterations = 8;
  }

  private buildTray() {
    if (!this.world) return;

    const tray = new THREE.Mesh(this.trayGeometry, this.trayMaterial);
    tray.receiveShadow = true;
    tray.position.y = -0.18;
    this.scene.add(tray);

    this.trayCollider = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(TRAY_RADIUS, 0.08, TRAY_RADIUS)
        .setTranslation(0, -0.02, 0)
        .setFriction(0.84)
        .setRestitution(0.08)
        .setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS)
        .setContactForceEventThreshold(3.6),
    );

    const wallCount = 28;
    for (let index = 0; index < wallCount; index += 1) {
      const angle = (index / wallCount) * Math.PI * 2;
      const x = Math.cos(angle) * WALL_RING_RADIUS;
      const z = Math.sin(angle) * WALL_RING_RADIUS;
      const body = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed()
          .setTranslation(x, WALL_CENTER_Y, z)
          .setRotation(new THREE.Quaternion().setFromAxisAngle(WORLD_UP, -angle)),
      );
      this.world.createCollider(
        // Keep the tray wall top above normal dice motion so dice cannot balance on a narrow wall edge.
        RAPIER.ColliderDesc.cuboid(WALL_HALF_WIDTH, WALL_HALF_HEIGHT, WALL_HALF_DEPTH)
          .setFriction(WALL_FRICTION)
          .setRestitution(0.05)
          .setSensor(true)
          .setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS)
          .setContactForceEventThreshold(4.2),
        body,
      );
    }
  }

  private buildCover() {
    const coverWall = new THREE.Mesh(this.coverWallGeometry, this.coverMaterial);
    const coverTop = new THREE.Mesh(this.coverTopGeometry, this.coverMaterial);
    const coverKnob = new THREE.Mesh(this.coverKnobGeometry, this.coverMaterial);
    coverWall.position.y = 0;
    coverTop.position.y = 1.24;
    coverKnob.position.y = 1.48;
    this.cover.add(coverWall, coverTop, coverKnob);

    this.setCoverProgress(1);
    this.cover.visible = false;
    this.scene.add(this.cover);
  }

  private addDie(index: number, locked: boolean) {
    if (!this.world) return;

    const spawn = randomInTray(index, this.diceCount);
    const group = this.createDieMesh();
    group.position.set(spawn.x, DIE_SPAWN_BASE_Y + index * DIE_SPAWN_STEP_Y, spawn.z);
    group.quaternion.copy(randomTossStartQuaternion());
    this.scene.add(group);

    const bodyDesc = locked ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic();
    const body = this.world.createRigidBody(
      bodyDesc
        .setTranslation(group.position.x, group.position.y, group.position.z)
        .setRotation({
          x: group.quaternion.x,
          y: group.quaternion.y,
          z: group.quaternion.z,
          w: group.quaternion.w,
        })
        .setLinearDamping(0.42)
        .setAngularDamping(0.56)
        .setCcdEnabled(true)
        .setCanSleep(true),
    );
    body.setAdditionalSolverIterations(4);

    const collider = this.createDieCollider(body);

    this.dice.splice(index, 0, {
      body,
      collider,
      mesh: group,
      locked,
      cornerStandElapsed: 0,
      cornerAssistCooldown: 0,
      cornerAssistAttempts: 0,
      airborneElapsed: 0,
      airborneRecoveryCooldown: 0,
      debugLastY: group.position.y,
      debugLastLinearY: 0,
    });
  }

  private removeDie(index: number) {
    const die = this.dice[index];
    if (!die || !this.world) return;
    this.world.removeRigidBody(die.body);
    this.scene.remove(die.mesh);
    this.dice.splice(index, 1);
  }

  private recreateDieBody(index: number, locked: boolean) {
    const die = this.dice[index];
    if (!die || !this.world) return;

    const position = die.body.translation();
    const rotation = die.body.rotation();
    this.world.removeRigidBody(die.body);

    const bodyDesc = locked ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic();
    die.body = this.world.createRigidBody(
      bodyDesc
        .setTranslation(position.x, position.y, position.z)
        .setRotation(rotation)
        .setLinearDamping(0.42)
        .setAngularDamping(0.56)
        .setCcdEnabled(true)
        .setCanSleep(true),
    );
    die.body.setAdditionalSolverIterations(4);

    die.collider = this.createDieCollider(die.body);

    die.locked = locked;
    die.cornerStandElapsed = 0;
    die.cornerAssistCooldown = 0;
    die.cornerAssistAttempts = 0;
    die.airborneElapsed = 0;
    die.airborneRecoveryCooldown = 0;
    die.debugLastY = position.y;
    die.debugLastLinearY = 0;
  }

  private createDieCollider(body: RAPIER.RigidBody) {
    if (!this.world) throw new Error('Physics world is not initialized.');

    return this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(DIE_COLLIDER_HALF_SIZE, DIE_COLLIDER_HALF_SIZE, DIE_COLLIDER_HALF_SIZE)
        .setFriction(0.58)
        .setRestitution(0.06)
        .setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS)
        .setContactForceEventThreshold(3.2),
      body,
    );
  }

  private createDieMesh() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(this.dieGeometry, this.dieMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    this.addFacePips(group, 1, 'y+', this.redPipMaterial);
    this.addFacePips(group, 6, 'y-', this.blackPipMaterial);
    this.addFacePips(group, 2, 'x+', this.blackPipMaterial);
    this.addFacePips(group, 5, 'x-', this.blackPipMaterial);
    this.addFacePips(group, 3, 'z+', this.blackPipMaterial);
    this.addFacePips(group, 4, 'z-', this.redPipMaterial);

    return group;
  }

  private addFacePips(
    group: THREE.Group,
    face: number,
    side: 'x+' | 'x-' | 'y+' | 'y-' | 'z+' | 'z-',
    material: THREE.Material,
  ) {
    const gap = DIE_SIZE * 0.21;
    const offset = DIE_HALF_SIZE + 0.006;

    for (const [u, v] of PIP_PATTERNS[face]) {
      const pip = new THREE.Mesh(this.pipGeometry, material);

      if (side === 'z+') {
        pip.position.set(u * gap, v * gap, offset);
      } else if (side === 'z-') {
        pip.position.set(-u * gap, v * gap, -offset);
        pip.rotation.y = Math.PI;
      } else if (side === 'x+') {
        pip.position.set(offset, v * gap, -u * gap);
        pip.rotation.y = Math.PI / 2;
      } else if (side === 'x-') {
        pip.position.set(-offset, v * gap, u * gap);
        pip.rotation.y = -Math.PI / 2;
      } else if (side === 'y+') {
        pip.position.set(u * gap, offset, -v * gap);
        pip.rotation.x = -Math.PI / 2;
      } else {
        pip.position.set(u * gap, -offset, v * gap);
        pip.rotation.x = Math.PI / 2;
      }

      group.add(pip);
    }
  }

  private animate = () => {
    if (this.disposed || !this.world) return;

    const delta = Math.min(this.clock.getDelta(), 0.05);
    this.world.timestep = delta;
    this.world.step(this.eventQueue);
    this.handleContactForces();
    this.keepDiceInsideBounds();
    this.syncDice();
    this.recordPhysicsBounceDebug();
    this.checkSettled(delta);
    this.renderer.render(this.scene, this.camera);
    this.frameId = requestAnimationFrame(this.animate);
  };

  private syncDice() {
    for (const die of this.dice) {
      const position = die.body.translation();
      const rotation = die.body.rotation();
      die.mesh.position.set(position.x, position.y, position.z);
      die.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    }
  }

  // 结算纠偏按帧推进物理体，让骰子自己滑落到稳定面，而不是瞬移到目标姿态。
  private checkSettled(delta: number) {
    if (!this.rolling) return;

    this.rollingElapsed += delta;
    this.updateRestabilizationTimers(delta);
    const allSleeping = this.dice.every((die) => die.locked || die.body.isSleeping());
    if (allSleeping) {
      if (!this.areDiceStructurallyStable() && !this.forceSettleUnsupportedDice()) return;
      this.finishRoll();
      return;
    }

    const visuallyStill = this.dice.every((die) => {
      if (die.locked) return true;
      const linear = die.body.linvel();
      const angular = die.body.angvel();
      return Math.hypot(linear.x, linear.y, linear.z) < VISUAL_LINEAR_SPEED
        && Math.hypot(angular.x, angular.y, angular.z) < VISUAL_ANGULAR_SPEED;
    });
    this.visualStillElapsed = visuallyStill ? this.visualStillElapsed + delta : 0;
    if (this.rollingElapsed >= VISUAL_SETTLE_DELAY_SECONDS && this.visualStillElapsed >= VISUAL_STILL_SECONDS) {
      if (!this.areDiceStructurallyStable() && !this.forceSettleUnsupportedDice()) return;
      this.finishRoll();
      return;
    }

    if (this.rollingElapsed < SLEEP_FALLBACK_SECONDS) return;

    const slowEnough = this.dice.every((die) => {
      if (die.locked) return true;
      const linear = die.body.linvel();
      const angular = die.body.angvel();
      return Math.hypot(linear.x, linear.y, linear.z) < SETTLE_LINEAR_SPEED
        && Math.hypot(angular.x, angular.y, angular.z) < SETTLE_ANGULAR_SPEED;
    });
    if (!slowEnough) return;

    if (!this.areDiceStructurallyStable() && !this.forceSettleUnsupportedDice()) return;
    this.finishRoll();
  }

  private finishRoll() {
    this.rolling = false;
    this.visualStillElapsed = 0;
    this.impactSuppressedUntil = performance.now() + 120;
    this.options.onRollingChange(false);

    this.dice.forEach((die) => {
      if (die.locked) return;
      die.body.sleep();
    });

    this.syncDice();
    this.finishDiceDebug();
    this.publishFaces();
  }

  private handleContactForces() {
    if (!this.eventQueue) return;

    const now = performance.now();
    this.eventQueue.drainContactForceEvents((event) => {
      if (!this.rolling || now < this.impactSuppressedUntil) return;
      const strength = event.maxForceMagnitude();
      if (strength < 3.2 || now - this.lastImpactAt < COLLISION_SOUND_COOLDOWN) return;
      this.lastImpactAt = now;
      this.recordImpactDebug(strength);
      this.options.onImpact(Math.min(1, strength / 18));
    });
  }

  private publishFaces() {
    this.options.onFacesChange(this.dice.map((die) => this.getTopFace(die)));
  }

  private keepDiceInsideBounds() {
    const maxRadius = TRAY_INNER_RADIUS - DIE_HALF_SIZE;

    for (const die of this.dice) {
      if (die.locked) continue;
      if (die.body.isSleeping()) continue;

      const position = die.body.translation();
      const radial = Math.hypot(position.x, position.z);
      const nextPosition = { x: position.x, y: position.y, z: position.z };
      const nextLinearVelocity = die.body.linvel();
      const nextAngularVelocity = die.body.angvel();
      const wakeOnCorrection = !die.body.isSleeping();
      const linearYBefore = nextLinearVelocity.y;
      let corrected = false;
      let touchedHorizontalBoundary = false;
      let touchedVerticalBoundary = false;

      if (radial > maxRadius) {
        const scale = maxRadius / radial;
        nextPosition.x = position.x * scale;
        nextPosition.z = position.z * scale;
        corrected = true;
        touchedHorizontalBoundary = true;
      }

      if (position.y > MAX_DIE_CENTER_HEIGHT) {
        nextPosition.y = MAX_DIE_CENTER_HEIGHT;
        corrected = true;
        touchedVerticalBoundary = true;
      }

      if (position.y < BOUNDS_MIN_DIE_CENTER_HEIGHT) {
        nextPosition.y = BOUNDS_MIN_DIE_CENTER_HEIGHT;
        corrected = true;
        touchedVerticalBoundary = true;
      }

      if (radial > WALL_ESCAPE_RADIUS && position.y > WALL_ESCAPE_MIN_Y) {
        const scale = WALL_ESCAPE_RADIUS / radial;
        nextPosition.x = position.x * scale;
        nextPosition.z = position.z * scale;
        corrected = true;
        touchedHorizontalBoundary = true;
      }

      if (!corrected) continue;

      // Horizontal bounds should not cancel downward motion, otherwise dice can appear frozen in midair.
      die.body.setTranslation(nextPosition, wakeOnCorrection);

      if (touchedHorizontalBoundary && radial > 1e-4) {
        const normalX = position.x / radial;
        const normalZ = position.z / radial;
        const outwardSpeed = nextLinearVelocity.x * normalX + nextLinearVelocity.z * normalZ;
        if (outwardSpeed > 0) {
          nextLinearVelocity.x -= outwardSpeed * normalX;
          nextLinearVelocity.z -= outwardSpeed * normalZ;
        }
      }

      if (touchedVerticalBoundary) {
        if (nextPosition.y >= MAX_DIE_CENTER_HEIGHT) {
          nextLinearVelocity.y = Math.min(0, nextLinearVelocity.y);
        }
        if (nextPosition.y <= BOUNDS_MIN_DIE_CENTER_HEIGHT) {
          nextLinearVelocity.y = Math.max(0, nextLinearVelocity.y);
        }
      }

      die.body.setLinvel(nextLinearVelocity, wakeOnCorrection);
      this.recordBoundsCorrectionDebug(this.dice.indexOf(die), {
        fromY: position.y,
        toY: nextPosition.y,
        radial,
        vertical: touchedVerticalBoundary,
        horizontal: touchedHorizontalBoundary,
        linearYBefore,
        linearYAfter: nextLinearVelocity.y,
      });
      if (touchedVerticalBoundary) {
        die.body.setAngvel({ x: 0, y: 0, z: 0 }, wakeOnCorrection);
      } else {
        die.body.setAngvel(nextAngularVelocity, wakeOnCorrection);
      }
    }
  }

  private getStableFaceQuaternion(die: DieItem) {
    const rotation = die.body.rotation();
    const current = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
    const topFace = this.getTopFaceFromQuaternion(current);
    let target = CUBE_ORIENTATIONS[0];
    let bestDot = -Infinity;

    for (const candidate of CUBE_ORIENTATIONS) {
      if (this.getTopFaceFromQuaternion(candidate) !== topFace) continue;
      const dot = Math.abs(current.dot(candidate));
      if (dot > bestDot) {
        bestDot = dot;
        target = candidate;
      }
    }

    return target;
  }

  private areDiceStructurallyStable() {
    return this.dice.every((die, index) => {
      if (die.locked) return true;
      return !this.needsRestabilization(index);
    });
  }

  // 只把明显斜角站立当成异常，避免轻微倾斜的稳定骰子继续被扶正。
  private isDieClearlyCornerStanding(die: DieItem) {
    const rotation = die.body.rotation();
    const quaternion = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
    return this.getTopFaceDot(quaternion) < CORNER_STAND_FACE_DOT;
  }

  private forceSettleUnsupportedDice() {
    let resolved = true;
    this.dice.forEach((die, index) => {
      if (die.locked) return;

      if (this.isNearGroundCornerStand(index)) {
        if (die.cornerAssistAttempts >= FINAL_POSE_RECOVERY_ATTEMPTS) {
          this.applyRecoveryToss(index);
          die.cornerStandElapsed = 0;
          die.cornerAssistCooldown = CORNER_ASSIST_COOLDOWN_SECONDS;
          die.cornerAssistAttempts = 0;
          resolved = false;
          return;
        }
        if (!this.shouldAssistCornerStand(index)) {
          resolved = false;
          return;
        }
        // 贴地斜角站立只给一个小助推，让骰子自己滚正，不直接把姿态摆回目标面。
        if (!this.applyCornerStandAssist(index, { upward: true })) return;
        die.cornerStandElapsed = 0;
        die.cornerAssistCooldown = CORNER_ASSIST_COOLDOWN_SECONDS;
        die.cornerAssistAttempts += 1;
        resolved = false;
        return;
      }

      if (this.isUnsupportedAirborne(index)) {
        // 真正离开支撑面的骰子才走下落纠偏，贴底斜角交给物理助推自然落稳。
        this.startCorrectionMotion(index);
        die.cornerAssistCooldown = 0;
        die.cornerAssistAttempts = 0;
        resolved = false;
      }
    });

    return resolved;
  }

  private needsRestabilization(index: number) {
    const die = this.dice[index];
    if (!die || die.locked) return false;

    return this.isUnsupportedAirborne(index) || this.isNearGroundCornerStand(index);
  }

  private updateRestabilizationTimers(delta: number) {
    this.dice.forEach((die, index) => {
      if (die.locked) return;
      die.cornerAssistCooldown = Math.max(0, die.cornerAssistCooldown - delta);
      die.airborneRecoveryCooldown = Math.max(0, die.airborneRecoveryCooldown - delta);

      if (this.isNearGroundCornerStand(index)) {
        die.cornerStandElapsed += delta;
      } else {
        die.cornerStandElapsed = 0;
        die.cornerAssistCooldown = 0;
        die.cornerAssistAttempts = 0;
      }
      die.airborneElapsed = this.isUnsupportedAirborne(index)
        ? die.airborneElapsed + delta
        : 0;
      if (die.airborneElapsed === 0) die.airborneRecoveryCooldown = 0;
    });
  }

  private getProjectedOverlapRatio(upper: RAPIER.Vector, lower: RAPIER.Vector) {
    const overlapX = Math.max(0, DIE_SIZE - Math.abs(upper.x - lower.x));
    const overlapZ = Math.max(0, DIE_SIZE - Math.abs(upper.z - lower.z));
    return (overlapX * overlapZ) / (DIE_SIZE * DIE_SIZE);
  }

  private hasSupportContact(upper: DieItem, lower: DieItem) {
    if (!this.world) return false;

    let supported = false;
    this.world.contactPair(upper.collider, lower.collider, (manifold) => {
      if (supported) return;
      if (Math.max(manifold.numContacts(), manifold.numSolverContacts()) === 0) return;
      if (Math.abs(manifold.normal().y) < STACK_SUPPORT_NORMAL_DOT) return;
      supported = true;
    });

    return supported;
  }

  // 支撑骰必须满足高度、投影覆盖和真实接触，避免仅靠中心距离把擦边状态误判成叠放。
  private getSupportDie(
    index: number,
    {
      overlapRatio,
      maxVerticalGap,
      requireContact,
    }: {
      overlapRatio: number;
      maxVerticalGap: number;
      requireContact: boolean;
    },
  ) {
    const upper = this.dice[index];
    if (!upper) return undefined;

    const position = upper.body.translation();
    let bestSupport: DieItem | undefined;
    let bestY = -Infinity;
    for (let otherIndex = 0; otherIndex < this.dice.length; otherIndex += 1) {
      if (otherIndex === index) continue;
      const lower = this.dice[otherIndex];
      const otherPosition = lower.body.translation();
      const verticalGap = position.y - otherPosition.y;
      if (verticalGap < STACK_SUPPORT_VERTICAL_MIN || verticalGap > maxVerticalGap) continue;
      if (otherPosition.y >= position.y) continue;
      if (this.getProjectedOverlapRatio(position, otherPosition) < overlapRatio) continue;
      if (requireContact && !this.hasSupportContact(upper, lower)) continue;
      if (otherPosition.y > bestY) {
        bestY = otherPosition.y;
        bestSupport = lower;
      }
    }

    return bestSupport;
  }

  private hasStackSupport(index: number) {
    return Boolean(this.getSupportDie(index, {
      overlapRatio: STACK_SUPPORT_OVERLAP_RATIO,
      maxVerticalGap: STACK_SUPPORT_VERTICAL_MAX,
      requireContact: true,
    }));
  }

  private hasCandidateStackSupport(index: number) {
    return Boolean(this.getSupportDie(index, {
      overlapRatio: STACK_SUPPORT_CANDIDATE_OVERLAP_RATIO,
      maxVerticalGap: DIE_SIZE * 1.45,
      requireContact: false,
    }));
  }

  private getRestingHeight(index: number, requireContact = false) {
    const supportDie = this.getSupportDie(index, {
      overlapRatio: requireContact
        ? STACK_SUPPORT_OVERLAP_RATIO
        : STACK_SUPPORT_CANDIDATE_OVERLAP_RATIO,
      maxVerticalGap: requireContact
        ? STACK_SUPPORT_VERTICAL_MAX
        : DIE_SIZE * 1.45,
      requireContact,
    });
    if (!supportDie) return MIN_DIE_CENTER_HEIGHT;
    return supportDie.body.translation().y + STACKED_REST_CENTER_DISTANCE;
  }

  private hasTrayContact(die: DieItem) {
    if (!this.world || !this.trayCollider) return false;

    let touchingTray = false;
    this.world.contactPair(die.collider, this.trayCollider, (manifold) => {
      if (touchingTray) return;
      if (Math.max(manifold.numContacts(), manifold.numSolverContacts()) === 0) return;
      if (Math.abs(manifold.normal().y) < TRAY_SUPPORT_NORMAL_DOT) return;
      touchingTray = true;
    });

    return touchingTray;
  }

  private hasAnyTrayContact(die: DieItem) {
    if (!this.world || !this.trayCollider) return false;

    let touchingTray = false;
    this.world.contactPair(die.collider, this.trayCollider, (manifold) => {
      if (touchingTray) return;
      if (Math.max(manifold.numContacts(), manifold.numSolverContacts()) === 0) return;
      touchingTray = true;
    });

    return touchingTray;
  }

  private isNearGroundCornerStand(index: number) {
    const die = this.dice[index];
    if (!die) return false;

    const position = die.body.translation();
    const stableRestingHeight = this.getRestingHeight(index, true);
    const nearTrayBase = position.y <= MIN_DIE_CENTER_HEIGHT + CORNER_STAND_HEIGHT_SLACK;
    return nearTrayBase
      && stableRestingHeight <= MIN_DIE_CENTER_HEIGHT + REST_HEIGHT_SNAP_SLACK
      && this.hasAnyTrayContact(die)
      && !this.hasStackSupport(index)
      && this.isDieClearlyCornerStanding(die);
  }

  private isFinalPoseInvalid(index: number) {
    const die = this.dice[index];
    if (!die) return false;

    const rotation = die.body.rotation();
    const quaternion = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
    return this.getTopFaceDot(quaternion) < FINAL_FACE_DOT;
  }

  private isUnsupportedAirborne(index: number) {
    const die = this.dice[index];
    if (!die) return false;

    const position = die.body.translation();
    if (this.hasStackSupport(index)) return false;
    const stableRestingHeight = this.getRestingHeight(index, true);
    const restsOnTray = stableRestingHeight <= MIN_DIE_CENTER_HEIGHT + REST_HEIGHT_SNAP_SLACK;
    if (restsOnTray) {
      return position.y > MIN_DIE_CENTER_HEIGHT + REST_HEIGHT_SNAP_SLACK
        || !this.hasAnyTrayContact(die);
    }

    return position.y > stableRestingHeight + REST_HEIGHT_SNAP_SLACK;
  }

  private shouldAssistCornerStand(index: number) {
    const die = this.dice[index];
    if (!die || die.cornerStandElapsed < CORNER_STAND_CONFIRM_SECONDS) return false;
    if (die.cornerAssistCooldown > 0) return false;

    const linear = die.body.linvel();
    const angular = die.body.angvel();
    return Math.hypot(linear.x, linear.y, linear.z) <= CORNER_STAND_SNAP_LINEAR_SPEED
      && Math.hypot(angular.x, angular.y, angular.z) <= CORNER_STAND_SNAP_ANGULAR_SPEED;
  }

  // 贴地斜角只施加小幅抬升、横向回滚和扭矩，避免正常结果被突兀地几何复位。
  private applyCornerStandAssist(index: number, { upward }: { upward: boolean }) {
    const die = this.dice[index];
    if (!die) return false;

    const rotation = die.body.rotation();
    const currentQuaternion = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
    const targetQuaternion = this.getStableFaceQuaternion(die);
    const deltaQuaternion = targetQuaternion.clone().multiply(currentQuaternion.clone().invert()).normalize();
    const rawAxis = new THREE.Vector3(deltaQuaternion.x, deltaQuaternion.y, deltaQuaternion.z);
    const rawAxisLength = rawAxis.length();
    let angle = 2 * Math.acos(THREE.MathUtils.clamp(deltaQuaternion.w, -1, 1));
    if (angle > Math.PI) angle = Math.PI * 2 - angle;
    if (rawAxisLength < 1e-4 || angle < 0.08) return false;

    const assistAxis = rawAxis.multiplyScalar(1 / rawAxisLength);
    const supportCorner = this.getLowestSupportCorner(currentQuaternion).applyQuaternion(currentQuaternion);
    const horizontalAssist = new THREE.Vector3(-supportCorner.x, 0, -supportCorner.z);
    if (horizontalAssist.lengthSq() < 1e-6) {
      horizontalAssist.set(-assistAxis.x, 0, -assistAxis.z);
    }
    if (horizontalAssist.lengthSq() > 1e-6) {
      horizontalAssist.normalize();
    }

    const attemptRatio = clamp01((die.cornerAssistAttempts + 1) / CORNER_ASSIST_MAX_ATTEMPTS);
    const angleRatio = clamp01(angle / RIGHT_ANGLE);
    const upwardImpulse = upward
      ? THREE.MathUtils.lerp(
        CORNER_ASSIST_UPWARD_IMPULSE_MIN,
        CORNER_ASSIST_UPWARD_IMPULSE_MAX,
        attemptRatio,
      ) * THREE.MathUtils.lerp(0.8, 1, angleRatio)
      : 0;
    const lateralImpulse = THREE.MathUtils.lerp(
      CORNER_ASSIST_LATERAL_IMPULSE_MIN,
      CORNER_ASSIST_LATERAL_IMPULSE_MAX,
      attemptRatio,
    ) * Math.max(0.45, angleRatio);
    const torqueImpulse = THREE.MathUtils.lerp(
      CORNER_ASSIST_TORQUE_IMPULSE_MIN,
      CORNER_ASSIST_TORQUE_IMPULSE_MAX,
      attemptRatio,
    ) * Math.max(0.4, angleRatio);

    die.body.wakeUp();
    die.body.applyImpulse({
      x: horizontalAssist.x * lateralImpulse,
      y: upwardImpulse,
      z: horizontalAssist.z * lateralImpulse,
    }, true);
    die.body.applyTorqueImpulse({
      x: assistAxis.x * torqueImpulse,
      y: assistAxis.y * torqueImpulse,
      z: assistAxis.z * torqueImpulse,
    }, true);
    this.recordCornerAssistDebug(index, {
      upwardImpulse,
      lateralImpulse,
      torqueImpulse,
      topFaceDot: this.getTopFaceDot(currentQuaternion),
      angle,
    });

    return true;
  }

  private applyRecoveryToss(index: number) {
    const die = this.dice[index];
    if (!die) return;

    const horizontalImpulse = randomHorizontalImpulse();
    const torqueImpulse = randomTorqueImpulse();
    die.body.wakeUp();
    die.body.applyImpulse({
      x: horizontalImpulse.x * 0.34,
      y: 0.1,
      z: horizontalImpulse.z * 0.34,
    }, true);
    die.body.applyTorqueImpulse({
      x: torqueImpulse.x * 0.28,
      y: torqueImpulse.y * 0.22,
      z: torqueImpulse.z * 0.28,
    }, true);
  }

  // 重置本轮骰子调试记录，方便从浏览器读取最近一次弹跳/助推次数。
  private resetDiceDebug() {
    this.debugRollId += 1;
    const debug: DiceDebugState = {
      rollId: this.debugRollId,
      startedAt: performance.now(),
      assistCounts: this.dice.map(() => 0),
      physicsBounceCounts: this.dice.map(() => 0),
      boundsCorrectionCounts: this.dice.map(() => 0),
      correctionMotionCounts: this.dice.map(() => 0),
      diceStates: [],
      assists: [],
      physicsBounces: [],
      boundsCorrections: [],
      correctionMotions: [],
      impacts: [],
    };
    window.__diceDebug = debug;
    this.persistDiceDebug(debug);
  }

  // 记录一次贴地斜角助推，便于排查某颗骰子是否被反复向上拨动。
  private recordCornerAssistDebug(
    index: number,
    event: Omit<DiceAssistDebugEvent, 'rollId' | 'dieIndex' | 'assistCount' | 'height' | 'at'>,
  ) {
    const debug = window.__diceDebug;
    const die = this.dice[index];
    if (!debug || !die) return;

    debug.assistCounts[index] = (debug.assistCounts[index] ?? 0) + 1;
    const position = die.body.translation();
    debug.assists.push({
      rollId: debug.rollId,
      dieIndex: index,
      assistCount: debug.assistCounts[index],
      height: position.y,
      at: performance.now(),
      ...event,
    });
    this.trimDebugEvents(debug.assists);
    this.persistDiceDebug(debug);
  }

  // 记录普通物理反弹，区分自然落地弹跳和斜角助推。
  private recordPhysicsBounceDebug() {
    const debug = window.__diceDebug;

    this.dice.forEach((die, index) => {
      const position = die.body.translation();
      const linear = die.body.linvel();
      const previousHeight = die.debugLastY;
      const previousLinearY = die.debugLastLinearY;

      if (debug && this.rolling && !die.locked) {
        const restingHeight = this.getRestingHeight(index);
        const nearRestingHeight = Math.min(position.y, previousHeight) <= restingHeight + DEBUG_BOUNCE_HEIGHT_SLACK;
        const bouncedUp = previousLinearY <= DEBUG_BOUNCE_MIN_PREVIOUS_DOWNWARD_SPEED
          && linear.y >= DEBUG_BOUNCE_MIN_UPWARD_SPEED;

        if (nearRestingHeight && bouncedUp) {
          debug.physicsBounceCounts[index] = (debug.physicsBounceCounts[index] ?? 0) + 1;
          debug.physicsBounces.push({
            rollId: debug.rollId,
            dieIndex: index,
            at: performance.now(),
            height: position.y,
            previousHeight,
            restingHeight,
            previousLinearY,
            linearY: linear.y,
          });
          this.trimDebugEvents(debug.physicsBounces);
          this.persistDiceDebug(debug);
        }
      }

      die.debugLastY = position.y;
      die.debugLastLinearY = linear.y;
    });
  }

  // 记录边界或底部位置钳制，排查是否由防穿透回推造成小跳。
  private recordBoundsCorrectionDebug(
    index: number,
    event: Omit<DiceBoundsCorrectionDebugEvent, 'rollId' | 'dieIndex' | 'at'>,
  ) {
    const debug = window.__diceDebug;
    if (!debug || index < 0) return;

    debug.boundsCorrectionCounts[index] = (debug.boundsCorrectionCounts[index] ?? 0) + 1;
    debug.boundsCorrections.push({
      rollId: debug.rollId,
      dieIndex: index,
      at: performance.now(),
      ...event,
    });
    this.trimDebugEvents(debug.boundsCorrections);
    this.persistDiceDebug(debug);
  }

  // 记录悬空下落纠偏，排查是否由结算阶段的高度修正造成视觉跳动。
  private recordCorrectionMotionDebug(
    index: number,
    event: Omit<DiceCorrectionMotionDebugEvent, 'rollId' | 'dieIndex' | 'at'>,
  ) {
    const debug = window.__diceDebug;
    if (!debug) return;

    debug.correctionMotionCounts[index] = (debug.correctionMotionCounts[index] ?? 0) + 1;
    debug.correctionMotions.push({
      rollId: debug.rollId,
      dieIndex: index,
      at: performance.now(),
      ...event,
    });
    this.trimDebugEvents(debug.correctionMotions);
    this.persistDiceDebug(debug);
  }

  // 记录强碰撞事件，辅助判断小跳是否来自普通物理接触。
  private recordImpactDebug(strength: number) {
    const debug = window.__diceDebug;
    if (!debug) return;

    debug.impacts.push({
      rollId: debug.rollId,
      at: performance.now(),
      strength,
    });
    this.trimDebugEvents(debug.impacts);
    this.persistDiceDebug(debug);
  }

  // 在结算时写入最终点数，方便把助推次数和最终结果对上。
  private finishDiceDebug() {
    const debug = window.__diceDebug;
    if (!debug) return;

    debug.finalFaces = this.dice.map((die) => this.getTopFace(die));
    debug.finishedAt = performance.now();
    this.persistDiceDebug(debug);
  }

  // 同步调试记录到当前标签页会话，方便下次从浏览器稳定读取。
  private persistDiceDebug(debug: DiceDebugState) {
    try {
      debug.diceStates = this.collectDicePoseDebug();
      const payload = JSON.stringify(debug);
      sessionStorage.setItem(DICE_DEBUG_STORAGE_KEY, payload);
      document.documentElement.dataset[DICE_DEBUG_DATASET_KEY] = payload;
    } catch {
      // 调试记录不能影响真实摇骰流程。
    }
  }

  // 采集每颗骰子的当前姿态读数，辅助判断斜角站立是否漏检。
  private collectDicePoseDebug(): DicePoseDebugState[] {
    return this.dice.map((die, dieIndex) => {
      const position = die.body.translation();
      const rotation = die.body.rotation();
      const linear = die.body.linvel();
      const angular = die.body.angvel();
      const quaternion = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
      const stableRestingHeight = this.getRestingHeight(dieIndex, true);
      const nearTrayBase = position.y <= MIN_DIE_CENTER_HEIGHT + CORNER_STAND_HEIGHT_SLACK;
      const hasTrayContact = this.hasTrayContact(die);
      const hasStackSupport = this.hasStackSupport(dieIndex);
      const topFaceDot = this.getTopFaceDot(quaternion);
      const isCornerStanding = topFaceDot < CORNER_STAND_FACE_DOT;
      const isFinalPoseInvalid = this.isFinalPoseInvalid(dieIndex);

      return {
        dieIndex,
        height: position.y,
        restingHeight: this.getRestingHeight(dieIndex),
        stableRestingHeight,
        topFaceDot,
        linearSpeed: Math.hypot(linear.x, linear.y, linear.z),
        angularSpeed: Math.hypot(angular.x, angular.y, angular.z),
        nearTrayBase,
        hasTrayContact,
        hasStackSupport,
        isCornerStanding,
        isFinalPoseInvalid,
        isNearGroundCornerStand: this.isNearGroundCornerStand(dieIndex),
        isUnsupportedAirborne: this.isUnsupportedAirborne(dieIndex),
      };
    });
  }

  private trimDebugEvents<T>(events: T[]) {
    if (events.length <= DEBUG_MAX_EVENTS) return;
    events.splice(0, events.length - DEBUG_MAX_EVENTS);
  }

  private getLowestSupportCorner(quaternion: THREE.Quaternion) {
    let bestCorner = SUPPORT_CORNERS[0];
    let lowestY = Infinity;

    SUPPORT_CORNERS.forEach((corner) => {
      const y = corner.clone().applyQuaternion(quaternion).y;
      if (y < lowestY) {
        lowestY = y;
        bestCorner = corner;
      }
    });

    return bestCorner.clone();
  }

  private startCorrectionMotion(index: number) {
    const die = this.dice[index];
    if (!die) return;

    const position = die.body.translation();
    const targetHeight = this.getRestingHeight(index, true);
    const verticalDistance = Math.max(0, position.y - targetHeight);
    this.recordCorrectionMotionDebug(index, {
      startHeight: position.y,
      targetHeight,
      verticalDistance,
    });

    die.body.wakeUp();
    const linear = die.body.linvel();
    const linearSpeed = Math.hypot(linear.x, linear.y, linear.z);
    if (
      die.airborneElapsed >= AIRBORNE_RECOVERY_CONFIRM_SECONDS
      && die.airborneRecoveryCooldown <= 0
      && linearSpeed <= AIRBORNE_RECOVERY_MAX_LINEAR_SPEED
    ) {
      if (this.hasCandidateStackSupport(index)) {
        die.body.setLinvel({
          x: linear.x,
          y: Math.min(linear.y, -AIRBORNE_STACK_RECOVERY_DOWNWARD_SPEED),
          z: linear.z,
        }, true);
        die.airborneRecoveryCooldown = AIRBORNE_RECOVERY_COOLDOWN_SECONDS;
        return;
      }

      const lateral = this.getAirborneRecoveryLateralDirection(index, position);
      die.body.setLinvel({
        x: lateral.x * AIRBORNE_RECOVERY_LATERAL_SPEED,
        y: Math.min(linear.y, -AIRBORNE_RECOVERY_DOWNWARD_SPEED),
        z: lateral.z * AIRBORNE_RECOVERY_LATERAL_SPEED,
      }, true);
      die.body.applyTorqueImpulse({
        x: lateral.z * AIRBORNE_RECOVERY_TORQUE_IMPULSE,
        y: 0,
        z: -lateral.x * AIRBORNE_RECOVERY_TORQUE_IMPULSE,
      }, true);
      die.airborneRecoveryCooldown = AIRBORNE_RECOVERY_COOLDOWN_SECONDS;
    }
  }

  private getAirborneRecoveryLateralDirection(index: number, position: RAPIER.Vector) {
    let closest: RAPIER.Vector | undefined;
    let closestDistanceSq = Infinity;

    this.dice.forEach((candidate, candidateIndex) => {
      if (candidateIndex === index) return;
      const candidatePosition = candidate.body.translation();
      if (candidatePosition.y >= position.y) return;
      const distanceSq = ((position.x - candidatePosition.x) ** 2) + ((position.z - candidatePosition.z) ** 2);
      if (distanceSq < closestDistanceSq) {
        closestDistanceSq = distanceSq;
        closest = candidatePosition;
      }
    });

    const direction = closest
      ? new THREE.Vector3(position.x - closest.x, 0, position.z - closest.z)
      : new THREE.Vector3(-position.x, 0, -position.z);
    if (direction.lengthSq() < 1e-6) direction.set(1, 0, 0);
    return direction.normalize();
  }

  private getTopFace(die: DieItem) {
    const rotation = die.body.rotation();
    return this.getTopFaceFromQuaternion(
      new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w),
    );
  }

  private getTopFaceFromQuaternion(quaternion: THREE.Quaternion) {
    let bestFace = 1;
    let bestDot = -Infinity;

    for (const item of FACE_AXES) {
      const dot = item.axis.clone().applyQuaternion(quaternion).dot(WORLD_UP);
      if (dot > bestDot) {
        bestDot = dot;
        bestFace = item.face;
      }
    }

    return bestFace;
  }

  private getTopFaceDot(quaternion: THREE.Quaternion) {
    let bestDot = -Infinity;

    for (const item of FACE_AXES) {
      const dot = item.axis.clone().applyQuaternion(quaternion).dot(WORLD_UP);
      if (dot > bestDot) bestDot = dot;
    }

    return bestDot;
  }

  private resize = () => {
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };
}
