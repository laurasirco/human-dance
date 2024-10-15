import './style.css'
import * as THREE from 'three';
import * as Tone from 'tone';
import { gsap } from 'gsap';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let character;
let mixer;

let char = {};

var hipsUpAction, hipsDownAction;
var leftKickAction, rightKickAction;
var armsAction, robotArmsRightAction, robotArmsLeftAction;
var torsoLeftAction, torsoRightAction;
var headNodInAction, headNodOutAction, headNodLeftAction, headNodRightAction;
var clapAction;
var initialPoseAction;
var torsoSide = 0;
var robotArmsSide = 0;
var kickSide = 0;
var headNod = false;
var headNodSide = 0;
var metronomeEnabled = false;

// TONE PART

var tr808 = new Tone.Players({
  35: 'audio/tr808/BD.WAV', //BASS DRUM
  37: 'audio/tr808/SD.WAV', //SNARE DRUM
  38: 'audio/tr808/LT.WAV', //TOM
  39: 'audio/tr808/CP.WAV', //CLAP
  41: 'audio/tr808/CH.WAV', //OPEN HI HAT
  42: 'audio/tr808/OH.WAV', //HI HAT
});

tr808.toDestination();

var reverb = new Tone.Reverb({
  decay: 0.2,
  preDelay: 0.0
}).toDestination();

// tr808.connect(reverb);

var metronome = new Tone.Synth();
metronome.oscillator.type = 'sine';
metronome.volume.value = -6;
metronome.toDestination();

const gain = new Tone.Gain(0.6);
gain.toDestination();

const notes = [35, 37, 38, 39, 41, 42];

var bass = new Tone.Synth({
});
bass.oscillator.type = "triangle";
bass.connect(reverb);
bass.toDestination();

let bassNotes = ['C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2'];
let bassNoteIndex = 0;

var chords = new Tone.PolySynth({
}).toDestination();
// chords.connect(reverb);

chords.set({
	"envelope" : {
		"attack"  : 0.005 ,
    "decay"  : 0.1 ,
    "sustain"  : 0.3 ,
    "release"  : 1
	}
});

chords.volume.value = -30;


let chordsNotes = [
  ['A3', 'C3', 'E4', 'B4'],
  ['F3', 'A3', 'C4', 'E4'],
  ['G3', 'B3', 'D4', 'A4']
];

// BUTTONS

const $rows = document.body.querySelectorAll('.seq-row');

let buttonStates = Array.from({ length: $rows.length }, () => Array(16).fill(false));

$rows.forEach(($row, i) => {
  const buttons = $row.querySelectorAll('.seq-button');
  

  buttons.forEach((button, j) => {
    button.addEventListener('mousedown', () =>{
      buttonStates[i][j] = !buttonStates[i][j];
      button.classList.toggle('active');
    });
  });
});

const chordsButtons = document.body.querySelectorAll('.ui-chord-button');
chordsButtons.forEach((button, i) => {
  button.addEventListener('mousedown', async () => {
    const isToneStarted = await ensureToneStarted();
    
    if (isToneStarted) {
      // Si Tone está corriendo, entonces reproducir el acorde
      const currentBeat = Tone.Transport.position;
      const nextBeat = Tone.Transport.nextSubdivision('16n');
      chords.triggerAttackRelease(chordsNotes[i], '2n', nextBeat);
    } else {
    }
  });
});

//URL FROM

// Función para crear una URL con la secuencia en la query string
function createShareableLink(sequence, bpm) {
  // Convertir el array en una cadena JSON y codificarla
  const encodedSequence = encodeURIComponent(JSON.stringify(sequence));
  
  // Crear la URL actual con el parámetro `sequence`
  const baseUrl = window.location.origin + window.location.pathname;
  const shareableUrl = `${baseUrl}?sequence=${encodedSequence}&bpm=${bpm}`;
  
  return shareableUrl;
}

// Función para obtener la secuencia desde la query string
function getSequenceFromUrl() {
  const params = new URLSearchParams(window.location.search);
  
  if (params.has('sequence')) {
    const encodedSequence = params.get('sequence');
    try {
      // Decodificar y convertir de nuevo a array de booleanos
      const decodedSequence = JSON.parse(decodeURIComponent(encodedSequence));
      return decodedSequence;
    } catch (e) {
      console.error('Error al decodificar la secuencia:', e);
    }
  }
  return null;
}

