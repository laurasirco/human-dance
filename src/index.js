import './style.css'
import * as THREE from 'three';
import * as Tone from 'tone';
import { gsap } from 'gsap';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let character;
let mixer;

let char = {};

var hipsUpAction, hipsDownAction;
var armsAction;
var torsoLeftAction, torsoRightAction;
var headNodInAction, headNodOutAction;
var clapAction;
var initialPoseAction;
var torsoSide = 0;
var headNod = false;

// TONE PART

var tr808 = new Tone.Players({
  35: 'audio/tr808/BD.WAV',
  37: 'audio/tr808/RS.WAV',
  38: 'audio/tr808/SD.WAV',
  39: 'audio/tr808/CP.WAV',
  41: 'audio/tr808/LT.WAV',
  42: 'audio/tr808/CH.WAV',
  45: 'audio/tr808/MT.WAV',
  46: 'audio/tr808/OH.WAV',
  48: 'audio/tr808/HT.WAV',
  49: 'audio/tr808/CY.WAV'
});

tr808.toDestination();

var reverb = new Tone.Reverb({
  decay: 0.2,
  preDelay: 0.0
}).toDestination();

tr808.connect(reverb);

var metronome = new Tone.Synth();
metronome.oscillator.type = 'sine';
metronome.volume.value = -6;
metronome.toDestination();

const gain = new Tone.Gain(0.6);
gain.toDestination();

const notes = [35, 37, 38, 39, 41, 42, 46];

// BUTTONS

const $rows = document.body.querySelectorAll('.button-row');

let buttonStates = Array.from({ length: $rows.length }, () => Array(16).fill(false));

$rows.forEach(($row, i) => {
  const buttons = $row.querySelectorAll('.color-button');

  buttons.forEach((button, j) => {
    button.addEventListener('click', () =>{
      buttonStates[i][j] = !buttonStates[i][j];
      button.classList.toggle('active');
    });
  });
});

// TONE LOOP SETTING

let index = 0;

const loop = new Tone.Loop((time) => {

  let step = index % 16;

  $rows.forEach(($row, i) => {
    const buttons = $row.querySelectorAll('.color-button');
  
    buttons.forEach((button, j) => {
      button.classList.remove('current');
    });
    buttons[step].classList.add('current');
  });

  clapAction.stop();
  initialPoseAction.play();

  if (step % 2 === 0) {  // Cambiar el criterio de alternancia según sea necesario
    // Reproducir hipsDown
    hipsDownAction.play();   // Reproducir la animación

    hipsUpAction.stop();
    hipsUpAction.reset();
  } else {
    // // Reproducir hipsUp
    hipsUpAction.play();     // Reproducir la animación

    // // // Detener hipsDown
    hipsDownAction.stop();
    hipsDownAction.reset();
  }

  // if(step % 4 == 0){
  //   metronome.triggerAttackRelease('A4', '16n', time);
  // }

  for (let i = 0; i < buttonStates.length; i++) {
    // let $row = $rows[i];
    let note = notes[i];
    // let $input = $row.querySelector(`input:nth-child(${step + 1})`);

    let state = buttonStates[i][step];

    if(state){
      tr808.player(note).start(time);
      if (i == 0) {
        if (torsoSide == 0) {

          torsoLeftAction.play();

          torsoRightAction.stop();
          torsoRightAction.reset();

          torsoSide = 1;
        }
        else {

          torsoRightAction.play();

          torsoLeftAction.stop();
          torsoRightAction.reset();

          torsoSide = 0;
        }
      }

      if (i == 1) {
        armsAction.stop();
        armsAction.play();
      }

      if (i == 2) {
        if (headNod == false) {

          headNodInAction.play();

          headNodOutAction.stop();
          headNodOutAction.reset();

          headNod = true;
        }
        else {

          headNodOutAction.play();

          headNodInAction.stop();
          headNodInAction.reset();

          headNod = false;
        }
      }

      if (i == 3) {
        armsAction.stop();
        initialPoseAction.stop();
        clapAction.stop();
        clapAction.play();
      }
    }
  }
  index++;

}, "8n");

