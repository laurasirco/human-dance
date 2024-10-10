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

var hipsUpAction, hipsDownAction;
var armsAction;

// TONE PART

var tr808 = new Tone.Players({
  35: 'src/tr808/BD.WAV',
  37: 'src/tr808/RS.WAV',
  38: 'src/tr808/SD.WAV',
  39: 'src/tr808/CP.WAV',
  41: 'src/tr808/LT.WAV',
  42: 'src/tr808/CH.WAV',
  45: 'src/tr808/MT.WAV',
  46: 'src/tr808/OH.WAV',
  48: 'src/tr808/HT.WAV',
  49: 'src/tr808/CY.WAV'
});

tr808.toDestination();

var reverb = new Tone.Reverb({
  decay: 2,
  preDelay: 0.01
}).toDestination();

tr808.connect(reverb);

var metronome = new Tone.Synth();
metronome.oscillator.type = 'sine';
metronome.volume.value = -6;
metronome.toDestination();

const gain = new Tone.Gain(0.6);
gain.toDestination();

const $rows = document.body.querySelectorAll('div > div');
console.log($rows);

const notes = [35, 37, 38, 39, 41];
let index = 0;

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
} else {
    // // Reproducir hipsUp
    hipsUpAction.stop();     // Detener la animación anterior
    hipsUpAction.reset();    // Reiniciar la animación
    hipsUpAction.play();     // Reproducir la animación

    // // // Detener hipsDown
    hipsDownAction.stop();
    hipsDownAction.reset();
}

  if(step % 4 == 0){
    metronome.triggerAttackRelease('A4', '16n', time);
  }

  for (let i = 0; i < $rows.length; i++) {
    let $row = $rows[i];
    let note = notes[i];
    let $input = $row.querySelector(`input:nth-child(${step + 1})`);

    if ($input.checked) {

      tr808.player(note).start(time);

      // if (i == 1) {
      //   snare.triggerAttack(time);
      // }
      // else {
      //   synth.triggerAttackRelease(note, '16n', time);
      // }

      if (i == 0 && char.leftShoulder && char.rightShoulder) {
        armsAction.stop();
        armsAction.play();
      }

      // if (i == 1 && char.spine00) {
      //   animateRotation(char.spine00, [0.5, 0.0, 0.0], 0.1, initialChar.spine00);
      // }

      // if (i == 2 && char.leftUpLeg && char.rightUpLeg) {
      //   animateRotation(char.leftUpLeg, [0.0, 0.0, 0.6], 0.15, initialChar.leftUpLeg);
      //   animateRotation(char.rightUpLeg, [0.0, 0.0, -0.6], 0.15, initialChar.rightUpLeg);
      // }
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

        character.rotation.y += Math.sin(delta);

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