// Evento para el botón "Compartir"
document.getElementById('share').addEventListener('click', () => {
  const shareableUrl = createShareableLink(buttonStates, Tone.Transport.bpm.value);
  console.log(shareableUrl);

    // Verificar si la API del portapapeles está disponible
    if (navigator.clipboard && navigator.clipboard.writeText) {
      // Si está disponible, copiar el enlace al portapapeles
      navigator.clipboard.writeText(shareableUrl).then(() => {
        alert("Shared link copied");
      }).catch(err => {
        console.error('Error al copiar el enlace:', err);
      });
    } else {
      // Si no está disponible, usar un campo de entrada como alternativa
      let tempInput = document.createElement('input');
      tempInput.value = shareableUrl;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      alert("Shared link copied");
    }

});

window.onload = function() {
  const sharedSequence = getSequenceFromUrl();
  if (sharedSequence) {
    // Aquí puedes cargar la secuencia en tu UI
    console.log("Secuencia cargada desde URL:");
    buttonStates = sharedSequence;

    $rows.forEach(($row, i) => {
      const buttons = $row.querySelectorAll('.seq-button');
    
      buttons.forEach((button, j) => {
        if(buttonStates[i][j]){
          button.classList.add('active');
        }
        else{
          button.classList.remove('active');
        }
      });
    });
  }
  const params = new URLSearchParams(window.location.search);

  if(params.has('bpm')){
    const bpm = params.get('bpm');

    Tone.Transport.bpm.value = bpm; // Cambiar el BPM del transporte global
    bpmValue.textContent = bpm; // Mostrar el valor del BPM actual
    bpmSlider.value = bpm;
  }
};

// TONE LOOP SETTING

let index = 0;

const loop = new Tone.Loop((time) => {

  let step = index % 16;

  $rows.forEach(($row, i) => {
    const buttons = $row.querySelectorAll('.seq-button');
  
    buttons.forEach((button, j) => {
      button.classList.remove('current');
    });
    buttons[step].classList.add('current');
  });

  clapAction.stop();
  initialPoseAction.play();

  if (step % 2 === 0) { 
    hipsDownAction.play(); 

    hipsUpAction.stop();
    hipsUpAction.reset();

    // animateRotation(char.spine00, [getRandomArbitrary(-0.2, 0.2), 0, getRandomArbitrary(-0.2, 0.2)], 1.0, {"x": 0, "y": 0, "z": 0});

  } else {
    hipsUpAction.play();

    hipsDownAction.stop();
    hipsDownAction.reset();
  }

  if(step % 2 == 0 && metronomeEnabled){
    metronome.triggerAttackRelease('A4', '16n', time);
  }

  for (let i = 0; i < buttonStates.length; i++) {
    // let $row = $rows[i];
    let note = notes[i];
    // let $input = $row.querySelector(`input:nth-child(${step + 1})`);

    let state = buttonStates[i][step];
    
    if(state){

      if(i <= 5){
        tr808.player(note).start(time);
      }
      else{
        if(i == 6){
          bass.triggerAttackRelease(bassNotes[bassNoteIndex], '16n', time);
        }
      }

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

          headNodLeftAction.stop();
          headNodRightAction.stop();

          headNodInAction.play();

          headNodOutAction.stop();
          headNodOutAction.reset();

          headNod = true;
        }
        else {

          headNodLeftAction.stop();
          headNodRightAction.stop();

          headNodOutAction.play();

          headNodInAction.stop();
          headNodInAction.reset();

          headNod = false;
        }
      }

      if (i == 3) {
        armsAction.stop();
        initialPoseAction.stop();
        robotArmsLeftAction.stop();
        robotArmsRightAction.stop();

        clapAction.stop();
        clapAction.play();
      }

      if(i == 4){
        if (robotArmsSide == 0) {

          robotArmsLeftAction.play();

          robotArmsRightAction.stop();
          robotArmsRightAction.reset();

          robotArmsSide = 1;
        }
        else {

          robotArmsRightAction.play();

          robotArmsLeftAction.stop();
          robotArmsLeftAction.reset();

          robotArmsSide = 0;
        }
      }

      if(i == 5){
        if (headNodSide == 0) {

          headNodInAction.stop();
          headNodOutAction.stop();

          headNodLeftAction.play();

          headNodRightAction.stop();
          headNodRightAction.reset();

          headNodSide = 1;
        }
        else {

          headNodInAction.stop();
          headNodOutAction.stop();

          headNodRightAction.play();

          headNodLeftAction.stop();
          headNodLeftAction.reset();

          headNodSide = 0;
        }
      }

      if(i == 6){
        if (kickSide == 0) {

          // hipsUpAction.stop();
          // hipsDownAction.stop();

          leftKickAction.play();

          rightKickAction.stop();
          rightKickAction.reset();

          kickSide = 1;
        }
        else {

          // hipsUpAction.stop();
          // hipsDownAction.stop();

          rightKickAction.play();

          leftKickAction.stop();
          leftKickAction.reset();

          kickSide = 0;
        }
      }
    }
  }
  index++;

}, "8n");