// Iniciar el loop
Tone.Transport.bpm.value = 120;
Tone.Transport.start();
loop.start(0);  // Empieza en el tiempo 0

// Escuchar el clic en el botón para iniciar el audio
document.getElementById('start-button').addEventListener('click', async () => {
  await Tone.start();

  console.log('Audio started');

  // document.getElementById('startButton').style.display = 'none';

});

//THREE JS PART

const loader = new GLTFLoader();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Añadir luces a la escena
const ambientLight = new THREE.AmbientLight('white', 2);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight('white', 1);
directionalLight.position.set(10, 10, 7.5);
scene.add(directionalLight);
directionalLight.castShadow = true;
// Configurar las propiedades de la sombra, como la distancia y la resolución
directionalLight.shadow.mapSize.width = 1024;  // Resolución horizontal
directionalLight.shadow.mapSize.height = 1024; // Resolución vertical
directionalLight.shadow.camera.near = 0.1;    // Distancia mínima de la sombra
directionalLight.shadow.camera.far = 50;     // Distancia máxima de la sombra


// Crear un plano para que sea el shadow catcher
const planeGeometry = new THREE.PlaneGeometry(10, 10);
const planeMaterial = new THREE.MeshStandardMaterial({
  color: '#ecf0f1', // Color verde
  roughness: 0.5,  // Control de la rugosidad para efectos de luz
  metalness: 0.0,  // Control de la metálicidad
  side: THREE.DoubleSide // Mostrar en ambos lados
});
const plane = new THREE.Mesh(planeGeometry, planeMaterial);

// Colocarlo en la escena y rotarlo para que quede horizontal
plane.rotation.x = -Math.PI / 2;
plane.receiveShadow = true;

// Añadir el plano a la escena
scene.add(plane);

// const directionalLight2 = new THREE.DirectionalLight('blue', 2);
// directionalLight2.position.set(-5, -10, 7.5);
// scene.add(directionalLight2);

