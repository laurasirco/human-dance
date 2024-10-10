import './style.css'
import * as THREE from 'three';
import * as Tone from 'tone';
import { gsap } from 'gsap';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CCDIKSolver } from 'three/addons/animation/CCDIKSolver.js';

let character;
let ikSolver, ikHelper;
let mixer;

let char = {};
let initialChar = {};

var hipsUpAction, hipsDownAction;
var armsAction;

// TONE PART

var kick = new Tone.MembraneSynth({
  'envelope': {
    'sustain': 0,
    'attack': 0.01,
    'decay': 0.6,
    'release': 0.1
  },
  'pitchDecay': 0.05,
  'octaves': 4
});

var snare = new Tone.NoiseSynth({
  'volume': -5,   // Volumen más controlado para ajustarse a la mezcla
  'noise': {
    'type': 'white'  // Ruido blanco para emular el ruido del TR-909
  },
  'envelope': {
    'attack': 0.001,
    'decay': 0.2,
    'sustain': 0,
    'release': 0.02
  },
  'filter': {
    'Q': 1,
    'type': 'bandpass',  // Filtro bandpass para darle el carácter del TR-909
    'frequency': 1500     // Ajustar la frecuencia central del ruido
  },
  'filterEnvelope': {
    'attack': 0.001,
    'decay': 0.1,
    'sustain': 0,
    'release': 0.01,
    'baseFrequency': 2000,  // Frecuencia base del filtro
    'octaves': -1.5         // Desplazamiento del filtro en octavas
  }
});

var closedHat = new Tone.MetalSynth({
  frequency: 400,  // Frecuencia central
  envelope: {
    attack: 0.001,
    decay: 0.1,    // Decaimiento corto para un sonido de "ch"
    release: 0.01
  },
  harmonicity: 5.1, // Relación armónica para un sonido metálico
  modulationIndex: 32, // Ajusta la textura del sonido
  resonance: 8000,
  octaves: 1.5
});

var openHat = new Tone.MetalSynth({
  frequency: 400,
  envelope: {
    attack: 0.001,
    decay: 0.3,    // Decaimiento más largo que el closed hat
    release: 0.2
  },
  harmonicity: 5.1,
  modulationIndex: 32,
  resonance: 8000,
  octaves: 1.5
});

var lowTom = new Tone.MembraneSynth({
  pitchDecay: 0.05,
  octaves: 2,  // Afinado bajo para el tom grave
  envelope: {
    attack: 0.01,
    decay: 0.5,
    sustain: 0,
    release: 0.1
  }
});

const synths = [
  kick,
  snare,
  closedHat,
  openHat,
  lowTom
];

var synth = new Tone.Synth();
synth.oscillator.type = 'sawtooth';
synth.toDestination();

// synths[0].oscillator.type = 'triangle';
// synths[1].oscillator.type = 'sine';
// synths[2].oscillator.type = 'sawtooth';

const gain = new Tone.Gain(0.6);
gain.toDestination();

synths.forEach(synth => synth.toDestination());

const $rows = document.body.querySelectorAll('div > div');
console.log($rows);

const notes = ['C2', 'E4', 'C2', 'C2', 'G3'];
let index = 0;

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