// Iniciar el loop

let bpmValue = document.getElementById('bpm-value');

Tone.Transport.bpm.value = 120;
Tone.Transport.start();
loop.start(0);  // Empieza en el tiempo 0

// BOTONES DEL LOOP

document.getElementById('stop').addEventListener('mousedown', () => {
  loop.stop();
});

// Escuchar el clic en el botón para iniciar el audio
document.getElementById('play').addEventListener('mousedown', async () => {
  await Tone.start();

  loop.start();
  bpmValue.textContent = Math.round(Tone.Transport.bpm.value);
});

document.getElementById('reset').addEventListener('mousedown', () =>{
  $rows.forEach(($row, i) => {
    const buttons = $row.querySelectorAll('.seq-button');
  
    buttons.forEach((button, j) => {
      buttonStates[i][j] = false;
      button.classList.remove('active');
    });

    hipsDownAction.stop();
    hipsUpAction.stop();
    headNodInAction.stop();
    headNodOutAction.stop();
    armsAction.stop();
    leftKickAction.stop();
    rightKickAction.stop();
    headNodLeftAction.stop();
    headNodRightAction.stop();
    torsoLeftAction.stop();
    torsoRightAction.stop();
    robotArmsLeftAction.stop();
    robotArmsRightAction.stop();
    clapAction.stop();

  });
});

document.getElementById('bpm-minus').addEventListener('mousedown', () => {
  Tone.Transport.bpm.value -= 5;
  if(Tone.Transport.bpm.value <= 60)
    Tone.Transport.bpm.value = 60;
  bpmValue.textContent = Math.round(Tone.Transport.bpm.value);
  
});

document.getElementById('bpm-plus').addEventListener('mousedown', () => {
  Tone.Transport.bpm.value += 5;
  if(Tone.Transport.bpm.value >= 200)
    Tone.Transport.bpm.value = 200;
  bpmValue.textContent = Math.round(Tone.Transport.bpm.value);
});

document.getElementById('bassdrum-sound').addEventListener('mousedown', async () => {

  toggleNoteOnNextStep(0);

});

document.getElementById('snare-sound').addEventListener('mousedown', async () => {
  toggleNoteOnNextStep(1);
});

document.getElementById('tom-sound').addEventListener('mousedown', async () => {
  toggleNoteOnNextStep(2);

});

document.getElementById('clap-sound').addEventListener('mousedown', async () => {
  toggleNoteOnNextStep(3);

});

document.getElementById('chihat-sound').addEventListener('mousedown', async () => {
  toggleNoteOnNextStep(4);

});

document.getElementById('ohihat-sound').addEventListener('mousedown', async () => {
  toggleNoteOnNextStep(5);
});

document.getElementById('bass-up').addEventListener('mousedown', () => {
  bassNoteIndex++;
  if(bassNoteIndex > bassNotes.length)
    bassNoteIndex = 0;
});

document.getElementById('bass-down').addEventListener('mousedown', () => {
  bassNoteIndex--;
  if(bassNoteIndex < 0)
    bassNoteIndex = bassNotes.length - 1;
});

document.getElementById('bass-sound').addEventListener('mousedown', () =>{
  toggleNoteOnNextStep(6);
});

// document.getElementById('metronome-button').addEventListener('mousedown', () => {
//   metronomeEnabled = !metronomeEnabled;
// });

// const bpmSlider = document.getElementById('bpm-slider');
// const bpmValue = document.getElementById('bpm-value');

// bpmSlider.addEventListener('input', (event) => {
//   const bpm = event.target.value;
//   Tone.Transport.bpm.value = bpm; // Cambiar el BPM del transporte global
//   bpmValue.textContent = bpm; // Mostrar el valor del BPM actual
// });

