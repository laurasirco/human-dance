import './style.css'
import * as THREE from 'three';
import * as Tone from 'tone';
import { gsap } from 'gsap';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPixelatedPass } from 'three/addons/postprocessing/RenderPixelatedPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createNoise2D } from 'simplex-noise';
const { degToRad } = THREE.MathUtils;
import LZString from 'lz-string';


// TITLE

let projectTitle;

function generateRandomTitle() {
  return Math.floor(10000 + Math.random() * 90000); // Genera un número entre 10000 y 99999
}

function updateTitleField() {
  const titleElement = document.getElementById('title-text');
  if (titleElement) {
    titleElement.textContent = `#${projectTitle}`; // Actualiza el texto con el número generado
  }
}

function checkIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function alertSilentMode() {
  if (checkIOS()) {
    alert("Please turn off silent mode to hear audio.\nPor favor, desactiva el modo silencio para escuchar el audio.");
  }
}

document.addEventListener('touchstart', function(event) {
  if (event.touches.length > 1) {
    // Evita el zoom con pellizco
    event.preventDefault();
  }
}, { passive: false });

document.addEventListener('gesturestart', function(event) {
  // Evita el zoom con gesto
  event.preventDefault();
});

// Llama a esta función cuando el usuario inicie la reproducción de audio.

const thresholdWidth = 768;
const noise2D = createNoise2D();

let character;
let mixer;

let char = {};

var hipsUpAction, hipsDownAction;
var leftKickAction, rightKickAction, leftBackKickAction, rightBackKickAction;
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
var metronomeEnabled = true;

var dispensador, silla, planta, reloj, corcho;
var iPDisp, iRDisp, iPSilla, iRSilla, iPPlanta, iRPlanta, iPReloj, iRReloj, iPCorcho, iRCorcho;

var cameraZoomed = true;
var cameraRotatedSide = -1;
let lookAt;

let startTime = Date.now();
const clock = new THREE.Clock();

const targetFPS = 15;
const frameDuration = 1000 / targetFPS;  // Duración de un frame en milisegundos

let lastFrameTime = 0;

let cameraXRadius = 0.1;
let cameraYRadius = 0.01;
let cameraSpeed = 0.5;

const ambientLight = new THREE.AmbientLight('azure', 1.0);
let ambientColors = ['greenyellow', 'blue', 'gold', 'pink'];

var started = false;

// TONE PART
const chordsInC = {
  'I': ['C3', 'E3', 'G3', 'B3'],       // Cmaj7
  'ii': ['D3', 'F3', 'A3', 'C4'],      // Dm7
  'iii': ['E3', 'G3', 'B3', 'D4'],     // Em7
  'IV': ['F3', 'A3', 'C4', 'E4'],      // Fmaj7
  'V': ['G3', 'B3', 'D4', 'F4'],       // G7
  'vi': ['A3', 'C4', 'E4', 'G4'],      // Am7
  'vii°': ['B3', 'D4', 'F4', 'A4'],    // Bdim7
  'i': ['C3', 'Eb3', 'G3', 'Bb3'],     // Cm7
  'iv': ['F3', 'Ab3', 'C4', 'Eb4'],    // Fm7
  'VII': ['Bb2', 'D3', 'F3', 'Ab3'],   // Bb7
};

// Progresiones conocidas ajustadas a 4 acordes
const knownProgressions = [
  ['I', 'IV', 'V', 'I'],        // Clásica mayor
  ['vi', 'IV', 'I', 'V'],       // Pop
  ['ii', 'V', 'I', 'ii'],       // Jazz extendido
  ['I', 'V', 'vi', 'IV'],       // Muy popular
  ['i', 'VII', 'vi', 'V'],      // Menor
  ['i', 'iv', 'VII', 'iii'],    // Menor con cadencia modal
  ['I', 'vi', 'ii', 'V'],       // Extensión mayor
];

function validateProgressions() {
  const invalidProgressions = knownProgressions.filter(prog =>
    prog.some(degree => !chordsInC.hasOwnProperty(degree))
  );

  if (invalidProgressions.length > 0) {
    console.error("Progresiones inválidas detectadas:", invalidProgressions);
    throw new Error("Hay progresiones inválidas. Revisa 'knownProgressions'.");
  }
}

// Validar las progresiones antes de iniciar
validateProgressions();

// Escoge una progresión aleatoria y genera los acordes
function generateChordProgression() {
  const progression = knownProgressions[Math.floor(Math.random() * knownProgressions.length)];
  return progression.map(degree => chordsInC[degree]);
}

function getUniqueBassNoteFromChord(chord, usedBassNotes) {
  // Transformamos las notas a la octava deseada
  let availableNotes = chord.map(note => note.replace('3', '2').replace('4', '3'));
  // Filtramos las notas que no se han usado
  let unusedNotes = availableNotes.filter(note => !usedBassNotes.includes(note));
  // Si hay notas disponibles, elegimos una al azar; si no, elegimos de todas
  let bassNote = unusedNotes.length > 0 
    ? unusedNotes[Math.floor(Math.random() * unusedNotes.length)]
    : availableNotes[Math.floor(Math.random() * availableNotes.length)];

  usedBassNotes.push(bassNote);
  return bassNote;
}

// Escoge una nota única para la voz desde el acorde de forma aleatoria
function getUniqueVoiceNoteFromChord(chord, usedVoiceNotes) {
  // Transformamos las notas a la octava deseada
  let availableNotes = chord.map(note => note.replace('3', '4').replace('4', '5'));
  // Filtramos las notas que no se han usado
  let unusedNotes = availableNotes.filter(note => !usedVoiceNotes.includes(note));
  // Si hay notas disponibles, elegimos una al azar; si no, elegimos de todas
  let voiceNote = unusedNotes.length > 0 
    ? unusedNotes[Math.floor(Math.random() * unusedNotes.length)]
    : availableNotes[Math.floor(Math.random() * availableNotes.length)];

  usedVoiceNotes.push(voiceNote);
  return voiceNote;
}

