function navigate(url) {
  document.body.classList.add('fade-out');
  const dest = url + location.hash;
  document.body.addEventListener('animationend', () => window.location.href = dest, { once: true });
}
const questions = [
  { age: 11, watched: 'Découverte d’un monde de blocs', category: 'Jeux', options: ['Top des nouveautés ludiques','Recette facile de gâteaux','Daily vlog scolaire','Astuces de soins pour animaux'] },
  { age: 13, watched: 'Tutoriel sur la préparation de smoothies', category: 'Cuisine', options: ['Compilation de jeux rétro','Top des looks street','Recette de smoothie','Épisode de vlog voyage'] },
  { age: 12, watched: 'Vlog : ma journée sportive', category: 'Sport', options: ['Tips gaming','Comment customiser un t-shirt','Ma séance de sport','Visite d’un refuge animalier'] },
  { age: 14, watched: 'Présentation des tendances mode été', category: 'Mode', options: ['Revue de jeu d’aventure','Défi pâtisserie','Haul mode','Vlog aventure en forêt'] },
  { age: 11, watched: 'Mon chat apprend un nouveau tour', category: 'Animaux', options: ['Top jeux collaboratifs','Vlog cuisine','Soins pour chat','Tutoriel danse'] },
  { age: 13, watched: 'Recette de crêpes express', category: 'Cuisine', options: ['Gaming en direct','Top pièces vintage','Recette de crêpes','Vlog découverte'] },
  { age: 12, watched: 'Exploration d’un jeu d’énigmes', category: 'Jeux', options: ['DIY mode','Compilation fails drôles','Jeu d’énigmes','Recette rapide'] },
  { age: 14, watched: 'Interview d’un créateur de mode', category: 'Mode', options: ['Challenge gaming','Interview créateur','Recette de cookies','Vlog sportif'] },
  { age: 11, watched: 'Test d’un nouveau jeu de sport', category: 'Sport', options: ['Recette soupe','Critique du jeu','Vlog animalier','Conseils mode'] },
  { age: 13, watched: 'Mes astuces pour une journée productive', category: 'Vlog', options: ['Revue JV stress','Astuce organisation','Recette snack','Haul sneakers'] }
];
let current = 0;
const questionText = document.getElementById('question-text');
const optionsDiv = document.getElementById('options');
const tbody = document.getElementById('dataset-body');
function renderQuestion() {
  const q = questions[current];
  questionText.classList.remove('fade'); void questionText.offsetWidth;
  questionText.textContent = `Vous avez ${q.age} ans et venez de regarder « ${q.watched} ».`;
  questionText.classList.add('fade');
  optionsDiv.innerHTML = '';
  q.options.forEach(opt => {
    const btn = document.createElement('button'); btn.textContent = opt;
    btn.onclick = () => addPrediction(opt);
    optionsDiv.appendChild(btn);
  });
}
function addPrediction(choice) {
  const q = questions[current];
  const row = document.createElement('tr');
  row.innerHTML = `<td>${q.age}</td><td>${q.watched}</td><td>${q.category}</td><td>${choice}</td>`;
  row.classList.add('row-fade-in'); tbody.appendChild(row);
  current++;
  if (current < questions.length) setTimeout(renderQuestion,300);
  else {
    questionText.classList.remove('fade'); void questionText.offsetWidth;
    questionText.textContent = 'Fin des questions !';
  }
}
renderQuestion();