loader.load('models/human_model_v01.glb', function (gltf) {
  scene.add(gltf.scene);

  character = gltf.scene;
  character.castShadow = true;

  const skinnedMesh = character.getObjectByProperty('type', 'SkinnedMesh');
  const ske = skinnedMesh.skeleton;
  char.skinnedMesh = skinnedMesh;
  char.skeleton = ske;

  character.traverse(function (object) {

    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }

    if (object.name == 'jacket') {
      char.jacket = object;
      char.jacket.visible = false;
    }

    if (object.name == "mixamorigHips") {
      char.hips = object;

    }
    if (object.name == "mixamorigSpine") {
      char.spine00 = object;
    }
    if (object.name == "mixamorigSpine1") {
      char.spine01 = object;
    }
    if (object.name == "mixamorigSpine2") {
      char.spine02 = object;
    }
    if (object.name == "mixamorigNeck") {
      char.neck = object;
    }
    if (object.name == "mixamorigShoulderL") {
      char.leftShoulder = object;
    }
    if (object.name == "mixamorigShoulderR") {
      char.rightShoulder = object;
    }
    if (object.name == "mixamorigArmL") {
      char.leftArm = object;
    }
    if (object.name == "mixamorigArmR") {
      char.rightArm = object;
    }
    if (object.name == "mixamorigForeArmL") {
      char.leftForearm = object;
    }
    if (object.name == "mixamorigForeArmR") {
      char.rightForearm = object;

    }
    if (object.name == "mixamorigHandL") {
      char.leftHand = object;
    }
    if (object.name == "mixamorigHandR") {
      char.rightHand = object;
    }
    if (object.name == "mixamorigUpLegL") {
      char.leftUpLeg = object;
    }
    if (object.name == "mixamorigLegL") {
      char.leftLeg = object;
    }
    if (object.name == "mixamorigFootL") {
      char.leftFoot = object;
    }
    if (object.name == "mixamorigIKLeftLeg") {
      char.leftIKLeg = object;
    }
    if (object.name == "mixamorigUpLegR") {
      char.rightUpLeg = object;
    }
    if (object.name == "mixamorigLegR") {
      char.rightLeg = object;
    }
    if (object.name == "mixamorigFootR") {
      char.rightFoot = object;
    }
    if (object.name == "mixamorigIKRightLeg") {
      char.rightIKLeg = object;
    }
  });

  const animations = gltf.animations;

  if (animations && animations.length) {

    mixer = new THREE.AnimationMixer(character);

    console.log(animations);

    const hipsUpAnimation = THREE.AnimationClip.findByName(animations, 'HipsUp');
    const hipsDownAnimation = THREE.AnimationClip.findByName(animations, 'HipsDown');
    const armsAnimation = THREE.AnimationClip.findByName(animations, 'Arms');
    const torsoRightAnimation = THREE.AnimationClip.findByName(animations, 'TorsoRight');
    const torsoLeftAnimation = THREE.AnimationClip.findByName(animations, 'TorsoLeft');
    const clapAnimation = THREE.AnimationClip.findByName(animations, 'Clap');
    const headNodInAnimation = THREE.AnimationClip.findByName(animations, 'HeadNodIn');
    const headNodOutAnimation = THREE.AnimationClip.findByName(animations, 'HeadNodOut');
    const initialPoseAnimation = THREE.AnimationClip.findByName(animations, 'InitialPose');

    const filteredHipsUpAnimation = filterTracksForBones(hipsUpAnimation, ['mixamorigHips', 'mixamorigUpLegL', 'mixamorigLegL', 'mixamorigFootL', 'mixamorigUpLegR', 'mixamorigLegR', 'mixamorigFootR']);
    hipsUpAction = mixer.clipAction(filteredHipsUpAnimation);
    hipsUpAction.setLoop(THREE.LoopOnce, 1);
    hipsUpAction.clampWhenFinished = true;

    const filteredHipsDownAnimation = filterTracksForBones(hipsDownAnimation, ['mixamorigHips', 'mixamorigUpLegL', 'mixamorigLegL', 'mixamorigFootL', 'mixamorigUpLegR', 'mixamorigLegR', 'mixamorigFootR']);
    hipsDownAction = mixer.clipAction(filteredHipsDownAnimation);
    hipsDownAction.setLoop(THREE.LoopOnce, 1);
    hipsDownAction.clampWhenFinished = true;

    const filteredArmsAnimation = filterTracksForBones(armsAnimation, ['mixamorigShoulderL', 'mixamorigShoulderR', 'mixamorigArmL', 'mixamorigArmR']);
    armsAction = mixer.clipAction(filteredArmsAnimation);
    armsAction.setLoop(THREE.LoopOnce, 1);
    armsAction.clampWhenFinished = true;

    const fiteredTorsoRightAnimation = filterTracksForBones(torsoRightAnimation, ['mixamorigSpine', 'mixamorigSpine1', 'mixamorigSpine2']);
    torsoRightAction = mixer.clipAction(fiteredTorsoRightAnimation);
    torsoRightAction.setLoop(THREE.LoopOnce, 1);
    torsoRightAction.clampWhenFinished = true;

    const fiteredTorsoLeftAnimation = filterTracksForBones(torsoLeftAnimation, ['mixamorigSpine', 'mixamorigSpine1', 'mixamorigSpine2']);
    torsoLeftAction = mixer.clipAction(fiteredTorsoLeftAnimation);
    torsoLeftAction.setLoop(THREE.LoopOnce, 1);
    torsoLeftAction.clampWhenFinished = true;

    const filteredClapAnimation = filterTracksForBones(clapAnimation, ['mixamorigShoulderL', 'mixamorigShoulderR', 'mixamorigArmL', 'mixamorigArmR', 'mixamorigForeArmL', 'mixamorigForeArmR', 'mixamorigHandL', 'mixamorigHandR']);
    clapAction = mixer.clipAction(filteredClapAnimation);
    clapAction.setLoop(THREE.LoopOnce, 1);
    clapAction.clampWhenFinished = true;

    const filteredHeadNodInAnimation = filterTracksForBones(headNodInAnimation, ['mixamorigNeck', 'mixamorigHead']);
    headNodInAction = mixer.clipAction(filteredHeadNodInAnimation);
    headNodInAction.setLoop(THREE.LoopOnce, 1);
    headNodInAction.clampWhenFinished = true;

    const filteredHeadNodOutAnimation = filterTracksForBones(headNodOutAnimation, ['mixamorigNeck', 'mixamorigHead']);
    headNodOutAction = mixer.clipAction(filteredHeadNodOutAnimation);
    headNodOutAction.setLoop(THREE.LoopOnce, 1);
    headNodOutAction.clampWhenFinished = true;

    initialPoseAction = mixer.clipAction(initialPoseAnimation);
    initialPoseAction.paused = true;
    initialPoseAction.play();

  }

  console.log(char);

  const skeletonHelper = new THREE.SkeletonHelper(character);
  // scene.add(skeletonHelper);

  let startTime = Date.now();
  const clock = new THREE.Clock();

  const targetFPS = 120;
  const frameDuration = 1000 / targetFPS;  // Duración de un frame en milisegundos

  let lastFrameTime = 0;

  function animate(time) {
    const deltaTime = time - lastFrameTime;

    if (deltaTime >= frameDuration) {
      lastFrameTime = time - (deltaTime % frameDuration);  // Resetear el tiempo de inicio del frame

      // Actualizar la escena, animaciones y renderizar
      const delta = clock.getDelta();

      character.rotation.y += Math.sin(delta / 2);

      mixer.update(delta);  // Actualiza las animaciones
      renderer.render(scene, camera);
    }

    requestAnimationFrame(animate);
  }

  animate();
});