// Convierte una nota a su valor MIDI
function noteToMidi(note) {
  const noteMap = {
    'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6,
    'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11,
  };
  const pitch = note.slice(0, -1);
  const octave = parseInt(note.slice(-1));
  return 12 * (octave + 1) + noteMap[pitch];
}

// Ordena las notas por su tono
function sortNotesByPitch(notes) {
  return notes.slice().sort((a, b) => noteToMidi(a) - noteToMidi(b));
}

// Generación inicial
let chordsNotes = generateChordProgression(); // Genera una progresión basada en patrones conocidos
let usedBassNotes = [];
let usedVoiceNotes = [];

let bassNotes = chordsNotes.map(chord => getUniqueBassNoteFromChord(chord, usedBassNotes));
let voiceNotes = chordsNotes.map(chord => getUniqueVoiceNoteFromChord(chord, usedVoiceNotes));

bassNotes = sortNotesByPitch(bassNotes);
voiceNotes = sortNotesByPitch(voiceNotes);

// Regenerar armonías
function regenerateHarmonies() {
  // chordsNotes = generateChordProgression(); // Genera una nueva progresión a partir de patrones conocidos
  
  usedBassNotes = [];
  usedVoiceNotes = [];

  bassNotes = chordsNotes.map(chord => getUniqueBassNoteFromChord(chord, usedBassNotes));
  voiceNotes = chordsNotes.map(chord => getUniqueVoiceNoteFromChord(chord, usedVoiceNotes));

  bassNotes = sortNotesByPitch(bassNotes);
  voiceNotes = sortNotesByPitch(voiceNotes);

  // console.log("Acordes aleatorios:", chordsNotes);
  // console.log("Notas del bajo:", bassNotes);
  // console.log("Notas de la voz:", voiceNotes);
}

// console.log("Progresión de acordes:", chordsNotes);
// console.log("Notas del bajo:", bassNotes);
// console.log("Notas de la voz:", voiceNotes);


let index = 0;
let sequenceSteps = 16;

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

// Añadir chorus para el efecto estéreo típico de house
const chorus = new Tone.Chorus({
  frequency: 4, // Frecuencia del chorus, en house suele estar entre 1-5 Hz
  delayTime: 2.5,
  depth: 1.0
}).toDestination();

// Añadir delay (eco) para un efecto house
const delay = new Tone.FeedbackDelay({
  delayTime: "4n",  // Eco con subdivisión de negra, ajusta según tu tempo
  feedback: 0.6,    // Cantidad de repetición
  wet: 0.3          // Cantidad del efecto en el sonido total
}).toDestination();

const lowpassFilter = new Tone.Filter({
  frequency: 100, // Frecuencia de corte en 800 Hz (ajústala para más o menos brillo)
  type: "lowpass",
  Q: 0 // La resonancia, ajusta para controlar el énfasis cerca de la frecuencia de corte
}).toDestination();

const autoWah = new Tone.AutoWah(50, 6, -30).toDestination();
// const crusher = new Tone.BitCrusher(4).toDestination();

// tr808.connect(reverb);

var metronome = new Tone.MembraneSynth({
  pitchDecay: 0.01,     // Breve caída en tono
  octaves: 2,           // Amplia gama de octavas
  oscillator: {
    type: "sine"        // Onda sinusoidal para un sonido limpio
  },
  envelope: {
    attack: 0.001,      // Ataque rápido para un click agudo
    decay: 0.1,         // Decaimiento más largo para un sonido resonante
    sustain: 0,
    release: 0.01       // Liberación rápida para evitar eco
  }
});
metronome.volume.value = -16; // Ajusta el volumen
metronome.toDestination();

const gain = new Tone.Gain(0.6);
gain.toDestination();

const notes = [35, 37, 38, 39, 41, 42];

var bass = new Tone.Synth({
  oscillator: {
    type: "triangle" 
  },
  envelope: {
    attack: 0.02, // Ataque suave
    decay: 0.2,
    sustain: 0.3,
    release: 1.2
  }
});
// bass.connect(crusher);
bass.connect(reverb);
bass.toDestination();
bass.volume.value = 4;

let bassNoteIndex = 0;

var voice = new Tone.Synth({
  oscillator: {
    type: "triangle" 
  },
  envelope: {
    attack: 0.02, // Ataque suave
    decay: 0.2,
    sustain: 0.6,
    release: 1.2
  }
});
// voice.connect(crusher);
voice.connect(delay);
voice.connect(reverb);
voice.volume.value = -10;

voice.toDestination();

let voiceNoteIndex = 0;

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

chords.volume.value = -10;
chords.connect(autoWah);
chords.connect(reverb);

// BUTTONS

const track = document.querySelector('.carousel-track');
const slides = Array.from(track.children);
slides.pop();
let slideWidth = 0;
let currentSlide = 0;
let startX = 0;
let currentTranslate = 0;
let prevTranslate = 0;
let isDragging = false;
const swipeThreshold = 50;

function calculateSlideWidth() {
  return track.getBoundingClientRect().width;
}

function updateSlideWidth() {
  slideWidth = calculateSlideWidth();
  const offset = -currentSlide * slideWidth;
  track.style.transition = 'none';  // Eliminar la transición para un ajuste instantáneo
  track.style.transform = `translateX(${offset}px)`;
}