function animatePosition(object, amount, duration, original){
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

// Crear un loop que repite cada '8n' (una octava nota)
const loop = new Tone.Loop((time) => {
  
  let step = index % 16;

  if (step % 2 === 0) {  // Cambiar el criterio de alternancia según sea necesario
    // Reproducir hipsDown
    hipsDownAction.stop();   // Detener la animación anterior
    hipsDownAction.reset();  // Reiniciar la animación
    hipsDownAction.play();   // Reproducir la animación

    hipsUpAction.stop();
    hipsUpAction.reset();
    synth.triggerAttackRelease('C2', '16n', time);
} else {
    // // Reproducir hipsUp
    hipsUpAction.stop();     // Detener la animación anterior
    hipsUpAction.reset();    // Reiniciar la animación
    hipsUpAction.play();     // Reproducir la animación

    // // // Detener hipsDown
    hipsDownAction.stop();
    hipsDownAction.reset();
    synth.triggerAttackRelease('D2', '16n', time);
}

  for (let i = 0; i < $rows.length; i++) {
    let synth = synths[i];
    let $row = $rows[i];
    let note = notes[i];
    let $input = $row.querySelector(`input:nth-child(${step + 1})`);

    if ($input.checked) {
      if (i == 1) {
        snare.triggerAttack(time);
      }
      else {
        synth.triggerAttackRelease(note, '16n', time);
      }

      if (i == 0 && char.leftShoulder && char.rightShoulder) {
        armsAction.stop();
        armsAction.play();
      }

      if (i == 1 && char.spine00) {
        animateRotation(char.spine00, [0.5, 0.0, 0.0], 0.1, initialChar.spine00);
      }

      if (i == 2 && char.leftUpLeg && char.rightUpLeg) {
        animateRotation(char.leftUpLeg, [0.0, 0.0, 0.6], 0.15, initialChar.leftUpLeg);
        animateRotation(char.rightUpLeg, [0.0, 0.0, -0.6], 0.15, initialChar.rightUpLeg);
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
document.getElementById('startButton').addEventListener('click', async () => {
  await Tone.start();

  console.log('Audio started');

  document.getElementById('startButton').style.display = 'none';

});

//THREE JS PART

const loader = new GLTFLoader();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Añadir luces a la escena
const ambientLight = new THREE.AmbientLight('white', 1);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

loader.load('src/Englishman_simplerig_v06.glb', function (gltf) {
  scene.add(gltf.scene);
  
  character = gltf.scene;

  const skinnedMesh = character.getObjectByProperty('type', 'SkinnedMesh');
  const ske = skinnedMesh.skeleton;
  char.skinnedMesh = skinnedMesh;
  char.skeleton = ske;

  character.traverse(function (object) {
    // if (object.isBone) {
    //     console.log(object.name);  // Esto imprime los nombres de los huesos, útil para saber cuál es cuál
    // }

    if (object.name == "mixamorigHips") {
      char.hips = object;
      initialChar.hips = { 
                          "rotation": {"x": object.rotation.x, "y": object.rotation.y, "z": object.rotation.z},
                          "position": {"x": object.position.x, "y": object.position.y, "z": object.position.z},  
                         };

    }
    if (object.name == "mixamorigSpine") {
      char.spine00 = object;
      initialChar.spine00 = { "x": object.rotation.x, "y": object.rotation.y, "z": object.rotation.z };
    }
    if (object.name == "mixamorigSpine1") {
      char.spine01 = object;
      initialChar.spine01 = { "x": object.rotation.x, "y": object.rotation.y, "z": object.rotation.z };
    }
    if (object.name == "mixamorigSpine2") {
      char.spine02 = object;
      initialChar.spine02 = { "x": object.rotation.x, "y": object.rotation.y, "z": object.rotation.z };
    }
    if (object.name == "mixamorigNeck") {
      char.neck = object;
      initialChar.neck = { "x": object.rotation.x, "y": object.rotation.y, "z": object.rotation.z };
    }
    if (object.name == "mixamorigShoulderL") {
      char.leftShoulder = object;
      initialChar.leftShoulder = { "x": object.rotation.x, "y": object.rotation.y, "z": object.rotation.z };
    }
    if (object.name == "mixamorigShoulderR") {
      char.rightShoulder = object;
      initialChar.rightShoulder = { "x": object.rotation.x, "y": object.rotation.y, "z": object.rotation.z };
    }
    if (object.name == "mixamorigArmL") {
      char.leftArm = object;
      initialChar.leftArm = { "x": object.rotation.x, "y": object.rotation.y, "z": object.rotation.z };
    }
    if (object.name == "mixamorigArmR") {
      char.rightArm = object;
      initialChar.rightArm = { "x": object.rotation.x, "y": object.rotation.y, "z": object.rotation.z };
    }
    if (object.name == "mixamorigForeArmL") {
      char.leftForearm = object;
      initialChar.leftForearm = { "x": object.rotation.x, "y": object.rotation.y, "z": object.rotation.z };
    }
    if (object.name == "mixamorigForeArmR") {
      char.rightForearm = object;
      initialChar.rightForearm = { "x": object.rotation.x, "y": object.rotation.y, "z": object.rotation.z };

    }
    if (object.name == "mixamorigHandL") {
      char.leftHand = object;
      initialChar.leftHand = { "x": object.rotation.x, "y": object.rotation.y, "z": object.rotation.z };

    }
    if (object.name == "mixamorigHandR") {
      char.rightHand = object;
      initialChar.rightHand = { "x": object.rotation.x, "y": object.rotation.y, "z": object.rotation.z };

    }
    if (object.name == "mixamorigUpLegL") {
      char.leftUpLeg = object;
      initialChar.leftUpLeg = { "x": object.rotation.x, "y": object.rotation.y, "z": object.rotation.z };

    }
    if (object.name == "mixamorigLegL") {
      char.leftLeg = object;
      initialChar.leftLef = { "x": object.rotation.x, "y": object.rotation.y, "z": object.rotation.z };

    }
    if (object.name == "mixamorigFootL") {
      char.leftFoot = object;
      initialChar.leftFoot = { "x": object.rotation.x, "y": object.rotation.y, "z": object.rotation.z };

    }
    if (object.name == "mixamorigIKLeftLeg") {
      char.leftIKLeg = object;
      initialChar.leftIKLeg = { "x": object.rotation.x, "y": object.rotation.y, "z": object.rotation.z };

    }
    if (object.name == "mixamorigUpLegR") {
      char.rightUpLeg = object;
      initialChar.rightUpLeg = { "x": object.rotation.x, "y": object.rotation.y, "z": object.rotation.z };

    }
    if (object.name == "mixamorigLegR") {
      char.rightLeg = object;
      initialChar.rightLeg = { "x": object.rotation.x, "y": object.rotation.y, "z": object.rotation.z };

    }
    if (object.name == "mixamorigFootR") {
      char.rightFoot = object;
      initialChar.rightFoot = { "x": object.rotation.x, "y": object.rotation.y, "z": object.rotation.z };

    }
    if (object.name == "mixamorigIKRightLeg") {
      char.rightIKLeg = object;
      initialChar.rightIKLeg = { "x": object.rotation.x, "y": object.rotation.y, "z": object.rotation.z };

    }
  });

  const animations = gltf.animations;

  if(animations && animations.length){
  
    mixer = new THREE.AnimationMixer(character);

    const hipsUpAnimation = THREE.AnimationClip.findByName(animations, 'HipsUp');
    const hipsDownAnimation = THREE.AnimationClip.findByName(animations, 'HipsDown');
    const armsAnimation = THREE.AnimationClip.findByName(animations, 'Arms');

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
    
  }

  console.log(char);

  const skeletonHelper = new THREE.SkeletonHelper(character);
  scene.add(skeletonHelper);


  let startTime = Date.now();
  const clock = new THREE.Clock();

  const targetFPS = 24;
  const frameDuration = 1000 / targetFPS;  // Duración de un frame en milisegundos

  let lastFrameTime = 0;

  function animate(time) {
    const deltaTime = time - lastFrameTime;

    if (deltaTime >= frameDuration) {
        lastFrameTime = time - (deltaTime % frameDuration);  // Resetear el tiempo de inicio del frame

        // Actualizar la escena, animaciones y renderizar
        const delta = clock.getDelta();
        mixer.update(delta);  // Actualiza las animaciones
        renderer.render(scene, camera);
    }

    requestAnimationFrame(animate);
  }

  animate();
});

camera.position.z = 5;
camera.position.y = 2;