camera.position.z = 5;
camera.position.y = 2;


// FUNCTIONS

function animateRotation(object, amount, duration, original) {
  // Animar rotación del objeto en el eje Y

  gsap.to(object.rotation, {
    x: object.rotation.x + amount[0],
    y: object.rotation.y + amount[1],
    z: object.rotation.z + amount[2],
    duration: duration,
    ease: 'power2.inOut',
    onComplete: () => {
      gsap.to(object.rotation, {
        x: original.x,
        y: original.y,
        z: original.z,
        duration: duration,
        ease: 'power2.inOut'
      });
    }
  });
}

function animatePosition(object, amount, duration, original) {
  gsap.to(object.position, {
    x: object.position.x + amount[0],
    y: object.position.y + amount[1],
    z: object.position.z + amount[2],
    duration: duration,
    ease: 'power2.inOut',
    onComplete: () => {
      gsap.to(object.rotation, {
        x: original.x,
        y: original.y,
        z: original.z,
        duration: duration,
        ease: 'power2.inOut'
      });
    }
  });
}

function filterTracksForBones(animationClip, boneNames) {
  // Crear un array para guardar las pistas filtradas
  const filteredTracks = [];

  // Recorrer todas las pistas de la animación (KeyframeTracks)
  animationClip.tracks.forEach(track => {
    // Chequear si el track está animando un hueso en la lista de huesos
    const trackName = track.name;
    // Verificar si alguno de los huesos está en el nombre del track
    // Por ejemplo, el nombre de un track puede ser algo como 'Hips.position' o 'Hips.quaternion'
    const isBoneTrack = boneNames.some(boneName => trackName.includes(boneName));

    if (isBoneTrack) {
      // Si el track pertenece a uno de los huesos que queremos, lo añadimos a la lista filtrada
      filteredTracks.push(track);
    }
  });

  // Crear un nuevo AnimationClip con las pistas filtradas
  return new THREE.AnimationClip(
    animationClip.name, // Mantener el nombre original del clip
    animationClip.duration, // Mantener la duración original del clip
    filteredTracks // Las pistas que hemos filtrado
  );
}

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

function getRandomInt(min, max) {
  min = Math.ceil(min);  // Redondea hacia arriba para incluir el mínimo
  max = Math.floor(max); // Redondea hacia abajo para excluir el máximo
  return Math.floor(Math.random() * (max - min)) + min;
}