const indicators = document.querySelectorAll('.indicator');

// Función para actualizar el indicador activo
function updateIndicators() {
  indicators.forEach((indicator, index) => {
    indicator.classList.toggle('active', index === currentSlide);
  });
}

function startSwipe(x){
  startX = x;
  track.style.transition = 'none';
}

function moveSwipe(x){
  const currentX = x;
  const deltaX = currentX - startX;

  // Solo actualizamos la posición si el desplazamiento supera el umbral
  if (Math.abs(deltaX) > swipeThreshold) {
    currentTranslate = prevTranslate + deltaX;
    track.style.transform = `translateX(${currentTranslate}px)`;
    isDragging = true;
  }
}

function endSwipe(){
  if(isDragging){
    track.style.transition = 'transform 0.3s ease';
    isDragging = false;
  
    const movedBy = currentTranslate - prevTranslate;
  
    // Solo cambiar de slide si el desplazamiento total supera el umbral
    if (Math.abs(movedBy) > swipeThreshold) {
      if (movedBy < -slideWidth / 4 && currentSlide < slides.length - 1) {
        currentSlide++;
      } else if (movedBy > slideWidth / 4 && currentSlide > 0) {
        currentSlide--;
      }
    }
  
    // Actualizar la posición del carrusel al slide actual
    prevTranslate = -currentSlide * slideWidth;
    track.style.transform = `translateX(${prevTranslate}px)`;
    isDragging = false;  
    updateIndicators();
  }
}

function goToSlide(index) {
  // Actualizar la posición de `track`
  const offset = -index * slideWidth;
  track.style.transition = 'transform 0.3s ease';
  track.style.transform = `translateX(${offset}px)`;

  // Actualizar el estado de los indicadores
  indicators[currentSlide].classList.remove('active');
  indicators[index].classList.add('active');

  currentSlide = index; // Actualizar el índice actual
}

track.addEventListener('touchstart', e => startSwipe(e.touches[0].clientX));
track.addEventListener('touchmove', e => moveSwipe(e.touches[0].clientX));
track.addEventListener('touchend', endSwipe);

indicators.forEach(indicator => {
  indicator.addEventListener('click', (e) => {
    const index = parseInt(e.target.getAttribute('data-index'), 10);
    goToSlide(index);
  });
});

function getColorFromClass(className) {
  // Crear un elemento temporal
  const tempElement = document.createElement('div');
  tempElement.classList.add(className);
  document.body.appendChild(tempElement);

  // Obtener el color de fondo del elemento con la clase
  const color = window.getComputedStyle(tempElement).backgroundColor;

  // Quitar el elemento temporal
  document.body.removeChild(tempElement);

  return color;
}

function createStaticBorder(container) {

  const className = container.getAttribute('data-index');
  const color = getColorFromClass(className);

  const width = container.clientWidth;
  const height = container.clientHeight;
  const borderRadius = 31; // Ajusta este valor para cambiar el redondeado
  const borderWidth = 6; // Grosor del borde

  // Crear el SVG con dimensiones iguales al contenedor
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  svg.style.position = "absolute";
  svg.style.top = "0";
  svg.style.left = "0";
  svg.style.opacity = 0.9;

  // Crear el rectángulo con dimensiones ajustadas para borde interno
  const rect = document.createElementNS(svgNS, "rect");
  rect.setAttribute("x", borderWidth / 2);
  rect.setAttribute("y", borderWidth / 2);
  rect.setAttribute("width", width - borderWidth);
  rect.setAttribute("height", height - borderWidth);
  rect.setAttribute("rx", borderRadius); // Radio de esquina horizontal
  rect.setAttribute("ry", borderRadius); // Radio de esquina vertical
  rect.setAttribute("fill", "none");
  rect.setAttribute("stroke", color);
  rect.setAttribute("stroke-width", borderWidth);

  // Calcular la longitud del perímetro del rectángulo para el efecto de relleno
  const perimeter = 2 * (width + height); // Perímetro del rectángulo
  rect.setAttribute("stroke-dasharray", perimeter); // Definir el tamaño total del borde
  rect.setAttribute("stroke-dashoffset", perimeter); // Ocultar el borde inicialmente

  // Añadir el rectángulo al SVG y el SVG al contenedor
  svg.appendChild(rect);
  container.appendChild(svg);

  return rect
}

function updateBorderFill(rect, step, totalSteps) {
  const perimeter = rect.getTotalLength(); // Obtener el perímetro
  const offset = perimeter - (step / totalSteps) * perimeter;
  rect.setAttribute("stroke-dashoffset", offset); // Ajustar el borde visible según el step
}

let borderContainers = document.querySelectorAll('.border-container');
let borderRects = [];

let mouseDown = false;

document.addEventListener('mousedown', () => {
  mouseDown = true;
});

document.addEventListener('mouseup', () => {
  mouseDown = false;
});

document.addEventListener('touchstart', () => {
  mouseDown = true;
});

document.addEventListener('touchend', () => {
  mouseDown = false;
});

document.addEventListener('touchcancel', () => {
  mouseDown = false;
});

const $rows = document.body.querySelectorAll('.seq-row');

let buttonStates = Array.from({ length: $rows.length }, () => Array(sequenceSteps).fill(false));

$rows.forEach(($row, i) => {
  const buttons = $row.querySelectorAll('.seq-button');
  
  buttons.forEach((button, j) => {
    button.addEventListener('mousedown', () =>{
      buttonStates[i][j] = !buttonStates[i][j];
      button.classList.toggle('active');
    });
  });
  buttons.forEach((button, j) => {
    button.addEventListener('touchdown', () =>{
      buttonStates[i][j] = !buttonStates[i][j];
      button.classList.toggle('active');
    });
  });

});