var metronomeDiv = document.getElementById("ui-metronome");
var volumeSlider = document.getElementById("ui-volume-slider");

metronomeDiv.addEventListener('mousemove', function(e){
  if(e.buttons == 1){
    const rect = metronomeDiv.getBoundingClientRect();
    const yOffset = rect.bottom - e.clientY;

    // Restringir el tamaño del div interno entre 50px y 150px
    let newHeight = Math.min(150, Math.max(50, yOffset));
    volumeSlider.style.height = newHeight + 'px';

    let volume = -40 + ((newHeight - 50) / 100) * 40;

    if(newHeight == 50){
      metronomeEnabled = false;
    }
    else{
      metronomeEnabled = true;
    }

    metronome.volume.value = volume;
  }
})

//THREE JS PART

const canvas = document.getElementById("threejs-container");

const loader = new GLTFLoader();
const scene = new THREE.Scene();
const containerWidth = canvas.offsetWidth;
const containerHeight = canvas.offsetHeight;

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
renderer.setSize(containerWidth, containerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// renderer.setClearColor(0x000000, 0); 

// container.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(40, canvas.offsetWidth / canvas.offsetHeight, 0.1, 1000);

// Handle window resizing
window.addEventListener('resize', () => {
  const newWidth = window.innerWidth - 400; // Restamos el ancho fijo de #ui
  const newHeight = window.innerHeight;
  renderer.setSize(newWidth, newHeight);
  camera.aspect = newWidth / newHeight;
  camera.updateProjectionMatrix();
});

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
directionalLight.shadow.camera.near = 0.5;    // Distancia mínima de la sombra
directionalLight.shadow.camera.far = 50;     // Distancia máxima de la sombra
directionalLight.shadow.camera.left = -10;
directionalLight.shadow.camera.right = 10;

// Crear un plano para que sea el shadow catcher
const planeGeometry = new THREE.PlaneGeometry(10, 10);
const planeMaterial = new THREE.ShadowMaterial();
planeMaterial.opacity = 0.2;
const plane = new THREE.Mesh(planeGeometry, planeMaterial);

// Colocarlo en la escena y rotarlo para que quede horizontal
plane.rotation.x = -Math.PI / 2;
plane.receiveShadow = true;

// Añadir el plano a la escena
// scene.add(plane);

// const directionalLight2 = new THREE.DirectionalLight('blue', 2);
// directionalLight2.position.set(-5, -10, 7.5);
// scene.add(directionalLight2);

loader.load('models/scene_v01.glb', function(gltf){
  scene.add(gltf.scene);
  gltf.scene.receiveShadow = true;

  gltf.scene.traverse(function (object) {

    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
});

loader.load('models/human_model_v01.glb', function (gltf) {
  scene.add(gltf.scene);

  character = gltf.scene;
  character.castShadow = true;

  const skinnedMesh = character.getObjectByProperty('type', 'SkinnedMesh');
  const ske = skinnedMesh.skeleton;
  char.skinnedMesh = skinnedMesh;
  char.skeleton = ske;

  // console.log(ske);

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

    // console.log(animations);

    const hipsUpAnimation = THREE.AnimationClip.findByName(animations, 'HipsUp');
    const hipsDownAnimation = THREE.AnimationClip.findByName(animations, 'HipsDown');
    const buttRightAnimation = THREE.AnimationClip.findByName(animations, 'ButtRight');
    const buttleftAnimation = THREE.AnimationClip.findByName(animations, 'ButtLeft');
    const armsAnimation = THREE.AnimationClip.findByName(animations, 'Arms');
    const torsoRightAnimation = THREE.AnimationClip.findByName(animations, 'TorsoRight');
    const torsoLeftAnimation = THREE.AnimationClip.findByName(animations, 'TorsoLeft');
    const clapAnimation = THREE.AnimationClip.findByName(animations, 'Clap');
    const headNodInAnimation = THREE.AnimationClip.findByName(animations, 'HeadNodIn');
    const headNodOutAnimation = THREE.AnimationClip.findByName(animations, 'HeadNodOut');
    const headNodLeftAnimation = THREE.AnimationClip.findByName(animations, 'HeadLeft');
    const headNodRightAnimation = THREE.AnimationClip.findByName(animations, 'HeadRight');
    const initialPoseAnimation = THREE.AnimationClip.findByName(animations, 'InitialPose');
    const robotArmsLeft = THREE.AnimationClip.findByName(animations, 'RobotArmsLeft');
    const robotArmsRight = THREE.AnimationClip.findByName(animations, 'RobotArmsRight');
    const leftKick = THREE.AnimationClip.findByName(animations, 'KickLeft');
    const rightKick = THREE.AnimationClip.findByName(animations, 'KickRight');

    const fLeftKick = filterTracksForBones(leftKick, ['mixamorigUpLegL', 'mixamorigLegL', 'mixamorigFootL', 'mixamorigUpLegR', 'mixamorigLegR', 'mixamorigFootR']);
    leftKickAction = mixer.clipAction(fLeftKick);
    leftKickAction.setLoop(THREE.LoopOnce, 1);
    leftKickAction.clampWhenFinished = true;

    const fRightKick = filterTracksForBones(rightKick, ['mixamorigUpLegL', 'mixamorigLegL', 'mixamorigFootL', 'mixamorigUpLegR', 'mixamorigLegR', 'mixamorigFootR']);
    rightKickAction = mixer.clipAction(fRightKick);
    rightKickAction.setLoop(THREE.LoopOnce, 1);
    rightKickAction.clampWhenFinished = true;

    const fRobotArmsLeft = filterTracksForBones(robotArmsLeft, ['mixamorigShoulderL', 'mixamorigShoulderR', 'mixamorigArmL', 'mixamorigArmR', 'mixamorigForeArmL', 'mixamorigForeArmR', 'mixamorigHandL', 'mixamorigHandR']);
    robotArmsLeftAction = mixer.clipAction(fRobotArmsLeft);
    robotArmsLeftAction.setLoop(THREE.LoopOnce, 1);
    robotArmsLeftAction.clampWhenFinished = true;

    const fRobotArmsRight = filterTracksForBones(robotArmsRight, ['mixamorigShoulderL', 'mixamorigShoulderR', 'mixamorigArmL', 'mixamorigArmR', 'mixamorigForeArmL', 'mixamorigForeArmR', 'mixamorigHandL', 'mixamorigHandR']);
    robotArmsRightAction = mixer.clipAction(fRobotArmsRight);
    robotArmsRightAction.setLoop(THREE.LoopOnce, 1);
    robotArmsRightAction.clampWhenFinished = true;

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

    const fHeadNodLeftAnimation = filterTracksForBones(headNodLeftAnimation, ['mixamorigNeck', 'mixamorigHead']);
    headNodLeftAction = mixer.clipAction(fHeadNodLeftAnimation);
    headNodLeftAction.setLoop(THREE.LoopOnce, 1);
    headNodLeftAction.clampWhenFinished = true;

    const fHeadNodRightAnimation = filterTracksForBones(headNodRightAnimation, ['mixamorigNeck', 'mixamorigHead']);
    headNodRightAction = mixer.clipAction(fHeadNodRightAnimation);
    headNodRightAction.setLoop(THREE.LoopOnce, 1);
    headNodRightAction.clampWhenFinished = true;

    initialPoseAction = mixer.clipAction(initialPoseAnimation);
    initialPoseAction.paused = true;
    initialPoseAction.play();

  }


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

camera.position.z = 10;
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

async function ensureToneStarted() {
  const state = Tone.context.state;  // Obtener el estado del contexto de audio
  if (state === 'suspended') {
    // Si el contexto está suspendido, iniciar Tone
    await Tone.start();
    console.log('Tone.js ha sido iniciado');
  }
  return Tone.context.state === 'running';  // Verificar si Tone está corriendo
}

async function toggleNoteOnNextStep(row) {

  const isToneStarted = await ensureToneStarted();

  if (isToneStarted) {

    let s = index % 16;

    s -= 1;
    if(s < 0) s = 0;

    const $rows = document.body.querySelectorAll('.seq-row');

    buttonStates[row][s] = !buttonStates[row][s];
    const buttons = $rows[row].querySelectorAll('.seq-button');

    let button = buttons[s];
    button.classList.toggle('active');

    if(row <= 5){
      let note = notes[row];
      tr808.player(note).start();
    }
    else{
      if(row == 6){
        bass.triggerAttackRelease(bassNotes[bassNoteIndex], '16n');
      }
    }
  }
}