const chordsButtons = document.body.querySelectorAll('.ui-chord-button');
let playingChord = false;

const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

chordsButtons.forEach((button, i) => {
  if (isTouchDevice) {
    button.addEventListener('touchstart', async (e) => {
      e.preventDefault();
      const isToneStarted = await ensureToneStarted();
      if (isToneStarted) {
        chords.triggerAttack(chordsNotes[i]);
        ambientLight.color.set(ambientColors[i]);
        playingChord = true;
      }
    });

    button.addEventListener('touchend', async (e) => {
      e.preventDefault();
      const isToneStarted = await ensureToneStarted();
      if (isToneStarted) {
        chords.triggerRelease(chordsNotes[i]);
        ambientLight.color.set('azure');
        ambientLight.intensity = 1.0;
        playingChord = false;
      }
    });

    button.addEventListener('touchcancel', async (e) => {
      e.preventDefault();
      const isToneStarted = await ensureToneStarted();
      if (isToneStarted) {
        chords.triggerRelease(chordsNotes[i]);
        ambientLight.color.set('azure');
        ambientLight.intensity = 1.0;
        playingChord = false;
      }
    });
  } else {
    button.addEventListener('mousedown', async () => {
      const isToneStarted = await ensureToneStarted();
      if (isToneStarted) {
        chords.triggerAttack(chordsNotes[i]);
        ambientLight.color.set(ambientColors[i]);
        playingChord = true;
      }
    });

    button.addEventListener('mouseup', async () => {
      const isToneStarted = await ensureToneStarted();
      if (isToneStarted) {
        chords.triggerRelease(chordsNotes[i]);
        ambientLight.color.set('azure');
        ambientLight.intensity = 1.0;
        playingChord = false;
      }
    });
  }
});

const bassButtons = document.body.querySelectorAll('.ui-bass-button');
let bassSequence =  Array(sequenceSteps).fill(-1);

function getNextStep(){
  let s = index % sequenceSteps;

  s -= 1;
  if(s < 0) s = 0;

  return s;
}

bassButtons.forEach((button, i) => {

if(isTouchDevice){
  button.addEventListener('touchstart', async () => {
    const isToneStarted = await ensureToneStarted();
    if (isToneStarted) {
      bass.triggerAttackRelease(bassNotes[i], '16n');
      bassSequence[getNextStep()] = i;
      toggleNoteOnNextStep(6);
    }
  });
  button.addEventListener('touchend', () =>{
    button.classList.remove('active');
  });
  button.addEventListener('touchcancel', () =>{
    button.classList.remove('active');
  });
}
else{
  button.addEventListener('mousedown', async () => {
    const isToneStarted = await ensureToneStarted();
    if (isToneStarted) {
      bass.triggerAttackRelease(bassNotes[i], '16n');
      bassSequence[getNextStep()] = i;
      toggleNoteOnNextStep(6);
    }
  });
}

});



const voiceButtons = document.body.querySelectorAll('.ui-voice-button');
let voiceSequence =  Array(sequenceSteps).fill(-1);

voiceButtons.forEach((button, i) => {

if(isTouchDevice){
  button.addEventListener('touchstart', async () => {
    const isToneStarted = await ensureToneStarted();
    if (isToneStarted) {
      voice.triggerAttackRelease(voiceNotes[i], '16n');
      voiceSequence[getNextStep()] = i;
      toggleNoteOnNextStep(7);
    }
  });
  button.addEventListener('touchend', () =>{
    button.classList.remove('active');
  });
  button.addEventListener('touchcancel', () =>{
    button.classList.remove('active');
  });
}
else{
  button.addEventListener('mousedown', async () => {
    const isToneStarted = await ensureToneStarted();
    if (isToneStarted) {
      voice.triggerAttackRelease(voiceNotes[i], '16n');
      voiceSequence[getNextStep()] = i;
      toggleNoteOnNextStep(7);
    }
  });
}
});


let stopButton = document.getElementById('stop');
let playButton = document.getElementById('play');
let startButton = document.getElementById('start-button');
let reloadButton = document.getElementById('reload');

startButton.addEventListener('mousedown', async () => {
  await Tone.start();
  Tone.Transport.start();
  loop.start();
  // loop.stop();

  startButton.style.visibility = 'hidden';
  started = true;
});

stopButton.addEventListener('mousedown', () => {
  loop.stop();
});

// Escuchar el clic en el botón para iniciar el audio
playButton.addEventListener('mousedown', async () => {
  await Tone.start();

  loop.start();
  bpmValue.textContent = Math.round(Tone.Transport.bpm.value);

  playButton.classList.toggle('active');
});

reloadButton.addEventListener('mousedown', () => {
  regenerateHarmonies();
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

if(isTouchDevice){
  document.getElementById('bassdrum-sound').addEventListener('touchstart', async () => {
    toggleNoteOnNextStep(0);
  });
  
  document.getElementById('snare-sound').addEventListener('touchstart', async () => {
    toggleNoteOnNextStep(1);
  });
  
  document.getElementById('tom-sound').addEventListener('touchstart', async () => {
    toggleNoteOnNextStep(2);
  
  });
  
  document.getElementById('clap-sound').addEventListener('touchstart', async () => {
    toggleNoteOnNextStep(3);
  
  });
  
  document.getElementById('chihat-sound').addEventListener('touchstart', async () => {
    toggleNoteOnNextStep(4);
  
  });
  
  document.getElementById('ohihat-sound').addEventListener('touchstart', async () => {
    toggleNoteOnNextStep(5);
  });
}
else{
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
}

let drumsButtons = [document.getElementById('bassdrum-sound'), document.getElementById('snare-sound'), document.getElementById('tom-sound'), document.getElementById('clap-sound'), document.getElementById('chihat-sound'), document.getElementById('ohihat-sound')];

var metronomeDiv = document.getElementById("ui-metronome");
var volumeSlider = document.getElementById("ui-volume-slider");

volumeSlider.addEventListener('mousedown', () =>{
  metronomeEnabled = !metronomeEnabled;

  // metronomeDiv.style.backgroundColor = metronomeEnabled ? "#FFA125" : "#FFFFFF";  // Verde si activo, morado si inactivo

  if (metronomeEnabled) {
    volumeSlider.classList.add("active");
    metronomeDiv.classList.add("active");
  } else {
    volumeSlider.classList.remove("active");
    metronomeDiv.classList.remove("active");
  }

});

//URL FROM

function createShareableLink(data) {
  // Combina los datos en un solo objeto
  const combinedData = {
    projectTitle,
    chordsNotes,
    bassNotes,
    voiceNotes,
    buttonStates,
    bassSequence,
    voiceSequence,
    bpm: Tone.Transport.bpm.value,
  };

  // Convierte los datos a JSON
  const jsonData = JSON.stringify(combinedData);

  // Comprime los datos JSON con LZ-String
  const compressedData = LZString.compressToBase64(jsonData);

  // Verifica la longitud antes y después de la compresión
  // console.log("Original JSON length: ", jsonData.length);
  // console.log("Compressed Data (Base64) length: ", compressedData.length);
  // console.log("Compressed Data (Base64): ", compressedData);  // Muestra el Base64 comprimido

  // Construye la URL limpia
  const baseUrl = window.location.origin + window.location.pathname;
  const shareableUrl = `${baseUrl}?data=${encodeURIComponent(compressedData)}`;

  return shareableUrl;
}

// Decodifica los datos de la URL
function getSequenceFromUrl() {
  const params = new URLSearchParams(window.location.search);

  if (params.has('data')) {
    const compressedData = params.get('data');
    try {
      // Verifica el valor de 'data' antes de intentar descomprimirlo
      // console.log("Compressed data from URL:", compressedData);

      // Descomprime los datos usando LZ-String y convierte de vuelta a JSON
      const decompressedData = LZString.decompressFromBase64(compressedData);

      if (!decompressedData) {
        // throw new Error("Failed to decompress data.");
      }

      // console.log("Decompressed Data:", decompressedData);  // Muestra los datos descomprimidos

      const decodedData = JSON.parse(decompressedData);
      return decodedData;
    } catch (e) {
      console.error('Error al decodificar los datos:', e);
    }
  }
  return null;
}

// Escucha el evento para compartir
document.getElementById('share').addEventListener('click', () => {
  const shareableUrl = createShareableLink();
  console.log(shareableUrl);

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(shareableUrl).then(() => {
      alert("Shared link copied");
    }).catch(err => {
      console.error('Error al copiar el enlace:', err);
    });
  } else {
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
  updateSlideWidth();
  projectTitle = generateRandomTitle();
  updateTitleField();

  borderContainers.forEach(slide => {
    let border = createStaticBorder(slide);
    borderRects.push(border);
  });

  const sharedData = getSequenceFromUrl();
  if (sharedData) {
    console.log("Datos cargados desde URL:", sharedData);

    // Restaura las variables

    projectTitle = sharedData.projectTitle;
    updateTitleField();

    chordsNotes = sharedData.chordsNotes || [];
    bassNotes = sharedData.bassNotes || [];
    voiceNotes = sharedData.voiceNotes || [];
    buttonStates = sharedData.buttonStates || [];
    bassSequence = sharedData.bassSequence || [];
    voiceSequence = sharedData.voiceSequence || [];
    const bpm = sharedData.bpm || 120;

    // Restaura los valores del secuenciador
    $rows.forEach(($row, i) => {
      const buttons = $row.querySelectorAll('.seq-button');
      buttons.forEach((button, j) => {
        if (buttonStates[i] && buttonStates[i][j]) {
          button.classList.add('active');
        } else {
          button.classList.remove('active');
        }
      });
    });

    // Actualiza el BPM
    Tone.Transport.bpm.value = bpm;
    bpmValue.textContent = bpm;
    bpmSlider.value = bpm;
    
  }

};


// TONE LOOP SETTING

const loop = new Tone.Loop((time) => {

  let step = index % sequenceSteps;

  borderRects.forEach(rect => {
    updateBorderFill(rect, step, sequenceSteps);
  });

  $rows.forEach(($row, i) => {
    const buttons = $row.querySelectorAll('.seq-button');
  
    buttons.forEach((button, j) => {
      button.classList.remove('current');
    });
    buttons[step].classList.add('current');
  });

  drumsButtons.forEach((button) =>{
    button.classList.remove('active');
  });
  bassButtons.forEach((button) =>{
    button.classList.remove('active');
  });
  voiceButtons.forEach((button) =>{
    button.classList.remove('active');
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

    let note = notes[i];
    let state = buttonStates[i][step];

    if(state){

      if(i <= 5){
        tr808.player(note).start(time);
        drumsButtons[i].classList.add('active');
      }
      else{
        if(i == 6){
          // bassNoteIndex = getRandomInt(0, bassNotes.length-1);
          let bassNote = bassSequence[step];
          bass.triggerAttackRelease(bassNotes[bassNote], '16n', time);
          bassButtons[bassNote].classList.add('active');

        }
        if(i == 7){
          let voiceNote = voiceSequence[step];
          voice.triggerAttackRelease(voiceNotes[voiceNote], '16n', time);
          voiceButtons[voiceNote].classList.add('active');

          if(voiceNote == 0){
            const sign = Math.random() < 0.5 ? 1 : -1;
            gsap.to(planta.position, {
              x: iPPlanta.x + sign * 0.5, 
              duration: 0.2,
              ease: "power3.inOut",
              onComplete: () => {
                gsap.to(planta.position, {
                  x: iPPlanta.x,
                  duration: 0.2,
                  ease: "power3.inOut"
                });
              }
            });
            gsap.to(planta.rotation, {
              y: iRPlanta.y + sign * (Math.random() * degToRad(360) - degToRad(180)), 
              duration: 0.2,
              ease: "power3.out",
              onComplete: () => {
                gsap.to(planta.rotation, {
                  y: iRPlanta.y,
                  duration: 0.2,
                  ease: "power.out"
                });
              }
            });           
          }
          else if(voiceNote == 1){
            const sign = Math.random() < 0.5 ? 1 : -1;
            gsap.to(dispensador.position, {
              z: iPDisp.z + 2.5, 
              duration: 0.2,
              ease: "power3.inOut",
              onComplete: () => {
                gsap.to(dispensador.position, {
                  z: iPDisp.z,
                  duration: 0.2,
                  ease: "power3.inOut"
                });
              }
            });
            gsap.to(dispensador.rotation, {
              y: iRDisp.y + sign * (Math.random() * degToRad(360) - degToRad(180)), 
              duration: 0.2,
              ease: "power3.out",
              onComplete: () => {
                gsap.to(dispensador.rotation, {
                  y: iRDisp.y,
                  duration: 0.2,
                  ease: "power.out"
                });
              }
            }); 
          }
          else if(voiceNote == 2){
            gsap.to(silla.position, {
              x: iPSilla.x - 0.5, 
              duration: 0.2,
              ease: "power3.inOut",
              onComplete: () => {
                gsap.to(silla.position, {
                  x: iPSilla.x,
                  duration: 0.2,
                  ease: "power3.inOut"
                });
              }
            });
            const sign = Math.random() < 0.5 ? 1 : -1;
            gsap.to(silla.rotation, {
              y: iRSilla.y + sign * (Math.random() * degToRad(360) - degToRad(180)), 
              duration: 0.2,
              ease: "power3.out",
              onComplete: () => {
                gsap.to(silla.rotation, {
                  y: iRSilla.y,
                  duration: 0.2,
                  ease: "power.out"
                });
              }
            });
          }
          else{
            const sign = Math.random() < 0.5 ? 1 : -1;
            gsap.to(reloj.rotation, {
              y: iRReloj.y + sign * (Math.random() * degToRad(360) - degToRad(180)), 
              duration: 0.2,
              ease: "power3.out",
              onComplete: () => {
                gsap.to(reloj.rotation, {
                  y: iRReloj.y,
                  duration: 0.2,
                  ease: "power.out"
                });
              }
            });
          }
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

        if(cameraZoomed){
          gsap.to(camera, {
            fov: 16,
            duration: 0.1,
            ease: 'power1.out',
            onUpdate: function () {
              camera.updateProjectionMatrix();  // Necesario para que los cambios en FOV surtan efecto
            }
          });
        }
        else{
          gsap.to(camera, {
            fov: 15,
            duration: 0.1,
            ease: 'power1.out',
            onUpdate: function () {
              camera.updateProjectionMatrix();  // Necesario para que los cambios en FOV surtan efecto
            }
          });
        }
        cameraZoomed = !cameraZoomed;
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

        gsap.to(camera.rotation, {
          z: Math.PI / 80 * cameraRotatedSide,           // Rotar 45 grados
          duration: 0.1,            // Duración de la animación
          ease: "power2.out",       // Ease out
          repeat: 1,               // Repetir infinitamente
          yoyo: true,               // Ir y volver
      });
      cameraRotatedSide *= -1;
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

          rightKickAction.stop();
          rightKickAction.reset();
          rightBackKickAction.stop();
          rightBackKickAction.reset();

          if(bassNoteIndex % 2 == 0){
            leftKickAction.play();
          }
          else{
            leftBackKickAction.play();
          }

          kickSide = 1;
        }
        else {

          if(bassNoteIndex % 2 == 0){
            rightBackKickAction.play();
          }
          else {
            rightKickAction.play();
          }

          leftKickAction.stop();
          leftKickAction.reset();
          leftBackKickAction.stop();
          leftBackKickAction.reset();

          kickSide = 0;
        }
      }
    }
  }
  index++;

}, "8n");


let bpmValue = document.getElementById('bpm-value');

Tone.Transport.bpm.value = 120;
// Tone.Transport.start();
// loop.start(0);  // Empieza en el tiempo 0

//THREE JS PART

const canvas = document.getElementById("threejs-container");

const loader = new GLTFLoader();
const scene = new THREE.Scene();
let containerWidth = window.innerWidth;
let containerHeight = window.innerHeight;

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: false });
renderer.setSize(containerWidth, containerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// renderer.setClearColor(0x000000, 0); 

const camera = new THREE.PerspectiveCamera(15, canvas.offsetWidth / canvas.offsetHeight, 0.1, 1000);
// const controls = new OrbitControls( camera, renderer.domElement );

const composer = new EffectComposer( renderer );
let renderPixelatedPass = new RenderPixelatedPass( 4, scene, camera );

if(containerWidth <= thresholdWidth){
  renderPixelatedPass = new RenderPixelatedPass( 2, scene, camera );
}

renderPixelatedPass.normalEdgeStrength = 0.05;
renderPixelatedPass.depthEdgeStrength = 0.5;
composer.addPass( renderPixelatedPass );

const outputPass = new OutputPass();
composer.addPass( outputPass );

// container.appendChild(renderer.domElement);

// Handle window resizing
window.addEventListener('resize', () => {
  const newWidth = window.innerWidth;
  const newHeight = window.innerHeight;
  containerHeight = newHeight;
  containerWidth = newWidth;
  renderer.setSize(newWidth, newHeight);
  composer.setSize(newWidth, newHeight);
  camera.aspect = newWidth / newHeight;
  camera.updateProjectionMatrix();

  let originalLookAt = new THREE.Vector3(char.hips.position.x, char.hips.position.y, char.hips.position.z);

  if(newWidth >= thresholdWidth){
    character.position.x = 1;
    lookAt.y = originalLookAt.y + 0.5;
    camera.position.y = gltfCamera.position.y + 1;
  }
  else{
    character.position.x = 0;      
    lookAt.y = originalLookAt.y - 0.2;
    camera.position.y = gltfCamera.position.y;
  }

  updateSlideWidth();

  // controls.update();

});

// Añadir luces a la escena
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight('azure', 2);
directionalLight.position.set(0, 14, 0);
scene.add(directionalLight);
directionalLight.castShadow = true;
// Configurar las propiedades de la sombra, como la distancia y la resolución
directionalLight.shadow.mapSize.width = 2048;  // Resolución horizontal
directionalLight.shadow.mapSize.height = 2048; // Resolución vertical
directionalLight.shadow.camera.near = 0.1;    // Distancia mínima de la sombra
directionalLight.shadow.camera.far = 20;     // Distancia máxima de la sombra
directionalLight.shadow.camera.left = -15;
directionalLight.shadow.camera.right = 15;
directionalLight.shadow.camera.top = 15;
directionalLight.shadow.camera.bottom = -15;
directionalLight.shadow.bias = -0.004;

// const directionalLightCameraHelper = new THREE.CameraHelper(directionalLight.shadow.camera)
// scene.add(directionalLightCameraHelper)

// const directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight, 0.2)
// scene.add(directionalLightHelper)

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

const directionalLight2 = new THREE.DirectionalLight('darkorange', 5);
directionalLight2.position.set(-4, 2, 0);
scene.add(directionalLight2);
directionalLight2.castShadow = true;
// Configurar las propiedades de la sombra, como la distancia y la resolución
directionalLight2.shadow.mapSize.width = 2048;  // Resolución horizontal
directionalLight2.shadow.mapSize.height = 2048; // Resolución vertical
directionalLight2.shadow.camera.near = 0.1;    // Distancia mínima de la sombra
directionalLight2.shadow.camera.far = 20;     // Distancia máxima de la sombra
directionalLight2.shadow.camera.left = -15;
directionalLight2.shadow.camera.right = 15;
directionalLight2.shadow.camera.top = 15;
directionalLight2.shadow.camera.bottom = -15;
directionalLight2.shadow.bias = -0.004;

const directionalLight3 = new THREE.DirectionalLight('midnightblue', 3);
directionalLight3.position.set(4, 2, -1);
scene.add(directionalLight3);

const hemisphereLight = new THREE.HemisphereLight('red', 'blue', 2)
scene.add(hemisphereLight)

let gltfCamera = null;

loader.load('models/scene_v01.gltf', function(gltf){
  scene.add(gltf.scene);

  gltf.scene.traverse(function (object) {

    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;

      if(object.name.includes('techo')){
        object.castShadow = false;
        object.receiveShadow = false;
      }
      if(object.material.name == 'cristal'){
        const translucentMaterial = new THREE.MeshStandardMaterial({
          color: 0x99ccff,            // Un color ligeramente azulado
          transparent: true,          // Habilitar la transparencia
          opacity: 0.2,               // Controlar el nivel de transparencia
          roughness: 0.5,             // Rugosidad media para una superficie difusa
          metalness: 0,               // Sin efecto metálico
      });
        object.material = translucentMaterial;
      }
      else{
        // object.material = new THREE.MeshLambertMaterial({
        //   color: object.material.color,  // Mantener el color original
        // });
        
      }
    }

    if(object.isCamera){
      gltfCamera = object;

      camera.position.copy(gltfCamera.position);  // Aseguramos que la posición esté alineada
      camera.quaternion.copy(gltfCamera.quaternion);  // Alineamos la rotación

      if(containerWidth >= thresholdWidth){
        camera.position.y = gltfCamera.position.y + 1;
      }
      else{
        camera.position.y = gltfCamera.position.y;
      }

    }

    if(object.name == 'corcho'){
      corcho = object;
      iPCorcho = new THREE.Vector3(object.position.x, object.position.y, object.position.z);
      iRCorcho = new THREE.Euler(object.rotation.x, object.rotation.y, object.rotation.z, object.rotation.order);
    }
    if(object.name == 'dispensador'){
      dispensador = object;
      iPDisp = new THREE.Vector3(object.position.x, object.position.y, object.position.z);
      iRDisp = new THREE.Euler(object.rotation.x, object.rotation.y, object.rotation.z, object.rotation.order);      
    }
    if(object.name == 'planta'){
      planta = object;
      iPPlanta = new THREE.Vector3(object.position.x, object.position.y, object.position.z);
      iRPlanta = new THREE.Euler(object.rotation.x, object.rotation.y, object.rotation.z, object.rotation.order);
    }
    if(object.name == 'silla'){
      silla = object;
      iPSilla = new THREE.Vector3(object.position.x, object.position.y, object.position.z);
      iRSilla = new THREE.Euler(object.rotation.x, object.rotation.y, object.rotation.z, object.rotation.order);    
    }
    if(object.name == 'reloj'){
      reloj = object;
      iPReloj = new THREE.Vector3(object.position.x, object.position.y, object.position.z);
      iRReloj = new THREE.Euler(object.rotation.x, object.rotation.y, object.rotation.z, object.rotation.order);
    }

  });
});


loader.load('models/human_model_v01.glb', function (gltf) {
  scene.add(gltf.scene);

  character = gltf.scene;
  character.castShadow = true;

  if(containerWidth >= thresholdWidth){
    character.position.x += 1;
  }
  const skinnedMesh = character.getObjectByProperty('type', 'SkinnedMesh');
  const ske = skinnedMesh.skeleton;
  char.skinnedMesh = skinnedMesh;
  char.skeleton = ske;

  // console.log(ske);

  character.traverse(function (object) {

    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;

      // object.material = new THREE.MeshLambertMaterial({
      //   color: object.material.color,  // Mantener el color original
      // });
    }

    if (object.name == 'jacket') {
      char.jacket = object;
      // char.jacket.visible = false;
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
    const leftBKick = THREE.AnimationClip.findByName(animations, 'BackKickLeft');
    const rightBKick = THREE.AnimationClip.findByName(animations, 'BackKickRight');

    const fLeftKick = filterTracksForBones(leftKick, ['mixamorigUpLegL', 'mixamorigLegL', 'mixamorigFootL', 'mixamorigUpLegR', 'mixamorigLegR', 'mixamorigFootR']);
    leftKickAction = mixer.clipAction(fLeftKick);
    leftKickAction.setLoop(THREE.LoopOnce, 1);
    leftKickAction.clampWhenFinished = true;

    const fRightKick = filterTracksForBones(rightKick, ['mixamorigUpLegL', 'mixamorigLegL', 'mixamorigFootL', 'mixamorigUpLegR', 'mixamorigLegR', 'mixamorigFootR']);
    rightKickAction = mixer.clipAction(fRightKick);
    rightKickAction.setLoop(THREE.LoopOnce, 1);
    rightKickAction.clampWhenFinished = true;

    const fLeftBKick = filterTracksForBones(leftBKick, ['mixamorigUpLegL', 'mixamorigLegL', 'mixamorigFootL', 'mixamorigUpLegR', 'mixamorigLegR', 'mixamorigFootR']);
    leftBackKickAction = mixer.clipAction(fLeftBKick);
    leftBackKickAction.setLoop(THREE.LoopOnce, 1);
    leftBackKickAction.clampWhenFinished = true;

    const fRighBtKick = filterTracksForBones(rightBKick, ['mixamorigUpLegL', 'mixamorigLegL', 'mixamorigFootL', 'mixamorigUpLegR', 'mixamorigLegR', 'mixamorigFootR']);
    rightBackKickAction = mixer.clipAction(fRighBtKick);
    rightBackKickAction.setLoop(THREE.LoopOnce, 1);
    rightBackKickAction.clampWhenFinished = true;

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


  let originalLookAt = new THREE.Vector3(char.hips.position.x, char.hips.position.y, char.hips.position.z);
  lookAt = new THREE.Vector3(char.hips.position.x, char.hips.position.y, char.hips.position.z);

  if(containerWidth >= thresholdWidth){
    lookAt.y = originalLookAt.y + 0.5;
  }
  else{
    lookAt.y = originalLookAt.y - 0.3;
  }

  animate();
  alertSilentMode();

});

// FUNCTIONS


function animate(time) {

  const deltaTime = time - lastFrameTime;

  if (deltaTime >= frameDuration) {

    lastFrameTime = time - (deltaTime % frameDuration);  // Resetear el tiempo de inicio del frame

    // Actualizar la escena, animaciones y renderizar
    const delta = clock.getDelta();

    const elapsedTime = clock.getElapsedTime();
    
    if(started){
      const noiseX = noise2D(elapsedTime*0.5, 0);
      const noiseY = noise2D(elapsedTime*0.5, 10);
  
      const angle = elapsedTime * cameraSpeed;
  
      const x = Math.cos(angle) * cameraXRadius;
      const y = Math.sin(angle) * cameraYRadius;
  
      camera.position.x += x;
      camera.position.y += y;
  
      camera.position.x += noiseX*0.02;
      camera.position.y += noiseY*0.02;
  
  
      character.rotation.y += Math.sin(delta / 2);

      if(playingChord){
        ambientLight.intensity = Math.abs(Math.sin(time)) * 2;
      }
    }

    camera.lookAt(lookAt);

    mixer.update(delta);  // Actualiza las animaciones
    
    // controls.update();
    composer.render(scene, camera);
    
  }

  requestAnimationFrame(animate);
}

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
  }
  return Tone.context.state === 'running';  // Verificar si Tone está corriendo
}

async function toggleNoteOnNextStep(row) {

  const isToneStarted = await ensureToneStarted();

  if (isToneStarted) {

    let s = getNextStep();
    
    const $rows = document.body.querySelectorAll('.seq-row');
    const buttons = $rows[row].querySelectorAll('.seq-button');
    let button = buttons[s];

    if(row <= 5){
      buttonStates[row][s] = !buttonStates[row][s];

      // button.classList.toggle('active');

      let note = notes[row];
      tr808.player(note).start();
    }
    
    else{
      buttonStates[row][s] = true;
      // button.classList.toggle('active');
    }
  }
}